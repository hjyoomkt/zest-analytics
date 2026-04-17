-- ============================================================
-- user_agent 컬럼 마이그레이션
-- za_events 테이블에 user_agent 저장 컬럼 추가
-- Edge Function 재배포 전에 먼저 실행
-- ============================================================

-- STEP 1. user_agent 컬럼 추가
ALTER TABLE za_events
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- STEP 2. 확인
SELECT
  count(*)                                     AS total_rows,
  count(user_agent)                            AS rows_with_ua,
  count(*) FILTER (WHERE user_agent IS NULL)   AS rows_without_ua
FROM za_events;
