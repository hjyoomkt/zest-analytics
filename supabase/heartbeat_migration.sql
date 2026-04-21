-- ============================================================
-- za_session_heartbeats 테이블 생성
-- session_id 기준 upsert, 한 세션당 항상 1개 행 유지
-- session_end 정상 수신 시 삭제, 30분 후 cron이 session_end 생성
-- ============================================================

CREATE TABLE IF NOT EXISTS za_session_heartbeats (
  session_id        TEXT        PRIMARY KEY,
  tracking_id       TEXT        NOT NULL,
  advertiser_id     UUID        NOT NULL,
  visitor_id        TEXT,
  page_url          TEXT,
  time_on_page      INTEGER     DEFAULT 0,
  scroll_depth      INTEGER     DEFAULT 0,
  scroll_buckets    JSONB       DEFAULT '[0,0,0,0,0,0,0,0,0,0]'::jsonb,
  channel           TEXT,
  device_type       TEXT,
  utm_source        TEXT,
  utm_medium        TEXT,
  utm_campaign      TEXT,
  utm_term          TEXT,
  utm_content       TEXT,
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_za_session_heartbeats_last
  ON za_session_heartbeats (last_heartbeat_at);

CREATE INDEX IF NOT EXISTS idx_za_session_heartbeats_tracking
  ON za_session_heartbeats (tracking_id);

-- ============================================================
-- stale 세션 자동 종료 함수
-- last_heartbeat_at 기준 30분 초과 → session_end INSERT 후 삭제
-- ============================================================

CREATE OR REPLACE FUNCTION za_close_stale_sessions()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  closed_count integer;
BEGIN
  -- stale heartbeat → za_events에 session_end 삽입
  INSERT INTO za_events (
    tracking_id,
    advertiser_id,
    event_type,
    session_id,
    visitor_id,
    time_on_page,
    scroll_depth,
    scroll_buckets,
    page_url,
    channel,
    device_type,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content
  )
  SELECT
    hb.tracking_id,
    hb.advertiser_id,
    'session_end',
    hb.session_id,
    hb.visitor_id,
    hb.time_on_page,
    hb.scroll_depth,
    hb.scroll_buckets,
    hb.page_url,
    hb.channel,
    hb.device_type,
    hb.utm_source,
    hb.utm_medium,
    hb.utm_campaign,
    hb.utm_term,
    hb.utm_content
  FROM za_session_heartbeats hb
  WHERE hb.last_heartbeat_at < NOW() - INTERVAL '30 minutes'
    AND hb.time_on_page >= 3;  -- MIN_SESSION_DURATION 3초 필터

  GET DIAGNOSTICS closed_count = ROW_COUNT;

  -- 처리된 heartbeat 삭제
  DELETE FROM za_session_heartbeats
  WHERE last_heartbeat_at < NOW() - INTERVAL '30 minutes';

  RETURN closed_count;
END;
$$;

-- ============================================================
-- pg_cron 스케줄 등록은 heartbeat_cron.sql 파일 참고
-- 사전 조건: Supabase 대시보드 > Database > Extensions > pg_cron 활성화 필요
-- ============================================================
