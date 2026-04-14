# Changelog

## [4.6.12] 2026-04-14

### 경로 탐색 분석 탭 추가 — `/admin/traffic-source`

**`src/views/admin/trafficSource/index.jsx`**
- 기존 2탭(유입 경로 / 유입 키워드) → **3탭 구조**로 확장
  - `경로 탐색` 탭 신규 추가

**`src/views/admin/trafficSource/components/NavigationFlow.jsx`** (신규)
- 세션 내 페이지 이동 흐름을 단계별 컬럼으로 시각화
- 표시 모드 3가지 토글 (기본: 타이틀명)
  - **타이틀명**: `page_title` (없으면 전체 경로 자동 fallback)
  - **전체 경로**: `/shop/?idx=79` (pathname + query string)
  - **경로만**: `/shop/` (pathname 기준 그룹화)
- 카드 클릭 → 해당 페이지로 필터, 다음 단계 데이터 갱신
- 같은 카드 재클릭 → 필터 해제
- 선택 경로 breadcrumb 표시 (배지 클릭으로 해당 단계까지 되돌아가기)
- 단계별 "세션 종료" 카드 (이탈 세션 수/비율)
- "N개 더 보기" — 단계별 최대 8개 기본 표시, 확장 가능
- 연속 중복 페이지 자동 제거 (새로고침 무시), 비연속 재방문은 유지
- 최대 6단계 / 최대 100,000 pageview fetch / 모듈 레벨 캐시 적용

**`src/views/admin/zestAnalytics/services/zaService.js`**
- `getNavigationPaths()` 신규 추가
  - `za_events` 테이블에서 `pageview` 이벤트 기반 세션별 경로 배열 반환
  - 반환 구조: `Array<Array<{ path: string, title: string|null }>>`
  - `page_title` 컬럼 fetch 포함 (Supabase 컬럼 추가 후 활성화)

---

### SDK — `page_title` 수집 추가

**`src/views/admin/zestAnalytics/sdk/index.js`**
- `trackPageView()` 페이로드에 `page_title: document.title` 추가

**`za-collect-event.ts`** (Edge Function)
- `za_events` INSERT 시 `page_title: isPageview ? (payload.page_title || null) : null` 추가

**`public/sdk/za-sdk.js`**
- `node src/views/admin/zestAnalytics/sdk/build.js` 재빌드 반영 (23.78 KB)

> ⚠️ **Supabase 적용 필요**: `za_events` 테이블에 `page_title TEXT` 컬럼 추가 후 수집 시작
> ```sql
> ALTER TABLE za_events ADD COLUMN IF NOT EXISTS page_title TEXT;
> ```
> 기존 데이터는 NULL 유지, 신규 수집 데이터부터 타이틀 표시

---

## [4.6.11] 2026-04-07

### 유입 키워드 분석 탭 추가 — `/admin/traffic-source`

**`src/views/admin/trafficSource/index.jsx`**
- 기존 단일 뷰 → **Chakra UI `Tabs`** 구조로 변경
  - `유입 경로` 탭: 기존 ReferrerChart + ReferrerTable
  - `유입 키워드` 탭: 신규 KeywordTable

**`src/views/admin/trafficSource/components/KeywordTable.jsx`** (신규)
- `page_referrer` URL을 파싱하여 자연검색 유입 키워드 추출
- 지원 검색엔진: 네이버(`query=`), 다음(`q=`), 빙(`q=`), 네이트(`q=`), 야후(`p=`), 구글(`(not provided)`)
- 세션 단위 전환 귀속: 검색 세션에서 발생한 구매/회원가입/리드 집계
- 테이블 지표 8개 (기본 on): 방문자수, 세션수, 회원전환수, 회원전환율, 구매자수, 구매량, 총구매금액, 구매전환율
- 추가 지표 3개 (기본 off): 평균주문금액, 리드, 장바구니담기
- 열 선택/저장 Popover (localStorage 키: `keyword_table_visible_cols`)
- 헤더에 검색엔진별 방문자 수 요약 배지
- `(not provided)` 행에 "Google Search Console 연동 예정" 툴팁 표시
- 푸터에 연동 예정 안내 문구

**`src/views/admin/zestAnalytics/services/zaService.js`**
- `getKeywordBreakdown()` 신규 추가
  - `_extractSearchKeyword()` 내부 헬퍼: referrer URL에서 검색엔진 + 키워드 추출
  - DB 스키마 변경 없이 기존 `page_referrer` 컬럼 활용
  - 반환 구조: `{ keyword, engine, engineDomain, visitors, sessions, signups, memberConversionRate, purchasers, purchaseCount, revenue, purchaseConversionRate, avgOrderValue, leads, addToCarts }`
  - 모듈 레벨 캐시 적용

> **Google 유기검색 키워드**: HTTPS 암호화로 인해 `(not provided)` — 추후 Google Search Console API 연동 예정

---

## [4.6.10] 2026-04-06

### DateRangePicker — zest-analytics / traffic-source 페이지 추가

**`src/views/admin/zestAnalytics/ZestAnalytics.jsx`**
- 페이지 상단에 `<DateRangePicker />` 추가

**`src/views/admin/trafficSource/index.jsx`**
- 페이지 상단에 `<DateRangePicker />` 추가

---

### 어트리뷰션 모델 선택 드롭다운 — 채널 분석 / 유입경로 Top5 / 유입 경로 분석 테이블

세 곳에 **퍼스트터치 / 방문자 / 세션** 기준 선택 드롭다운을 공통 적용:
- 기본값: `first_touch` (방문자를 최초 유입 채널에만 카운트, 중복 없음)
- `visitor`: 채널별 고유 visitor_id 카운트 (중복 가능)
- `session`: 세션 수 기준 카운트 (중복 없음)

**`src/views/admin/zestAnalytics/components/ChannelAnalytics.jsx`**
- 헤더에 `Menu/MenuButton/MenuItem` 드롭다운 추가 (DateRangePicker 동일 스타일)
- 선택 기준에 따라 "사용자수 / 사용자수* / 세션수" 컬럼 헤더 동적 변경
- 캐시 키에 `attributionModel` 포함

**`src/views/admin/default/components/TopReferrers.jsx`**
- 카드 헤더 우측에 드롭다운 추가

**`src/views/admin/trafficSource/components/ReferrerTable.jsx`**
- 헤더 버튼 영역에 드롭다운 추가
- `Menu`, `MenuButton`, `MenuList`, `MenuItem`, `MdKeyboardArrowDown` import 추가

**`src/views/admin/zestAnalytics/services/zaService.js`**
- `getUTMBreakdown()` — `attributionModel` 파라미터 추가, `created_at` 오름차순 정렬 추가
- `getTopReferrers()` — `attributionModel` 파라미터 추가, `session_id` / `created_at` select 추가
- `getReferrerBreakdown()` — `attributionModel` 파라미터 추가, `sessions: new Set()` 집계 추가, `created_at` 오름차순 정렬 추가

---

### 버그 수정 — 총 이벤트 집계에서 session_end 제외

**`src/views/admin/zestAnalytics/services/zaService.js`**
- `getEventStatistics()` 쿼리에 `.neq('event_type', 'session_end')` 추가
- session_end 이벤트가 총 이벤트 수에 포함되던 문제 수정

---

### 버그 수정 — 신규/재방문 visitor_id 중복 카운트

**`src/views/admin/zestAnalytics/services/zaService.js`**
- `getDashboardKPIs()` — session_end 기준 신규/재방문 집계 시 세션 수가 아닌 `visitor_id` 고유값 기준으로 수정
- 한 명이 여러 세션을 가지면 재방문이 세션 수만큼 카운트되던 문제 수정

---

### UI 개선 — EventStatistics 어트리뷰션 윈도우 레이아웃

**`src/views/admin/zestAnalytics/components/EventStatistics.jsx`**
- 하단 4개 MiniStatistics 카드(1일/7일/28일 이내 전환, 평균 전환 소요일) → 단일 Card 안에 인라인 가로 나열로 변경
- `Divider`로 항목 구분, 모든 항목 동일 높이 유지 (`visibility: hidden`으로 빈 sub 텍스트 공간 확보)

---

### UI 개선 — 사이드바 메뉴 텍스트 색상 진하게

**`src/components/sidebar/components/Links.js`**
- 비활성 메뉴 텍스트 색상: `secondaryGray.500` / `secondaryGray.600` → `gray.600` / `gray.600`

---

## [4.6.9] 2026-04-06

### DateRangePicker — 오늘 프리셋 추가 / KPI 카드 아이콘 스타일 통일

#### DateRangePicker — 오늘 프리셋 추가

**`src/components/fields/DateRangePicker.js`**
- presets 배열에 `'오늘'` 추가 (`'직접설정'` 다음, `'어제'` 앞)

**`src/contexts/DateRangeContext.js`**
- `getKSTToday` import 추가
- `getDateRange` switch에 `'오늘'` case 추가 (start/end 모두 `getKSTToday()`)

---

#### KPI 카드 아이콘 스타일 통일

**`src/views/admin/zestAnalytics/components/EventStatistics.jsx`**
- 상단 4개 카드(총 이벤트 / 구매 전환 / 회원가입 / 전환 매출) IconBox 변경
  - 컬러 그라디언트 배경 → `boxBg` (secondaryGray.300 / whiteAlpha.100)
  - 흰색 아이콘 → `brandColor` Chakra `Icon` 컴포넌트 (32px)

**`src/views/admin/default/index.jsx`**
- 신규 방문 카드 IconBox 변경
  - 블루 그라디언트 배경 → `boxBg`
  - 흰색 28px 아이콘 → `brandColor` 32px (나머지 5개 카드와 동일 스타일로 통일)

---

## [4.6.8] 2026-04-06

### 클릭 히트맵 탭 — "서비스 준비중" 알럿 처리

**`src/views/admin/zestAnalytics/components/HeatmapViewer.jsx`**
- 클릭 히트맵 탭 클릭 시 `alert('클릭 히트맵은 현재 서비스 준비중입니다.')` 표시 후 탭 전환 차단
- 기존 클릭 히트맵 UI는 코드 내 보존, 실제 탭 전환은 불가

---

## [4.6.7] 2026-04-06

### 클릭 히트맵 기능 구축 (UI 완성 / 수집 비활성)

#### 구축 내용

**`src/views/admin/zestAnalytics/components/HeatmapViewer.jsx`**
- 상단 모드 토글 추가: **스크롤 히트맵** / **클릭 히트맵** 탭
- 클릭 히트맵 모드:
  - iframe 위 canvas 절대 위치 오버레이 (가우시안 블러 COLD→HOT 렌더링)
  - 우측 패널: 총 클릭 수, 클릭된 요소 종류, **많이 클릭된 요소 TOP 10** 리스트 (진행 바 포함)

**`src/views/admin/zestAnalytics/services/zaService.js`**
- `getClickHeatmap()` 추가 — `za_click_events` 테이블에서 좌표 목록 조회
- `getClickTopElements()` 추가 — element_selector 기준 그룹핑, 클릭 수 TOP N 반환

**`src/views/admin/zestAnalytics/sdk/index.js`**
- `_trackClick(e)` 메서드 추가 — 클릭 좌표(뷰포트 기준 0~1 비율), 요소 태그/텍스트/CSS 경로 수집
- `_getCssSelector(el)` 메서드 추가 — id > class > tag 순 최대 3단계 경로 생성
- **현재 수집 비활성화** (`init()` 내 이벤트 리스너 주석 처리)

**`za-collect-event.ts`**
- `validEventTypes`에 `'click'` 추가
- `click` 이벤트 수신 시 `za_click_events` 테이블로 분기 INSERT

#### Supabase 변경사항

- `za_click_events` 테이블 신규 생성
- RLS 활성화 + 3개 SELECT 정책 추가 (`za_events`와 동일 구조):
  - `Advertiser can view own click events`
  - `Agency can view organization click events`
  - `Master can view all click events`

#### ⚠️ 클릭 수집 비활성화 사유 및 현황

**사유**: iframe 기반 canvas 오버레이의 구조적 한계
1. **좌표 불일치** — SDK는 실제 사이트 뷰포트(예: 1920px) 기준으로 기록하지만, iframe은 대시보드 컨테이너 너비(약 800px)에 맞춰 렌더링되어 좌표가 어긋남
2. **스크롤 desync** — canvas는 iframe 위 고정 오버레이라 iframe 내부 스크롤 시 클릭 점이 화면과 함께 이동하지 않음

**현황**:
- SDK `_trackClick`, `_getCssSelector` 코드는 완성 상태로 보존
- `init()` 내 `window.addEventListener('click', ...)` 한 줄 주석 처리로 수집 중단
- 재활성화: 주석 1줄 해제 후 `node sdk/build.js` + CDN 배포

**향후 방향** (미결): iframe 방식 대신 독립 canvas 좌표 분포도 또는 세션 리플레이 방식으로 재설계 필요

---

## [4.6.6] 2026-04-06

### /admin/zest-analytics — 사용자수 집계 버그 수정 및 채널명 개선

#### zaService.js — `getUTMBreakdown` 사용자수 버그 수정

- **버그**: 사용자수(`users`)를 `session_id` 기준 Set으로 집계하던 로직이 이벤트수와 동일하게 표시되는 문제
- **원인**: `session_id`가 이벤트마다 고유하게 생성되는 경우 `sessions.size === 이벤트 수`가 됨
- **수정**: 다른 분석 함수(`getDailyStats`, `getPageStats` 등)와 동일하게 `visitor_id` 기준으로 고유 사용자 집계
  - select 쿼리에 `visitor_id` 추가
  - 그룹별 `visitors: new Set()` 추가
  - `users`, `avgPageviewsPerUser`, `memberConversionRate`, `purchaseConversionRate` 모두 `g.visitors.size` 기준으로 통일

#### ChannelAnalytics.jsx — 채널 표시명 개선

- `referral` 채널 라벨 변경: `'추천'` → `'추천 (외부링크)'`
  - "추천"이 어떤 유입 채널인지 직관적으로 알기 어려운 문제 개선
  - 다른 사이트의 링크를 클릭해서 들어온 유입임을 명시

---

## [4.6.5] 2026-04-06

### routes.js — 사이드바 순서 변경 및 Data Tables 숨김 처리

- `/admin/data-tables` 라우트에 `hidden: true` 추가 → 사이드바 미노출 (URL 직접 접근은 유지)
- 사이드바 메뉴 노출 순서 변경: 홈 → 제스트애널리틱스 → 유입경로분석 → UX히트맵 → 슈퍼어드민 → 브랜드어드민 → 프로필

---

## [4.6.4] 2026-04-06

### /admin/traffic-source — 유입 경로 분석 페이지 신규 추가

#### 신규 파일

| 파일 | 설명 |
|------|------|
| `src/views/admin/trafficSource/index.jsx` | 메인 페이지. 차트↔테이블 선택 소스 상태 공유. Ctrl/Cmd+클릭 비교 선택 핸들러 |
| `src/views/admin/trafficSource/components/ReferrerChart.jsx` | 시간대별(0~23시) 방문자 라인 차트. 소스 칩(tag) 표시 + X 제거. 지표 드롭다운은 DateRangePicker 스타일(Menu/MenuItem) 적용 |
| `src/views/admin/trafficSource/components/ReferrerTable.jsx` | 유입 소스별 전환 지표 테이블. 열 선택은 `/superadmin/users` 브랜드 선택 HStack 커스텀 체크박스 디자인 적용. 열 저장(localStorage). 합계 행 자동 계산. 행 클릭 → 차트 연동 |

#### zaService.js 신규 함수

| 함수 | 설명 |
|------|------|
| `getReferrerBreakdown(params)` | page_referrer 도메인 기준으로 그룹화. pageview 세션→referrer 매핑 후 signup/purchase 귀속. 반환 메트릭: source, lastUtmChannel, totalVisits, visitors, pageviews, avgTimeOnPage, avgScrollDepth, signups, memberConversionRate, purchasers, purchaseCount, revenue, purchaseConversionRate, avgOrderValue, addToCarts, leads |
| `getReferrerHourlyData(params)` | 한 번 조회로 전 지표 반환. pageview + signup + purchase 이벤트 조합. referrer별·시간대별 totalVisits/visitors/signups/purchasers/purchaseCount/revenue/purchaseConversionRate/avgOrderValue 배열(24개) 반환. 모듈 레벨 캐시 적용 |

#### 차트 지표 목록 (8개)
- 전체 페이지뷰수 / 방문자수 / 회원 전환 수 / 구매자수 / 구매량 / 총 구매금액 / 구매 전환율 / 평균 주문 금액

#### 테이블 지표 컬럼
- 기본(9개): 전체 페이지뷰수, 방문자 수, 회원 전환 수, 회원 전환율, 구매지 수, 구매량, 총 구매 금액, 구매 전환율, 평균 주문 금액
- 추가(5개): 페이지뷰수, 평균 체류시간, 평균 도달률, 장바구니담기, 리드

#### routes.js 변경
- `/admin/traffic-source` 라우트 추가 (`MdCallSplit` 아이콘, 사이드바 노출)

---

### /admin/zest-analytics — ChannelAnalytics 개선

#### 열 선택 디자인 변경
- `Checkbox` 컴포넌트 → `/superadmin/users` 브랜드 선택 HStack 커스텀 체크박스 디자인으로 교체
- 선택 항목: `brand.500` 테두리 + `brand.50` 배경 + 내부 흰 사각형 표시
- 취소 / 저장 버튼 분리 (draft 패턴: Popover 열기 시 draft 생성, 저장 시 적용)

#### 열 저장 기능 추가
- 헤더 "열 저장" 버튼: 현재 적용 컬럼을 `localStorage(channel_analytics_visible_cols)`에 즉시 저장
- Popover 내 "저장" 버튼: draft 적용 + localStorage 저장 + Popover 닫기
- 페이지 재진입 시 저장된 열 설정 자동 복원

---

## [4.6.3] 2026-04-05

### /admin/zest-analytics — GA 스타일 채널 분석 테이블 전면 개편

#### 신규 컴포넌트

| 파일 | 설명 |
|------|------|
| `src/views/admin/zestAnalytics/components/ChannelAnalytics.jsx` | 채널·소스·미디엄·캠페인을 한 행의 컬럼으로 나란히 표시하는 GA 스타일 분석 테이블. 채널 아이콘(Meta/Google/네이버/카카오 등) 자동 매핑. 정렬, 열 선택 기능 포함 |

#### zaService.js 신규 함수

| 함수 | 설명 |
|------|------|
| `getUTMBreakdown(params)` | `channel + utm_source + utm_medium + utm_campaign` 조합으로 그룹화. 2-패스 처리로 session_end 체류시간/스크롤을 세션 매핑으로 정확히 연결. 반환 메트릭: users, pageviews, avgPageviewsPerUser, avgTimeOnPage, avgScrollDepth, purchases, revenue, addToCarts, signups, leads, memberConversionRate, purchaseConversionRate |

#### ZestAnalytics.jsx 변경

- 기존 2탭 구조(대시보드 / 추적코드 관리) 제거
- 추적코드 관리: superadmin/clientadmin 어드민 패널에서 관리하므로 해당 탭 삭제
- `AttributionAnalysis`, `CampaignPerformance` 컴포넌트 제거
- 페이지 구조: EventStatistics KPI 카드 → ChannelAnalytics 테이블 (단일 뷰)

#### ChannelAnalytics 기능 상세

**차원 컬럼 (고정)**
- 채널: 플랫폼 아이콘(FaFacebook/FaInstagram/FaYoutube/FaTwitter) + 텍스트 레이블 자동 매핑
- 소스 / 미디엄 / 캠페인

**지표 컬럼 (열 선택으로 on/off)**
- 기본 표시: 사용자수, 페이지뷰수, 평균 체류시간, 구매, 구매전환액수, 회원가입
- 선택 추가: 평균 페이지뷰, 평균 도달률, 구매전환율, 장바구니담기, 회원전환율, 리드

**UX**
- 컬럼 헤더 클릭 → 오름/내림차순 정렬 토글, 정렬 중인 열 파란색 강조
- 탭 이동 후 복귀 시 깜빡임 방지: 모듈 레벨 캐시(_cache)로 이전 데이터 즉시 표시, 스피너는 첫 요청 시만 노출
- Card `overflow:hidden` 제거 + Popover `strategy="fixed"` 적용으로 열선택 팝오버 클리핑 문제 해결

---

## [4.6.2] 2026-04-05

### 한글 URL percent-encoding 디코딩 처리

한글이 포함된 페이지 URL이 `%ED%95%9C%EA%B8%80` 형태로 표시되던 문제 수정.
`window.location.href`가 한글 경로를 percent-encoding으로 저장하므로, 표시 시점에 `decodeURIComponent`로 디코딩하도록 변경.
DB에 저장된 값 및 쿼리 조건은 원본(encoded) 그대로 유지.

#### 수정된 파일

| 파일 | 변경 내용 |
|------|-----------|
| `src/views/admin/default/components/TopPages.jsx` | `decodeUrl()` 헬퍼 추가, URL 표시(title + 텍스트) 시 디코딩 적용 |
| `src/views/admin/zestAnalytics/components/HeatmapViewer.jsx` | 페이지 드롭다운 option 텍스트 디코딩 (value는 DB 쿼리용 원본 유지) |
| `src/views/admin/zestAnalytics/services/zaService.js` | `getTopActions()`의 label 생성 시 URL 디코딩 적용 |

---

## [4.6.1] 2026-04-05

### OS / 브라우저 통계 추가

#### 신규 컴포넌트

| 파일 | 설명 |
|------|------|
| `src/views/admin/default/components/OsBrowserStats.jsx` | OS / 브라우저별 방문 통계 카드. 운영체제·브라우저 섹션 각각 프로그레스바 표시. 항목별 **이벤트 수** + **고유 사용자 수**(visitor_id 중복 제거) 동시 표시. 비율(%)은 이벤트 수 기준 |

#### zaService.js 신규 함수

| 함수 | 설명 |
|------|------|
| `getOsStats(params)` | pageview 이벤트에서 `os` 컬럼 집계 → `[{os, events, users}]`. visitor_id 기준 고유 사용자 수 포함 |
| `getBrowserStats(params)` | pageview 이벤트에서 `browser` 컬럼 집계 → `[{browser, events, users}]`. visitor_id 기준 고유 사용자 수 포함 |

#### 수정된 파일

- **`src/views/admin/default/index.jsx`** — 기기통계+방문유형 그리드에 `OsBrowserStats` 추가 (2열 → 3열)
- **`za-collect-event.ts`** — 기존부터 `browser`/`os` 저장 중 (line 100-101, 변경 없음)
- **SDK `index.js`** — `trackPageView`에서 `...this._getDeviceInfo()`로 `browser`/`os` 이미 전송 중 (변경 없음)

#### za_events 컬럼 요구사항

`browser`, `os` 컬럼이 없는 경우 아래 SQL 실행 필요:
```sql
ALTER TABLE za_events
  ADD COLUMN IF NOT EXISTS browser TEXT,
  ADD COLUMN IF NOT EXISTS os TEXT;
```

---

## [4.6.0] 2026-04-05

### /admin/default 메인 대시보드 — 실제 데이터 연동 및 섹션 추가

#### 신규 컴포넌트

| 파일 | 설명 |
|------|------|
| `src/components/fields/DateRangePicker.js` | growth-dashboard와 동일한 날짜 선택 UI (달력 팝오버 + 프리셋 드롭다운 + 비교 기간 모드). DateRangeContext 연동 |
| `src/hooks/useStableFetch.js` | 탭 전환 시 깜빡임 방지 커스텀 훅 — 의존성 값이 JSON 비교 기준으로 실제 변경됐을 때만 재조회 |
| `src/views/admin/default/components/VisitorTrendChart.jsx` | 일별 방문자수 & 페이지뷰 꺾은선 차트 (ApexCharts line) |
| `src/views/admin/default/components/DeviceStatsChart.jsx` | 기기 유형별 도넛 차트 (desktop/mobile/tablet 분포) |
| `src/views/admin/default/components/VisitorTypeChart.jsx` | 신규/재방문 도넛 차트 |
| `src/views/admin/default/components/TopPages.jsx` | 많이 방문한 페이지 Top10 (방문 수 + 비율 바 게이지) |
| `src/views/admin/default/components/BehaviorRates.jsx` | 이탈률 / 새로고침률 / 뒤로가기율 KPI 카드 3개 |
| `src/views/admin/default/components/TopActions.jsx` | 자주 하는 행동 Top10 (event_type별 집계, 이벤트 타입 뱃지) |
| `src/views/admin/default/components/TopReferrers.jsx` | 유입경로 Top5 (도넛 차트 + 목록) |

#### 수정된 파일

- **`src/views/admin/default/index.jsx`** — 전면 재작성
  - `DateRangePicker` 상단 배치
  - KPI 6개 카드: 방문자수 / 방문자당 페이지뷰 / 평균 체류시간 / 평균 스크롤 깊이 / 신규 방문 / 재방문
  - `useStableFetch`로 탭 전환 깜빡임 방지
  - 하단 섹션: 방문자&페이지뷰 추이 → 이탈지표 → 기기통계+방문유형 → 많이방문한페이지+자주하는행동 → 유입경로Top5

#### zaService.js 신규 함수 (`src/views/admin/zestAnalytics/services/zaService.js`)

| 함수 | 설명 |
|------|------|
| `getDashboardKPIs(params)` | 방문자수, 방문자당 페이지뷰, 평균 체류시간(time_on_page), 평균 스크롤 깊이, 신규/재방문 수 |
| `getDailyVisitorTrend(params)` | 일별 {date, visitors, pageviews} 배열, KST 기준 집계 |
| `getDeviceStats(params)` | 기기별 {device_type, count} 배열 |
| `getVisitorTypeStats(params)` | {newVisitors, returningVisitors} — session_end 우선, 없으면 pageview fallback |
| `getTopPages(params, limit=10)` | 페이지별 {page_url, pageviews, unique_visitors} 내림차순 |
| `getBehaviorRates(params)` | {bounceRate, refreshRate, backRate} — session_end + is_bounce 기준 |
| `getTopActions(params, limit=10)` | event_type + page_url 기준 행동 집계, event_name 컬럼 활용 |
| `getTopReferrers(params, limit=5)` | channel 컬럼 우선, 없으면 page_referrer 파싱하여 도메인 추출 |

#### 버그 수정

- **방문자당 페이지뷰 계산 오류** — `pageviews / uniqueSessions` → `pageviews / uniqueVisitors` 로 수정
- **is_new_visitor 타입 처리** — `true / 1 / '1' / 'true'` 모두 신규 방문으로 처리
- **ESLint: useColorModeValue in callback** — `TopActions.jsx`에서 `rowBorderColor` 변수로 추출
- **useStableFetch 호이스팅 에러** — `const fetchXxx` 정의 이후에 `useStableFetch` 호출하도록 순서 수정 (7개 파일 전체)

#### za_events 스키마 확인 (2026-04-05)

실제 컬럼명 확인으로 하기 버그 수정:
- `referrer` → `page_referrer` (컬럼명 달랐음)
- `element_text` — 존재하지 않음, `event_name` 으로 대체
- `channel` 컬럼 존재 확인 → 유입경로 그루핑에 우선 사용
- `is_new_visitor BOOLEAN`, `time_on_page INTEGER`, `scroll_depth INTEGER`, `visitor_id TEXT` 모두 확인
- `page_refresh`, `page_back` 이벤트 미수집 → 이탈/새로고침/뒤로가기 지표는 SDK 미지원으로 데이터 없음

---

## [4.5.0] 2026-04-02 (정상 작동 확인: 2026-04-03)

### UX 스크롤 히트맵 구현

#### 신규 기능

- **HeatmapViewer 컴포넌트** (`src/views/admin/zestAnalytics/components/HeatmapViewer.jsx`)
  - 좌측: iframe 실제 페이지 미리보기 + 우측에 56px 수직 컬러 바 (canvas 오버레이 없음)
  - 수직 바: 10% 구간별 COLD(파랑 #4a90d9) → HOT(빨강 #e53e3e) 그라디언트
  - 우측 통계 패널: 방문자 / 페이지뷰 / 평균 도달률 / 세션 수 KPI 카드
  - 도달 구간 카드: 25% / 50% / 75% / 100% 이상 도달률(%)
  - 도달률 추이 SVG 차트 (0~10% → 90~100% 구간별 도달 감소 트렌드)
  - 상단 필터: 전체/PC/MO 디바이스 탭 + 페이지 URL 드롭다운
  - 날짜 프리셋: 오늘/어제/최근 7일/최근 30일 + 직접 입력 + 적용 버튼
  - **자체 날짜 상태** (기본값: 오늘) — DateRangeContext 미사용
  - iframe 페이지 이동 감지: SDK postMessage(`za_pageview`) 수신 방식
    - 단, SDK가 CDN URL(`https://analytics.zestdot.com/sdk/za-sdk.js`)로 설치되어야 작동
    - HTTPS 사이트에서 `http://localhost` SDK URL은 Chrome PNA 정책으로 차단됨

- **UX 히트맵 독립 페이지** (`src/views/admin/heatmap/index.jsx`)
  - `/admin/heatmap` 경로, 사이드바에 "UX 히트맵" 메뉴 노출 (물방울 아이콘)
  - ZestAnalytics 탭과 완전 분리된 독립 페이지

- **ZestAnalytics.jsx 탭 구조**: 대시보드 / 추적 코드 관리 (2탭 유지, 히트맵 탭 없음)

#### SDK v1.4.0

| 항목 | 설명 |
|------|------|
| `scrollBuckets` 추가 | 10개 배열, `scrollBuckets[i] = 1` if scroll_depth >= i*10 |
| `_trackScrollDepth()` 확장 | 스크롤마다 10개 bucket 갱신 |
| `_sendSessionEnd()` 확장 | `scroll_buckets`, `device_type` 추가 전송 |
| `_resetSession()` 확장 | `scrollBuckets` 초기화 |
| `trackPageView()` 확장 | `window.parent.postMessage({ type: 'za_pageview', page_url })` 전송 (iframe 감지용) |

#### Supabase 변경사항 (`수퍼베이스_DB_세팅.md` Part 9)

- **`za_events` 컬럼 추가**: `scroll_buckets JSONB`
- **RPC 함수 2개 추가**: `get_scroll_heatmap`, `get_heatmap_page_list`
- **`za-collect-event` Edge Function 업데이트**: `scroll_buckets`, `device_type`(session_end 포함 전체 이벤트) 저장

#### zaService.js 신규 함수

| 함수 | 설명 |
|------|------|
| `getHeatmapPageList(params)` | `get_heatmap_page_list` RPC 호출, 데이터 있는 페이지 URL 목록 |
| `getScrollHeatmap(params)` | `get_scroll_heatmap` RPC 호출, 10개 bucket 도달률 |
| `getHeatmapPageStats(params)` | 방문자/페이지뷰/평균 도달률/구간별 도달률 요약 |

---

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
