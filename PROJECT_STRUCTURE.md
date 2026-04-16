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
├── robots.txt           검색 엔진 크롤러 규칙
└── sdk/
    └── za-sdk.js        Zest Analytics SDK 빌드 결과물 (build.js로 생성)
                         로컬: http://localhost:3000/sdk/za-sdk.js
                         운영: https://analytics.zestdot.com/sdk/za-sdk.js
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
│                            Admin 라우트(사이드바 순서): /default, /zest-analytics, /traffic-source, /heatmap, /profile
│                            Admin 라우트(숨김): /data-tables (hidden: true, URL 직접 접근만 가능)
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
│   ├── SwitchField.js               토글 스위치
│   └── DateRangePicker.js           날짜 범위 선택기 (react-calendar 기반)
│                                    - start/end date 입력 + 캘린더 팝오버
│                                    - 프리셋 드롭다운 (직접설정/어제/최근7일/최근14일/최근30일/이번주/지난주/이번달/지난달)
│                                    - 비교 모드 토글
│                                    - DateRangeContext 연동
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

### 훅 `src/hooks/`

```
src/hooks/
└── useStableFetch.js    JSON.stringify 기반 안정적 데이터 패치 훅
                         - deps를 직렬화하여 이전 값과 비교 → 동일하면 패치 스킵
                         - 탭 전환 시 Supabase 세션 갱신으로 배열 참조가 바뀌어도 리패치 방지
                         - useEffect deps 대신 이 훅 사용 → 불필요한 리렌더링/API 중복 호출 제거
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
│   │                                    + 브랜드 선택 드롭다운 → TrackingCodeManager (브랜드 대행 추적 코드 발급)
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
│   ├── default/index.jsx                대시보드 (팀 통계) + TrackingCodeManager (currentAdvertiserId 기준 추적 코드 발급)
│   └── brands/                          브랜드 목록
│       ├── index.jsx                    접근 가능 브랜드 카드 그리드
│       └── components/
│           └── BrandCard.jsx            브랜드 정보 카드
│
├── admin/
│   ├── default/                         메인 대시보드 페이지 (/admin/default)
│   │   ├── index.jsx                    DateRangePicker + 6 KPI 카드 + 차트/테이블 섹션 통합
│   │   │                                KPI: 방문자수 / 방문자당 페이지뷰 / 평균 체류시간 / 평균 스크롤 깊이 / 신규방문 / 재방문
│   │   │                                AuthContext(브랜드 선택) + DateRangeContext 연동
│   │   ├── components/
│   │   │   ├── VisitorTrendChart.jsx    일별 방문자 & 페이지뷰 이중 라인 차트 (ApexCharts)
│   │   │   │                            getDailyVisitorTrend() 사용
│   │   │   ├── DeviceStatsChart.jsx     기기별 통계 도넛 차트 (PC/모바일/태블릿/기타)
│   │   │   │                            getDeviceStats() 사용
│   │   │   ├── VisitorTypeChart.jsx     신규/재방문 비율 도넛 차트
│   │   │   │                            getVisitorTypeStats() 사용
│   │   │   ├── TopPages.jsx             페이지별 방문 순위 (프로그레스바 게이지)
│   │   │   │                            getTopPages() 사용, limit=10
│   │   │   ├── BehaviorRates.jsx        이탈률/새로고침률/뒤로가기율 MiniStatistics 3개
│   │   │   │                            getBehaviorRates() 사용 (현재 새로고침/뒤로가기는 SDK 미지원으로 0)
│   │   │   ├── TopActions.jsx           자주 하는 행동 Top10 (이벤트 타입 배지 + 라벨 + 횟수)
│   │   │   │                            getTopActions() 사용, event_type 배지 매핑
│   │   │   ├── TopReferrers.jsx         유입경로 Top5 도넛 차트 + 목록 (비율 % + 건수)
│   │   │   │                            getTopReferrers() 사용, channel 우선 → page_referrer 파싱
│   │   │   │                            어트리뷰션 모델 드롭다운 (퍼스트터치/방문자/세션) + ⓘ 아이콘 툴팁
│   │   │   └── OsBrowserStats.jsx       OS / 브라우저별 통계 (프로그레스바)
│   │   │                                getOsStats() + getBrowserStats() 병렬 호출
│   │   │                                항목별 이벤트 수 + 사용자 수(visitor_id 중복 제거) 동시 표시
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
│   ├── trafficSource/                   유입 경로 분석 페이지 (/admin/traffic-source)
│   │   ├── index.jsx                    메인 페이지. Tabs(유입 경로 / 유입 키워드 / 경로 탐색) 구조. Ctrl/Cmd+클릭 다중 비교 선택
│   │   └── components/
│   │       ├── ReferrerChart.jsx        시간대별(0~23시) 유입 소스별 라인 차트 (ApexCharts)
│   │       │                            - 지표 드롭다운: DateRangePicker 스타일 Menu/MenuItem (8개 지표)
│   │       │                            - 선택 소스 칩(Tag) 상단 표시, X로 제거
│   │       │                            - 모듈 레벨 캐시로 탭 전환 시 깜빡임 방지
│   │       ├── ReferrerTable.jsx        유입 소스(referrer 도메인)별 전환 지표 테이블
│   │       │                            - 열 선택: /superadmin/users 브랜드 선택 HStack 커스텀 체크박스 디자인
│   │       │                            - 열 저장: localStorage(traffic_source_visible_cols)
│   │       │                            - 기본 지표 9개 + 추가 지표 5개 (zest-analytics 지표 포함)
│   │       │                            - 합계 행 자동 계산 / 행 클릭 → 차트 소스 선택 연동
│   │       │                            - 정렬, 모듈 레벨 캐시 적용
│   │       │                            - 어트리뷰션 모델 드롭다운 옆 ⓘ 아이콘 호버 시 3가지 모델 설명 툴팁 표시
│   │       ├── KeywordTable.jsx         자연검색 유입 키워드별 전환 지표 테이블
│   │       │                            - page_referrer 파싱으로 키워드 추출 (DB 스키마 변경 없음)
│   │       │                            - 지원: 네이버/다음/빙/네이트/야후. 구글=(not provided)
│   │       │                            - 세션 단위 전환 귀속 (구매/회원가입/리드)
│   │       │                            - 열 선택/저장: localStorage(keyword_table_visible_cols)
│   │       │                            - 헤더 검색엔진별 방문자 수 배지. (not provided) 툴팁 안내
│   │       │                            - 추후 Google Search Console API 연동 예정
│   │       └── NavigationFlow.jsx       세션 내 페이지 이동 흐름 (경로 탐색 탭)
│   │                                    - 단계별(최대 6단계) 컬럼 레이아웃, 카드 클릭으로 경로 필터
│   │                                    - 표시 모드 5가지: 타이틀명 / 타이틀(경로) / 타이틀(전체경로) / 전체경로 / 경로만
│   │                                      · 타이틀(경로): "상품 상세 페이지 (/shop/)" 형식
│   │                                      · 타이틀(전체경로): "상품 상세 페이지 (/shop/?idx=79)" 형식
│   │                                    - 최대 6단계 / 단계별 최대 8개 카드(더 보기 가능)
│   │                                    - 세션 종료 카드, 선택 경로 breadcrumb, 필터 초기화 버튼
│   │
│   ├── heatmap/                         UX 스크롤 히트맵 페이지 (독립 페이지, /admin/heatmap)
│   │   └── index.jsx                    HeatmapViewer를 감싸는 페이지 컴포넌트
│   │                                    useAuth() → currentAdvertiserId / availableAdvertiserIds 주입
│   │
│   └── zestAnalytics/                   Zest Analytics 전환 추적 분석 페이지
│       ├── ZestAnalytics.jsx            메인 페이지 (KPI 카드 + 채널 분석 테이블 단일 뷰)
│       │                                추적코드 관리는 superadmin/clientadmin 어드민 패널에서 담당
│       ├── index.js                     모듈 진입점
│       ├── components/
│       │   ├── EventStatistics.jsx      이벤트 KPI 카드 (총이벤트/구매/회원가입/매출 등)
│       │   ├── ChannelAnalytics.jsx     GA 스타일 채널 분석 테이블
│       │   │                            - 채널·소스·미디엄·캠페인 고정 컬럼 + 지표 컬럼
│       │   │                            - 채널 아이콘 자동 매핑 (Meta/Google/네이버/카카오 등)
│       │   │                            - 열 선택 Popover로 지표 12개 on/off
│       │   │                            - 컬럼 헤더 클릭 정렬 / 탭 전환 캐시(깜빡임 방지)
│       │   ├── AttributionAnalysis.jsx  어트리뷰션 윈도우별 분석 (1일/7일/28일) ※ 현재 미사용
│       │   ├── CampaignPerformance.jsx  캠페인별 성과 테이블 ※ 현재 미사용
│       │   ├── TrackingCodeManager.jsx  추적 코드 생성/재생성/삭제/설치 가이드
│       │   │                            props: advertiserId, role
│       │   │                                   availableAdvertisers, selectedBrandId, onBrandChange (슈퍼어드민용 브랜드 선택 내장)
│       │   │                            설치 가이드 모달: 7개 탭 (기본설치/구매/회원가입/리드/장바구니/커스텀/UTM)
│       │   │                                              Horizon UI pill 탭 + 다크 코드 블록 + 복사 버튼
│       │   └── HeatmapViewer.jsx        UX 스크롤 히트맵 뷰어
│       │                                - 자체 날짜 상태 (기본: 오늘, DateRangeContext 미사용)
│       │                                - 디바이스 탭: 전체/PC/MO
│       │                                - iframe 실제 페이지 미리보기 + 우측 56px 수직 컬러 바
│       │                                - 우측 통계: 방문자/페이지뷰/평균 도달률/세션 수 + 도달 구간 + SVG 추이 차트
│       │                                - iframe 페이지 이동 감지: SDK postMessage(za_pageview) 수신
│       │                                - 컴포넌트 분리: ScrollHeatmapPanel / ScrollStatsPanel / FilterChip
│       │                                ── 탭 3종 ──
│       │                                - 스크롤 히트맵: 정규화 URL 기준 전체 채널 합산
│       │                                - 채널별 히트맵: 3단계 드릴다운 (채널 필터 → 페이지 목록 → 히트맵)
│       │                                  · Step 1 필터 패널: source → medium → campaign 계단식 (각 선택 시 하위 행 노출)
│       │                                  · Step 2 페이지 목록: maxH 320px 스크롤, 세션/도달률 헤더 클릭 정렬(▼▲⇅)
│       │                                  · Step 3 히트맵: 필터된 raw_urls 기준 조회 (ScrollHeatmapPanel 재사용)
│       │                                  ⚠️ 데이터 한계: raw_url UTM 파싱 방식 → 랜딩 페이지에만 적용
│       │                                  → 향후 za_events.utm_source/medium 컬럼 기준 DB 필터로 교체 필요
│       │                                - 클릭 히트맵: UI 구현 완료, 수집 비활성화(준비중 표시)
│       │                                ── URL 정규화 ──
│       │                                - 페이지 드롭다운: UTM·광고 파라미터 제거 후 그룹핑, "URL 변형 N개" 표시
│       │                                - iframe URL: raw_urls[0] 사용 (hostname 유지)
│       │                                - selectedRawUrls useMemo: 정규화 URL → 원본 URL 배열 역조회
│       ├── services/
│       │   └── zaService.js             Supabase API 호출 (za_tracking_codes, za_events) + normalizeUrl() URL 정규화 헬퍼
│       │                                ── 추적 코드 관리 ──
│       │                                - getTrackingCodes / createTrackingCode / regenerateTrackingCode
│       │                                - updateTrackingCodeStatus / deleteTrackingCode
│       │                                ── 이벤트 통계 ──
│       │                                - getEventStatistics / getAttributionStats / getCampaignPerformance
│       │                                - getRecentEvents / getDailyEventStats
│       │                                ── 채널 분석 ──
│       │                                - getUTMBreakdown → channel+source+medium+campaign 조합 그룹화
│       │                                  사용자수/페이지뷰/체류시간/도달률/구매/매출/회원가입 등 일괄 집계
│       │                                ── 트래픽 분석 ──
│       │                                - getHourlyVisitors → get_hourly_visitors RPC (visitor_id 기준 고유 방문자)
│       │                                - getHourlyPageViews → get_hourly_pageviews RPC
│       │                                - getPageScrollStats → get_page_scroll_stats RPC (25/50/75/100% 도달률)
│       │                                - getChannelPerformance → get_channel_performance RPC (채널별 종합 성과)
│       │                                ── UX 히트맵 ──
│       │                                - getHeatmapPageList → get_heatmap_page_list RPC
│       │                                  결과를 normalizeUrl()로 그룹핑 → { page_url(정규화), session_count(합산), raw_urls[] } 반환
│       │                                - getScrollHeatmap(pageUrls[]) → 원본 URL 각각 get_scroll_heatmap RPC 병렬 호출
│       │                                  버킷(0~9)별 reached_count / total_count 합산 후 reach_pct 재계산
│       │                                - getHeatmapPageStats(pageUrls[]) → za_events 직접 쿼리, .in('page_url', urls)
│       │                                  방문자/페이지뷰/도달률 요약, reach10~reach100 구간별 도달률
│       │                                - getClickHeatmap(pageUrls[]) → za_click_events .in('page_url', urls)
│       │                                - getClickTopElements(pageUrls[]) → za_click_events .in('page_url', urls), 클라이언트 집계
│       │                                ── 메인 대시보드 ──
│       │                                - getDashboardKPIs → za_events 직접 쿼리
│       │                                  방문자수/방문자당PV/평균체류시간/평균스크롤깊이/신규방문/재방문
│       │                                - getDailyVisitorTrend → KST 날짜별 방문자+페이지뷰 집계
│       │                                - getDeviceStats → device_type별 pageview 집계
│       │                                - getVisitorTypeStats → session_end.is_new_visitor (pageview fallback)
│       │                                - getTopPages → page_url별 pageview + unique_visitors
│       │                                - getBehaviorRates → 이탈/새로고침/뒤로가기율 (새로고침·뒤로가기 SDK 미지원으로 0)
│       │                                - getTopActions → event_type/page_url/scroll_depth/event_name 기준 상위 행동
│       │                                - getTopReferrers → channel 우선, 없으면 page_referrer 파싱하여 hostname 추출
│       │                                - getOsStats → pageview 이벤트에서 os 컬럼 집계 (이벤트 수 + visitor_id 고유 사용자 수)
│       │                                - getBrowserStats → pageview 이벤트에서 browser 컬럼 집계 (이벤트 수 + 고유 사용자 수)
│       │                                - getReferrerBreakdown → referrer 도메인별 방문·전환 성과 집계 (3-pass: pageview→session_end→전환 귀속)
│       │                                  반환: source, lastUtmChannel, totalVisits, visitors, pageviews, signups, memberConversionRate,
│       │                                        purchasers, purchaseCount, revenue, purchaseConversionRate, avgOrderValue 등 16개 지표
│       │                                - getReferrerHourlyData → referrer별 시간대(0~23시) 지표 배열 반환 (KST 기준)
│       │                                  반환: { [referrer]: { totalVisits, visitors, signups, purchasers, purchaseCount, revenue,
│       │                                          purchaseConversionRate, avgOrderValue } } 각 24-element 배열
│       └── sdk/
│           ├── index.js                 광고주 웹사이트용 JS SDK v1.4.0 (IIFE, window.zestAnalytics)
│           │                            - init() → 페이지뷰 자동 추적, GA 스타일 세션 추적 리스너 등록
│           │                            - trackPageView() → channel / is_new_visitor / session_id / visitor_id / device 포함
│           │                                              + window.parent.postMessage(za_pageview) 전송 (iframe 감지용)
│           │                            - track(eventType, data) → 전환 이벤트
│           │                            - _detectChannel() → UTM 우선(28일 윈도우 체크), referrer 분석
│           │                            - _checkVisitorStatus() → localStorage za_visitor 기반 신규/재방문
│           │                            - _getOrCreateVisitorId() → localStorage za_vid 기반 브라우저별 고유 방문자 ID
│           │                            - _trackScrollDepth() → scroll 이벤트로 maxScrollDepth + scrollBuckets(10개) 갱신
│           │                            ── GA 스타일 세션 추적 ──
│           │                            - _onInteraction() → 상호작용 감지(8종), idle 타이머 리셋
│           │                            - _resetIdleTimer() → 30분 무활동 타이머 리셋
│           │                            - _onIdle() → 30분 무활동 시 세션 종료 + 새 세션 초기화
│           │                            - _pauseSession() → 탭 hidden 시 누적 일시정지
│           │                            - _resumeSession() → 탭 visible 시 타이머 재시작
│           │                            - _endSession() → beforeunload 시 최종 누적 후 전송
│           │                            - _sendSessionEnd() → fetch keepalive, 3초 미만 노이즈 필터
│           │                                                  scroll_buckets(10개 배열) + device_type 전송
│           │                            - _resetSession() → 새 sessionId 발급, 누적값·scrollBuckets 초기화
│           │                            SDK URL: https://analytics.zestdot.com/sdk/za-sdk.js
│           └── build.js                 SDK를 public/sdk/za-sdk.js로 복사하는 빌드 스크립트
│                                        실행: node src/views/admin/zestAnalytics/sdk/build.js
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
| 2026-04-02 | 추적 코드 발급 UI — clientadmin/superadmin 대시보드에 TrackingCodeManager 통합, 브랜드 대행 발급 기능 | `CHANGELOG.md` |
| 2026-04-02 | 설치 가이드 모달 리디자인 — 7탭 구조, Horizon UI 스타일, 다크 코드 블록 | `CHANGELOG.md` |
| 2026-04-02 | SDK v1.1.0 — 페이지뷰 자동 추적, 유입 채널 감지, 신규/재방문 구분, 체류시간 추적, SDK URL 변경 | `수퍼베이스_DB_세팅.md` |
| 2026-04-02 | za_events 컬럼 추가 (channel/is_new_visitor/session_id/time_on_page), session_end 이벤트 타입 추가 | `수퍼베이스_DB_세팅.md` |
| 2026-04-02 | za-collect-event Edge Function 재배포 — Deno.serve 교체, JWT OFF, session_end 지원 | `수퍼베이스_DB_세팅.md` |
| 2026-04-02 | 트래픽 분석 4기능 백엔드 구현 — scroll_depth/visitor_id 컬럼, RPC 함수 4개, 인덱스 2개 | `수퍼베이스_DB_세팅.md` Part 8 |
| 2026-04-02 | SDK v1.2.0 — 스크롤 도달률 추적, visitor_id 도입, 채널 어트리뷰션 윈도우 버그 수정 | `CHANGELOG.md` |
| 2026-04-02 | za-collect-event Edge Function 재배포 — scroll_depth, visitor_id, channel(session_end) 처리 추가 | `za-collect-event.ts` |
| 2026-04-02 | SDK v1.3.0 — GA 스타일 세션 추적 (탭 전환 일시정지/재개, 30분 idle timeout, 3초 노이즈 필터, 8종 상호작용 감지) | `CHANGELOG.md` |
| 2026-04-02 | UX 스크롤 히트맵 구현 — SDK v1.4.0(scroll_buckets/postMessage), HeatmapViewer, `/admin/heatmap` 독립 페이지, Part 9 DB | `수퍼베이스_DB_세팅.md` Part 9 |
| 2026-04-03 | UX 히트맵 정상 작동 확인 — analytics.zestdot.com에서 실데이터 표시(방문자/페이지뷰/도달률/세션) 확인 | - |
| 2026-04-05 | `/admin/default` 메인 대시보드 전면 구현 — 6 KPI 카드, 7개 차트/테이블 컴포넌트, DateRangePicker, useStableFetch 훅 | `CHANGELOG.md` v4.6.0 |
| 2026-04-05 | za_events 실제 스키마 확인 — page_referrer(not referrer), channel, is_new_visitor, scroll_depth, visitor_id, session_id, time_on_page 존재 확인; element_text 부재 확인 | `수퍼베이스_DB_세팅.md` Part 10 |
| 2026-04-05 | OS/브라우저 통계 추가 — OsBrowserStats.jsx, getOsStats/getBrowserStats (이벤트 수 + 고유 사용자 수 동시 표시) | `CHANGELOG.md` v4.6.1 |
| 2026-04-16 | 채널별 히트맵 탭 UX 전면 재설계 — 페이지→채널 역순 흐름을 채널 필터→페이지 목록→히트맵 3단계 드릴다운으로 교체. source/medium/campaign 계단식 필터, 페이지 목록 maxH 스크롤, 세션/도달률 헤더 클릭 정렬. 목업 데이터(MOCK_PAGE/MOCK_HEATMAP/MOCK_STATS) 전면 제거. ScrollHeatmapPanel·ScrollStatsPanel·FilterChip 컴포넌트 분리 | `프론트엔드_구축_계획.md` |

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
| `src/views/admin/zestAnalytics/ZestAnalytics.jsx` | 메인 페이지 (KPI 카드 + ChannelAnalytics 단일 뷰) |
| `src/views/admin/zestAnalytics/index.js` | 모듈 진입점 |
| `src/views/admin/zestAnalytics/services/zaService.js` | Supabase API 서비스. 파일 상단 `normalizeUrl()` 헬퍼로 트래킹 파라미터(gclid, fbclid, utm_* 등) 제거 후 URL 집계 |
| `src/views/admin/zestAnalytics/components/EventStatistics.jsx` | KPI 카드 |
| `src/views/admin/zestAnalytics/components/ChannelAnalytics.jsx` | GA 스타일 채널·소스·미디엄·캠페인 분석 테이블 (열 선택, 정렬, 캐시) |
| `src/views/admin/zestAnalytics/components/HeatmapViewer.jsx` | 스크롤/클릭 히트맵 뷰어. 탭 3종(스크롤·채널분리·클릭). URL 정규화(raw_urls[] 그룹핑). 채널분리 탭은 raw_url UTM 파싱 방식으로 구현(재설계 필요). **클릭 수집 비활성화** |
| `src/views/admin/zestAnalytics/components/AttributionAnalysis.jsx` | 어트리뷰션 분석 ※ 미사용 |
| `src/views/admin/zestAnalytics/components/CampaignPerformance.jsx` | 캠페인 성과 테이블 ※ 미사용 |
| `src/views/admin/zestAnalytics/components/TrackingCodeManager.jsx` | 추적 코드 관리 (superadmin/clientadmin에서 사용) |
| `src/views/admin/zestAnalytics/sdk/index.js` | 광고주용 JS SDK. `_trackClick`, `_getCssSelector` 메서드 구현 완료. **클릭 이벤트 리스너 주석 처리 — 수집 비활성** |
| `src/views/admin/zestAnalytics/sdk/build.js` | SDK 빌드 스크립트 (src → public/sdk/za-sdk.js 복사) |

**수정된 파일**

- `src/App.js` — `DateRangeProvider` 감싸기 추가
- `src/routes.js` — `/admin/zest-analytics` 라우트 추가 (사이드바 노출)
- `.env` — Supabase URL/ANON_KEY 설정

**연결 Supabase 테이블**

- `za_tracking_codes` — 추적 코드 생성/관리
- `za_events` — 전환 이벤트 데이터 조회
- RPC `generate_za_tracking_id` — 추적 ID 생성
