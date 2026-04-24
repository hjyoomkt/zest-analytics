/**
 * ============================================================================
 * HeatmapViewer — UX 스크롤 히트맵
 * ============================================================================
 *
 * 레이아웃:
 *  - 상단: 히트맵 모드 탭 + 디바이스 탭 + 날짜 필터
 *  - scroll 모드: 페이지 선택 → 스크롤 히트맵
 *  - scroll_channel 모드: 채널 필터(source→medium→campaign) → 페이지 목록 → 스크롤 히트맵
 *  - click 모드: 페이지 선택 → 클릭 히트맵
 */

import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import {
  Box, Flex, Text, Select, Button, ButtonGroup,
  SimpleGrid, Skeleton, useColorModeValue, Badge, Input, Tag, Tooltip, Icon,
} from '@chakra-ui/react';
import { MdInfoOutline } from 'react-icons/md';
import { getKSTToday, getKSTDaysAgo } from 'utils/dateUtils';
import {
  getHeatmapPageList,
  getScrollHeatmap,
  getHeatmapPageStats,
  getClickHeatmap,
  getClickTopElements,
  getHeatmapChannels,
} from '../services/zaService';

// COLD(파랑) → HOT(빨강) 그라디언트 색상 계산 (0~1)
function heatColor(ratio) {
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

/** DB channel 값 → 사람이 읽기 좋은 표시 */
function channelLabel(channel) {
  const map = {
    direct:     '직접유입',
    google:     '구글',
    google_ads: '구글 광고',
    naver:      '네이버',
    naver_ads:  '네이버 광고',
    facebook:   'Meta',
    instagram:  'Instagram',
    kakao:      '카카오',
    referral:   '추천링크',
    tiktok:     'TikTok',
    twitter:    'Twitter/X',
    taboola:    'Taboola',
    criteo:     'Criteo',
    appier:     'Appier',
  };
  return map[channel] || channel || '기타';
}

// ─────────────────────────────────────────────────────────────────────────────

export default function HeatmapViewer({ advertiserId, availableAdvertiserIds }) {
  // ── 날짜 상태 ──────────────────────────────────────────────────────
  const [startDate, setStartDate]   = useState(getKSTToday);
  const [endDate, setEndDate]       = useState(getKSTToday);
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

  // ── 히트맵 모드 ───────────────────────────────────────────────────
  const [heatmapMode, setHeatmapMode] = useState('scroll');

  // ── 공통 상태 ──────────────────────────────────────────────────────
  const [deviceTab, setDeviceTab]   = useState('all');
  const [pageList, setPageList]     = useState([]);
  const [selectedPage, setSelectedPage] = useState('');
  const [heatmapData, setHeatmapData]   = useState(null);
  const [pageStats, setPageStats]       = useState(null);
  const [loadingPages, setLoadingPages] = useState(false);
  const [loadingData, setLoadingData]   = useState(false);

  // ── 채널 분리 필터 상태 ────────────────────────────────────────────
  const [filterChannel, setFilterChannel]       = useState('all');
  const [channels, setChannels]                 = useState([]);
  const [channelPageList, setChannelPageList]   = useState([]);
  const [loadingChannelPages, setLoadingChannelPages] = useState(false);
  const [pageListSort, setPageListSort] = useState({ key: 'session_count', dir: 'desc' });
  const [channelSelectedPage, setChannelSelectedPage] = useState('');
  const [channelHeatmapData, setChannelHeatmapData]   = useState(null);
  const [channelPageStats, setChannelPageStats]       = useState(null);
  const [loadingChannelData, setLoadingChannelData]   = useState(false);

  // ── 클릭 히트맵 상태 ──────────────────────────────────────────────
  const [clickPoints, setClickPoints]           = useState([]);
  const [clickTopElements, setClickTopElements] = useState([]);
  const [loadingClick, setLoadingClick]         = useState(false);
  const clickCanvasRef = useRef(null);

  const cardBg      = useColorModeValue('white', 'navy.800');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
  const textColor   = useColorModeValue('gray.800', 'white');
  const subTextColor = useColorModeValue('gray.500', 'gray.400');
  const bgColor     = useColorModeValue('gray.50', 'navy.900');

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

  // ── 스크롤 히트맵용 raw URLs ───────────────────────────────────────
  const selectedRawUrls = useMemo(() => {
    const item = pageList.find((p) => p.page_url === selectedPage);
    return item?.raw_urls?.length ? item.raw_urls : (selectedPage ? [selectedPage] : []);
  }, [pageList, selectedPage]);

  // ── 채널 목록 로드 ────────────────────────────────────────────────
  const loadChannels = useCallback(async () => {
    if (!startDate || !endDate) return;
    try {
      const list = await getHeatmapChannels({ advertiserId, availableAdvertiserIds, startDate, endDate, deviceType });
      setChannels(list);
    } catch (e) {
      console.error(e);
    }
  }, [advertiserId, availableAdvertiserIds, startDate, endDate, deviceType]);

  // ── 채널별 페이지 목록 로드 ───────────────────────────────────────
  const loadChannelPageList = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoadingChannelPages(true);
    try {
      const list = await getHeatmapPageList({
        advertiserId,
        availableAdvertiserIds,
        startDate,
        endDate,
        deviceType,
        channel: filterChannel === 'all' ? null : filterChannel,
      });
      setChannelPageList(list);
      if (list.length > 0) {
        setChannelSelectedPage((prev) => {
          const stillExists = list.some((p) => p.page_url === prev);
          return stillExists ? prev : list[0].page_url;
        });
      } else {
        setChannelSelectedPage('');
      }
      setChannelHeatmapData(null);
      setChannelPageStats(null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingChannelPages(false);
    }
  }, [advertiserId, availableAdvertiserIds, startDate, endDate, deviceType, filterChannel]);

  /** 정렬 적용된 페이지 목록 */
  const sortedPageList = useMemo(() => {
    return [...channelPageList].sort((a, b) => {
      const aVal = pageListSort.key === 'session_count' ? a.session_count
        : pageListSort.key === 'avg_time' ? a.avg_time
        : a.avg_depth;
      const bVal = pageListSort.key === 'session_count' ? b.session_count
        : pageListSort.key === 'avg_time' ? b.avg_time
        : b.avg_depth;
      return pageListSort.dir === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }, [channelPageList, pageListSort]);

  const toggleSort = (key) => {
    setPageListSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
        : { key, dir: 'desc' }
    );
  };

  /** 채널 분리 히트맵용 iframe URL */
  const channelIframeUrl = useMemo(() => {
    const page = channelPageList.find((p) => p.page_url === channelSelectedPage);
    const rawUrl = page?.raw_urls?.[0];
    if (!rawUrl) return 'about:blank';
    try {
      const u = new URL(rawUrl);
      u.searchParams.set('za_preview', '1');
      return u.toString();
    } catch {
      return rawUrl;
    }
  }, [channelPageList, channelSelectedPage]);

  // ── 스크롤 히트맵 로드 ────────────────────────────────────────────
  const loadHeatmapData = useCallback(async () => {
    if (!selectedPage || !startDate || !endDate || selectedRawUrls.length === 0) return;
    setLoadingData(true);
    try {
      const [hm, stats] = await Promise.all([
        getScrollHeatmap({ advertiserId, availableAdvertiserIds, pageUrls: selectedRawUrls, startDate, endDate, deviceType }),
        getHeatmapPageStats({ advertiserId, availableAdvertiserIds, pageUrls: selectedRawUrls, startDate, endDate, deviceType }),
      ]);
      setHeatmapData(hm);
      setPageStats(stats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingData(false);
    }
  }, [advertiserId, availableAdvertiserIds, selectedRawUrls, startDate, endDate, deviceType]);

  // ── 채널 분리 스크롤 히트맵 로드 ─────────────────────────────────
  const loadChannelData = useCallback(async () => {
    if (!channelSelectedPage || !startDate || !endDate) return;
    const page = channelPageList.find((p) => p.page_url === channelSelectedPage);
    const rawUrls = page?.raw_urls;
    if (!rawUrls?.length) return;

    setLoadingChannelData(true);
    try {
      const ch = filterChannel === 'all' ? null : filterChannel;
      const [hm, stats] = await Promise.all([
        getScrollHeatmap({ advertiserId, availableAdvertiserIds, pageUrls: rawUrls, startDate, endDate, deviceType, channel: ch }),
        getHeatmapPageStats({ advertiserId, availableAdvertiserIds, pageUrls: rawUrls, startDate, endDate, deviceType }),
      ]);
      setChannelHeatmapData(hm);
      setChannelPageStats(stats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingChannelData(false);
    }
  }, [advertiserId, availableAdvertiserIds, channelSelectedPage, channelPageList, filterChannel, startDate, endDate, deviceType]);

  // ── 클릭 히트맵 로드 ──────────────────────────────────────────────
  const loadClickData = useCallback(async () => {
    if (!selectedPage || !startDate || !endDate || selectedRawUrls.length === 0) return;
    setLoadingClick(true);
    try {
      const [points, topEls] = await Promise.all([
        getClickHeatmap({ advertiserId, availableAdvertiserIds, pageUrls: selectedRawUrls, startDate, endDate, deviceType }),
        getClickTopElements({ advertiserId, availableAdvertiserIds, pageUrls: selectedRawUrls, startDate, endDate, deviceType }),
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
  useEffect(() => { if (heatmapMode === 'scroll_channel') { loadChannels(); loadChannelPageList(); } }, [heatmapMode, loadChannels, loadChannelPageList]);
  useEffect(() => { if (channelSelectedPage && heatmapMode === 'scroll_channel') loadChannelData(); }, [loadChannelData, channelSelectedPage, heatmapMode]);
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
    const RADIUS = Math.min(W, H) * 0.06;
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

  // ── SDK postMessage 수신 ──────────────────────────────────────────
  useEffect(() => {
    const handler = (event) => {
      if (event.data?.type !== 'za_pageview' || !event.data?.page_url) return;
      const newUrl = event.data.page_url;
      setPageList((prev) => {
        if (!prev.some((p) => p.page_url === newUrl)) {
          return [{ page_url: newUrl, session_count: 0, avg_depth: 0, avg_time: 0 }, ...prev];
        }
        return prev;
      });
      setSelectedPage(newUrl);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // ── 통계 카드 색상 ─────────────────────────────────────────────────
  const reachColor = (pct) => {
    if (pct >= 60) return 'green.500';
    if (pct >= 30) return 'orange.400';
    return 'red.400';
  };

  const trendPoints = heatmapData
    ? heatmapData.map((d) => d.reach_pct)
    : Array(10).fill(0);

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

  // ── 현재 채널 필터 레이블 (헤더 표시용) ───────────────────────────
  const activeFilterLabel = useMemo(() => {
    return filterChannel === 'all' ? '전체 채널' : channelLabel(filterChannel);
  }, [filterChannel]);

  // ─────────────────────────────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────────────────────────────
  return (
    <Box>
      {/* ── 히트맵 모드 탭 ── */}
      <Flex mb="16px" gap="8px" flexWrap="wrap">
        {[
          { key: 'scroll',         label: '스크롤 히트맵',        blocked: false },
          { key: 'scroll_channel', label: '채널별 히트맵',         blocked: false },
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

      {/* ── 필터 바 (scroll / click 모드) ── */}
      {heatmapMode !== 'scroll_channel' && (
        <Box
          bg={cardBg}
          border="1px solid"
          borderColor={borderColor}
          borderRadius="16px"
          p="14px 20px"
          mb="20px"
        >
          <Flex align="center" wrap="wrap" gap="10px" mb="10px">
            <ButtonGroup size="sm" isAttached variant="outline">
              {[{ key: 'all', label: '전체' }, { key: 'pc', label: 'PC' }, { key: 'mo', label: 'MO' }].map(({ key, label }) => (
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
            <Flex align="center" gap="6px" flex="1" minW="280px">
              <Input type="date" size="sm" borderRadius="10px" value={inputStart} onChange={(e) => setInputStart(e.target.value)} max={inputEnd} />
              <Text fontSize="13px" color={subTextColor} flexShrink={0}>~</Text>
              <Input type="date" size="sm" borderRadius="10px" value={inputEnd} onChange={(e) => setInputEnd(e.target.value)} min={inputStart} />
              <Button size="sm" colorScheme="brand" borderRadius="10px" flexShrink={0} onClick={applyDate}>적용</Button>
            </Flex>
          </Flex>
          <Select
            size="sm"
            borderRadius="10px"
            value={selectedPage}
            onChange={(e) => setSelectedPage(e.target.value)}
            isDisabled={loadingPages || pageList.length === 0}
            placeholder={loadingPages ? '페이지 로딩 중...' : pageList.length === 0 ? `데이터 없음 (${startDate} ~ ${endDate})` : undefined}
          >
            {pageList.map((p) => {
              const displayUrl = (() => { try { return decodeURIComponent(p.page_url); } catch { return p.page_url; } })();
              const variantNote = p.raw_urls?.length > 1 ? ` · URL 변형 ${p.raw_urls.length}개` : '';
              return (
                <option key={p.page_url} value={p.page_url}>
                  {displayUrl} ({p.session_count}세션{variantNote})
                </option>
              );
            })}
          </Select>
        </Box>
      )}

      {/* ══════════════════════════════════════════════════════════════
          스크롤 히트맵 (전체 합산)
      ══════════════════════════════════════════════════════════════ */}
      {heatmapMode === 'scroll' && (
        <Flex gap="20px" align="flex-start" wrap={{ base: 'wrap', xl: 'nowrap' }}>
          <ScrollHeatmapPanel
            selectedPage={selectedPage}
            selectedRawUrls={selectedRawUrls}
            iframeUrl={iframeUrl}
            heatmapData={heatmapData}
            loadingData={loadingData}
            startDate={startDate}
            cardBg={cardBg}
            borderColor={borderColor}
            textColor={textColor}
            subTextColor={subTextColor}
          />
          <ScrollStatsPanel
            pageStats={pageStats}
            trendData={trendPoints}
            loading={loadingData}
            deviceTab={deviceTab}
            label={selectedPage}
            cardBg={cardBg}
            borderColor={borderColor}
            textColor={textColor}
            subTextColor={subTextColor}
            bgColor={bgColor}
            reachColor={reachColor}
          />
        </Flex>
      )}

      {/* ══════════════════════════════════════════════════════════════
          채널별 히트맵 (3단계 드릴다운)
      ══════════════════════════════════════════════════════════════ */}
      {heatmapMode === 'scroll_channel' && (
        <Box>
          {/* ── 날짜/디바이스 필터 바 ── */}
          <Box bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="16px" p="14px 20px" mb="16px">
            <Flex align="center" wrap="wrap" gap="10px" mb="10px">
              <ButtonGroup size="sm" isAttached variant="outline">
                {[{ key: 'all', label: '전체' }, { key: 'pc', label: 'PC' }, { key: 'mo', label: 'MO' }].map(({ key, label }) => (
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
              <Flex align="center" gap="6px" flex="1" minW="280px">
                <Input type="date" size="sm" borderRadius="10px" value={inputStart} onChange={(e) => setInputStart(e.target.value)} max={inputEnd} />
                <Text fontSize="13px" color={subTextColor} flexShrink={0}>~</Text>
                <Input type="date" size="sm" borderRadius="10px" value={inputEnd} onChange={(e) => setInputEnd(e.target.value)} min={inputStart} />
                <Button size="sm" colorScheme="brand" borderRadius="10px" flexShrink={0} onClick={applyDate}>적용</Button>
              </Flex>
            </Flex>

            {/* ── Step 1: 채널 필터 ── */}
            <Flex align="center" gap="8px" flexWrap="wrap">
              <Text fontSize="11px" fontWeight="700" color={subTextColor} w="60px" flexShrink={0}>채널</Text>
              <Flex gap="6px" flexWrap="wrap">
                <FilterChip
                  label="전체"
                  active={filterChannel === 'all'}
                  onClick={() => setFilterChannel('all')}
                  cardBg={cardBg}
                  borderColor={borderColor}
                  textColor={textColor}
                  bgColor={bgColor}
                />
                {channels.map(({ channel, session_count }) => (
                  <FilterChip
                    key={channel}
                    label={`${channelLabel(channel)} (${session_count})`}
                    active={filterChannel === channel}
                    onClick={() => setFilterChannel(channel)}
                    cardBg={cardBg}
                    borderColor={borderColor}
                    textColor={textColor}
                    bgColor={bgColor}
                  />
                ))}
              </Flex>
            </Flex>
          </Box>

          {/* ── Step 2: 필터된 페이지 목록 ── */}
          <Box bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="16px" mb="16px" overflow="hidden">
            <Flex px="20px" py="12px" borderBottom="1px solid" borderColor={borderColor} align="center" justify="space-between">
              <Flex align="center" gap="8px">
                <Text fontSize="14px" fontWeight="700" color={textColor}>방문 페이지</Text>
                <Badge colorScheme="brand" borderRadius="full" px="8px" fontSize="11px">
                  {channelPageList.length}개
                </Badge>
              </Flex>
              <Text fontSize="12px" color={subTextColor}>{activeFilterLabel}</Text>
            </Flex>

            {loadingChannelPages ? (
              <Flex direction="column" gap="1px">
                {Array(4).fill(0).map((_, i) => <Skeleton key={i} h="52px" borderRadius="0" />)}
              </Flex>
            ) : channelPageList.length === 0 ? (
              <Flex align="center" justify="center" h="120px" direction="column" gap="6px">
                <Text fontSize="13px" color={subTextColor}>해당 채널로 유입된 페이지 데이터가 없습니다</Text>
                <Text fontSize="11px" color={subTextColor}>필터 조건을 변경해보세요</Text>
              </Flex>
            ) : (
              <Box maxH="320px" overflowY="auto">
                {/* 테이블 헤더 */}
                <Flex
                  px="20px" py="8px"
                  bg={bgColor}
                  position="sticky" top="0" zIndex="1"
                  borderBottom="1px solid"
                  borderColor={borderColor}
                >
                  <Text fontSize="11px" color={subTextColor} fontWeight="600" flex="1">페이지 URL</Text>
                  <Flex
                    w="80px" justify="flex-end" align="center" gap="3px"
                    cursor="pointer"
                    onClick={() => toggleSort('session_count')}
                    _hover={{ color: textColor }}
                    color={pageListSort.key === 'session_count' ? textColor : subTextColor}
                  >
                    <Text fontSize="11px" fontWeight="600">세션</Text>
                    <Text fontSize="10px" lineHeight="1">
                      {pageListSort.key === 'session_count' ? (pageListSort.dir === 'desc' ? '▼' : '▲') : '⇅'}
                    </Text>
                  </Flex>
                  <Flex
                    w="90px" justify="flex-end" align="center" gap="3px"
                    cursor="pointer"
                    onClick={() => toggleSort('avg_depth')}
                    _hover={{ color: textColor }}
                    color={pageListSort.key === 'avg_depth' ? textColor : subTextColor}
                  >
                    <Text fontSize="11px" fontWeight="600">평균 도달률</Text>
                    <Text fontSize="10px" lineHeight="1">
                      {pageListSort.key === 'avg_depth' ? (pageListSort.dir === 'desc' ? '▼' : '▲') : '⇅'}
                    </Text>
                  </Flex>
                  <Flex
                    w="80px" justify="flex-end" align="center" gap="3px"
                    cursor="pointer"
                    onClick={() => toggleSort('avg_time')}
                    _hover={{ color: textColor }}
                    color={pageListSort.key === 'avg_time' ? textColor : subTextColor}
                  >
                    <Text fontSize="11px" fontWeight="600">체류시간</Text>
                    <Text fontSize="10px" lineHeight="1">
                      {pageListSort.key === 'avg_time' ? (pageListSort.dir === 'desc' ? '▼' : '▲') : '⇅'}
                    </Text>
                  </Flex>
                  <Box w="80px" />
                </Flex>
                {sortedPageList.map((p) => {
                  const isSelected = channelSelectedPage === p.page_url;
                  const displayUrl = (() => { try { return decodeURIComponent(p.page_url); } catch { return p.page_url; } })();
                  return (
                    <Flex
                      key={p.page_url}
                      px="20px"
                      py="14px"
                      align="center"
                      borderBottom="1px solid"
                      borderColor={borderColor}
                      bg={isSelected ? (cardBg === 'white' ? 'brand.50' : 'whiteAlpha.100') : 'transparent'}
                      cursor="pointer"
                      onClick={() => setChannelSelectedPage(p.page_url)}
                      _hover={{ bg: isSelected ? undefined : bgColor }}
                      transition="background 0.1s"
                    >
                      <Flex flex="1" align="center" gap="8px" minW="0">
                        {isSelected && (
                          <Box w="3px" h="20px" bg="brand.500" borderRadius="full" flexShrink={0} />
                        )}
                        <Box minW="0">
                          <Text
                            fontSize="13px"
                            fontWeight={isSelected ? '700' : '500'}
                            color={isSelected ? 'brand.500' : textColor}
                            noOfLines={1}
                          >
                            {displayUrl}
                          </Text>
                          <Text fontSize="10px" color={subTextColor}>
                            URL 변형 {p.raw_urls.length}개
                          </Text>
                        </Box>
                      </Flex>
                      <Text fontSize="13px" color={textColor} w="80px" textAlign="right" fontWeight="500">
                        {p.session_count.toLocaleString()}
                      </Text>
                      <Flex w="90px" justify="flex-end" align="center" gap="4px">
                        <Box
                          w="36px"
                          h="4px"
                          bg={bgColor}
                          borderRadius="full"
                          overflow="hidden"
                        >
                          <Box
                            w={`${p.avg_depth}%`}
                            h="100%"
                            bg={p.avg_depth >= 60 ? 'green.400' : p.avg_depth >= 30 ? 'orange.400' : 'red.400'}
                            borderRadius="full"
                          />
                        </Box>
                        <Text
                          fontSize="12px"
                          fontWeight="700"
                          color={p.avg_depth >= 60 ? 'green.500' : p.avg_depth >= 30 ? 'orange.400' : 'red.400'}
                          w="32px"
                          textAlign="right"
                        >
                          {p.avg_depth}%
                        </Text>
                      </Flex>
                      <Text fontSize="12px" color={subTextColor} w="80px" textAlign="right" fontWeight="500">
                        {p.avg_time >= 60
                          ? `${Math.floor(p.avg_time / 60)}분 ${p.avg_time % 60}초`
                          : `${p.avg_time}초`}
                      </Text>
                      <Box w="80px" display="flex" justifyContent="flex-end">
                        <Button
                          size="xs"
                          colorScheme={isSelected ? 'brand' : 'gray'}
                          variant={isSelected ? 'solid' : 'outline'}
                          borderRadius="full"
                          px="12px"
                          onClick={(e) => { e.stopPropagation(); setChannelSelectedPage(p.page_url); }}
                        >
                          {isSelected ? '선택됨' : '히트맵'}
                        </Button>
                      </Box>
                    </Flex>
                  );
                })}
              </Box>
            )}
          </Box>

          {/* ── Step 3: 선택 페이지 히트맵 ── */}
          {channelSelectedPage ? (
            <Flex gap="20px" align="flex-start" wrap={{ base: 'wrap', xl: 'nowrap' }}>
              <ScrollHeatmapPanel
                selectedPage={channelSelectedPage}
                selectedRawUrls={channelPageList.find((p) => p.page_url === channelSelectedPage)?.raw_urls || []}
                iframeUrl={channelIframeUrl}
                heatmapData={channelHeatmapData}
                loadingData={loadingChannelData}
                startDate={startDate}
                channelBadge={activeFilterLabel}
                cardBg={cardBg}
                borderColor={borderColor}
                textColor={textColor}
                subTextColor={subTextColor}
              />
              <ScrollStatsPanel
                pageStats={channelPageStats}
                trendData={channelHeatmapData ? channelHeatmapData.map((d) => d.reach_pct) : Array(10).fill(0)}
                loading={loadingChannelData}
                deviceTab={deviceTab}
                label={activeFilterLabel}
                cardBg={cardBg}
                borderColor={borderColor}
                textColor={textColor}
                subTextColor={subTextColor}
                bgColor={bgColor}
                reachColor={reachColor}
              />
            </Flex>
          ) : (
            !loadingChannelPages && channelPageList.length > 0 && (
              <Flex
                align="center"
                justify="center"
                h="160px"
                bg={cardBg}
                border="1px solid"
                borderColor={borderColor}
                borderRadius="16px"
                direction="column"
                gap="8px"
              >
                <Text fontSize="14px" color={subTextColor}>위 페이지 목록에서 히트맵을 볼 페이지를 선택하세요</Text>
              </Flex>
            )
          )}
        </Box>
      )}

      {/* ══════════════════════════════════════════════════════════════
          클릭 히트맵
      ══════════════════════════════════════════════════════════════ */}
      {heatmapMode === 'click' && (
        <Flex gap="20px" align="flex-start" wrap={{ base: 'wrap', xl: 'nowrap' }}>
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
                    <Text as="span">{selectedPage}</Text>
                  </>
                ) : '페이지를 선택하세요'}
              </Text>
              <Text fontSize="12px" color={subTextColor}>
                {loadingClick ? '로딩 중...' : `${clickPoints.length}개 클릭`}
              </Text>
            </Flex>
            <Box position="relative" minH="600px" bg="white">
              {selectedPage ? (
                <Box as="iframe" src={iframeUrl} width="100%" height="600px" border="none" title="page-preview-click" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
              ) : (
                <Flex align="center" justify="center" h="600px" color={subTextColor}>
                  <Text>좌측 드롭다운에서 페이지를 선택하세요</Text>
                </Flex>
              )}
              {selectedPage && (
                <Box
                  as="canvas"
                  ref={clickCanvasRef}
                  width={800}
                  height={600}
                  position="absolute"
                  top="0" left="0"
                  w="100%" h="600px"
                  pointerEvents="none"
                  style={{ mixBlendMode: 'multiply' }}
                />
              )}
              {loadingClick && (
                <Flex position="absolute" top="0" left="0" right="0" bottom="0" align="center" justify="center" bg="blackAlpha.200">
                  <Text fontSize="14px" color="white" fontWeight="600" bg="blackAlpha.600" px="16px" py="8px" borderRadius="8px">
                    클릭 데이터 로딩 중...
                  </Text>
                </Flex>
              )}
            </Box>
            <Flex px="16px" py="10px" align="center" gap="8px" borderTop="1px solid" borderColor={borderColor}>
              <Text fontSize="11px" color="blue.400" fontWeight="600">적음</Text>
              <Box flex="1" h="8px" borderRadius="4px" bgGradient="linear(to-r, blue.200, yellow.300, red.500)" />
              <Text fontSize="11px" color="red.400" fontWeight="600">많음</Text>
            </Flex>
          </Box>

          <Box w={{ base: '100%', xl: '320px' }} flexShrink={0}>
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
                        <Box position="absolute" top="0" left="0" bottom="0" w={`${barPct}%`} bg="brand.50" borderRadius="8px" transition="width 0.3s" />
                        <Flex position="relative" align="center" justify="space-between" px="10px" py="8px" borderRadius="8px" border="1px solid" borderColor={borderColor}>
                          <Flex align="center" gap="8px" flex="1" minW="0">
                            <Text fontSize="13px" fontWeight="700" color="brand.500" flexShrink={0}>#{i + 1}</Text>
                            <Box flex="1" minW="0">
                              <Flex align="center" gap="4px" mb="2px">
                                <Tag size="sm" colorScheme="gray" fontSize="10px" px="6px" py="1px" borderRadius="4px">{el.element_tag || 'div'}</Tag>
                                <Text fontSize="12px" color={textColor} noOfLines={1}>{el.element_text || el.element_selector || '(텍스트 없음)'}</Text>
                              </Flex>
                              {el.element_selector && (
                                <Text fontSize="10px" color={subTextColor} noOfLines={1} fontFamily="mono">{el.element_selector}</Text>
                              )}
                            </Box>
                          </Flex>
                          <Text fontSize="14px" fontWeight="700" color={textColor} flexShrink={0} ml="8px">{el.click_count}</Text>
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

// ─────────────────────────────────────────────────────────────────────────────
// 서브 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

/** 필터 칩 버튼 */
function FilterChip({ label, active, onClick, cardBg, borderColor, textColor, bgColor }) {
  return (
    <Box
      as="button"
      px="12px"
      py="5px"
      borderRadius="full"
      border="1.5px solid"
      borderColor={active ? 'brand.500' : borderColor}
      bg={active ? 'brand.500' : cardBg}
      color={active ? 'white' : textColor}
      fontSize="12px"
      fontWeight={active ? '700' : '500'}
      cursor="pointer"
      onClick={onClick}
      _hover={{ borderColor: active ? 'brand.600' : 'brand.300', bg: active ? 'brand.600' : bgColor }}
      transition="all 0.12s"
    >
      {label}
    </Box>
  );
}

/** 스크롤 히트맵 iframe + 수직 바 패널 */
function ScrollHeatmapPanel({
  selectedPage, selectedRawUrls, iframeUrl, heatmapData, loadingData,
  startDate, channelBadge,
  cardBg, borderColor, textColor, subTextColor,
}) {
  const heatColorFn = heatColor;
  return (
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
              <Text as="span">{selectedPage}</Text>
            </>
          ) : '페이지를 선택하세요'}
        </Text>
        {channelBadge ? (
          <Badge colorScheme="brand" fontSize="10px" borderRadius="full" px="8px">{channelBadge}</Badge>
        ) : (
          <Text fontSize="12px" color={subTextColor}>{startDate}</Text>
        )}
      </Flex>

      <Flex>
        <Box flex="1" minH="600px" bg="white">
          {selectedPage ? (
            <Box
              as="iframe"
              src={iframeUrl}
              width="100%"
              height="600px"
              border="none"
              title="page-preview"
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
                  bg={heatColorFn(ratio)}
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
  );
}

/** 스크롤 통계 카드 패널 */
function ScrollStatsPanel({
  pageStats, trendData, loading, deviceTab, label,
  cardBg, borderColor, textColor, subTextColor, bgColor, reachColor,
}) {
  const [avgMode, setAvgMode] = useState('session');
  const avgScrollDepth = avgMode === 'session'
    ? (pageStats?.avgScrollDepth ?? 0)
    : (pageStats?.avgScrollDepthPerVisitor ?? 0);
  const avgLabel = avgMode === 'session' ? '평균 도달률 (세션)' : '평균 도달률 (방문자)';

  return (
    <Box w={{ base: '100%', xl: '320px' }} flexShrink={0}>
      <Flex justify="flex-end" mb="8px">
        <ButtonGroup size="xs" isAttached variant="outline">
          <Button
            onClick={() => setAvgMode('session')}
            bg={avgMode === 'session' ? 'brand.500' : 'transparent'}
            color={avgMode === 'session' ? 'white' : subTextColor}
            borderColor={borderColor}
            fontWeight="600"
            _hover={{ opacity: 0.85 }}
            borderRadius="8px 0 0 8px"
          >
            세션
          </Button>
          <Button
            onClick={() => setAvgMode('visitor')}
            bg={avgMode === 'visitor' ? 'brand.500' : 'transparent'}
            color={avgMode === 'visitor' ? 'white' : subTextColor}
            borderColor={borderColor}
            fontWeight="600"
            _hover={{ opacity: 0.85 }}
            borderRadius="0 8px 8px 0"
          >
            방문자
          </Button>
        </ButtonGroup>
      </Flex>
      <SimpleGrid columns={2} spacing="12px" mb="12px">
        {[
          { label: '방문자', value: loading ? null : (pageStats?.visitors ?? '-'), sessionEnd: false },
          { label: '페이지뷰', value: loading ? null : (pageStats?.pageviews ?? '-'), sessionEnd: false },
          { label: avgLabel, value: loading ? null : (pageStats ? `${avgScrollDepth}%` : '-'), sessionEnd: true },
          { label: '세션 수', value: loading ? null : (pageStats?.totalSessions ?? '-'), sessionEnd: true },
        ].map(({ label: lbl, value, sessionEnd }) => (
          <Box key={lbl} bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="16px" p="16px">
            <Flex align="center" gap="4px" mb="4px">
              <Text fontSize="12px" color={subTextColor}>{lbl}</Text>
              {sessionEnd && (
                <Tooltip label="session_end 발화 기준 데이터 — 탭 닫기/이탈 시 전송되며 마지막 페이지 이탈 누락 가능" fontSize="xs" placement="top" hasArrow>
                  <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }}>
                    <Icon as={MdInfoOutline} boxSize="12px" color="gray.400" />
                  </span>
                </Tooltip>
              )}
            </Flex>
            {value === null ? <Skeleton h="28px" borderRadius="6px" /> : <Text fontSize="24px" fontWeight="700" color={textColor}>{value}</Text>}
          </Box>
        ))}
      </SimpleGrid>
      <Box bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="16px" p="16px" mb="12px">
        <Flex align="center" gap="4px" mb="4px">
          <Text fontSize="12px" color={subTextColor}>평균 체류시간</Text>
          <Tooltip label="session_end 발화 기준 데이터 — 탭 닫기/이탈 시 전송되며 마지막 페이지 이탈 누락 가능" fontSize="xs" placement="top" hasArrow>
            <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }}>
              <Icon as={MdInfoOutline} boxSize="12px" color="gray.400" />
            </span>
          </Tooltip>
        </Flex>
        {loading ? (
          <Skeleton h="28px" borderRadius="6px" />
        ) : (
          <Text fontSize="24px" fontWeight="700" color={textColor}>
            {pageStats
              ? (pageStats.avgTime >= 60
                ? `${Math.floor(pageStats.avgTime / 60)}분 ${pageStats.avgTime % 60}초`
                : `${pageStats.avgTime}초`)
              : '-'}
          </Text>
        )}
      </Box>

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
                  {loading ? (
                    <Skeleton h="14px" w="60px" borderRadius="4px" />
                  ) : (
                    <Flex align="center" gap="6px">
                      <Text fontSize="11px" color={subTextColor}>{sessions}명</Text>
                      <Text fontSize="12px" fontWeight="700" color={reachColor(pct)} w="38px" textAlign="right">{pct}%</Text>
                    </Flex>
                  )}
                </Flex>
                {loading ? (
                  <Skeleton h="4px" borderRadius="full" />
                ) : (
                  <Box bg={bgColor} borderRadius="full" h="4px">
                    <Box bg={reachColor(pct)} borderRadius="full" h="4px" w={`${pct}%`} transition="width 0.3s ease" />
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
          <Text fontSize="11px" color={subTextColor} noOfLines={1} maxW="140px">{label || ''}</Text>
        </Flex>
        <TrendChart data={trendData} loading={loading} />
        <Flex justify="space-between" mt="4px">
          <Text fontSize="10px" color={subTextColor}>0%</Text>
          <Text fontSize="10px" color={subTextColor}>100%</Text>
        </Flex>
      </Box>
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

  const fillPoints = [`${PAD},${H - PAD}`, ...points, `${W - PAD},${H - PAD}`].join(' ');

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
