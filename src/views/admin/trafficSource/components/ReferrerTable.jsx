/**
 * ============================================================================
 * ReferrerTable - 유입 경로별 전환 지표 테이블
 *
 * - 주소(referrer 도메인) 기준으로 방문/전환 지표를 표시
 * - 열 선택: /superadmin/users 브랜드 선택 디자인(HStack 커스텀 체크박스) 적용
 * - 열 저장(localStorage) 지원
 * - 행 클릭 → 차트 소스 선택 (Ctrl/Cmd+Click → 비교 추가)
 * ============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  HStack,
  VStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  Divider,
  Spinner,
  Icon,
  Badge,
  Tooltip,
  useColorModeValue,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import {
  MdSettings,
  MdArrowUpward,
  MdArrowDownward,
  MdUnfoldMore,
  MdPublic,
  MdLink,
  MdEmail,
  MdSearch,
  MdKeyboardArrowDown,
  MdOutlineInfo,
} from 'react-icons/md';
import { FaFacebook, FaInstagram, FaYoutube, FaTwitter } from 'react-icons/fa';
import Card from 'components/card/Card';
import { getReferrerBreakdown, analyticsCacheVersion } from 'views/admin/zestAnalytics/services/zaService';

// ── localStorage 키 ──────────────────────────────────────────────────────────
const STORAGE_KEY = 'traffic_source_visible_cols';

// ── 모듈 레벨 캐시 ─────────────────────────────────────────────────────────
const _cache = {};
const _cacheKey = (advertiserId, startDate, endDate, attributionModel) =>
  `ref_table|${advertiserId ?? 'all'}|${startDate}|${endDate}|${attributionModel}|ip${analyticsCacheVersion.v}`;

const ATTRIBUTION_OPTIONS = [
  { value: 'first_touch', label: '퍼스트터치' },
  { value: 'visitor',     label: '방문자'     },
  { value: 'session',     label: '세션'       },
];

// ============================================================================
// 소스 아이콘 설정
// ============================================================================

const SOURCE_CONFIG = {
  'instagram.com':  { icon: FaInstagram, bg: '#E1306C', color: 'white',   label: 'Instagram'  },
  'facebook.com':   { icon: FaFacebook,  bg: '#1877F2', color: 'white',   label: 'Facebook'   },
  'youtube.com':    { icon: FaYoutube,   bg: '#FF0000', color: 'white',   label: 'YouTube'    },
  'twitter.com':    { icon: FaTwitter,   bg: '#1DA1F2', color: 'white',   label: 'Twitter/X'  },
  'x.com':          { icon: FaTwitter,   bg: '#000000', color: 'white',   label: 'X'          },
  'naver.com':      { icon: null, abbr: 'N', bg: '#03C75A', color: 'white', label: '네이버'   },
  'kakao.com':      { icon: null, abbr: 'K', bg: '#FEE500', color: '#3A1D1D', label: '카카오' },
  'google.com':     { icon: null, abbr: 'G', bg: '#4285F4', color: 'white', label: 'Google'   },
  '직접 유입':      { icon: MdPublic,   bg: '#718096', color: 'white',   label: '직접 유입'  },
  email:            { icon: MdEmail,    bg: '#F6AD55', color: 'white',   label: '이메일'     },
  organic:          { icon: MdSearch,   bg: '#48BB78', color: 'white',   label: '오가닉'     },
};

const getSourceCfg = (source) => {
  if (!source) return { bg: '#CBD5E0', color: '#2D3748', label: '-', abbr: '-' };
  const cfg = SOURCE_CONFIG[source.toLowerCase()] || SOURCE_CONFIG[source];
  if (cfg) return cfg;
  return { icon: MdLink, bg: '#9F7AEA', color: 'white', label: source };
};

// ============================================================================
// 지표 컬럼 정의
// ============================================================================

const METRIC_COLUMNS = [
  { key: 'totalVisits',            label: '전체 페이지뷰수', format: 'number',   defaultOn: true  },
  { key: 'visitors',               label: '방문자 수',        format: 'number',   defaultOn: true  },
  { key: 'signups',                label: '회원 전환 수',     format: 'number',   defaultOn: true  },
  { key: 'memberConversionRate',   label: '회원 전환율',      format: 'rate',     defaultOn: true  },
  { key: 'purchasers',             label: '구매지 수',        format: 'number',   defaultOn: true  },
  { key: 'purchaseCount',          label: '구매량',           format: 'number',   defaultOn: true  },
  { key: 'revenue',                label: '총 구매 금액',     format: 'currency', defaultOn: true  },
  { key: 'purchaseConversionRate', label: '구매 전환율',      format: 'rate',     defaultOn: true  },
  { key: 'avgOrderValue',          label: '평균 주문 금액',   format: 'currency', defaultOn: true  },
  // zest-analytics 추가 지표
  { key: 'pageviews',              label: '페이지뷰수',       format: 'number',   defaultOn: false },
  { key: 'avgTimeOnPage',          label: '평균 체류시간',    format: 'duration', defaultOn: false, sessionEnd: true },
  { key: 'avgScrollDepth',         label: '평균 도달률',      format: 'percent',  defaultOn: false, sessionEnd: true },
  { key: 'addToCarts',             label: '장바구니담기',     format: 'number',   defaultOn: false },
  { key: 'leads',                  label: '리드',             format: 'number',   defaultOn: false },
];

const DEFAULT_COLS = METRIC_COLUMNS.filter((c) => c.defaultOn).map((c) => c.key);

const loadSavedCols = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const validKeys = new Set(METRIC_COLUMNS.map((c) => c.key));
    return parsed.filter((k) => validKeys.has(k));
  } catch {
    return null;
  }
};

// ============================================================================
// 포맷 함수
// ============================================================================

const fmt = (value, format) => {
  if (value === null || value === undefined) return '-';
  switch (format) {
    case 'number':   return Number(value).toLocaleString();
    case 'decimal':  return Number(value).toFixed(1);
    case 'percent':  return value === 0 ? '-' : `${Number(value).toFixed(1)}%`;
    case 'rate':     return value === 0 ? '-' : `${Number(value).toFixed(2)}%`;
    case 'currency': return value === 0 ? '-' : `₩${Math.round(value).toLocaleString()}`;
    case 'duration': {
      if (!value || value === 0) return '-';
      const v = Math.round(value);
      const m = Math.floor(v / 60);
      const s = v % 60;
      return m > 0 ? `${m}분 ${s}초` : `${s}초`;
    }
    default: return String(value);
  }
};

// ============================================================================
// 하위 컴포넌트
// ============================================================================

function SortIcon({ colKey, sortKey, sortDir }) {
  if (colKey !== sortKey)
    return <Icon as={MdUnfoldMore} boxSize="14px" opacity={0.3} />;
  return sortDir === 'asc'
    ? <Icon as={MdArrowUpward}   boxSize="14px" color="brand.500" />
    : <Icon as={MdArrowDownward} boxSize="14px" color="brand.500" />;
}

function SourceCell({ value }) {
  const cfg      = getSourceCfg(value);
  const textColor = useColorModeValue('gray.800', 'white');
  if (!value || value === '-') return <Text fontSize="sm" color="gray.400">-</Text>;
  return (
    <Flex align="center" gap="10px">
      <Flex
        w="28px" h="28px" borderRadius="full" flexShrink={0}
        align="center" justify="center" bg={cfg.bg}
      >
        {cfg.icon
          ? <Icon as={cfg.icon} boxSize="14px" color={cfg.color} />
          : <Text fontSize="10px" fontWeight="800" color={cfg.color} lineHeight={1}>
              {cfg.abbr || value.charAt(0).toUpperCase()}
            </Text>
        }
      </Flex>
      <Text fontSize="sm" fontWeight="600" color={textColor} noOfLines={1} maxW="180px" title={value}>
        {cfg.label !== value ? cfg.label : value}
      </Text>
    </Flex>
  );
}

function UtmChannelCell({ value }) {
  const subColor  = useColorModeValue('gray.400', 'gray.500');
  const textColor = useColorModeValue('gray.700', 'gray.200');
  if (!value) return <Text fontSize="sm" color={subColor}>-</Text>;
  return (
    <Flex align="center" gap={2}>
      <Badge colorScheme="purple" variant="subtle" fontSize="xs" px={2} py={0.5} borderRadius="md">
        UTM
      </Badge>
      <Text fontSize="sm" color={textColor}>{value}</Text>
    </Flex>
  );
}

function MetricCell({ value, format, highlighted }) {
  const highlightColor = useColorModeValue('brand.600', 'brand.300');
  const normalColor    = useColorModeValue('gray.700', 'gray.200');
  return (
    <Text
      fontSize="sm"
      fontWeight={highlighted ? '700' : '500'}
      color={highlighted ? highlightColor : normalColor}
      textAlign="right"
    >
      {fmt(value, format)}
    </Text>
  );
}

/** EditUserModal 브랜드 선택 스타일 체크 항목 */
function ColCheckItem({ label, isChecked, onClick, brandColor, borderColor, selectedBg, inputBg, bgHover, textColor }) {
  return (
    <HStack
      p="10px"
      borderRadius="8px"
      border="1px solid"
      borderColor={isChecked ? brandColor : borderColor}
      bg={isChecked ? selectedBg : inputBg}
      cursor="pointer"
      onClick={onClick}
      _hover={{ borderColor: brandColor, bg: bgHover }}
      spacing="10px"
    >
      <Box
        w="16px" h="16px" borderRadius="4px" border="2px solid"
        borderColor={isChecked ? brandColor : borderColor}
        bg={isChecked ? brandColor : 'transparent'}
        display="flex" alignItems="center" justifyContent="center"
        flexShrink={0}
      >
        {isChecked && <Box w="8px" h="8px" bg="white" borderRadius="2px" />}
      </Box>
      <Text fontSize="sm" color={textColor} fontWeight={isChecked ? '600' : '500'}>
        {label}
      </Text>
    </HStack>
  );
}

// ============================================================================
// 합계 행 계산
// ============================================================================

function calcTotal(rows, activeMetricCols) {
  if (rows.length === 0) return null;
  const total = { source: '합계', lastUtmChannel: null };
  activeMetricCols.forEach(({ key, format }) => {
    if (['rate', 'percent'].includes(format)) {
      total[key] = null;
    } else {
      total[key] = rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);
    }
  });
  const totVisitors   = rows.reduce((s, r) => s + (r.visitors || 0), 0);
  const totSignups    = rows.reduce((s, r) => s + (r.signups || 0), 0);
  const totPurchases  = rows.reduce((s, r) => s + (r.purchaseCount || 0), 0);
  const totRevenue    = rows.reduce((s, r) => s + (r.revenue || 0), 0);
  total.visitors               = totVisitors;
  total.memberConversionRate   = totVisitors > 0 ? +((totSignups / totVisitors) * 100).toFixed(2) : 0;
  total.purchaseConversionRate = totVisitors > 0 ? +((totPurchases / totVisitors) * 100).toFixed(2) : 0;
  total.avgOrderValue          = totPurchases > 0 ? Math.round(totRevenue / totPurchases) : 0;
  total.avgTimeOnPage          = null;
  total.avgScrollDepth         = null;
  return total;
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function ReferrerTable({
  advertiserId,
  availableAdvertiserIds,
  startDate,
  endDate,
  selectedSources,
  onSourceSelect,
  attributionModel,
  onAttributionChange,
}) {
  const toast = useToast();
  const { isOpen: isColOpen, onOpen: onColOpen, onClose: onColClose } = useDisclosure();

  const [data,        setData]        = useState(() => {
    const key = _cacheKey(advertiserId, startDate, endDate);
    return _cache[key] ?? [];
  });
  const [loading,     setLoading]     = useState(false);
  const [sortKey,     setSortKey]     = useState('totalVisits');
  const [sortDir,     setSortDir]     = useState('desc');
  const [visibleCols, setVisibleCols] = useState(loadSavedCols() ?? DEFAULT_COLS);
  // 열 선택 Popover용 draft 상태
  const [draftCols,   setDraftCols]   = useState([]);

  // 색상 토큰
  const cardBg        = useColorModeValue('white', 'navy.800');
  const headerBg      = useColorModeValue('gray.50', 'navy.900');
  const borderColor   = useColorModeValue('gray.100', 'whiteAlpha.100');
  const rowHoverBg    = useColorModeValue('blue.50', 'whiteAlpha.50');
  const selectedRowBg = useColorModeValue('blue.50', 'blue.900');
  const thColor       = useColorModeValue('gray.500', 'gray.400');
  const textColor     = useColorModeValue('secondaryGray.900', 'white');
  // 브랜드 선택 스타일용
  const brandColor        = useColorModeValue('brand.500', 'brand.400');
  const selectedBg        = useColorModeValue('brand.50', 'whiteAlpha.100');
  const inputBg           = useColorModeValue('white', 'navy.700');
  const bgHover           = useColorModeValue('secondaryGray.100', 'whiteAlpha.100');
  const popoverBorder     = useColorModeValue('gray.200', 'whiteAlpha.100');
  const dropdownBorderColor = useColorModeValue('gray.300', 'whiteAlpha.300');
  const dropdownTextColor   = useColorModeValue('gray.700', 'white');

  const fetchData = useCallback(async () => {
    const key = _cacheKey(advertiserId, startDate, endDate, attributionModel);
    if (!_cache[key]) setLoading(true);
    try {
      const result = await getReferrerBreakdown({
        advertiserId,
        availableAdvertiserIds,
        startDate,
        endDate,
        attributionModel,
      });
      _cache[key] = result;
      setData(result);
    } catch (err) {
      console.error('유입 경로 데이터 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [advertiserId, availableAdvertiserIds, startDate, endDate, attributionModel]);

  useEffect(() => {
    const key = _cacheKey(advertiserId, startDate, endDate, attributionModel);
    if (_cache[key]) {
      setData(_cache[key]);
    } else {
      fetchData();
    }
  }, [fetchData, advertiserId, startDate, endDate, attributionModel]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sortedData = [...data].sort((a, b) => {
    const mult = sortDir === 'asc' ? 1 : -1;
    const aVal = a[sortKey] ?? 0;
    const bVal = b[sortKey] ?? 0;
    if (typeof aVal === 'number') return mult * (aVal - bVal);
    return mult * String(aVal).localeCompare(String(bVal));
  });

  const activeMetricCols = METRIC_COLUMNS.filter((c) => visibleCols.includes(c.key));
  const totalRow         = calcTotal(sortedData, activeMetricCols);

  // 열 선택 Popover 열기 (draft 초기화)
  const handleOpenColPicker = () => {
    setDraftCols([...visibleCols]);
    onColOpen();
  };

  const toggleDraftCol = (key) =>
    setDraftCols((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  // 헤더 "열 저장" 버튼: 현재 적용된 컬럼을 localStorage에 즉시 저장
  const handleSaveCurrentCols = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleCols));
      toast({ title: '열 설정이 저장되었습니다.', status: 'success', duration: 2000, isClosable: true, position: 'top-right' });
    } catch {
      toast({ title: '저장에 실패했습니다.', status: 'error', duration: 2000, position: 'top-right' });
    }
  };

  // 취소: draft 버리고 닫기
  const handleCancelCols = () => {
    onColClose();
  };

  // Popover 저장: draft 적용 + localStorage 저장 + 닫기
  const handleSaveCols = () => {
    setVisibleCols(draftCols);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draftCols));
      toast({
        title: '열 설정이 저장되었습니다.',
        status: 'success',
        duration: 2000,
        isClosable: true,
        position: 'top-right',
      });
    } catch {
      toast({ title: '저장에 실패했습니다.', status: 'error', duration: 2000, position: 'top-right' });
    }
    onColClose();
  };

  const handleRowClick = (source, e) => {
    onSourceSelect(source, e.ctrlKey || e.metaKey);
  };

  const thProps = {
    py: 3,
    px: 3,
    color: thColor,
    fontWeight: '700',
    fontSize: 'xs',
    textTransform: 'none',
    letterSpacing: 'normal',
    borderColor,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    _hover: { color: 'brand.500' },
  };

  return (
    <Card p={0} bg={cardBg}>

      {/* ── 헤더 ── */}
      <Flex
        px={6} py={4}
        justify="space-between"
        align="center"
        borderBottomWidth="1px"
        borderColor={borderColor}
        flexWrap="wrap"
        gap={3}
      >
        <Text fontSize="lg" fontWeight="700" color={textColor}>
          유입 경로 분석
        </Text>

        <Flex gap={2} align="center">
          {/* 어트리뷰션 기준 선택 */}
          <Tooltip
            label={
              <Box fontSize="xs" lineHeight="1.7">
                <Text fontWeight="700" mb="6px">어트리뷰션 기준 안내</Text>
                <Text fontWeight="600">퍼스트터치</Text>
                <Text mb="6px" color="whiteAlpha.800">방문자가 처음 유입된 경로 하나에만 카운트됩니다. 중복 없이 실제 UV와 가장 가깝습니다.</Text>
                <Text fontWeight="600">방문자</Text>
                <Text mb="6px" color="whiteAlpha.800">방문할 때마다 해당 경로에 카운트됩니다. 한 사람이 여러 경로로 방문하면 각 경로에 모두 집계되어 합계가 실제 UV보다 크게 나올 수 있습니다.</Text>
                <Text fontWeight="600">세션</Text>
                <Text color="whiteAlpha.800">세션 수 기준으로 집계합니다. 한 사람이 N번 방문하면 N개의 세션으로 카운트됩니다.</Text>
              </Box>
            }
            placement="bottom-end"
            hasArrow
            maxW="300px"
            bg="gray.700"
            color="white"
            borderRadius="lg"
            p="12px"
            openDelay={100}
          >
            <Flex align="center" cursor="default">
              <Icon as={MdOutlineInfo} boxSize="16px" color={thColor} />
            </Flex>
          </Tooltip>
          <Menu>
            <MenuButton
              as={Button}
              rightIcon={<Icon as={MdKeyboardArrowDown} />}
              bg={inputBg}
              border="1px solid"
              borderColor={dropdownBorderColor}
              color={dropdownTextColor}
              fontWeight="600"
              fontSize="xs"
              _hover={{ bg: bgHover }}
              _active={{ bg: bgHover }}
              size="sm"
              px="10px"
              borderRadius="8px"
            >
              {ATTRIBUTION_OPTIONS.find(o => o.value === attributionModel)?.label}
            </MenuButton>
            <MenuList minW="auto" w="fit-content" px="8px" py="8px" zIndex={2000}>
              {ATTRIBUTION_OPTIONS.map(opt => (
                <MenuItem
                  key={opt.value}
                  onClick={() => onAttributionChange(opt.value)}
                  bg={attributionModel === opt.value ? brandColor : 'transparent'}
                  color={attributionModel === opt.value ? 'white' : dropdownTextColor}
                  _hover={{ bg: attributionModel === opt.value ? brandColor : bgHover }}
                  fontWeight={attributionModel === opt.value ? '600' : '500'}
                  fontSize="sm"
                  px="12px"
                  py="8px"
                  borderRadius="8px"
                  justifyContent="center"
                  minH="auto"
                >
                  {opt.label}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>

          {/* 열 저장 버튼 */}
          <Button
            size="sm"
            variant="outline"
            colorScheme="green"
            borderRadius="lg"
            fontSize="sm"
            onClick={handleSaveCurrentCols}
          >
            열 저장
          </Button>

          {/* 열 선택 Popover */}
          <Popover
          isOpen={isColOpen}
          onClose={handleCancelCols}
          placement="bottom-end"
          isLazy
          strategy="fixed"
        >
          <PopoverTrigger>
            <Button
              size="sm"
              variant="outline"
              colorScheme="brand"
              leftIcon={<Icon as={MdSettings} />}
              borderRadius="lg"
              fontSize="sm"
              onClick={handleOpenColPicker}
            >
              열 선택
            </Button>
          </PopoverTrigger>
          <PopoverContent
            w="260px"
            shadow="xl"
            borderRadius="xl"
            border="1px solid"
            borderColor={popoverBorder}
          >
            <PopoverBody p={4}>
              <Text fontSize="sm" fontWeight="700" mb={3} color={textColor}>
                지표 열 선택
              </Text>

              {/* 기본 지표 */}
              <Text fontSize="xs" color={thColor} mb={2} fontWeight="600">기본 지표</Text>
              <VStack spacing="6px" align="stretch" mb={3}>
                {METRIC_COLUMNS.filter((c) => c.defaultOn).map((col) => (
                  <ColCheckItem
                    key={col.key}
                    label={col.label}
                    isChecked={draftCols.includes(col.key)}
                    onClick={() => toggleDraftCol(col.key)}
                    brandColor={brandColor}
                    borderColor={popoverBorder}
                    selectedBg={selectedBg}
                    inputBg={inputBg}
                    bgHover={bgHover}
                    textColor={textColor}
                  />
                ))}
              </VStack>

              <Divider mb={3} />

              {/* 추가 지표 */}
              <Text fontSize="xs" color={thColor} mb={2} fontWeight="600">추가 지표</Text>
              <VStack spacing="6px" align="stretch" maxH="180px" overflowY="auto" mb={3}>
                {METRIC_COLUMNS.filter((c) => !c.defaultOn).map((col) => (
                  <ColCheckItem
                    key={col.key}
                    label={col.label}
                    isChecked={draftCols.includes(col.key)}
                    onClick={() => toggleDraftCol(col.key)}
                    brandColor={brandColor}
                    borderColor={popoverBorder}
                    selectedBg={selectedBg}
                    inputBg={inputBg}
                    bgHover={bgHover}
                    textColor={textColor}
                  />
                ))}
              </VStack>

              <Text fontSize="xs" color="gray.500" mb={3}>
                {draftCols.length}개 열 선택됨
              </Text>

              <Divider mb={3} />

              <HStack justify="flex-end" spacing={2}>
                <Button size="sm" variant="ghost" onClick={handleCancelCols}>
                  취소
                </Button>
                <Button size="sm" colorScheme="brand" onClick={handleSaveCols}>
                  저장
                </Button>
              </HStack>
            </PopoverBody>
          </PopoverContent>
          </Popover>
        </Flex>
      </Flex>

      {/* ── 테이블 ── */}
      <Box overflowX="auto">
        {loading ? (
          <Flex justify="center" align="center" minH="240px">
            <Spinner size="xl" color="brand.500" thickness="3px" speed="0.7s" />
          </Flex>
        ) : sortedData.length === 0 ? (
          <Flex justify="center" align="center" minH="240px" direction="column" gap={2}>
            <Text fontSize="3xl">📊</Text>
            <Text color="gray.400" fontWeight="600">데이터가 없습니다</Text>
            <Text color="gray.300" fontSize="sm">선택한 기간에 추적된 데이터가 없습니다</Text>
          </Flex>
        ) : (
          <Table variant="simple" size="sm">
            <Thead>
              <Tr bg={headerBg}>
                <Th
                  {...thProps}
                  pl={6}
                  minW="200px"
                  onClick={() => handleSort('source')}
                >
                  <Flex align="center" gap={1}>
                    주소
                    <SortIcon colKey="source" sortKey={sortKey} sortDir={sortDir} />
                  </Flex>
                </Th>
                <Th {...thProps} minW="140px" cursor="default" _hover={{}}>
                  최근 방문한 UTM 채널
                </Th>
                {activeMetricCols.map((col) => (
                  <Th
                    key={col.key}
                    {...thProps}
                    isNumeric
                    minW="110px"
                    onClick={() => handleSort(col.key)}
                    color={sortKey === col.key ? 'brand.500' : thColor}
                  >
                    <Flex align="center" justify="flex-end" gap={1}>
                      {col.label}
                      {col.sessionEnd && (
                        <Tooltip label="session_end 발화 기준 데이터 — 탭 닫기/이탈 시 전송되며 마지막 페이지 이탈 누락 가능" fontSize="xs" placement="top" hasArrow>
                          <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }} onClick={(e) => e.stopPropagation()}>
                            <Icon as={MdOutlineInfo} boxSize="13px" color="gray.400" />
                          </span>
                        </Tooltip>
                      )}
                      <SortIcon colKey={col.key} sortKey={sortKey} sortDir={sortDir} />
                    </Flex>
                  </Th>
                ))}
              </Tr>
            </Thead>

            <Tbody>
              {/* 합계 행 */}
              {totalRow && (
                <Tr
                  borderBottomWidth="2px"
                  borderColor={borderColor}
                  bg={selectedSources.includes('합계') ? selectedRowBg : headerBg}
                  cursor="pointer"
                  onClick={(e) => handleRowClick('합계', e)}
                  _hover={{ bg: rowHoverBg }}
                  transition="background 0.1s"
                >
                  <Td py={3} pl={6} pr={3} borderColor={borderColor} minW="200px">
                    <Flex align="center" gap="10px">
                      <Flex
                        w="28px" h="28px" borderRadius="full"
                        align="center" justify="center"
                        bg={selectedSources.includes('합계') ? 'brand.500' : 'gray.400'}
                      >
                        <Icon as={MdPublic} boxSize="14px" color="white" />
                      </Flex>
                      <Text fontSize="sm" fontWeight="700" color={textColor}>합계</Text>
                    </Flex>
                  </Td>
                  <Td py={3} px={3} borderColor={borderColor}>
                    <Text fontSize="sm" color={thColor}>-</Text>
                  </Td>
                  {activeMetricCols.map((col) => (
                    <Td key={col.key} isNumeric py={3} px={3} borderColor={borderColor}>
                      <MetricCell value={totalRow[col.key]} format={col.format} highlighted={sortKey === col.key} />
                    </Td>
                  ))}
                </Tr>
              )}

              {/* 데이터 행 */}
              {sortedData.map((row, i) => {
                const isSelected = selectedSources.includes(row.source);
                return (
                  <Tr
                    key={i}
                    borderBottomWidth="1px"
                    borderColor={borderColor}
                    bg={isSelected ? selectedRowBg : undefined}
                    cursor="pointer"
                    onClick={(e) => handleRowClick(row.source, e)}
                    _hover={{ bg: rowHoverBg }}
                    transition="background 0.1s"
                  >
                    <Td py={3} pl={6} pr={3} borderColor={borderColor} minW="200px">
                      <SourceCell value={row.source} />
                    </Td>
                    <Td py={3} px={3} borderColor={borderColor} minW="140px">
                      <UtmChannelCell value={row.lastUtmChannel} />
                    </Td>
                    {activeMetricCols.map((col) => (
                      <Td key={col.key} isNumeric py={3} px={3} borderColor={borderColor}>
                        <MetricCell value={row[col.key]} format={col.format} highlighted={sortKey === col.key} />
                      </Td>
                    ))}
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </Box>

      {/* ── 푸터 ── */}
      {!loading && sortedData.length > 0 && (
        <Flex
          px={6} py={3}
          borderTopWidth="1px"
          borderColor={borderColor}
          justify="space-between"
          align="center"
          flexWrap="wrap"
          gap={2}
        >
          <Text fontSize="xs" color={thColor}>총 {sortedData.length}개 유입 경로</Text>
          <Text fontSize="xs" color={thColor}>행 클릭으로 차트 선택 · Ctrl(Cmd)+클릭으로 비교</Text>
        </Flex>
      )}
    </Card>
  );
}
