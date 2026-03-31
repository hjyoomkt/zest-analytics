# Growth Analytics - 프로젝트 파일 구조

> Google Analytics, 유저 히트맵 등의 분석 기능 구축을 위한 React 기반 어드민 대시보드
> Horizon UI 템플릿 + Chakra UI 기반

---

## 루트 설정 파일

| 파일 | 용도 |
|------|------|
| `package.json` | 의존성, 스크립트 (start/build/test/deploy), ESLint 설정 |
| `jsconfig.json` | 경로 별칭 설정 (`baseUrl: "src"`) |
| `prettier.config.js` | 코드 포맷 규칙 |
| `.env` | 환경 변수 |
| `.gitignore` | Git 제외 패턴 |
| `.vscode/settings.json` | VS Code 워크스페이스 설정 |

---

## public/

```
public/
├── favicon.ico          브라우저 탭 아이콘
├── index.html           HTML 진입점
├── manifest.json        PWA 매니페스트
└── robots.txt           검색 엔진 크롤러 규칙
```

---

## src/

### 진입점 및 앱 설정

```
src/
├── index.js                 React DOM 렌더, BrowserRouter 설정
├── App.js                   메인 앱 컴포넌트 (HelmetProvider > ChakraProvider > AuthProvider > DateRangeProvider > Routes)
│                            4개 레이아웃: AuthLayout / AdminLayout / SuperAdminLayout / ClientAdminLayout
│                            RoleBasedRedirect: master/agency → /superadmin, advertiser → /clientadmin
├── routes.js                메인 라우트 정의 (Auth, Admin 진입점 + SuperAdmin/ClientAdmin 사이드바 아이콘)
├── superadminRoutes.js      SuperAdmin 하위 라우트 (default, advertisers, brands, users)
└── clientAdminRoutes.js     ClientAdmin 하위 라우트 (default, users, brands)
```

### 레이아웃 `src/layouts/`

```
src/layouts/
├── admin/index.js           어드민 레이아웃 (AdminIconSidebar 70px + auth guard → 미인증 시 /auth/sign-in 리디렉트)
├── auth/index.js            인증 레이아웃 라우트 핸들러
├── auth/Default.js          인증 페이지 레이아웃 템플릿
├── superadmin/index.js      슈퍼어드민 레이아웃 (master/agency_admin/agency_manager 접근, AdminIconSidebar 70px + Sidebar left:70px, Navbar left:370px)
└── clientadmin/index.js     클라이언트어드민 레이아웃 (advertiser_admin/advertiser_staff/viewer/agency_manager 접근, 동일 사이드바 구조)
```

### 컴포넌트 `src/components/`

```
src/components/
├── HelmetProvider.js                페이지별 SEO 메타태그 관리 (PageHelmet)
├── calendar/MiniCalendar.js         캘린더 위젯
├── card/
│   ├── Card.js                      범용 카드 래퍼
│   ├── Mastercard.js                카드 결제 UI
│   ├── Member.js                    팀 멤버 카드
│   ├── MiniStatistics.js            소형 통계 카드
│   └── NFT.js                       NFT 표시 카드
├── charts/
│   ├── BarChart.js                  막대 차트 (ApexCharts)
│   ├── LineAreaChart.js             라인/에어리어 차트
│   ├── LineChart.js                 라인 차트
│   └── PieChart.js                  파이 차트
├── dataDispaly/TimelineRow.js       타임라인 이벤트 표시
├── fields/
│   ├── InputField.js                커스텀 입력 필드
│   └── SwitchField.js               토글 스위치
├── fixedPlugin/FixedPlugin.js       플로팅 플러그인 패널
├── footer/
│   ├── FooterAdmin.js               어드민 섹션 푸터
│   └── FooterAuth.js                인증 페이지 푸터
├── icons/
│   ├── IconBox.js                   아이콘 컨테이너
│   └── Icons.js                     커스텀 아이콘 정의
├── menu/
│   ├── ItemContent.js               메뉴 아이템 내용
│   ├── MainMenu.js                  메인 네비게이션 메뉴
│   └── TransparentMenu.js           투명 메뉴 변형
├── navbar/
│   ├── NavbarAdmin.js               어드민 상단 내비게이션 (navbarLeft prop으로 오프셋 조정)
│   ├── NavbarAuth.js                인증 페이지 내비게이션
│   ├── NavbarLinksAdmin.js          어드민 내비게이션 링크/드롭다운 (AuthContext 연동, 실제 유저명·역할 표시, 로그아웃)
│   └── searchBar/SearchBar.js       검색 바
├── scroll/ScrollToTop.js            스크롤 상단 이동 유틸리티
├── scrollbar/Scrollbar.js           커스텀 스크롤바
├── separator/Separator.jsx          구분선 컴포넌트
└── sidebar/
    ├── AdminIconSidebar.js          70px 고정 아이콘 사이드바 (모든 레이아웃에서 left:0 고정, 역할 기반 메뉴 필터링)
    ├── Sidebar.js                   전체 사이드바 (left prop 지원 — superadmin/clientadmin에서 left="70px" 적용, 총 370px)
    └── components/
        ├── Brand.js                 로고/브랜드 섹션
        ├── Content.js               사이드바 메뉴 내용
        ├── Links.js                 내비게이션 링크
        └── SidebarCard.js           사이드바 내 프로모션 카드
```

### 컨텍스트 `src/contexts/`

```
src/contexts/
├── AuthContext.js       인증 상태 전역 관리 (useAuth 훅 제공)
├── DateRangeContext.js  날짜 범위 전역 관리 (useDateRange 훅 제공)
└── SidebarContext.js    사이드바 상태 관리 React Context
```

### Supabase 설정 `src/config/`

```
src/config/
└── supabase.js          Supabase 클라이언트 초기화 (qdzdyoqtzkfpcogecyar.supabase.co)
```

### 서비스 `src/services/`

```
src/services/
└── supabaseService.js   Supabase 데이터/함수 호출 통합 서비스
                         ── 광고/검색 ──
                         - getAds() / getAdById() / deleteAd()
                         - getSearchHistory() / saveSearchHistory()
                         - getJobs()
                         ── 어드민 유저 관리 ──
                         - getUsers(currentUser)          유저 목록 (역할 기반 필터)
                         - getUserStats(currentUser)       유저 통계 (총/관리자/활성)
                         - updateUserRole(userId, role)
                         - updateUserStatus(userId, status)
                         - updateUserRoleAndAdvertisers()  역할+브랜드 일괄 변경
                         - deleteUserAccount()             → delete-user Edge Function
                         - getBrandUsersForTransfer()      소유권 이전 대상 조회
                         ── 브랜드/에이전시 관리 ──
                         - deleteBrand(brandId)
                         - deleteAgency(organizationId)   → send-agency-deletion-email
                         ── 초대 ──
                         - createInviteCode()              → send-invite-email
                         - sendInviteEmail()
                         ── 에이전시 삭제 인증 ──
                         - sendAgencyDeletionEmail()       → send-agency-deletion-email
                         - verifyAgencyDeletionCode()
                         ── 감사 로그 ──
                         - logChangelog()
```

### 테마 `src/theme/`

```
src/theme/
├── theme.js                         메인 테마 객체 (색상, 폰트, 간격)
├── styles.js                        글로벌 CSS 스타일
├── components/
│   ├── badge.js / button.js         컴포넌트별 테마 오버라이드
│   ├── input.js / link.js
│   ├── progress.js / slider.js
│   ├── switch.js / textarea.js
├── additions/card/card.js           카드 컴포넌트 커스텀 스타일
└── foundations/breakpoints.js       반응형 브레이크포인트
```

### 변수/설정 `src/variables/`

```
src/variables/
└── charts.js            차트 설정 및 데이터 프리셋
```

### 뷰 (페이지) `src/views/`

```
src/views/
├── superadmin/                          슈퍼어드민 패널 (master/agency 역할)
│   ├── default/index.jsx                대시보드 (총 유저·관리자·활성 유저 통계)
│   ├── users/index.jsx                  권한 관리 (UserTable + InviteUserModal)
│   └── advertisers/                     광고주·브랜드 관리
│       ├── index.jsx                    조직별 트리 뷰 + 모달 상태 관리
│       └── components/
│           ├── AdvertisersTree.jsx      조직 → 브랜드 접이식 트리
│           ├── AddBrandModal.jsx        브랜드 추가
│           ├── EditBrandModal.jsx       브랜드 수정
│           ├── DeleteBrandModal.jsx     브랜드 삭제 (텍스트 확인)
│           ├── DeleteAgencyModal.jsx    에이전시 삭제 (텍스트 확인)
│           └── InviteAgencyModal.jsx    신규 에이전시 초대
│
├── clientadmin/                         클라이언트어드민 패널 (advertiser 역할)
│   ├── default/index.jsx                대시보드 (팀 통계)
│   └── brands/                          브랜드 목록
│       ├── index.jsx                    접근 가능 브랜드 카드 그리드
│       └── components/
│           └── BrandCard.jsx            브랜드 정보 카드
│
├── admin/
│   ├── default/                         메인 대시보드 페이지
│   │   ├── index.jsx
│   │   ├── components/
│   │   │   ├── CheckTable.js / ComplexTable.js / DailyTraffic.js
│   │   │   ├── PieCard.js / Tasks.js / TotalSpent.js
│   │   │   ├── UserActivity.js / WeeklyRevenue.js
│   │   └── variables/
│   │       ├── columnsData.js / tableDataCheck.json / tableDataComplex.json
│   │
│   ├── users/                           공통 유저 관리 (admin/superadmin 공유)
│   │   ├── index.jsx                    페이지 (UserTable + InviteUserModal)
│   │   └── components/
│   │       ├── UserTable.js             React Table (역할 배지, 상태 토글, 액션 메뉴)
│   │       ├── InviteUserModal.jsx      초대 코드 생성 + 클립보드 복사
│   │       ├── EditUserModal.jsx        역할·브랜드 변경 (계층 검증)
│   │       ├── AdminDeleteUserModal.js  소유권 이전 + 계정 삭제
│   │       └── BrandListModal.jsx       유저의 브랜드 목록 팝업
│   │
│   ├── marketplace/                     NFT 마켓플레이스 페이지
│   │   ├── index.jsx
│   │   └── components/
│   │       ├── Banner.js / HistoryItem.js / TableTopCreators.js
│   │   └── variables/
│   │       ├── tableColumnsTopCreators.js / tableDataTopCreators.json
│   │
│   ├── profile/                         유저 프로필 페이지 (AuthContext 완전 연동)
│   │   ├── index.jsx                    실제 유저명·역할·담당 브랜드 수 표시
│   │   └── components/
│   │       ├── Banner.js                프로필 배너 (편집 버튼, 담당 브랜드 수·권한 레벨 통계)
│   │       ├── BrandsList.js            접근 가능 브랜드 목록 카드 (BrandDetailModal 연결)
│   │       ├── APIStatus.js             광고 플랫폼 API 연동 상태 테이블 (서비스 개발중 오버레이)
│   │       ├── Notifications.js         게시판 알림 목록 (allNotifications 연동)
│   │       ├── Upload.js                파일 업로드 영역 (서비스 개발중 오버레이)
│   │       ├── ProfileEditModal.js      역할별 삭제 분기 (계정/브랜드/에이전시)
│   │       ├── DeleteAccountConfirmModal.js  "회원탈퇴" 텍스트 확인 후 deleteUserAccount()
│   │       ├── OwnershipTransferModal.js     소유권 이전 대상 선택 (라디오)
│   │       └── DeleteAgencyWithEmailModal.jsx 텍스트 확인 → 이메일 PIN 6자리 2단계 삭제
│   │
│   ├── dataTables/                      데이터 테이블 데모 페이지
│   │   ├── index.jsx
│   │   ├── components/
│   │   │   ├── CheckTable.js / ColumnsTable.js
│   │   │   ├── ComplexTable.js / DevelopmentTable.js
│   │   └── variables/
│   │       ├── columnsData.js / tableData*.json (4개)
│   │
│   └── zestAnalytics/                   Zest Analytics 전환 추적 분석 페이지
│       ├── ZestAnalytics.jsx            메인 페이지 (대시보드 / 추적코드 관리 탭)
│       ├── index.js                     모듈 진입점
│       ├── components/
│       │   ├── EventStatistics.jsx      이벤트 KPI 카드 + 어트리뷰션 요약
│       │   ├── AttributionAnalysis.jsx  어트리뷰션 윈도우별 분석 (1일/7일/28일)
│       │   ├── CampaignPerformance.jsx  캠페인별 성과 테이블
│       │   └── TrackingCodeManager.jsx  추적 코드 생성/재생성/삭제/설치 가이드
│       ├── services/
│       │   └── zaService.js             Supabase API 호출 (za_tracking_codes, za_events)
│       └── sdk/
│           ├── index.js                 광고주 웹사이트용 JS SDK (IIFE, window.zestAnalytics)
│           └── build.js                 SDK를 public/sdk/za-sdk.js로 복사하는 빌드 스크립트
│
└── auth/
    ├── signIn/index.jsx             로그인 페이지
    ├── signUp/                      회원가입 페이지
    │   ├── index.jsx                회원가입 메인 (초대/셀프 모드 분기)
    │   └── components/
    │       ├── InviteSignUpForm.jsx  초대 코드 방식 가입 폼
    │       └── SelfSignUpForm.jsx    셀프 가입 폼 (Phase 2 예정)
    ├── forgotPassword/index.jsx     비밀번호 찾기
    └── resetPassword/index.jsx      비밀번호 재설정
```

### 유틸리티 `src/utils/`

```
src/utils/
└── dateUtils.js         KST(UTC+9) 기준 날짜 계산 유틸 (getKSTNow/Yesterday/DaysAgo/Today, formatDateToYYYYMMDD)
```

---

### 에셋 `src/assets/`

```
src/assets/
├── css/
│   ├── App.css                  메인 앱 스타일
│   ├── Contact.css              연락처 폼 스타일
│   └── MiniCalendar.css         캘린더 위젯 스타일
│
└── img/
    ├── Announcement.png / AnnouncementWinter.png
    ├── auth/auth.png, banner.png, lemon.jpg
    ├── avatars/avatar1~10.png, avatarSimmmple.png
    ├── dashboards/Debit.png, balanceImg.png, fakeGraph.png, usa.png, ...
    ├── layout/Navbar.png, logoWhite.png
    ├── nfts/Nft1~6.png, NftBanner1.png
    └── profile/Project1~3.png
```

---

## 주요 기술 스택

| 분류 | 라이브러리 | 버전 |
|------|-----------|------|
| UI 프레임워크 | React | 19.0.0 |
| 컴포넌트 라이브러리 | Chakra UI | 2.6.1 |
| 차트 | ApexCharts + react-apexcharts | 3.50.0 / 1.4.1 |
| 라우팅 | react-router-dom | 6.25.1 |
| 테이블 | @tanstack/react-table | 8.19.3 |
| 애니메이션 | framer-motion | 11.3.7 |
| 파일 업로드 | react-dropzone | 14.2.3 |
| 스타일 | @emotion/react + styled | 11.12.0 |
| 인증/DB | @supabase/supabase-js | 2.100.1 |
| SEO | react-helmet-async | 3.0.0 |

---

## 어드민 역할 구조

| role | 접근 레이아웃 | 설명 |
|------|-------------|------|
| `master` | `/superadmin` | 전체 관리자 |
| `agency_admin` | `/superadmin` | 대행사 관리자 |
| `agency_manager` | `/superadmin` → `/clientadmin` | 대행사 매니저 |
| `advertiser_admin` | `/clientadmin` | 광고주 관리자 |
| `advertiser_staff` | `/clientadmin` | 광고주 스태프 |
| `viewer` | `/clientadmin` | 뷰어 |

---

## 향후 추가 예정 기능

새로운 분석 기능 추가 시 예상 작업 위치:

- **새 페이지 추가**: `src/views/admin/` 하위에 디렉토리 생성
- **새 라우트 등록**: `src/routes.js`
- **새 차트 컴포넌트**: `src/components/charts/`
- **데이터 연동 로직**: `src/services/supabaseService.js` 또는 별도 서비스
- **API 환경 변수**: `.env`
- **사이드바 메뉴 추가**: `src/components/sidebar/AdminIconSidebar.js` (routes.js의 showInSidebar 플래그)

---

## 작업 이력

| 날짜 | 작업 내용 | 참고 문서 |
|------|----------|----------|
| 2026-03-30 | `ads-library`에서 로그인/회원가입/비밀번호 관련 인증 시스템 이식 | `로그인_기능_이식.md` |
| 2026-03-30 | `growth-dashboard`에서 Zest Analytics 모듈 이식 | - |
| 2026-03-31 | Supabase DB 세팅 — 인증/Zest Analytics 테이블, RLS, 함수, 트리거, Edge Function 배포 | `수퍼베이스_DB_세팅.md` |
| 2026-03-31 | growth-analytics 전용 Supabase 프로젝트 분리 — `.env` 및 `sdk/index.js` URL 교체 (`qdzdyoqtzkfpcogecyar`) | - |
| 2026-03-31 | `ads-library`에서 어드민 시스템 전체 이식 — 슈퍼어드민/클라이언트어드민 패널, 유저·브랜드·에이전시 관리 | `어드민_시스템_이식.md` |
| 2026-03-31 | RLS 무한재귀 버그 수정, 사이드바 겹침 수정, 네비게이션 실유저 연동, `/admin/profile` 페이지 전면 개편 | `수퍼베이스_DB_세팅.md` |

### 어드민 시스템 이식 상세 (2026-03-31)

**출처**: `ads-library` 프로젝트

**이식된 파일 목록**

| 파일 | 설명 |
|------|------|
| `src/superadminRoutes.js` | 슈퍼어드민 라우트 정의 |
| `src/clientAdminRoutes.js` | 클라이언트어드민 라우트 정의 |
| `src/layouts/superadmin/index.js` | 슈퍼어드민 레이아웃 |
| `src/layouts/clientadmin/index.js` | 클라이언트어드민 레이아웃 |
| `src/components/sidebar/AdminIconSidebar.js` | 70px 아이콘 사이드바 |
| `src/services/supabaseService.js` | 어드민 전용 Supabase 서비스 (유저/브랜드/에이전시/초대/삭제) |
| `src/views/superadmin/default/index.jsx` | 슈퍼어드민 대시보드 |
| `src/views/superadmin/users/index.jsx` | 권한 관리 페이지 |
| `src/views/superadmin/advertisers/index.jsx` | 광고주·브랜드 관리 |
| `src/views/superadmin/advertisers/components/AdvertisersTree.jsx` | 조직 트리 |
| `src/views/superadmin/advertisers/components/AddBrandModal.jsx` | 브랜드 추가 모달 |
| `src/views/superadmin/advertisers/components/EditBrandModal.jsx` | 브랜드 수정 모달 |
| `src/views/superadmin/advertisers/components/DeleteBrandModal.jsx` | 브랜드 삭제 모달 |
| `src/views/superadmin/advertisers/components/DeleteAgencyModal.jsx` | 에이전시 삭제 모달 |
| `src/views/superadmin/advertisers/components/InviteAgencyModal.jsx` | 에이전시 초대 모달 |
| `src/views/clientadmin/default/index.jsx` | 클라이언트어드민 대시보드 |
| `src/views/clientadmin/brands/index.jsx` | 브랜드 목록 페이지 |
| `src/views/clientadmin/brands/components/BrandCard.jsx` | 브랜드 카드 컴포넌트 |
| `src/views/admin/users/index.jsx` | 유저 관리 페이지 |
| `src/views/admin/users/components/UserTable.js` | 유저 테이블 |
| `src/views/admin/users/components/InviteUserModal.jsx` | 초대 모달 |
| `src/views/admin/users/components/EditUserModal.jsx` | 유저 수정 모달 |
| `src/views/admin/users/components/AdminDeleteUserModal.js` | 유저 삭제 모달 |
| `src/views/admin/users/components/BrandListModal.jsx` | 브랜드 목록 팝업 |

**수정된 파일**

- `src/App.js` — `SuperAdminLayout`, `ClientAdminLayout` 추가, `RoleBasedRedirect` 컴포넌트 추가
- `src/routes.js` — 슈퍼어드민/클라이언트어드민 아이콘 항목 추가 (`showInSidebar`, `requiresPermission`)
- `src/layouts/admin/index.js` — `Sidebar` → `AdminIconSidebar` 교체, auth guard 추가

**Supabase DB 영향**

- 기존 테이블 모두 그대로 사용 (추가 마이그레이션 불필요)
- Edge Function `delete-user` 배포 필요 (유저 삭제 기능 사용 시)

### Zest Analytics 이식 상세 (2026-03-30)

**출처**: `growth-dashboard/src/modules/zest-analytics/`

**이식된 파일 목록**

| 파일 | 설명 |
|------|------|
| `src/utils/dateUtils.js` | KST 날짜 유틸리티 (DateRangeContext 의존) |
| `src/contexts/DateRangeContext.js` | 날짜 범위 전역 상태 (useDateRange 훅) |
| `src/views/admin/zestAnalytics/ZestAnalytics.jsx` | 메인 페이지 |
| `src/views/admin/zestAnalytics/index.js` | 모듈 진입점 |
| `src/views/admin/zestAnalytics/services/zaService.js` | Supabase API 서비스 |
| `src/views/admin/zestAnalytics/components/EventStatistics.jsx` | KPI 카드 |
| `src/views/admin/zestAnalytics/components/AttributionAnalysis.jsx` | 어트리뷰션 분석 |
| `src/views/admin/zestAnalytics/components/CampaignPerformance.jsx` | 캠페인 성과 테이블 |
| `src/views/admin/zestAnalytics/components/TrackingCodeManager.jsx` | 추적 코드 관리 |
| `src/views/admin/zestAnalytics/sdk/index.js` | 광고주용 JS SDK |
| `src/views/admin/zestAnalytics/sdk/build.js` | SDK 빌드 스크립트 |

**수정된 파일**

- `src/App.js` — `DateRangeProvider` 감싸기 추가
- `src/routes.js` — `/admin/zest-analytics` 라우트 추가 (사이드바 노출)
- `.env` — Supabase URL/ANON_KEY 설정

**연결 Supabase 테이블**

- `za_tracking_codes` — 추적 코드 생성/관리
- `za_events` — 전환 이벤트 데이터 조회
- RPC `generate_za_tracking_id` — 추적 ID 생성
