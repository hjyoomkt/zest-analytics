# Changelog

## [4.4.0] 2026-04-02

### SDK v1.3.0 — GA 스타일 세션 추적

#### 변경 배경

기존 `visibilitychange` 방식은 탭 전환만 해도 즉시 `session_end`를 발송하여
실제 체류시간이 0~1초로 기록되는 문제가 있었습니다.
Google Analytics 방식으로 전면 재구현하였습니다.

#### SDK 변경사항

| 항목 | 이전 (v1.2.0) | 이후 (v1.3.0) |
|------|-------------|-------------|
| 탭 전환 | 즉시 `session_end` 전송 | 활성 시간 누적 일시정지 |
| 탭 복귀 | 아무것도 안 함 | 타이머 재시작, 누적 이어감 |
| 30분 무활동 | 없음 | 자동 세션 종료 + 새 세션 준비 |
| 실제 이탈 | session_end 전송 | 동일 (누적시간 기준) |
| 3초 미만 세션 | 전송됨 | 전송 안 함 (노이즈 필터) |
| 상호작용 감지 | 없음 | mousemove / mousedown / keydown / click / scroll / wheel / touchstart / touchmove |

#### 신규 메서드

| 메서드 | 설명 |
|--------|------|
| `_onInteraction()` | 상호작용 감지 → idle 타이머 리셋, idle 복귀 시 activeStartTime 재시작 |
| `_resetIdleTimer()` | 30분 setTimeout 리셋 |
| `_onIdle()` | 30분 무활동 → 세션 종료 전송 + `_resetSession()` |
| `_pauseSession()` | 탭 hidden → 경과시간 누적 후 일시정지 |
| `_resumeSession()` | 탭 visible → activeStartTime 재시작 |
| `_endSession()` | beforeunload → 최종 누적 후 전송 |
| `_sendSessionEnd()` | session_end fetch keepalive 전송 (MIN_SESSION_DURATION 3초 필터) |
| `_resetSession()` | 새 sessionId 발급, 누적값 초기화 |

#### 제거된 메서드

- `_trackDuration()` — 위 메서드들로 대체

#### 신규 인스턴스 변수

| 변수 | 설명 |
|------|------|
| `activeStartTime` | 현재 활성 구간 시작 시각 (null = 일시정지 상태) |
| `accumulatedTime` | 누적 활성 시간 (초) |
| `lastInteractionTime` | 마지막 상호작용 시각 |
| `idleTimer` | 30분 idle setTimeout 참조 |
| `IDLE_TIMEOUT` | 30 * 60 * 1000 (30분) |
| `MIN_SESSION_DURATION` | 3 (초 미만 노이즈 필터) |

---

## [4.3.0] 2026-04-02

### 트래픽 분석 기능 추가 (백엔드)

#### 신규 분석 기능 (4종)

- **시간대별 방문자 추이** — `get_hourly_visitors` RPC: KST 기준 0~23시 고유 방문자 수 (visitor_id 기준)
- **시간대별 페이지뷰 추이** — `get_hourly_pageviews` RPC: KST 기준 0~23시 pageview 이벤트 수
- **페이지별 스크롤 도달률** — `get_page_scroll_stats` RPC: 페이지 URL별 25/50/75/100% 도달 세션 수 및 비율, 평균 도달 깊이
- **유입 경로별 성과** — `get_channel_performance` RPC: 채널별 페이지뷰/고유방문자/평균 체류시간/평균 스크롤 도달률/도달 구간별 비율

#### SDK v1.2.0

- **스크롤 도달률 추적** — scroll 이벤트로 최대 도달 % 실시간 갱신 (`maxScrollDepth`)
- **짧은 페이지 처리** — 스크롤 불필요 페이지 (docHeight ≤ 0) → 100% 자동 처리
- **session_end 확장** — `scroll_depth` (0~100 정수), `channel` 추가 전송
- **visitor_id 추가** — localStorage `za_vid` 키로 브라우저별 고유 방문자 ID 영구 저장, pageview에 포함
- **버그 수정: document.body null 체크** — 스크립트가 `<head>`에서 실행될 때 `_trackScrollDepth()` 에러 발생 → guard 추가
- **버그 수정: 채널 어트리뷰션 윈도우 체크** — `_detectChannel()`이 28일 초과된 `za_params`를 계속 참조하는 문제 → `clicked_at` 기준 만료 체크 후 localStorage 자동 삭제 추가

#### Supabase 변경사항

- **`za_events` 컬럼 추가**
  ```sql
  ALTER TABLE za_events ADD COLUMN IF NOT EXISTS scroll_depth INTEGER;
  ALTER TABLE za_events ADD COLUMN IF NOT EXISTS visitor_id TEXT;
  ```
- **성능 인덱스 추가**
  ```sql
  CREATE INDEX IF NOT EXISTS idx_za_events_advertiser_event_created ON za_events (advertiser_id, event_type, created_at);
  CREATE INDEX IF NOT EXISTS idx_za_events_session_id ON za_events (session_id) WHERE session_id IS NOT NULL;
  ```
- **RPC 함수 4개 추가** — `get_hourly_visitors`, `get_hourly_pageviews`, `get_page_scroll_stats`, `get_channel_performance` (`수퍼베이스_DB_세팅.md` Part 8 참조)
- **`za-collect-event` Edge Function 업데이트** — `scroll_depth`, `visitor_id`, `channel`(session_end) 필드 처리 추가

#### zaService.js 신규 함수

- `getHourlyVisitors(params)` — `get_hourly_visitors` RPC 호출, 0~23시 24개 배열 반환
- `getHourlyPageViews(params)` — `get_hourly_pageviews` RPC 호출
- `getPageScrollStats(params)` — `get_page_scroll_stats` RPC 호출, 도달률 % 계산 포함
- `getChannelPerformance(params)` — `get_channel_performance` RPC 호출

---

## [4.2.0] 2026-04-02

### 제스트 애널리틱스 추적 코드 관리 UI 개선

#### 신규 기능

- **`/clientadmin/default` 추적 코드 발급** — 클라이언트어드민 대시보드에서 직접 제스트 애널리틱스 추적 코드 조회·발급 가능
- **`/superadmin/default` 추적 코드 발급 (브랜드 대행)** — 슈퍼어드민 대시보드에 브랜드 선택 드롭다운 추가, 선택한 브랜드의 추적 코드를 대신 발급 가능
- **브랜드 선택 드롭다운 디자인** — `Menu/MenuButton/MenuList/MenuItem` Horizon UI 스타일 (borderRadius 12px, 선택 항목 brand 컬러 강조)
- **`TrackingCodeManager` 브랜드 선택 내장** — 별도 카드 없이 헤더 영역 우측에 브랜드 선택 + 추적 코드 생성 버튼 나란히 배치
- **추적 코드 항상 표시** — 브랜드 미선택 시에도 `TrackingCodeManager` 렌더링, 선택 유도 안내 문구 표시

#### 설치 가이드 모달 전면 리디자인

- **탭 구조** — 기본 설치 / 구매 / 회원가입 / 리드 / 장바구니 / 커스텀 / UTM 파라미터 7개 탭으로 분리
- **Horizon UI pill 탭** — unstyled variant, secondaryGray 배경 컨테이너, 선택 탭 흰색 배경 + 그림자
- **다크 코드 블록** — macOS 스타일 빨/노/초 점, 복사 버튼(복사 후 2초간 체크 아이콘으로 전환)
- **설명 배지 카드** — 필수/전환/이벤트/설정 배지 + 사용 설명
- **GTM 스타일 주석** — 각 스니펫에 `<!-- Zest Analytics - EventName -->` / `<!-- End Zest Analytics - EventName -->` 추가
- **헤더에 추적 ID 배지 표시**

#### SDK 기능 확장 (`za-sdk.js` v1.1.0)

- **페이지뷰 자동 추적** — `init()` 호출 시 자동으로 `trackPageView()` 실행 (메타 픽셀 방식)
- **유입 채널 감지** — `_detectChannel()`: UTM 파라미터 우선, 없으면 referrer 분석
  - 지원 채널: `direct` / `google` / `google_ads` / `naver` / `naver_ads` / `kakao` / `instagram` / `facebook` / `youtube` / `tiktok` / `twitter` / `bing` / `email` / `referral`
- **신규/재방문 구분** — `_checkVisitorStatus()`: localStorage `za_visitor` 키로 최초 방문 여부 판별
- **체류시간 추적** — `visibilitychange` + `beforeunload` 이벤트로 이탈 감지, `session_end` 이벤트로 `time_on_page`(초) 전송
- **이탈 페이지 기록** — `session_end` 이벤트의 `page_url`로 어느 페이지에서 나갔는지 기록
- **`session_id`** — 세션별 고유 ID로 pageview ↔ session_end 연결
- **전송 방식 변경** — sendBeacon → `fetch keepalive` (CORS preflight 처리 안정성 향상)
- **디바이스 정보 pageview 포함** — `device_type` / `browser` / `os` 페이지뷰 이벤트에도 기록

#### SDK URL 변경

- `https://www.zestdot.com/sdk/za-sdk.js` → `https://analytics.zestdot.com/sdk/za-sdk.js`

#### Supabase 변경사항

- **`za_events` 컬럼 추가**
  ```sql
  ALTER TABLE za_events
    ADD COLUMN IF NOT EXISTS channel TEXT,
    ADD COLUMN IF NOT EXISTS is_new_visitor BOOLEAN,
    ADD COLUMN IF NOT EXISTS session_id TEXT,
    ADD COLUMN IF NOT EXISTS time_on_page INTEGER;
  ```
- **`event_type` 체크 제약조건 갱신** — `session_end` 추가
  ```sql
  ALTER TABLE za_events DROP CONSTRAINT IF EXISTS za_events_event_type_check;
  ALTER TABLE za_events ADD CONSTRAINT za_events_event_type_check
    CHECK (event_type IN ('purchase','signup','lead','add_to_cart','custom','pageview','session_end'));
  ```
- **`za-collect-event` Edge Function 재배포**
  - `serve` → `Deno.serve` 교체 (CORS preflight 처리 수정)
  - JWT 검증 OFF 설정
  - `session_end` 이벤트 타입 지원 추가
  - `channel`, `is_new_visitor`, `session_id`, `time_on_page` 필드 처리 추가

---

## [4.1.0] 2026-03-31

### 사이드바 / 네비게이션 / 프로필 페이지 수정

#### 버그 수정

- **Supabase RLS 무한 재귀 버그 수정** — `users` 테이블 `users_select_accessible_users` 정책의 서브쿼리 `id = (SELECT users_1.id FROM users users_1 WHERE users_1.email = auth.email())`가 무한 재귀를 유발하여 500 오류 발생 → `id = auth.uid()`로 교체
- **사이드바 레이아웃 겹침 수정** — `AdminIconSidebar`(70px, left:0)와 `Sidebar`(300px, left:0)가 겹쳐 사이드바가 가려지던 문제 수정 → `Sidebar`에 `left` prop 추가, superadmin/clientadmin 레이아웃에서 `left="70px"` 적용 (총 사이드바 폭 370px)
- **`meta_conversion_type` 컬럼 오류 수정** — `advertisers` 테이블에 존재하지 않는 컬럼 쿼리로 인한 오류 → `superadmin/advertisers/index.jsx` SELECT 및 `EditBrandModal.jsx`에서 관련 코드 전면 제거

#### 기능 개선

- **NavbarLinksAdmin 실제 유저 연동** — 하드코딩된 "Adela Parkson" 대신 `AuthContext`의 `user`, `userName`, `role`로 교체, 실제 로그아웃 기능(`signOut()` + `/auth/sign-in` 리디렉트) 구현
- **NavbarAdmin `navbarLeft` prop 추가** — superadmin/clientadmin 레이아웃에서 370px 오프셋 적용 지원
- **`/admin/profile` 페이지 전면 개편** — `AuthContext` 완전 연동 (실제 이름, 역할, 담당 브랜드 수 표시), 다음 신규 컴포넌트 추가:
  - `BrandsList.js` — 접근 가능 브랜드 목록 카드, 클릭 시 `BrandDetailModal`로 상세 조회
  - `APIStatus.js` — 광고 플랫폼별 API 연동 상태 테이블 (서비스 개발중 오버레이)
  - `ProfileEditModal.js` — 역할별 계정/브랜드/에이전시 삭제 분기 처리
  - `DeleteAccountConfirmModal.js` — "회원탈퇴" 텍스트 입력 확인 후 `deleteUserAccount()` 호출
  - `OwnershipTransferModal.js` — 소유권 이전 대상 선택 (라디오)
  - `DeleteAgencyWithEmailModal.jsx` — 텍스트 확인 → 이메일 6자리 PIN 인증 2단계 삭제 플로우
  - `Banner.js` 수정 — 프로필 편집 버튼, 담당 브랜드 수 / 권한 레벨 통계 표시
  - `Upload.js` 수정 — "서비스 개발중" 오버레이 추가

## [4.0.0] 2026-03-31

### 어드민 시스템 이식 (ads-library → growth-analytics)

- 슈퍼어드민 패널 (`/superadmin`): 유저 권한 관리, 광고주·브랜드·에이전시 CRUD
- 클라이언트어드민 패널 (`/clientadmin`): 팀 대시보드, 브랜드 목록
- `AdminIconSidebar` (70px 고정 아이콘 사이드바) — 기존 290px Sidebar 대체
- 역할 기반 자동 리디렉트 (`RoleBasedRedirect`): master/agency → `/superadmin`, advertiser → `/clientadmin`
- 공통 유저 관리 컴포넌트: `UserTable`, `InviteUserModal`, `EditUserModal`, `AdminDeleteUserModal`
- 다중 역할 RBAC: `master` / `agency_admin` / `agency_manager` / `advertiser_admin` / `advertiser_staff` / `viewer`
- 추가 DB 마이그레이션 불필요 (기존 Supabase 스키마 완비 확인)

## [3.1.0] 2026-03-31

### Zest Analytics — 전용 Supabase 프로젝트 분리

- growth-analytics 전용 Supabase 프로젝트 생성 (`qdzdyoqtzkfpcogecyar.supabase.co`)
- `.env` 및 `sdk/index.js` Supabase URL 교체
- 인증/Zest Analytics 테이블, RLS, 함수, 트리거, Edge Function 전체 배포

## [3.0.1] 2026-03-30

### 인증 시스템 이식 (ads-library → growth-analytics)

- 로그인 / 회원가입(초대 코드) / 비밀번호 찾기·재설정 페이지
- `AuthContext` 다중 역할 인증 상태 관리
- Zest Analytics 전환 추적 모듈 이식 (growth-dashboard → growth-analytics)

## [3.0.0] 2025-13-01

### Upgraded to React 19 ⚡️

## [2.0.0] 2024-07-22

### Vulnerabilities removed

- Most vulnerabilities removed, besides those cause by `react-scripts`. We kept this depedency due to the fact that there are
  many users who still use it, and there is already a Next.js version for thos who want to migrate from `react-scripts`.
- Updated to React 18.
- Updated react-table to Tanstack V8.

## [1.3.0] 2023-05-06

🐛 Bugs solved:

- Sidebar content design bug solved

## [1.2.1] 2022-11-01

🚀 Feature:
-Added TimelineRow

## [1.2.0] 2022-08-23

🚀 HyperTheme Editor

- With the help of the guys from Hyperting, we added HyperTheme Editor. You can check the docs [here](https://www.hyperthe.me/documentation/getting-started/community)!

## [1.1.0] 2022-06-08

🐛 Bugs solved:

- Calendar card - Card border bug on dark mode
- Development Table - Missing content bug
- Solved the warnings regarding stylis-plugin-rtl
- Fixed console warnings

## [1.0.1] 2022-04-25

### Multiple design bugs on mobile solved

- Default - "Daily traffic" card - text align problem on mobile - solved.
- Navbar - Icons - align problem with all icons on mobile - solved.
- Profile - "Your storage" card - "More" icon align problem on mobile - solved.
- Profile - "Complete your profile" card - text align problem on mobile - solved.

## [1.0.0] 2022-04-18

### Original Release

- Added Chakra UI as base framework
