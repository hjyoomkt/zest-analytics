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

import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  Box, Flex, Text, Select, Button, ButtonGroup,
  SimpleGrid, Skeleton, useColorModeValue, Badge, Input,
} from '@chakra-ui/react';
import { getKSTToday, getKSTDaysAgo } from 'utils/dateUtils';
import {
  getHeatmapPageList,
  getScrollHeatmap,
  getHeatmapPageStats,
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

  const [deviceTab, setDeviceTab] = useState('all');
  const [pageList, setPageList] = useState([]);
  const [selectedPage, setSelectedPage] = useState('');
  const [heatmapData, setHeatmapData] = useState(null);  // 10개 buckets
  const [pageStats, setPageStats] = useState(null);
  const [loadingPages, setLoadingPages] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

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
      setPageList(list);
      if (list.length > 0) {
        setSelectedPage((prev) => {
          const stillExists = list.some((p) => p.page_url === prev);
          return stillExists ? prev : list[0].page_url;
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

  // ── 히트맵 + 통계 로드 ───────────────────────────────────────────
  const loadHeatmapData = useCallback(async () => {
    if (!selectedPage || !startDate || !endDate) return;
    setLoadingData(true);
    try {
      const [hm, stats] = await Promise.all([
        getScrollHeatmap({
          advertiserId,
          availableAdvertiserIds,
          pageUrl: selectedPage,
          startDate,
          endDate,
          deviceType,
        }),
        getHeatmapPageStats({
          advertiserId,
          availableAdvertiserIds,
          pageUrl: selectedPage,
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
  }, [advertiserId, availableAdvertiserIds, selectedPage, startDate, endDate, deviceType]);

  useEffect(() => { loadPageList(); }, [loadPageList]);
  useEffect(() => { if (selectedPage) loadHeatmapData(); }, [loadHeatmapData]);

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

  const iframeUrl = selectedPage || 'about:blank';

  return (
    <Box>
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
            return (
              <option key={p.page_url} value={p.page_url}>
                {displayUrl} ({p.session_count}세션)
              </option>
            );
          })}
        </Select>
      </Box>

      {/* ── 메인 콘텐츠 ── */}
      <Flex gap="20px" align="flex-start" wrap={{ base: 'wrap', xl: 'nowrap' }}>
        {/* ── 좌측: iframe + 수직 히트맵 바 ── */}
        <Box
          flex="1"
          minW={{ base: '100%', xl: '0' }}
          bg={cardBg}
          border="1px solid"
          borderColor={borderColor}
          borderRadius="16px"
          overflow="hidden"
        >
          {/* 페이지 URL 헤더 */}
          <Flex px="16px" py="10px" borderBottom="1px solid" borderColor={borderColor} align="center" justify="space-between">
            <Text fontSize="13px" color={subTextColor} noOfLines={1} flex="1" mr="8px">
              {selectedPage ? (
                <>
                  <Text as="span" fontWeight="600" color={textColor}>
                    {(() => {
                      try { return new URL(selectedPage).hostname; } catch { return ''; }
                    })()}
                  </Text>
                  <Text as="span">
                    {(() => {
                      try { return new URL(selectedPage).pathname + new URL(selectedPage).search; } catch { return selectedPage; }
                    })()}
                  </Text>
                </>
              ) : '페이지를 선택하세요'}
            </Text>
            <Text fontSize="12px" color={subTextColor}>{startDate}</Text>
          </Flex>

          {/* iframe + canvas 오버레이 */}
          <Flex>
            {/* iframe 영역 */}
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
            <Box
              w="56px"
              h="600px"
              position="relative"
              borderLeft="1px solid"
              borderColor={borderColor}
              flexShrink={0}
            >
              {/* COLD→HOT 레이블 */}
              <Text
                position="absolute"
                top="4px"
                left="50%"
                transform="translateX(-50%)"
                fontSize="9px"
                color="red.400"
                fontWeight="700"
                letterSpacing="0.5px"
              >
                HOT
              </Text>
              <Text
                position="absolute"
                bottom="4px"
                left="50%"
                transform="translateX(-50%)"
                fontSize="9px"
                color="blue.400"
                fontWeight="700"
                letterSpacing="0.5px"
              >
                COLD
              </Text>

              {/* 구간별 색상 슬롯 (상단=0%구간이 HOT 가능성 높음) */}
              {loadingData ? (
                <Skeleton w="100%" h="100%" />
              ) : (
                (heatmapData || Array(10).fill({ reach_pct: 0 })).map((d, i) => {
                  const ratio = (d.reach_pct || 0) / 100;
                  return (
                    <Box
                      key={i}
                      position="absolute"
                      left="0"
                      right="0"
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

          {/* COLD→HOT 범례 */}
          <Flex px="16px" py="10px" align="center" gap="8px" borderTop="1px solid" borderColor={borderColor}>
            <Text fontSize="11px" color="blue.400" fontWeight="600">COLD</Text>
            <Box
              flex="1"
              h="8px"
              borderRadius="4px"
              bgGradient="linear(to-r, blue.300, yellow.300, red.400)"
            />
            <Text fontSize="11px" color="red.400" fontWeight="600">HOT</Text>
          </Flex>
        </Box>

        {/* ── 우측: 통계 카드 ── */}
        <Box w={{ base: '100%', xl: '320px' }} flexShrink={0}>
          {/* KPI 카드 2x2 */}
          <SimpleGrid columns={2} spacing="12px" mb="12px">
            {[
              { label: '이 페이지 방문자', value: loadingData ? null : (pageStats?.visitors ?? '-') },
              { label: '페이지뷰', value: loadingData ? null : (pageStats?.pageviews ?? '-') },
              { label: '평균 도달률', value: loadingData ? null : (pageStats ? `${pageStats.avgScrollDepth}%` : '-') },
              { label: '세션 수', value: loadingData ? null : (pageStats?.totalSessions ?? '-') },
            ].map(({ label, value }) => (
              <Box
                key={label}
                bg={cardBg}
                border="1px solid"
                borderColor={borderColor}
                borderRadius="16px"
                p="16px"
              >
                <Text fontSize="12px" color={subTextColor} mb="4px">{label}</Text>
                {value === null ? (
                  <Skeleton h="28px" borderRadius="6px" />
                ) : (
                  <Text fontSize="24px" fontWeight="700" color={textColor}>{value}</Text>
                )}
              </Box>
            ))}
          </SimpleGrid>

          {/* 도달 구간 카드 */}
          <Box
            bg={cardBg}
            border="1px solid"
            borderColor={borderColor}
            borderRadius="16px"
            p="16px"
            mb="12px"
          >
            <Flex align="center" justify="space-between" mb="12px">
              <Text fontSize="14px" fontWeight="600" color={textColor}>도달 구간</Text>
              <Badge
                colorScheme={deviceTab === 'pc' ? 'blue' : deviceTab === 'mo' ? 'green' : 'gray'}
                borderRadius="full"
                px="8px"
                fontSize="10px"
              >
                {deviceTab === 'all' ? '전체' : deviceTab.toUpperCase()}
              </Badge>
            </Flex>
            <SimpleGrid columns={2} spacing="12px">
              {[
                { label: '25% 이상', pct: pageStats?.reach25, sessions: pageStats ? Math.round((pageStats.reach25 / 100) * pageStats.totalSessions) : 0 },
                { label: '50% 이상', pct: pageStats?.reach50, sessions: pageStats ? Math.round((pageStats.reach50 / 100) * pageStats.totalSessions) : 0 },
                { label: '75% 이상', pct: pageStats?.reach75, sessions: pageStats ? Math.round((pageStats.reach75 / 100) * pageStats.totalSessions) : 0 },
                { label: '100% 이상', pct: pageStats?.reach100, sessions: pageStats ? Math.round((pageStats.reach100 / 100) * pageStats.totalSessions) : 0 },
              ].map(({ label, pct, sessions }) => (
                <Box key={label}>
                  <Text fontSize="11px" color={subTextColor} mb="2px">{label}</Text>
                  {loadingData ? (
                    <Skeleton h="24px" borderRadius="4px" />
                  ) : (
                    <>
                      <Text fontSize="20px" fontWeight="700" color={reachColor(pct ?? 0)}>
                        {pct ?? 0}%
                      </Text>
                      <Text fontSize="11px" color={subTextColor}>{sessions}명</Text>
                    </>
                  )}
                </Box>
              ))}
            </SimpleGrid>
          </Box>

          {/* 도달률 추이 미니 차트 (SVG 라인) */}
          <Box
            bg={cardBg}
            border="1px solid"
            borderColor={borderColor}
            borderRadius="16px"
            p="16px"
          >
            <Flex align="center" justify="space-between" mb="8px">
              <Text fontSize="14px" fontWeight="600" color={textColor}>도달률 추이</Text>
              <Text fontSize="11px" color={subTextColor}>
                {selectedPage ? (() => { try { return new URL(selectedPage).pathname; } catch { return ''; } })() : ''}
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
