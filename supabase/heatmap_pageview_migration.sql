-- ============================================================
-- 히트맵 페이지 목록: session_end → pageview 기준으로 변경
-- session_end는 탭 닫을 때만 발화돼 누락이 많음
-- pageview 기준으로 세션 카운트, scroll_depth는 session_end JOIN
-- Supabase SQL Editor에서 실행
-- ============================================================

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
  avg_depth      NUMERIC,
  avg_time       NUMERIC
)
LANGUAGE sql STABLE
AS $$
  SELECT
    pv.page_url,
    COUNT(DISTINCT pv.session_id)                        AS session_count,
    COALESCE(ROUND(AVG(se.scroll_depth), 1), 0)         AS avg_depth,
    COALESCE(ROUND(AVG(se.time_on_page), 0), 0)         AS avg_time
  FROM za_events pv
  LEFT JOIN za_events se
    ON  se.session_id    = pv.session_id
    AND se.page_url      = pv.page_url
    AND se.event_type    = 'session_end'
    AND se.scroll_depth  IS NOT NULL
    AND se.advertiser_id = ANY(p_advertiser_ids)
    AND NOT COALESCE(se.is_bot, false)
  WHERE pv.advertiser_id = ANY(p_advertiser_ids)
    AND pv.event_type    = 'pageview'
    AND pv.page_url      IS NOT NULL
    AND pv.created_at   >= p_start
    AND pv.created_at   <  p_end
    AND (p_device_type IS NULL OR pv.device_type = p_device_type)
    AND (cardinality(p_blocked_ips) = 0 OR host(pv.ip_address) != ALL(p_blocked_ips))
    AND NOT COALESCE(pv.is_bot, false)
    AND (p_channel IS NULL OR COALESCE(pv.channel, 'direct') = p_channel)
  GROUP BY pv.page_url
  ORDER BY session_count DESC;
$$;
