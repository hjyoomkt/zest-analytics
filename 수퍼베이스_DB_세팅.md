# Supabase DB 세팅 작업 로그

> 작업일: 2026-03-31
> 대상 프로젝트: `growth-analytics` (`qdzdyoqtzkfpcogecyar.supabase.co`)
> 참고 출처: `ads-library` 마이그레이션 파일, `growth-dashboard` 마이그레이션 파일

---

## 개요

`growth-analytics` Supabase 프로젝트에 인증 시스템 및 Zest Analytics 추적 시스템에 필요한
DB 테이블, RLS 정책, 함수, 트리거를 설정하였습니다.

작업 전 `ads-library` 및 `growth-dashboard` Supabase의 실제 현황을 SQL로 직접 확인한 후,
실제 운영 중인 스키마를 기준으로 생성하였습니다.

---

## Part 1 — 인증 시스템 (ads-library 기반)

### 생성된 테이블

| 테이블 | 설명 |
|--------|------|
| `organizations` | 조직 (대행사/광고주 구분) |
| `advertisers` | 광고주/브랜드 |
| `users` | 사용자 (auth.users와 별도 관리) |
| `invitation_codes` | 초대 코드 |

### users 테이블 role 종류

| role | 설명 |
|------|------|
| `master` | 전체 관리자 |
| `agency_admin` | 대행사 관리자 |
| `agency_manager` | 대행사 매니저 |
| `advertiser_admin` | 광고주 관리자 |
| `advertiser_staff` | 광고주 스태프 |
| `viewer` | 뷰어 |

### 생성된 함수

| 함수 | 설명 |
|------|------|
| `get_user_advertiser_ids(email)` | 이메일 기반 접근 가능 광고주 ID 목록 반환 |
| `get_user_advertiser_ids_by_uid(uuid)` | UUID 기반 접근 가능 광고주 ID 목록 반환 |
| `can_update_user(target_uuid)` | 역할 계층 기반 사용자 수정 권한 체크 |

### 생성된 RLS 정책

| 테이블 | 정책 수 | 주요 내용 |
|--------|---------|----------|
| `organizations` | 4개 | INSERT/SELECT/UPDATE/DELETE |
| `advertisers` | 5개 | INSERT/SELECT/UPDATE/DELETE |
| `users` | 4개 | INSERT/SELECT(접근 가능 범위)/UPDATE(권한 기반)/DELETE |
| `invitation_codes` | 4개 | 익명 유효 초대코드 조회, 인증 사용자 관리 |

### ads-library와의 차이점

`ads-library`는 `user_advertisers` 중간 테이블(다:다 관계)을 사용했으나,
`growth-analytics`는 `users.advertiser_id` 직접 참조 방식(1:1)을 사용합니다.
RLS 정책 SQL이 이에 맞게 작성되었습니다.

---

## Part 2 — Zest Analytics 추적 시스템 (growth-dashboard 기반)

### 생성된 테이블

| 테이블 | 설명 |
|--------|------|
| `za_tracking_codes` | 광고주별 추적 코드 관리 (ZA-XXXXXXXX 형식) |
| `za_events` | 전환 이벤트 저장 (구매/회원가입/리드 등) |

### za_events 지원 event_type

`purchase` / `signup` / `lead` / `add_to_cart` / `custom` / `pageview`

### 어트리뷰션 윈도우

클릭 후 1일 / 7일 / 28일 기준 라스트 클릭 어트리뷰션

### 생성된 함수 및 트리거

| 이름 | 종류 | 설명 |
|------|------|------|
| `generate_za_tracking_id()` | 함수 | ZA-XXXXXXXX 형식 고유 ID 생성 |
| `update_za_tracking_code_stats()` | 트리거 함수 | 이벤트 INSERT 시 추적 코드 통계 자동 업데이트 |
| `update_za_updated_at()` | 트리거 함수 | za_tracking_codes UPDATE 시 updated_at 자동 갱신 |
| `trigger_update_za_stats` | 트리거 | za_events AFTER INSERT |
| `trigger_za_tracking_codes_updated_at` | 트리거 | za_tracking_codes BEFORE UPDATE |

### 생성된 뷰

| 뷰 | 설명 |
|----|------|
| `za_attribution_stats` | 어트리뷰션 윈도우별 전환 통계 (읽기 전용) |

### 생성된 RLS 정책

| 테이블 | 정책명 | 대상 |
|--------|--------|------|
| `za_tracking_codes` | Master can manage all tracking codes | master 역할 전체 관리 |
| `za_tracking_codes` | Agency can manage organization tracking codes | agency_admin/manager 소속 조직 관리 |
| `za_tracking_codes` | Advertiser can manage own tracking codes | 자신의 advertiser_id 기준 관리 |
| `za_events` | Allow public event insertion | 익명/인증 모두 INSERT 가능 (SDK용) |
| `za_events` | Master can view all events | master 전체 조회 |
| `za_events` | Agency can view organization events | agency 소속 조직 조회 |
| `za_events` | Advertiser can view own events | 자신의 advertiser_id 기준 조회 |

### growth-dashboard와의 차이점

growth-dashboard의 `Advertiser` 정책은 `user_advertisers` 테이블 JOIN을 사용하지만,
growth-analytics는 `users.advertiser_id` 직접 참조로 대체하여 적용하였습니다.

---

## Part 3 — Edge Function

| 함수명 | 설명 | 배포 방법 |
|--------|------|----------|
| `za-collect-event` | 광고주 SDK에서 이벤트 수집 | Supabase 대시보드 Edge Functions에서 직접 배포 |

출처: `growth-dashboard/supabase/functions/za-collect-event/index.ts`

> `send-password-reset-email` Edge Function은 비밀번호 찾기 기능에 필요하며 아직 미배포 상태입니다.
> 배포 시 `RESEND_API_KEY` 환경변수 설정 필요 (Supabase 대시보드 → Edge Functions → Secrets).

---

## 최종 DB 현황 요약

| 분류 | 테이블/객체 | 상태 |
|------|------------|------|
| 인증 | organizations, advertisers, users, invitation_codes | ✅ |
| 인증 RLS 함수 | get_user_advertiser_ids, get_user_advertiser_ids_by_uid, can_update_user | ✅ |
| Zest Analytics | za_tracking_codes, za_events | ✅ |
| Zest Analytics 함수 | generate_za_tracking_id, update_za_tracking_code_stats, update_za_updated_at | ✅ |
| Zest Analytics 트리거 | trigger_update_za_stats, trigger_za_tracking_codes_updated_at | ✅ |
| Zest Analytics 뷰 | za_attribution_stats | ✅ |
| Edge Function | za-collect-event | ✅ 배포 완료 |
| Edge Function | send-password-reset-email | ⏳ 미배포 |
