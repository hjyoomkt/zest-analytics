# CLAUDE.md — 개발 주의사항

## SDK 수정 시 필수 규칙

### ⚠️ 반드시 `index.js`를 수정해야 함

**절대 `public/sdk/za-sdk.js`를 직접 수정하지 말 것.**

| 파일 | 역할 | 수정 가능 여부 |
|------|------|--------------|
| `src/views/admin/zestAnalytics/sdk/index.js` | **진짜 소스 파일** | ✅ 여기만 수정 |
| `public/sdk/za-sdk.js` | 빌드 산출물 (자동 생성) | ❌ 직접 수정 금지 |

**이유**: Vercel 빌드 명령이 `node src/views/admin/zestAnalytics/sdk/build.js && react-scripts build` 이므로, 빌드할 때마다 `index.js` 내용이 `public/sdk/za-sdk.js`를 덮어씀. `public/sdk/za-sdk.js`만 수정하면 배포 시 항상 구버전으로 복원됨.

> 이 규칙을 무시하고 `public/sdk/za-sdk.js`만 수정했다가 CDN이 계속 구버전을 서빙하는 문제가 발생했음 (2026-04-17 사고).

### SDK 수정 절차

```bash
# 1. 소스 파일 수정
# src/views/admin/zestAnalytics/sdk/index.js 수정

# 2. 로컬 빌드 (public/sdk/za-sdk.js 동기화)
node src/views/admin/zestAnalytics/sdk/build.js

# 3. 문법 검사
node --check public/sdk/za-sdk.js

# 4. 두 파일 함께 커밋
git add src/views/admin/zestAnalytics/sdk/index.js public/sdk/za-sdk.js
git commit -m "feat/fix: SDK ..."
git push
```

---

## SDK 채널 감지 로직

### 우선순위

```
1순위: Click ID (플랫폼 자동 부착, 가장 신뢰)
2순위: utm_source / utm_medium (광고주 설정)
3순위: document.referrer (fallback)
4순위: 'direct' (referrer 없음) / 'referral' (알 수 없음)
```

### Click ID 매핑

| 파라미터 | 플랫폼 | channel 값 |
|----------|--------|-----------|
| `gclid`, `gad_source`, `gad_campaignid` | Google 광고 | `google_ads` |
| `fbclid` | Meta(Facebook/Instagram) | `facebook` |
| `ttclid` | TikTok | `tiktok` |
| `twclid` | Twitter/X | `twitter` |
| `n_media`, `NaPm` | 네이버 광고 | `naver_ads` |
| `tb_clickid` | Taboola | `taboola` |
| `cto_pld` | Criteo | `criteo` |

### utm_source 매핑 예시

| utm_source | channel |
|-----------|---------|
| `google` | `google` 또는 `google_ads` (medium=cpc면 ads) |
| `naver` | `naver` 또는 `naver_ads` |
| `facebook`, `fb`, `meta` | `facebook` |
| `kakao` | `kakao` |
| `appier` 포함 | `appier` |
| `taboola` | `taboola` |
| `criteo` | `criteo` |

> **카카오**: 자체 click ID 없음. 반드시 `utm_source=kakao`로 설정해야 채널 인식됨.

### google vs google_ads 구분 이유

- `google`: 오가닉 자연유입 (무료, referrer=google.com)
- `google_ads`: 유료 광고 클릭 (gclid 또는 utm_medium=cpc)
- 광고비 ROI 분석을 위해 반드시 구분 필요

---

## Edge Function 수정

`za-collect-event.ts` 수정 후 반드시 Supabase에 재배포 필요:

```bash
supabase functions deploy za-collect-event
```

로컬 파일만 수정하고 배포 안 하면 운영 환경에 미반영.
