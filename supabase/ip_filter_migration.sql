-- ============================================================
-- IP 필터 마이그레이션
-- 실행 순서: STEP 1 → 2 → 3 → 4
-- ============================================================


-- ============================================================
-- STEP 1. 현재 상태 확인 (읽기 전용 — 아무것도 변경하지 않음)
-- ============================================================

-- [1-1] za_events 에 ip_address 컬럼이 있는지 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'za_events'
  AND column_name  = 'ip_address';
-- 결과가 1행 있으면 OK. 없으면 STEP 2 실행 전 아래 주석 해제 필요.

-- [1-2] za_ip_blocklist 테이블이 이미 있는지 확인
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name   = 'za_ip_blocklist';
-- 결과가 1행 있으면 이미 생성됨 → STEP 2 건너뜀

-- [1-3] 6개 RPC 함수 존재 여부 + 현재 파라미터 목록 확인
SELECT
  p.proname                                    AS function_name,
  pg_get_function_arguments(p.oid)             AS arguments
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_hourly_visitors',
    'get_hourly_pageviews',
    'get_page_scroll_stats',
    'get_channel_performance',
    'get_heatmap_page_list',
    'get_scroll_heatmap'
  )
ORDER BY p.proname;
-- 각 함수의 arguments 컬럼에 "p_blocked_ips" 가 없으면 STEP 3 실행 필요


-- ============================================================
-- STEP 2. za_ip_blocklist 테이블 생성 + is_bot 컬럼 추가
-- ============================================================

-- [2-0] za_events 에 is_bot 컬럼 추가 (user_agent 기반 자동 계산)
ALTER TABLE za_events
  ADD COLUMN IF NOT EXISTS is_bot BOOLEAN GENERATED ALWAYS AS (
    user_agent ~* '(bot|crawl|spider|slurp|Ads-Naver|AdsBot|HeadlessChrome|PhantomJS|Selenium|facebookexternalhit|Twitterbot|LinkedInBot|Kakaotalk|DaumApps|Yeti|NaverBot)'
  ) STORED;



CREATE TABLE IF NOT EXISTS za_ip_blocklist (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address  TEXT        NOT NULL UNIQUE,
  description TEXT,
  created_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: master 계정만 읽기/쓰기
ALTER TABLE za_ip_blocklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "master_only_all" ON za_ip_blocklist;
CREATE POLICY "master_only_all" ON za_ip_blocklist
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'master'
        AND users.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'master'
        AND users.deleted_at IS NULL
    )
  );


-- ============================================================
-- STEP 3. 6개 RPC 함수에 p_blocked_ips 파라미터 추가
--   · DEFAULT ARRAY[]::TEXT[] 이므로 기존 호출 코드는 그대로 동작
-- ============================================================

-- [3-1] get_hourly_visitors
CREATE OR REPLACE FUNCTION get_hourly_visitors(
  p_advertiser_ids UUID[],
  p_start          TIMESTAMPTZ,
  p_end            TIMESTAMPTZ,
  p_blocked_ips    TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS TABLE(hour_of_day INT, visitor_count BIGINT)
LANGUAGE sql STABLE
AS $$
  SELECT
    EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Seoul')::INT AS hour_of_day,
    COUNT(DISTINCT session_id)                                    AS visitor_count
  FROM za_events
  WHERE advertiser_id = ANY(p_advertiser_ids)
    AND event_type    = 'pageview'
    AND session_id    IS NOT NULL
    AND created_at   >= p_start
    AND created_at   <  p_end
    AND (cardinality(p_blocked_ips) = 0 OR host(ip_address) != ALL(p_blocked_ips))
    AND NOT COALESCE(is_bot, false)
  GROUP BY 1
  ORDER BY 1;
$$;

-- [3-2] get_hourly_pageviews
CREATE OR REPLACE FUNCTION get_hourly_pageviews(
  p_advertiser_ids UUID[],
  p_start          TIMESTAMPTZ,
  p_end            TIMESTAMPTZ,
  p_blocked_ips    TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS TABLE(hour_of_day INT, pageview_count BIGINT)
LANGUAGE sql STABLE
AS $$
  SELECT
    EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Seoul')::INT AS hour_of_day,
    COUNT(*)                                                       AS pageview_count
  FROM za_events
  WHERE advertiser_id = ANY(p_advertiser_ids)
    AND event_type    = 'pageview'
    AND created_at   >= p_start
    AND created_at   <  p_end
    AND (cardinality(p_blocked_ips) = 0 OR host(ip_address) != ALL(p_blocked_ips))
    AND NOT COALESCE(is_bot, false)
  GROUP BY 1
  ORDER BY 1;
$$;

-- [3-3] get_page_scroll_stats
CREATE OR REPLACE FUNCTION get_page_scroll_stats(
  p_advertiser_ids UUID[],
  p_start          TIMESTAMPTZ,
  p_end            TIMESTAMPTZ,
  p_blocked_ips    TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS TABLE(
  page_url         TEXT,
  total_sessions   BIGINT,
  avg_scroll_depth NUMERIC,
  reach_25         BIGINT,
  reach_50         BIGINT,
  reach_75         BIGINT,
  reach_100        BIGINT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    page_url,
    COUNT(*)                                         AS total_sessions,
    ROUND(AVG(scroll_depth), 1)                      AS avg_scroll_depth,
    COUNT(*) FILTER (WHERE scroll_depth >= 25)       AS reach_25,
    COUNT(*) FILTER (WHERE scroll_depth >= 50)       AS reach_50,
    COUNT(*) FILTER (WHERE scroll_depth >= 75)       AS reach_75,
    COUNT(*) FILTER (WHERE scroll_depth >= 100)      AS reach_100
  FROM za_events
  WHERE advertiser_id = ANY(p_advertiser_ids)
    AND event_type    = 'session_end'
    AND scroll_depth  IS NOT NULL
    AND page_url      IS NOT NULL
    AND created_at   >= p_start
    AND created_at   <  p_end
    AND (cardinality(p_blocked_ips) = 0 OR host(ip_address) != ALL(p_blocked_ips))
    AND NOT COALESCE(is_bot, false)
  GROUP BY page_url
  ORDER BY total_sessions DESC;
$$;

-- [3-4] get_channel_performance (CTE 2개 모두에 필터 적용)
CREATE OR REPLACE FUNCTION get_channel_performance(
  p_advertiser_ids UUID[],
  p_start          TIMESTAMPTZ,
  p_end            TIMESTAMPTZ,
  p_blocked_ips    TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS TABLE(
  channel          TEXT,
  pageview_count   BIGINT,
  unique_sessions  BIGINT,
  avg_time_on_page NUMERIC,
  avg_scroll_depth NUMERIC,
  reach_25_pct     NUMERIC,
  reach_50_pct     NUMERIC,
  reach_75_pct     NUMERIC,
  reach_100_pct    NUMERIC
)
LANGUAGE sql STABLE
AS $$
  WITH pv AS (
    SELECT
      COALESCE(channel, 'unknown') AS channel,
      session_id,
      COUNT(*)                     AS pv_count
    FROM za_events
    WHERE advertiser_id = ANY(p_advertiser_ids)
      AND event_type    = 'pageview'
      AND created_at   >= p_start
      AND created_at   <  p_end
      AND (cardinality(p_blocked_ips) = 0 OR host(ip_address) != ALL(p_blocked_ips))
      AND NOT COALESCE(is_bot, false)
    GROUP BY 1, 2
  ),
  se AS (
    SELECT
      COALESCE(channel, 'unknown') AS channel,
      session_id,
      time_on_page,
      scroll_depth
    FROM za_events
    WHERE advertiser_id = ANY(p_advertiser_ids)
      AND event_type    = 'session_end'
      AND created_at   >= p_start
      AND created_at   <  p_end
      AND (cardinality(p_blocked_ips) = 0 OR host(ip_address) != ALL(p_blocked_ips))
      AND NOT COALESCE(is_bot, false)
  )
  SELECT
    pv.channel,
    SUM(pv.pv_count)::BIGINT                                                        AS pageview_count,
    COUNT(DISTINCT pv.session_id)::BIGINT                                            AS unique_sessions,
    ROUND(AVG(se.time_on_page), 1)                                                   AS avg_time_on_page,
    ROUND(AVG(se.scroll_depth), 1)                                                   AS avg_scroll_depth,
    ROUND(COUNT(se.session_id) FILTER (WHERE se.scroll_depth >= 25)::NUMERIC
          / NULLIF(COUNT(se.session_id), 0) * 100, 1)                               AS reach_25_pct,
    ROUND(COUNT(se.session_id) FILTER (WHERE se.scroll_depth >= 50)::NUMERIC
          / NULLIF(COUNT(se.session_id), 0) * 100, 1)                               AS reach_50_pct,
    ROUND(COUNT(se.session_id) FILTER (WHERE se.scroll_depth >= 75)::NUMERIC
          / NULLIF(COUNT(se.session_id), 0) * 100, 1)                               AS reach_75_pct,
    ROUND(COUNT(se.session_id) FILTER (WHERE se.scroll_depth >= 100)::NUMERIC
          / NULLIF(COUNT(se.session_id), 0) * 100, 1)                               AS reach_100_pct
  FROM pv
  LEFT JOIN se ON pv.session_id = se.session_id
  GROUP BY pv.channel
  ORDER BY pageview_count DESC;
$$;

-- [3-5] get_heatmap_page_list
CREATE OR REPLACE FUNCTION get_heatmap_page_list(
  p_advertiser_ids UUID[],
  p_start          TIMESTAMPTZ,
  p_end            TIMESTAMPTZ,
  p_device_type    TEXT    DEFAULT NULL,
  p_blocked_ips    TEXT[]  DEFAULT ARRAY[]::TEXT[]
)
RETURNS TABLE(
  page_url       TEXT,
  session_count  BIGINT,
  avg_depth      NUMERIC
)
LANGUAGE sql STABLE
AS $$
  SELECT
    page_url,
    COUNT(*)                        AS session_count,
    ROUND(AVG(scroll_depth), 1)     AS avg_depth
  FROM za_events
  WHERE advertiser_id = ANY(p_advertiser_ids)
    AND event_type    = 'session_end'
    AND page_url      IS NOT NULL
    AND scroll_depth  IS NOT NULL
    AND created_at   >= p_start
    AND created_at   <  p_end
    AND (p_device_type IS NULL OR device_type = p_device_type)
    AND (cardinality(p_blocked_ips) = 0 OR host(ip_address) != ALL(p_blocked_ips))
    AND NOT COALESCE(is_bot, false)
  GROUP BY page_url
  ORDER BY session_count DESC;
$$;

-- [3-6] get_scroll_heatmap
CREATE OR REPLACE FUNCTION get_scroll_heatmap(
  p_advertiser_ids UUID[],
  p_page_url       TEXT,
  p_start          TIMESTAMPTZ,
  p_end            TIMESTAMPTZ,
  p_device_type    TEXT    DEFAULT NULL,
  p_blocked_ips    TEXT[]  DEFAULT ARRAY[]::TEXT[]
)
RETURNS TABLE(
  bucket_index    INT,
  reached_count   BIGINT,
  total_count     BIGINT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    b                                                          AS bucket_index,
    COUNT(*) FILTER (WHERE scroll_depth >= b * 10)            AS reached_count,
    COUNT(*)                                                   AS total_count
  FROM za_events
  CROSS JOIN generate_series(0, 9) AS b
  WHERE advertiser_id = ANY(p_advertiser_ids)
    AND event_type    = 'session_end'
    AND page_url      = p_page_url
    AND scroll_depth  IS NOT NULL
    AND created_at   >= p_start
    AND created_at   <  p_end
    AND (p_device_type IS NULL OR device_type = p_device_type)
    AND (cardinality(p_blocked_ips) = 0 OR host(ip_address) != ALL(p_blocked_ips))
    AND NOT COALESCE(is_bot, false)
  GROUP BY b
  ORDER BY b;
$$;


-- ============================================================
-- STEP 4. 적용 완료 확인 (STEP 3 실행 후 재실행)
-- ============================================================

SELECT
  p.proname                         AS function_name,
  pg_get_function_arguments(p.oid)  AS arguments
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_hourly_visitors',
    'get_hourly_pageviews',
    'get_page_scroll_stats',
    'get_channel_performance',
    'get_heatmap_page_list',
    'get_scroll_heatmap'
  )
ORDER BY p.proname;
-- arguments 컬럼에 "p_blocked_ips text[] DEFAULT '{}'"가 보이면 완료
