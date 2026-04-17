/**
 * ============================================================================
 * ReferrerChart - 유입 소스별 시간대별 지표 라인 차트
 *
 * - 선택된 소스들의 시간대별(0~23시) 지표를 라인으로 표시
 * - 지표 선택 드롭다운: DateRangePicker와 동일한 Menu 디자인
 * - "합계" = 전체 합산 데이터
 * ============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  Tag,
  TagLabel,
  TagCloseButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Spinner,
  Icon,
  useColorModeValue,
} from '@chakra-ui/react';
import { MdKeyboardArrowDown } from 'react-icons/md';
import ReactApexChart from 'react-apexcharts';
import Card from 'components/card/Card';
import { getReferrerHourlyData, analyticsCacheVersion } from 'views/admin/zestAnalytics/services/zaService';

// ── 지표 목록 ─────────────────────────────────────────────────────────────────
const METRICS = [
  { key: 'totalVisits',            label: '전체 페이지뷰수', unit: '회',  format: 'number'   },
  { key: 'visitors',               label: '방문자수',        unit: '명',  format: 'number'   },
  { key: 'signups',                label: '회원 전환 수',   unit: '명',  format: 'number'   },
  { key: 'purchasers',             label: '구매자수',        unit: '명',  format: 'number'   },
  { key: 'purchaseCount',          label: '구매량',          unit: '건',  format: 'number'   },
  { key: 'revenue',                label: '총 구매금액',     unit: '원',  format: 'currency' },
  { key: 'purchaseConversionRate', label: '구매 전환율',    unit: '%',   format: 'percent'  },
  { key: 'avgOrderValue',          label: '평균 주문 금액', unit: '원',  format: 'currency' },
];

// ── 라인 색상 팔레트 ──────────────────────────────────────────────────────────
const LINE_COLORS = [
  '#00B5D8', '#4318FF', '#E53E3E', '#38A169', '#D69E2E',
  '#805AD5', '#DD6B20', '#2B6CB0', '#C53030', '#276749',
];

// ── X축 레이블 ────────────────────────────────────────────────────────────────
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

// ── 모듈 레벨 캐시 ────────────────────────────────────────────────────────────
const _cache = {};
const _cacheKey = (advertiserId, startDate, endDate) =>
  `ref_hourly|${advertiserId ?? 'all'}|${startDate}|${endDate}|ip${analyticsCacheVersion.v}`;

// ── 값 포맷 ───────────────────────────────────────────────────────────────────
const fmtValue = (val, format) => {
  if (format === 'currency') return `₩${Math.round(val).toLocaleString()}`;
  if (format === 'percent')  return `${val.toFixed(2)}%`;
  return `${Math.round(val).toLocaleString()}`;
};

export default function ReferrerChart({
  advertiserId,
  availableAdvertiserIds,
  startDate,
  endDate,
  selectedSources,
  onRemoveSource,
}) {
  const [allData, setAllData] = useState({});   // { [referrer]: { [metricKey]: number[24] } }
  const [loading, setLoading] = useState(false);
  const [metric,  setMetric]  = useState('visitors');

  // 색상
  const cardBg      = useColorModeValue('white', 'navy.800');
  const borderColor = useColorModeValue('gray.100', 'whiteAlpha.100');
  const subColor    = useColorModeValue('gray.500', 'gray.400');
  const inputBg     = useColorModeValue('white', 'navy.700');
  const textColor   = useColorModeValue('secondaryGray.900', 'white');
  const bgHover     = useColorModeValue('secondaryGray.100', 'whiteAlpha.100');
  const brandColor  = useColorModeValue('brand.500', 'white');
  const gridColor   = useColorModeValue('#EDF2F7', 'rgba(255,255,255,0.06)');

  const fetchData = useCallback(async () => {
    const key = _cacheKey(advertiserId, startDate, endDate);
    if (!_cache[key]) setLoading(true);
    try {
      const result = await getReferrerHourlyData({
        advertiserId,
        availableAdvertiserIds,
        startDate,
        endDate,
      });
      _cache[key] = result;
      setAllData(result);
    } catch (err) {
      console.error('ReferrerChart 데이터 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [advertiserId, availableAdvertiserIds, startDate, endDate]);

  useEffect(() => {
    const key = _cacheKey(advertiserId, startDate, endDate);
    if (_cache[key]) {
      setAllData(_cache[key]);
    } else {
      fetchData();
    }
  }, [fetchData, advertiserId, startDate, endDate]);

  const activeMetric = METRICS.find((m) => m.key === metric) || METRICS[0];

  // 선택된 소스별 시리즈 구성
  const series = selectedSources.map((src) => ({
    name: src,
    data: (allData[src]?.[metric] || Array(24).fill(0)),
  }));

  const options = {
    chart: {
      type: 'line',
      toolbar: { show: false },
      zoom:    { enabled: false },
      animations: { enabled: false },
    },
    colors: selectedSources.map((_, i) => LINE_COLORS[i % LINE_COLORS.length]),
    stroke: { curve: 'smooth', width: 2 },
    xaxis: {
      categories: HOURS,
      labels: {
        style: { colors: subColor, fontSize: '11px' },
        rotate: 0,
        formatter: (val) => {
          const h = parseInt(val, 10);
          return h % 2 === 0 ? val : '';
        },
      },
      axisBorder: { show: false },
      axisTicks:  { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: subColor, fontSize: '11px' },
        formatter: (val) => {
          if (activeMetric.format === 'currency') return `₩${Math.round(val).toLocaleString()}`;
          if (activeMetric.format === 'percent')  return `${val.toFixed(1)}%`;
          return Math.round(val).toLocaleString();
        },
      },
      min: 0,
    },
    grid: {
      borderColor: gridColor,
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
    },
    tooltip: {
      theme: 'light',
      x: { show: true },
      y: {
        formatter: (val, { seriesIndex }) =>
          `${selectedSources[seriesIndex]}: ${fmtValue(val, activeMetric.format)}${activeMetric.format === 'number' ? activeMetric.unit : ''}`,
      },
    },
    legend:      { show: false },
    dataLabels:  { enabled: false },
    markers:     { size: 0, hover: { size: 4 } },
  };

  return (
    <Card p={0} bg={cardBg}>

      {/* 헤더 */}
      <Flex
        px={6} py={4}
        justify="space-between"
        align="center"
        borderBottomWidth="1px"
        borderColor={borderColor}
        flexWrap="wrap"
        gap={3}
      >
        {/* 선택 소스 태그들 */}
        <Flex gap={2} flexWrap="wrap" align="center" flex="1">
          {selectedSources.map((src, idx) => (
            <Tag
              key={src}
              size="sm"
              borderRadius="full"
              variant="solid"
              bg={LINE_COLORS[idx % LINE_COLORS.length]}
              color="white"
              fontSize="xs"
              px={3}
              py={1}
            >
              <TagLabel>{src}</TagLabel>
              {selectedSources.length > 1 && (
                <TagCloseButton onClick={() => onRemoveSource(src)} />
              )}
            </Tag>
          ))}
        </Flex>

        {/* 지표 선택 Menu (DateRangePicker 스타일) */}
        <Menu>
          <MenuButton
            as={Button}
            rightIcon={<Icon as={MdKeyboardArrowDown} />}
            bg={inputBg}
            border="1px solid"
            borderColor={borderColor}
            color={textColor}
            fontWeight="500"
            fontSize="sm"
            _hover={{ bg: bgHover }}
            _active={{ bg: bgHover }}
            px="16px"
            h="36px"
            borderRadius="12px"
          >
            {activeMetric.label}
          </MenuButton>
          <MenuList minW="auto" w="fit-content" px="8px" py="8px" zIndex={2000}>
            {METRICS.map((m) => (
              <MenuItem
                key={m.key}
                onClick={() => setMetric(m.key)}
                bg={metric === m.key ? brandColor : 'transparent'}
                color={metric === m.key ? 'white' : textColor}
                _hover={{ bg: metric === m.key ? brandColor : bgHover }}
                fontWeight={metric === m.key ? '600' : '500'}
                fontSize="sm"
                px="12px"
                py="8px"
                borderRadius="8px"
                minH="auto"
              >
                {m.label}
              </MenuItem>
            ))}
          </MenuList>
        </Menu>
      </Flex>

      {/* 차트 */}
      <Box px={4} py={4} minH="220px">
        {loading ? (
          <Flex justify="center" align="center" minH="200px">
            <Spinner size="lg" color="brand.500" thickness="3px" speed="0.7s" />
          </Flex>
        ) : (
          <ReactApexChart
            options={options}
            series={series}
            type="line"
            height={200}
          />
        )}
      </Box>

      {/* 안내 문구 */}
      <Flex
        px={6} py={3}
        borderTopWidth="1px"
        borderColor={borderColor}
        align="center"
      >
        <Text fontSize="xs" color={subColor}>
          다른 차트와 비교하려면 Ctrl(Cmd)키를 누른 상태로 원하는 주소를 선택하세요.
        </Text>
      </Flex>
    </Card>
  );
}
