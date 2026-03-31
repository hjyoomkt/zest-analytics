# Changelog

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
