/**
 * ============================================================================
 * HeatmapViewer — UX 스크롤 히트맵
 * ============================================================================
 *
 * 레이아웃:
 *  - 상단: 디바이스 탭(전체/PC/MO) + 페이지 URL 드롭다운
 *  - 좌측: iframe + 우측에 vertical 스크롤 분포 canvas 바
 *  - 우측: 방문자/페이지뷰/평균 도달률/구간별 도달률 통계 카드
 */

import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import {
  Box, Flex, Text, Select, Button, ButtonGroup,
  SimpleGrid, Skeleton, useColorModeValue, Badge, Input, Tag,
} from '@chakra-ui/react';
import { getKSTToday, getKSTDaysAgo } from 'utils/dateUtils';
import {
  getHeatmapPageList,
  getScrollHeatmap,
  getHeatmapPageStats,
  getClickHeatmap,
  getClickTopElements,
} from '../services/zaService';

// COLD(파랑) → HOT(빨강) 그라디언트 색상 계산 (0~1)
function heatColor(ratio) {
  // 0 = COLD(#4a90d9 파랑), 0.5 = 노랑, 1 = HOT(#e53e3e 빨강)
  const r = Math.round(ratio < 0.5 ? 74 + (ratio * 2) * (255 - 74) : 255);
  const g = Math.round(
    ratio < 0.5
      ? 144 + (ratio * 2) * (200 - 144)
      : 200 - ((ratio - 0.5) * 2) * (200 - 62)
  );
  const b = Math.round(ratio < 0.5 ? 217 - (ratio * 2) * (217 - 0) : 0);
  return `rgb(${r},${g},${b})`;
}

// 디바이스 탭 → Supabase device_type 값 매핑
const DEVICE_MAP = {
  all: null,
  pc: 'desktop',
  mo: 'mobile',
};

const DATE_PRESETS = [
  { label: '오늘',      start: () => getKSTToday(),    end: () => getKSTToday() },
  { label: '어제',      start: () => getKSTDaysAgo(1), end: () => getKSTDaysAgo(1) },
  { label: '최근 7일',  start: () => getKSTDaysAgo(6), end: () => getKSTToday() },
  { label: '최근 30일', start: () => getKSTDaysAgo(29),end: () => getKSTToday() },
];

// ── 채널분리 목업 데이터 ──────────────────────────────────────────────────────

const MOCK_BASE = 'https://mock-demo.zest';

/** 채널별 raw URL 목록 (목업 페이지 전용) */
const MOCK_RAW_URLS = {
  google:   `${MOCK_BASE}/shop/spring-sale?utm_source=google&utm_medium=cpc&utm_campaign=spring2024`,
  naver:    `${MOCK_BASE}/shop/spring-sale?utm_source=naver&utm_medium=cpc&utm_campaign=봄_세일`,
  facebook: `${MOCK_BASE}/shop/spring-sale?utm_source=facebook&utm_medium=social&utm_campaign=retargeting`,
  kakao:    `${MOCK_BASE}/shop/spring-sale?utm_source=kakao&utm_medium=display`,
  direct:   `${MOCK_BASE}/shop/spring-sale`,
};

/** 목업 페이지 (pageList에 주입) */
const MOCK_PAGE = {
  page_url:      '/shop/spring-sale',
  session_count: 1247,
  avg_depth:     62,
  raw_urls:      Object.values(MOCK_RAW_URLS),
  _isMock:       true,
};

/** 채널별 스크롤 도달률 (bucket 0~9 = 0~10%, 10~20%, …) */
const MOCK_HEATMAP = {
  [MOCK_RAW_URLS.google]:   [88, 75, 68, 60, 51, 43, 32, 22, 14,  7],
  [MOCK_RAW_URLS.naver]:    [92, 83, 75, 67, 57, 47, 36, 26, 17, 10],
  [MOCK_RAW_URLS.facebook]: [78, 62, 48, 36, 25, 17, 11,  6,  3,  1],
  [MOCK_RAW_URLS.kakao]:    [72, 55, 40, 28, 18, 11,  7,  4,  2,  1],
  [MOCK_RAW_URLS.direct]:   [96, 90, 83, 75, 65, 55, 44, 34, 24, 15],
};

/** 채널별 페이지 통계 */
const MOCK_STATS = {
  [MOCK_RAW_URLS.google]:   { visitors: 412, pageviews: 534, avgScrollDepth: 58, totalSessions: 489, reach10: 88, reach20: 75, reach30: 68, reach40: 60, reach50: 51, reach60: 43, reach70: 32, reach80: 22, reach90: 14, reach100: 7  },
  [MOCK_RAW_URLS.naver]:    { visitors: 318, pageviews: 401, avgScrollDepth: 64, totalSessions: 372, reach10: 92, reach20: 83, reach30: 75, reach40: 67, reach50: 57, reach60: 47, reach70: 36, reach80: 26, reach90: 17, reach100: 10 },
  [MOCK_RAW_URLS.facebook]: { visitors: 201, pageviews: 247, avgScrollDepth: 31, totalSessions: 223, reach10: 78, reach20: 62, reach30: 48, reach40: 36, reach50: 25, reach60: 17, reach70: 11, reach80:  6, reach90:  3, reach100:  1 },
  [MOCK_RAW_URLS.kakao]:    { visitors: 158, pageviews: 189, avgScrollDepth: 26, totalSessions: 175, reach10: 72, reach20: 55, reach30: 40, reach40: 28, reach50: 18, reach60: 11, reach70:  7, reach80:  4, reach90:  2, reach100:  1 },
  [MOCK_RAW_URLS.direct]:   { visitors: 287, pageviews: 354, avgScrollDepth: 74, totalSessions: 330, reach10: 96, reach20: 90, reach30: 83, reach40: 75, reach50: 65, reach60: 55, reach70: 44, reach80: 34, reach90: 24, reach100: 15 },
};

/** raw URL → 목업 히트맵 데이터 (10 버킷 배열) */
function getMockHeatmapData(url) {
  const pcts = MOCK_HEATMAP[url];
  if (!pcts) return null;
  return pcts.map((reach_pct, i) => ({
    bucket_index:   i,
    reached_count:  Math.round((reach_pct / 100) * 500),
    total_count:    500,
    reach_pct,
  }));
}

const isMockUrl = (url) => url?.startsWith(MOCK_BASE);

export default function HeatmapViewer({
  advertiserId,
  availableAdvertiserIds,
}) {
  // 자체 날짜 상태 (기본값: 오늘)
  const [startDate, setStartDate] = useState(getKSTToday);
  const [endDate, setEndDate]     = useState(getKSTToday);
  const [inputStart, setInputStart] = useState(getKSTToday);
  const [inputEnd, setInputEnd]     = useState(getKSTToday);
  const [activePreset, setActivePreset] = useState('오늘');

  const applyDate = () => {
    setStartDate(inputStart);
    setEndDate(inputEnd);
    setActivePreset('직접설정');
  };

  const applyPreset = (preset) => {
    const s = preset.start();
    const e = preset.end();
    setStartDate(s);
    setEndDate(e);
    setInputStart(s);
    setInputEnd(e);
    setActivePreset(preset.label);
  };

  // 히트맵 모드: 'scroll' | 'scroll_channel' | 'click'
  const [heatmapMode, setHeatmapMode] = useState('scroll');

  // 채널 분리 모드 상태
  const [selectedChannelUrl, setSelectedChannelUrl] = useState('');
  const [channelHeatmapData, setChannelHeatmapData] = useState(null);
  const [channelPageStats, setChannelPageStats]     = useState(null);
  const [loadingChannelData, setLoadingChannelData] = useState(false);

  const [deviceTab, setDeviceTab] = useState('all');
  const [pageList, setPageList] = useState([]);
  const [selectedPage, setSelectedPage] = useState('');
  const [heatmapData, setHeatmapData] = useState(null);  // 10개 buckets
  const [pageStats, setPageStats] = useState(null);
  const [loadingPages, setLoadingPages] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // 클릭 히트맵 상태
  const [clickPoints, setClickPoints] = useState([]);      // [{click_x, click_y}]
  const [clickTopElements, setClickTopElements] = useState([]);
  const [loadingClick, setLoadingClick] = useState(false);
  const clickCanvasRef = useRef(null);

  const iframeRef = useRef(null);

  const cardBg = useColorModeValue('white', 'navy.800');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
  const textColor = useColorModeValue('gray.800', 'white');
  const subTextColor = useColorModeValue('gray.500', 'gray.400');
  const bgColor = useColorModeValue('gray.50', 'navy.900');

  const deviceType = DEVICE_MAP[deviceTab];

  // ── 페이지 목록 로드 ──────────────────────────────────────────────
  const loadPageList = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoadingPages(true);
    try {
      const list = await getHeatmapPageList({
        advertiserId,
        availableAdvertiserIds,
        startDate,
        endDate,
        deviceType,
      });
      // 목업 페이지 주입 (채널분리 UI 미리보기용)
      const listWithMock = [MOCK_PAGE, ...list];
      setPageList(listWithMock);
      if (listWithMock.length > 0) {
        setSelectedPage((prev) => {
          const stillExists = listWithMock.some((p) => p.page_url === prev);
          return stillExists ? prev : listWithMock[0].page_url;
        });
      } else {
        setSelectedPage('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPages(false);
    }
  }, [advertiserId, availableAdvertiserIds, startDate, endDate, deviceType]);

  // 선택된 페이지의 원본 URL 배열 (서비스 조회용)
  const selectedRawUrls = useMemo(() => {
    const item = pageList.find((p) => p.page_url === selectedPage);
    return item?.raw_urls?.length ? item.raw_urls : (selectedPage ? [selectedPage] : []);
  }, [pageList, selectedPage]);

  // ── 히트맵 + 통계 로드 ───────────────────────────────────────────
  const loadHeatmapData = useCallback(async () => {
    if (!selectedPage || !startDate || !endDate || selectedRawUrls.length === 0) return;
    setLoadingData(true);
    try {
      const [hm, stats] = await Promise.all([
        getScrollHeatmap({
          advertiserId,
          availableAdvertiserIds,
          pageUrls: selectedRawUrls,
          startDate,
          endDate,
          deviceType,
        }),
        getHeatmapPageStats({
          advertiserId,
          availableAdvertiserIds,
          pageUrls: selectedRawUrls,
          startDate,
          endDate,
          deviceType,
        }),
      ]);
      setHeatmapData(hm);
      setPageStats(stats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingData(false);
    }
  }, [advertiserId, availableAdvertiserIds, selectedRawUrls, startDate, endDate, deviceType]);

  // ── 클릭 히트맵 로드 ──────────────────────────────────────────────
  const loadClickData = useCallback(async () => {
    if (!selectedPage || !startDate || !endDate || selectedRawUrls.length === 0) return;
    setLoadingClick(true);
    try {
      const [points, topEls] = await Promise.all([
        getClickHeatmap({
          advertiserId,
          availableAdvertiserIds,
          pageUrls: selectedRawUrls,
          startDate,
          endDate,
          deviceType,
        }),
        getClickTopElements({
          advertiserId,
          availableAdvertiserIds,
          pageUrls: selectedRawUrls,
          startDate,
          endDate,
          deviceType,
        }),
      ]);
      setClickPoints(points);
      setClickTopElements(topEls);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingClick(false);
    }
  }, [advertiserId, availableAdvertiserIds, selectedRawUrls, startDate, endDate, deviceType]);

  useEffect(() => { loadPageList(); }, [loadPageList]);
  useEffect(() => { if (selectedPage) loadHeatmapData(); }, [loadHeatmapData]);
  useEffect(() => { if (selectedPage && heatmapMode === 'click') loadClickData(); }, [loadClickData, heatmapMode, selectedPage]);

  // ── 클릭 Canvas 렌더링 ────────────────────────────────────────────
  useEffect(() => {
    const canvas = clickCanvasRef.current;
    if (!canvas || heatmapMode !== 'click') return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    if (clickPoints.length === 0) return;

    // 가우시안 블러 히트맵: 각 포인트를 radialGradient로 합산
    const RADIUS = Math.min(W, H) * 0.06; // 반경 6%
    clickPoints.forEach(({ click_x, click_y }) => {
      const x = click_x * W;
      const y = click_y * H;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, RADIUS);
      grad.addColorStop(0,   'rgba(255,0,0,0.18)');
      grad.addColorStop(0.4, 'rgba(255,165,0,0.08)');
      grad.addColorStop(1,   'rgba(0,0,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, RADIUS, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [clickPoints, heatmapMode]);

  // ── SDK postMessage 수신 → iframe 페이지 전환 감지 ────────────────
  useEffect(() => {
    const handler = (event) => {
      if (event.data?.type !== 'za_pageview' || !event.data?.page_url) return;
      const newUrl = event.data.page_url;
      // 드롭다운에 없으면 추가
      setPageList((prev) => {
        if (!prev.some((p) => p.page_url === newUrl)) {
          return [{ page_url: newUrl, session_count: 0, avg_depth: 0 }, ...prev];
        }
        return prev;
      });
      setSelectedPage(newUrl);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // ── 통계 카드 색상 ────────────────────────────────────────────────
  const reachColor = (pct) => {
    if (pct >= 60) return 'green.500';
    if (pct >= 30) return 'orange.400';
    return 'red.400';
  };

  // ── 도달률 추이 데이터 (10% 구간) ────────────────────────────────
  const trendPoints = heatmapData
    ? heatmapData.map((d) => d.reach_pct)
    : Array(10).fill(0);

  // iframe은 실제 고객 사이트 전체 URL이 필요하므로 raw_urls[0] 사용
  const iframeUrl = useMemo(() => {
    const rawUrl = selectedRawUrls[0];
    if (!rawUrl) return 'about:blank';
    try {
      const u = new URL(rawUrl);
      u.searchParams.set('za_preview', '1');
      return u.toString();
    } catch {
      return rawUrl;
    }
  }, [selectedRawUrls]);

  // ── 채널 분리 모드 ────────────────────────────────────────────────

  /** URL의 UTM 파라미터를 파싱해 채널 정보 반환 */
  const parseChannel = (url) => {
    try {
      const base = url.includes('://') ? url : `https://x.com${url}`;
      const u = new URL(base);
      return {
        source:   u.searchParams.get('utm_source')   || null,
        medium:   u.searchParams.get('utm_medium')   || null,
        campaign: u.searchParams.get('utm_campaign') || null,
      };
    } catch {
      return { source: null, medium: null, campaign: null };
    }
  };

  /** 선택된 정규화 페이지의 raw URL 목록을 채널 옵션으로 변환 */
  const channelOptions = useMemo(() => {
    const item = pageList.find((p) => p.page_url === selectedPage);
    if (!item?.raw_urls?.length) return [];
    return item.raw_urls.map((url) => {
      const { source, medium, campaign } = parseChannel(url);
      const label = source
        ? [source, medium, campaign].filter(Boolean).join(' / ')
        : '직접 방문 (Direct)';
      return { url, source, medium, campaign, label };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageList, selectedPage]);

  // 채널 선택이 바뀌면 초기화 후 첫 번째 채널 자동 선택
  useEffect(() => {
    if (channelOptions.length > 0) {
      setSelectedChannelUrl(channelOptions[0].url);
    } else {
      setSelectedChannelUrl('');
    }
    setChannelHeatmapData(null);
    setChannelPageStats(null);
  }, [channelOptions]);

  const channelIframeUrl = useMemo(() => {
    if (!selectedChannelUrl) return 'about:blank';
    try {
      const u = new URL(selectedChannelUrl);
      u.searchParams.set('za_preview', '1');
      return u.toString();
    } catch {
      return selectedChannelUrl;
    }
  }, [selectedChannelUrl]);

  const loadChannelData = useCallback(async () => {
    if (!selectedChannelUrl || !startDate || !endDate) return;
    setLoadingChannelData(true);
    try {
      // 목업 URL이면 실제 API 호출 없이 mock 데이터 반환
      if (isMockUrl(selectedChannelUrl)) {
        await new Promise((r) => setTimeout(r, 400)); // 로딩 애니메이션 체험
        setChannelHeatmapData(getMockHeatmapData(selectedChannelUrl));
        setChannelPageStats(MOCK_STATS[selectedChannelUrl] ?? null);
        return;
      }

      const [hm, stats] = await Promise.all([
        getScrollHeatmap({
          advertiserId,
          availableAdvertiserIds,
          pageUrls: [selectedChannelUrl],
          startDate,
          endDate,
          deviceType,
        }),
        getHeatmapPageStats({
          advertiserId,
          availableAdvertiserIds,
          pageUrls: [selectedChannelUrl],
          startDate,
          endDate,
          deviceType,
        }),
      ]);
      setChannelHeatmapData(hm);
      setChannelPageStats(stats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingChannelData(false);
    }
  }, [advertiserId, availableAdvertiserIds, selectedChannelUrl, startDate, endDate, deviceType]);

  useEffect(() => { if (selectedChannelUrl && heatmapMode === 'scroll_channel') loadChannelData(); }, [loadChannelData, selectedChannelUrl, heatmapMode]);

  return (
    <Box>
      {/* ── 히트맵 모드 탭 ── */}
      <Flex mb="16px" gap="8px" flexWrap="wrap">
        {[
          { key: 'scroll',         label: '스크롤 히트맵',        blocked: false },
          { key: 'scroll_channel', label: '스크롤 히트맵(채널분리)', blocked: false },
          { key: 'click',          label: '클릭 히트맵',           blocked: true  },
        ].map(({ key, label, blocked }) => (
          <Button
            key={key}
            size="sm"
            onClick={() => {
              if (blocked) { alert('클릭 히트맵은 현재 서비스 준비중입니다.'); return; }
              setHeatmapMode(key);
            }}
            bg={heatmapMode === key ? 'brand.500' : cardBg}
            color={heatmapMode === key ? 'white' : textColor}
            border="1px solid"
            borderColor={heatmapMode === key ? 'brand.500' : borderColor}
            borderRadius="full"
            px="20px"
            fontWeight={heatmapMode === key ? '700' : '400'}
            _hover={{ bg: heatmapMode === key ? 'brand.600' : bgColor }}
          >
            {label}
          </Button>
        ))}
      </Flex>

      {/* ── 필터 바 ── */}
      <Box
        bg={cardBg}
        border="1px solid"
        borderColor={borderColor}
        borderRadius="16px"
        p="14px 20px"
        mb="20px"
      >
        {/* 1행: 디바이스 탭 + 날짜 프리셋 */}
        <Flex align="center" wrap="wrap" gap="10px" mb="10px">
          {/* 디바이스 탭 */}
          <ButtonGroup size="sm" isAttached variant="outline">
            {[
              { key: 'all', label: '전체' },
              { key: 'pc',  label: 'PC'  },
              { key: 'mo',  label: 'MO'  },
            ].map(({ key, label }) => (
              <Button
                key={key}
                onClick={() => setDeviceTab(key)}
                bg={deviceTab === key ? 'brand.500' : 'transparent'}
                color={deviceTab === key ? 'white' : textColor}
                borderColor={deviceTab === key ? 'brand.500' : borderColor}
                borderRadius="full"
                px="16px"
                _hover={{ bg: deviceTab === key ? 'brand.600' : bgColor }}
              >
                {label}
              </Button>
            ))}
          </ButtonGroup>

          {/* 날짜 프리셋 */}
          <ButtonGroup size="sm" variant="outline" spacing="6px">
            {DATE_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                onClick={() => applyPreset(preset)}
                bg={activePreset === preset.label ? 'brand.500' : 'transparent'}
                color={activePreset === preset.label ? 'white' : textColor}
                borderColor={activePreset === preset.label ? 'brand.500' : borderColor}
                borderRadius="full"
                px="14px"
                _hover={{ bg: activePreset === preset.label ? 'brand.600' : bgColor }}
              >
                {preset.label}
              </Button>
            ))}
          </ButtonGroup>

          {/* 날짜 직접 입력 */}
          <Flex align="center" gap="6px" flex="1" minW="280px">
            <Input
              type="date"
              size="sm"
              borderRadius="10px"
              value={inputStart}
              onChange={(e) => setInputStart(e.target.value)}
              max={inputEnd}
            />
            <Text fontSize="13px" color={subTextColor} flexShrink={0}>~</Text>
            <Input
              type="date"
              size="sm"
              borderRadius="10px"
              value={inputEnd}
              onChange={(e) => setInputEnd(e.target.value)}
              min={inputStart}
            />
            <Button
              size="sm"
              colorScheme="brand"
              borderRadius="10px"
              flexShrink={0}
              onClick={applyDate}
            >
              적용
            </Button>
          </Flex>
        </Flex>

        {/* 2행: 페이지 URL 드롭다운 */}
        <Select
          size="sm"
          borderRadius="10px"
          value={selectedPage}
          onChange={(e) => setSelectedPage(e.target.value)}
          isDisabled={loadingPages || pageList.length === 0}
          placeholder={
            loadingPages
              ? '페이지 로딩 중...'
              : pageList.length === 0
              ? `데이터 없음 (${startDate} ~ ${endDate})`
              : undefined
          }
        >
          {pageList.map((p) => {
            const displayUrl = (() => { try { return decodeURIComponent(p.page_url); } catch { return p.page_url; } })();
            const variantNote = p.raw_urls?.length > 1 ? ` · URL 변형 ${p.raw_urls.length}개` : '';
            const mockNote = p._isMock ? '[데모] ' : '';
            return (
              <option key={p.page_url} value={p.page_url}>
                {mockNote}{displayUrl} ({p.session_count}세션{variantNote})
              </option>
            );
          })}
        </Select>
      </Box>

      {/* ── 메인 콘텐츠 ── */}
      {heatmapMode === 'scroll' ? (
        /* ════════════ 스크롤 히트맵 (전체 합산) ════════════ */
        <Flex gap="20px" align="flex-start" wrap={{ base: 'wrap', xl: 'nowrap' }}>
          {/* 좌측: iframe + 수직 히트맵 바 */}
          <Box
            flex="1"
            minW={{ base: '100%', xl: '0' }}
            bg={cardBg}
            border="1px solid"
            borderColor={borderColor}
            borderRadius="16px"
            overflow="hidden"
          >
            <Flex px="16px" py="10px" borderBottom="1px solid" borderColor={borderColor} align="center" justify="space-between">
              <Text fontSize="13px" color={subTextColor} noOfLines={1} flex="1" mr="8px">
                {selectedPage ? (
                  <>
                    <Text as="span" fontWeight="600" color={textColor}>
                      {(() => { try { return new URL(selectedRawUrls[0]).hostname; } catch { return ''; } })()}
                    </Text>
                    <Text as="span">
                      {selectedPage}
                    </Text>
                  </>
                ) : '페이지를 선택하세요'}
              </Text>
              <Text fontSize="12px" color={subTextColor}>{startDate}</Text>
            </Flex>

            <Flex>
              <Box flex="1" minH="600px" bg="white">
                {selectedPage ? (
                  <Box
                    as="iframe"
                    ref={iframeRef}
                    src={iframeUrl}
                    width="100%"
                    height="600px"
                    border="none"
                    title="page-preview"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  />
                ) : (
                  <Flex align="center" justify="center" h="600px" color={subTextColor}>
                    <Text>좌측 드롭다운에서 페이지를 선택하세요</Text>
                  </Flex>
                )}
              </Box>

              {/* 수직 스크롤 분포 바 */}
              <Box w="56px" h="600px" position="relative" borderLeft="1px solid" borderColor={borderColor} flexShrink={0}>
                <Text position="absolute" top="4px" left="50%" transform="translateX(-50%)" fontSize="9px" color="red.400" fontWeight="700" letterSpacing="0.5px">HOT</Text>
                <Text position="absolute" bottom="4px" left="50%" transform="translateX(-50%)" fontSize="9px" color="blue.400" fontWeight="700" letterSpacing="0.5px">COLD</Text>
                {loadingData ? (
                  <Skeleton w="100%" h="100%" />
                ) : (
                  (heatmapData || Array(10).fill({ reach_pct: 0 })).map((d, i) => {
                    const ratio = (d.reach_pct || 0) / 100;
                    return (
                      <Box
                        key={i}
                        position="absolute"
                        left="0" right="0"
                        top={`${i * 10}%`}
                        height="10%"
                        bg={heatColor(ratio)}
                        title={`스크롤 ${i * 10}~${(i + 1) * 10}%: ${d.reach_pct || 0}% 도달`}
                        cursor="pointer"
                      />
                    );
                  })
                )}
              </Box>
            </Flex>

            <Flex px="16px" py="10px" align="center" gap="8px" borderTop="1px solid" borderColor={borderColor}>
              <Text fontSize="11px" color="blue.400" fontWeight="600">COLD</Text>
              <Box flex="1" h="8px" borderRadius="4px" bgGradient="linear(to-r, blue.300, yellow.300, red.400)" />
              <Text fontSize="11px" color="red.400" fontWeight="600">HOT</Text>
            </Flex>
          </Box>

          {/* 우측: 통계 카드 */}
          <Box w={{ base: '100%', xl: '320px' }} flexShrink={0}>
            <SimpleGrid columns={2} spacing="12px" mb="12px">
              {[
                { label: '이 페이지 방문자', value: loadingData ? null : (pageStats?.visitors ?? '-') },
                { label: '페이지뷰', value: loadingData ? null : (pageStats?.pageviews ?? '-') },
                { label: '평균 도달률', value: loadingData ? null : (pageStats ? `${pageStats.avgScrollDepth}%` : '-') },
                { label: '세션 수', value: loadingData ? null : (pageStats?.totalSessions ?? '-') },
              ].map(({ label, value }) => (
                <Box key={label} bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="16px" p="16px">
                  <Text fontSize="12px" color={subTextColor} mb="4px">{label}</Text>
                  {value === null ? <Skeleton h="28px" borderRadius="6px" /> : <Text fontSize="24px" fontWeight="700" color={textColor}>{value}</Text>}
                </Box>
              ))}
            </SimpleGrid>

            <Box bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="16px" p="16px" mb="12px">
              <Flex align="center" justify="space-between" mb="12px">
                <Text fontSize="14px" fontWeight="600" color={textColor}>도달 구간</Text>
                <Badge colorScheme={deviceTab === 'pc' ? 'blue' : deviceTab === 'mo' ? 'green' : 'gray'} borderRadius="full" px="8px" fontSize="10px">
                  {deviceTab === 'all' ? '전체' : deviceTab.toUpperCase()}
                </Badge>
              </Flex>
              <Flex direction="column" gap="6px">
                {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((threshold) => {
                  const key = `reach${threshold}`;
                  const pct = pageStats?.[key] ?? 0;
                  const sessions = pageStats ? Math.round((pct / 100) * pageStats.totalSessions) : 0;
                  return (
                    <Box key={threshold}>
                      <Flex justify="space-between" align="center" mb="2px">
                        <Text fontSize="11px" color={subTextColor}>{threshold}% 이상</Text>
                        {loadingData ? (
                          <Skeleton h="14px" w="60px" borderRadius="4px" />
                        ) : (
                          <Flex align="center" gap="6px">
                            <Text fontSize="11px" color={subTextColor}>{sessions}명</Text>
                            <Text fontSize="12px" fontWeight="700" color={reachColor(pct)} w="38px" textAlign="right">{pct}%</Text>
                          </Flex>
                        )}
                      </Flex>
                      {loadingData ? (
                        <Skeleton h="4px" borderRadius="full" />
                      ) : (
                        <Box bg={bgColor} borderRadius="full" h="4px">
                          <Box
                            bg={reachColor(pct)}
                            borderRadius="full"
                            h="4px"
                            w={`${pct}%`}
                            transition="width 0.3s ease"
                          />
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Flex>
            </Box>

            <Box bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="16px" p="16px">
              <Flex align="center" justify="space-between" mb="8px">
                <Text fontSize="14px" fontWeight="600" color={textColor}>도달률 추이</Text>
                <Text fontSize="11px" color={subTextColor}>
                  {selectedPage || ''}
                </Text>
              </Flex>
              <TrendChart data={trendPoints} loading={loadingData} />
              <Flex justify="space-between" mt="4px">
                <Text fontSize="10px" color={subTextColor}>0%</Text>
                <Text fontSize="10px" color={subTextColor}>100%</Text>
              </Flex>
            </Box>
          </Box>
        </Flex>
      ) : heatmapMode === 'scroll_channel' ? (
        /* ════════════ 스크롤 히트맵 (채널 분리) ════════════ */
        <Box>
          {/* 채널 선택 카드 */}
          {selectedPage && (
            <Box
              bg={cardBg}
              border="1px solid"
              borderColor={borderColor}
              borderRadius="16px"
              p="14px 20px"
              mb="20px"
            >
              <Text fontSize="12px" fontWeight="600" color={subTextColor} mb="10px">
                채널 선택 — {channelOptions.length}개 유입 경로
              </Text>
              {channelOptions.length === 0 ? (
                <Text fontSize="12px" color={subTextColor}>
                  이 페이지에 채널 변형 데이터가 없습니다.
                </Text>
              ) : (
                <Flex gap="8px" flexWrap="wrap">
                  {channelOptions.map((opt) => {
                    const isSelected = selectedChannelUrl === opt.url;
                    return (
                      <Box
                        key={opt.url}
                        px="14px"
                        py="8px"
                        borderRadius="10px"
                        border="2px solid"
                        borderColor={isSelected ? 'brand.500' : borderColor}
                        bg={isSelected ? 'brand.50' : cardBg}
                        cursor="pointer"
                        onClick={() => setSelectedChannelUrl(opt.url)}
                        _hover={{ borderColor: 'brand.400' }}
                        transition="all 0.15s"
                        _dark={{ bg: isSelected ? 'whiteAlpha.100' : 'navy.800' }}
                      >
                        <Text
                          fontSize="13px"
                          fontWeight={isSelected ? '700' : '500'}
                          color={isSelected ? 'brand.500' : textColor}
                          mb="2px"
                        >
                          {opt.label}
                        </Text>
                        {opt.campaign && (
                          <Text fontSize="10px" color={subTextColor} noOfLines={1} maxW="200px">
                            캠페인: {opt.campaign}
                          </Text>
                        )}
                        {!opt.source && (
                          <Text fontSize="10px" color={subTextColor}>UTM 없는 직접 유입</Text>
                        )}
                      </Box>
                    );
                  })}
                </Flex>
              )}
            </Box>
          )}

          {/* 히트맵 + 통계 (스크롤 히트맵과 동일한 레이아웃) */}
          <Flex gap="20px" align="flex-start" wrap={{ base: 'wrap', xl: 'nowrap' }}>
            {/* 좌측: iframe + 수직 히트맵 바 */}
            <Box
              flex="1"
              minW={{ base: '100%', xl: '0' }}
              bg={cardBg}
              border="1px solid"
              borderColor={borderColor}
              borderRadius="16px"
              overflow="hidden"
            >
              <Flex px="16px" py="10px" borderBottom="1px solid" borderColor={borderColor} align="center" justify="space-between">
                <Text fontSize="13px" color={subTextColor} noOfLines={1} flex="1" mr="8px">
                  {selectedChannelUrl ? (
                    <>
                      <Text as="span" fontWeight="600" color={textColor}>
                        {(() => { try { return new URL(selectedChannelUrl).hostname; } catch { return ''; } })()}
                      </Text>
                      <Text as="span">{selectedPage}</Text>
                    </>
                  ) : '페이지를 선택하세요'}
                </Text>
                {selectedChannelUrl && (
                  <Badge colorScheme="brand" fontSize="10px" borderRadius="full" px="8px">
                    {channelOptions.find((o) => o.url === selectedChannelUrl)?.label ?? ''}
                  </Badge>
                )}
              </Flex>

              <Flex>
                <Box flex="1" minH="600px" bg="white">
                  {selectedChannelUrl ? (
                    <Box
                      as="iframe"
                      src={channelIframeUrl}
                      width="100%"
                      height="600px"
                      border="none"
                      title="page-preview-channel"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    />
                  ) : (
                    <Flex align="center" justify="center" h="600px" color={subTextColor}>
                      <Text>페이지를 선택하세요</Text>
                    </Flex>
                  )}
                </Box>

                {/* 수직 스크롤 분포 바 */}
                <Box w="56px" h="600px" position="relative" borderLeft="1px solid" borderColor={borderColor} flexShrink={0}>
                  <Text position="absolute" top="4px" left="50%" transform="translateX(-50%)" fontSize="9px" color="red.400" fontWeight="700" letterSpacing="0.5px">HOT</Text>
                  <Text position="absolute" bottom="4px" left="50%" transform="translateX(-50%)" fontSize="9px" color="blue.400" fontWeight="700" letterSpacing="0.5px">COLD</Text>
                  {loadingChannelData ? (
                    <Skeleton w="100%" h="100%" />
                  ) : (
                    (channelHeatmapData || Array(10).fill({ reach_pct: 0 })).map((d, i) => {
                      const ratio = (d.reach_pct || 0) / 100;
                      return (
                        <Box
                          key={i}
                          position="absolute"
                          left="0" right="0"
                          top={`${i * 10}%`}
                          height="10%"
                          bg={heatColor(ratio)}
                          title={`스크롤 ${i * 10}~${(i + 1) * 10}%: ${d.reach_pct || 0}% 도달`}
                          cursor="pointer"
                        />
                      );
                    })
                  )}
                </Box>
              </Flex>

              <Flex px="16px" py="10px" align="center" gap="8px" borderTop="1px solid" borderColor={borderColor}>
                <Text fontSize="11px" color="blue.400" fontWeight="600">COLD</Text>
                <Box flex="1" h="8px" borderRadius="4px" bgGradient="linear(to-r, blue.300, yellow.300, red.400)" />
                <Text fontSize="11px" color="red.400" fontWeight="600">HOT</Text>
              </Flex>
            </Box>

            {/* 우측: 통계 카드 */}
            <Box w={{ base: '100%', xl: '320px' }} flexShrink={0}>
              <SimpleGrid columns={2} spacing="12px" mb="12px">
                {[
                  { label: '이 채널 방문자',  value: loadingChannelData ? null : (channelPageStats?.visitors ?? '-') },
                  { label: '페이지뷰',        value: loadingChannelData ? null : (channelPageStats?.pageviews ?? '-') },
                  { label: '평균 도달률',     value: loadingChannelData ? null : (channelPageStats ? `${channelPageStats.avgScrollDepth}%` : '-') },
                  { label: '세션 수',         value: loadingChannelData ? null : (channelPageStats?.totalSessions ?? '-') },
                ].map(({ label, value }) => (
                  <Box key={label} bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="16px" p="16px">
                    <Text fontSize="12px" color={subTextColor} mb="4px">{label}</Text>
                    {value === null ? <Skeleton h="28px" borderRadius="6px" /> : <Text fontSize="24px" fontWeight="700" color={textColor}>{value}</Text>}
                  </Box>
                ))}
              </SimpleGrid>

              <Box bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="16px" p="16px" mb="12px">
                <Flex align="center" justify="space-between" mb="12px">
                  <Text fontSize="14px" fontWeight="600" color={textColor}>도달 구간</Text>
                  <Badge colorScheme={deviceTab === 'pc' ? 'blue' : deviceTab === 'mo' ? 'green' : 'gray'} borderRadius="full" px="8px" fontSize="10px">
                    {deviceTab === 'all' ? '전체' : deviceTab.toUpperCase()}
                  </Badge>
                </Flex>
                <Flex direction="column" gap="6px">
                  {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((threshold) => {
                    const key = `reach${threshold}`;
                    const pct = channelPageStats?.[key] ?? 0;
                    const sessions = channelPageStats ? Math.round((pct / 100) * channelPageStats.totalSessions) : 0;
                    return (
                      <Box key={threshold}>
                        <Flex justify="space-between" align="center" mb="2px">
                          <Text fontSize="11px" color={subTextColor}>{threshold}% 이상</Text>
                          {loadingChannelData ? (
                            <Skeleton h="14px" w="60px" borderRadius="4px" />
                          ) : (
                            <Flex align="center" gap="6px">
                              <Text fontSize="11px" color={subTextColor}>{sessions}명</Text>
                              <Text fontSize="12px" fontWeight="700" color={reachColor(pct)} w="38px" textAlign="right">{pct}%</Text>
                            </Flex>
                          )}
                        </Flex>
                        {loadingChannelData ? (
                          <Skeleton h="4px" borderRadius="full" />
                        ) : (
                          <Box bg={bgColor} borderRadius="full" h="4px">
                            <Box
                              bg={reachColor(pct)}
                              borderRadius="full"
                              h="4px"
                              w={`${pct}%`}
                              transition="width 0.3s ease"
                            />
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Flex>
              </Box>

              <Box bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="16px" p="16px">
                <Flex align="center" justify="space-between" mb="8px">
                  <Text fontSize="14px" fontWeight="600" color={textColor}>도달률 추이</Text>
                  <Text fontSize="11px" color={subTextColor} noOfLines={1} maxW="140px">
                    {channelOptions.find((o) => o.url === selectedChannelUrl)?.label ?? ''}
                  </Text>
                </Flex>
                <TrendChart
                  data={channelHeatmapData ? channelHeatmapData.map((d) => d.reach_pct) : Array(10).fill(0)}
                  loading={loadingChannelData}
                />
                <Flex justify="space-between" mt="4px">
                  <Text fontSize="10px" color={subTextColor}>0%</Text>
                  <Text fontSize="10px" color={subTextColor}>100%</Text>
                </Flex>
              </Box>
            </Box>
          </Flex>
        </Box>
      ) : (
        /* ════════════ 클릭 히트맵 ════════════ */
        <Flex gap="20px" align="flex-start" wrap={{ base: 'wrap', xl: 'nowrap' }}>
          {/* 좌측: iframe + canvas 오버레이 */}
          <Box
            flex="1"
            minW={{ base: '100%', xl: '0' }}
            bg={cardBg}
            border="1px solid"
            borderColor={borderColor}
            borderRadius="16px"
            overflow="hidden"
          >
            <Flex px="16px" py="10px" borderBottom="1px solid" borderColor={borderColor} align="center" justify="space-between">
              <Text fontSize="13px" color={subTextColor} noOfLines={1} flex="1" mr="8px">
                {selectedPage ? (
                  <>
                    <Text as="span" fontWeight="600" color={textColor}>
                      {(() => { try { return new URL(selectedRawUrls[0]).hostname; } catch { return ''; } })()}
                    </Text>
                    <Text as="span">
                      {selectedPage}
                    </Text>
                  </>
                ) : '페이지를 선택하세요'}
              </Text>
              <Text fontSize="12px" color={subTextColor}>
                {loadingClick ? '로딩 중...' : `${clickPoints.length}개 클릭`}
              </Text>
            </Flex>

            {/* iframe + canvas 오버레이 */}
            <Box position="relative" minH="600px" bg="white">
              {selectedPage ? (
                <Box
                  as="iframe"
                  src={iframeUrl}
                  width="100%"
                  height="600px"
                  border="none"
                  title="page-preview-click"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              ) : (
                <Flex align="center" justify="center" h="600px" color={subTextColor}>
                  <Text>좌측 드롭다운에서 페이지를 선택하세요</Text>
                </Flex>
              )}
              {/* 클릭 히트맵 캔버스 오버레이 */}
              {selectedPage && (
                <Box
                  as="canvas"
                  ref={clickCanvasRef}
                  width={800}
                  height={600}
                  position="absolute"
                  top="0"
                  left="0"
                  w="100%"
                  h="600px"
                  pointerEvents="none"
                  style={{ mixBlendMode: 'multiply' }}
                />
              )}
              {loadingClick && (
                <Flex
                  position="absolute"
                  top="0" left="0" right="0" bottom="0"
                  align="center"
                  justify="center"
                  bg="blackAlpha.200"
                >
                  <Text fontSize="14px" color="white" fontWeight="600" bg="blackAlpha.600" px="16px" py="8px" borderRadius="8px">
                    클릭 데이터 로딩 중...
                  </Text>
                </Flex>
              )}
            </Box>

            {/* 범례 */}
            <Flex px="16px" py="10px" align="center" gap="8px" borderTop="1px solid" borderColor={borderColor}>
              <Text fontSize="11px" color="blue.400" fontWeight="600">적음</Text>
              <Box flex="1" h="8px" borderRadius="4px" bgGradient="linear(to-r, blue.200, yellow.300, red.500)" />
              <Text fontSize="11px" color="red.400" fontWeight="600">많음</Text>
            </Flex>
          </Box>

          {/* 우측: 클릭 통계 */}
          <Box w={{ base: '100%', xl: '320px' }} flexShrink={0}>
            {/* 총 클릭 수 카드 */}
            <SimpleGrid columns={2} spacing="12px" mb="12px">
              {[
                { label: '총 클릭 수', value: loadingClick ? null : clickPoints.length },
                { label: '클릭된 요소 종류', value: loadingClick ? null : clickTopElements.length },
              ].map(({ label, value }) => (
                <Box key={label} bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="16px" p="16px">
                  <Text fontSize="12px" color={subTextColor} mb="4px">{label}</Text>
                  {value === null ? <Skeleton h="28px" borderRadius="6px" /> : <Text fontSize="24px" fontWeight="700" color={textColor}>{value}</Text>}
                </Box>
              ))}
            </SimpleGrid>

            {/* 많이 클릭된 요소 TOP 10 */}
            <Box bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="16px" p="16px">
              <Flex align="center" justify="space-between" mb="12px">
                <Text fontSize="14px" fontWeight="600" color={textColor}>많이 클릭된 요소</Text>
                <Badge colorScheme={deviceTab === 'pc' ? 'blue' : deviceTab === 'mo' ? 'green' : 'gray'} borderRadius="full" px="8px" fontSize="10px">
                  {deviceTab === 'all' ? '전체' : deviceTab.toUpperCase()}
                </Badge>
              </Flex>

              {loadingClick ? (
                <Flex direction="column" gap="8px">
                  {Array(5).fill(0).map((_, i) => <Skeleton key={i} h="48px" borderRadius="8px" />)}
                </Flex>
              ) : clickTopElements.length === 0 ? (
                <Flex align="center" justify="center" h="120px" direction="column" gap="8px">
                  <Text fontSize="13px" color={subTextColor}>클릭 데이터가 없습니다</Text>
                  <Text fontSize="11px" color={subTextColor}>SDK 클릭 수집을 활성화해주세요</Text>
                </Flex>
              ) : (
                <Flex direction="column" gap="8px">
                  {clickTopElements.map((el, i) => {
                    const maxCount = clickTopElements[0]?.click_count || 1;
                    const barPct = Math.round((el.click_count / maxCount) * 100);
                    return (
                      <Box key={i} position="relative">
                        {/* 배경 진행 바 */}
                        <Box
                          position="absolute"
                          top="0" left="0" bottom="0"
                          w={`${barPct}%`}
                          bg="brand.50"
                          borderRadius="8px"
                          transition="width 0.3s"
                        />
                        <Flex
                          position="relative"
                          align="center"
                          justify="space-between"
                          px="10px"
                          py="8px"
                          borderRadius="8px"
                          border="1px solid"
                          borderColor={borderColor}
                        >
                          <Flex align="center" gap="8px" flex="1" minW="0">
                            <Text fontSize="13px" fontWeight="700" color="brand.500" flexShrink={0}>#{i + 1}</Text>
                            <Box flex="1" minW="0">
                              <Flex align="center" gap="4px" mb="2px">
                                <Tag size="sm" colorScheme="gray" fontSize="10px" px="6px" py="1px" borderRadius="4px">
                                  {el.element_tag || 'div'}
                                </Tag>
                                <Text fontSize="12px" color={textColor} noOfLines={1}>
                                  {el.element_text || el.element_selector || '(텍스트 없음)'}
                                </Text>
                              </Flex>
                              {el.element_selector && (
                                <Text fontSize="10px" color={subTextColor} noOfLines={1} fontFamily="mono">
                                  {el.element_selector}
                                </Text>
                              )}
                            </Box>
                          </Flex>
                          <Text fontSize="14px" fontWeight="700" color={textColor} flexShrink={0} ml="8px">
                            {el.click_count}
                          </Text>
                        </Flex>
                      </Box>
                    );
                  })}
                </Flex>
              )}
            </Box>
          </Box>
        </Flex>
      )}
    </Box>
  );
}

/** SVG 도달률 추이 라인 차트 */
function TrendChart({ data, loading }) {
  const W = 280;
  const H = 80;
  const PAD = 6;

  if (loading) return <Skeleton h={`${H}px`} borderRadius="8px" />;

  const max = Math.max(...data, 1);
  const points = data.map((v, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((v / max) * (H - PAD * 2));
    return `${x},${y}`;
  });

  const fillPoints = [
    `${PAD},${H - PAD}`,
    ...points,
    `${W - PAD},${H - PAD}`,
  ].join(' ');

  return (
    <Box as="svg" viewBox={`0 0 ${W} ${H}`} w="100%" h={`${H}px`}>
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3182ce" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#3182ce" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill="url(#trendGrad)" />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="#3182ce"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Box>
  );
}
