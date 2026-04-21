-- ============================================================
-- pg_cron 스케줄 등록
-- 사전 조건: Supabase 대시보드 > Database > Extensions > pg_cron 활성화 후 실행
-- ============================================================

-- 기존 스케줄 있으면 제거 후 재등록
SELECT cron.unschedule('za-close-stale-sessions') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'za-close-stale-sessions'
);

SELECT cron.schedule(
  'za-close-stale-sessions',
  '*/5 * * * *',
  'SELECT za_close_stale_sessions()'
);
