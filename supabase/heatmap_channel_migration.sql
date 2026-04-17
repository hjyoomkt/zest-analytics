-- ============================================================
-- 히트맵 채널 필터 마이그레이션
-- Supabase SQL Editor에서 순서대로 실행
-- ============================================================

-- 1. get_heatmap_channels — 채널별 세션 수 목록 (신규)
CREATE OR REPLACE FUNCTION get_heatmap_channels(
  p_advertiser_ids UUID[],
  p_start          TIMESTAMPTZ,
  p_end            TIMESTAMPTZ,
  p_device_type    TEXT    DEFAULT NULL,
  p_blocked_ips    TEXT[]  DEFAULT ARRAY[]::TEXT[]
)
RETURNS TABLE(channel TEXT, session_count BIGINT)
LANGUAGE sql STABLE
AS $$
  SELECT
    COALESCE(e.channel, 'direct') AS channel,
    COUNT(*)                      AS session_count
  FROM za_events e
  WHERE e.advertiser_id = ANY(p_advertiser_ids)
    AND e.event_type    = 'session_end'
    AND e.created_at   >= p_start
    AND e.created_at   <  p_end
    AND (p_device_type IS NULL OR e.device_type = p_device_type)
    AND (cardinality(p_blocked_ips) = 0 OR host(e.ip_address) != ALL(p_blocked_ips))
  GROUP BY COALESCE(e.channel, 'direct')
  ORDER BY session_count DESC;
$$;

-- 2. get_heatmap_page_list — p_channel 파라미터 추가
CREATE OR REPLACE FUNCTION get_heatmap_page_list(
  p_advertiser_ids UUID[],
  p_start          TIMESTAMPTZ,
  p_end            TIMESTAMPTZ,
  p_device_type    TEXT    DEFAULT NULL,
  p_blocked_ips    TEXT[]  DEFAULT ARRAY[]::TEXT[],
  p_channel        TEXT    DEFAULT NULL
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
    COUNT(*)                    AS session_count,
    ROUND(AVG(scroll_depth), 1) AS avg_depth
  FROM za_events
  WHERE advertiser_id = ANY(p_advertiser_ids)
    AND event_type    = 'session_end'
    AND page_url      IS NOT NULL
    AND scroll_depth  IS NOT NULL
    AND created_at   >= p_start
    AND created_at   <  p_end
    AND (p_device_type IS NULL OR device_type = p_device_type)
    AND (cardinality(p_blocked_ips) = 0 OR host(ip_address) != ALL(p_blocked_ips))
    AND (p_channel IS NULL OR COALESCE(channel, 'direct') = p_channel)
  GROUP BY page_url
  ORDER BY session_count DESC;
$$;

-- 3. get_scroll_heatmap — p_channel 파라미터 추가
CREATE OR REPLACE FUNCTION get_scroll_heatmap(
  p_advertiser_ids UUID[],
  p_page_url       TEXT,
  p_start          TIMESTAMPTZ,
  p_end            TIMESTAMPTZ,
  p_device_type    TEXT    DEFAULT NULL,
  p_blocked_ips    TEXT[]  DEFAULT ARRAY[]::TEXT[],
  p_channel        TEXT    DEFAULT NULL
)
RETURNS TABLE(
  bucket_index    INT,
  reached_count   BIGINT,
  total_count     BIGINT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    b                                                         AS bucket_index,
    COUNT(*) FILTER (WHERE scroll_depth >= b * 10)           AS reached_count,
    COUNT(*)                                                  AS total_count
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
    AND (p_channel IS NULL OR COALESCE(channel, 'direct') = p_channel)
  GROUP BY b
  ORDER BY b;
$$;
