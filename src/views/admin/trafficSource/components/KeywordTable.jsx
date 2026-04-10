/**
 * ============================================================================
 * KeywordTable - 유입 키워드별 전환 지표 테이블
 *
 * - page_referrer에서 검색엔진 키워드를 추출하여 집계
 * - 네이버/다음/빙/네이트 유기검색 키워드 지원
 * - 구글: HTTPS 암호화로 인해 (not provided) 표시
 * ============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
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
  MdSearch,
  MdInfoOutline,
} from 'react-icons/md';
import Card from 'components/card/Card';
import { getKeywordBreakdown } from 'views/admin/zestAnalytics/services/zaService';

// ── localStorage 키 ──────────────────────────────────────────────────────────
const STORAGE_KEY = 'keyword_table_visible_cols';

// ── 모듈 레벨 캐시 ───────────────────────────────────────────────────────────
const _cache = {};
const _cacheKey = (advertiserId, startDate, endDate) =>
  `keyword|${advertiserId ?? 'all'}|${startDate}|${endDate}`;

// ============================================================================
// 검색엔진 스타일 설정
// ============================================================================

const ENGINE_CONFIG = {
  '네이버':  { abbr: 'N', bg: '#03C75A', color: 'white'  },
  '다음':    { abbr: 'D', bg: '#FF5000', color: 'white'  },
  'Google':  { abbr: 'G', bg: '#4285F4', color: 'white'  },
  'Bing':    { abbr: 'B', bg: '#008373', color: 'white'  },
  '네이트':  { abbr: 'T', bg: '#FF6000', color: 'white'  },
  'Yahoo':   { abbr: 'Y', bg: '#6001D2', color: 'white'  },
};

const getEngineCfg = (engine) =>
  ENGINE_CONFIG[engine] || { abbr: engine?.[0]?.toUpperCase() || '?', bg: '#9F7AEA', color: 'white' };

// ============================================================================
// 지표 컬럼 정의
// ============================================================================

const METRIC_COLUMNS = [
  { key: 'visitors',               label: '방문자 수',      format: 'number',   defaultOn: true  },
  { key: 'sessions',               label: '세션 수',        format: 'number',   defaultOn: true  },
  { key: 'signups',                label: '회원 전환 수',   format: 'number',   defaultOn: true  },
  { key: 'memberConversionRate',   label: '회원 전환율',    format: 'rate',     defaultOn: true  },
  { key: 'purchasers',             label: '구매자 수',      format: 'number',   defaultOn: true  },
  { key: 'purchaseCount',          label: '구매량',         format: 'number',   defaultOn: true  },
  { key: 'revenue',                label: '총 구매 금액',   format: 'currency', defaultOn: true  },
  { key: 'purchaseConversionRate', label: '구매 전환율',    format: 'rate',     defaultOn: true  },
  { key: 'avgOrderValue',          label: '평균 주문 금액', format: 'currency', defaultOn: false },
  { key: 'leads',                  label: '리드',           format: 'number',   defaultOn: false },
  { key: 'addToCarts',             label: '장바구니담기',   format: 'number',   defaultOn: false },
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
    case 'rate':     return value === 0 ? '-' : `${Number(value).toFixed(2)}%`;
    case 'currency': return value === 0 ? '-' : `₩${Math.round(value).toLocaleString()}`;
    default:         return String(value);
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

function EngineCell({ engine, engineDomain }) {
  const cfg      = getEngineCfg(engine);
  const textColor = useColorModeValue('gray.800', 'white');
  return (
    <Flex align="center" gap="8px">
      <Flex
        w="24px" h="24px" borderRadius="full" flexShrink={0}
        align="center" justify="center" bg={cfg.bg}
      >
        <Text fontSize="10px" fontWeight="800" color={cfg.color} lineHeight={1}>
          {cfg.abbr}
        </Text>
      </Flex>
      <Text fontSize="sm" color={textColor}>{engine}</Text>
    </Flex>
  );
}

function KeywordCell({ keyword }) {
  const textColor  = useColorModeValue('gray.800', 'white');
  const subColor   = useColorModeValue('gray.400', 'gray.500');
  const isNotProvided = keyword === '(not provided)';
  return (
    <Flex align="center" gap={2}>
      {isNotProvided ? (
        <>
          <Text fontSize="sm" color={subColor} fontStyle="italic">(not provided)</Text>
          <Tooltip
            label="Google은 HTTPS 암호화로 검색 키워드를 전달하지 않습니다. Google Search Console 연동 시 확인 가능합니다."
            fontSize="xs"
            placement="top"
            hasArrow
          >
            <span>
              <Icon as={MdInfoOutline} boxSize="14px" color={subColor} cursor="help" />
            </span>
          </Tooltip>
        </>
      ) : (
        <Flex align="center" gap={2}>
          <Icon as={MdSearch} boxSize="14px" color="green.400" />
          <Text fontSize="sm" fontWeight="600" color={textColor} noOfLines={1} maxW="240px" title={keyword}>
            {keyword}
          </Text>
        </Flex>
      )}
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
  const total = { keyword: '합계', engine: null };
  activeMetricCols.forEach(({ key, format }) => {
    if (['rate'].includes(format)) {
      total[key] = null;
    } else {
      total[key] = rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);
    }
  });
  const totVisitors  = rows.reduce((s, r) => s + (r.visitors || 0), 0);
  const totSignups   = rows.reduce((s, r) => s + (r.signups || 0), 0);
  const totPurchases = rows.reduce((s, r) => s + (r.purchaseCount || 0), 0);
  const totRevenue   = rows.reduce((s, r) => s + (r.revenue || 0), 0);
  total.visitors               = totVisitors;
  total.memberConversionRate   = totVisitors > 0 ? +((totSignups  / totVisitors) * 100).toFixed(2) : 0;
  total.purchaseConversionRate = totVisitors > 0 ? +((totPurchases / totVisitors) * 100).toFixed(2) : 0;
  total.avgOrderValue          = totPurchases > 0 ? Math.round(totRevenue / totPurchases) : 0;
  return total;
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function KeywordTable({
  advertiserId,
  availableAdvertiserIds,
  startDate,
  endDate,
}) {
  const toast = useToast();
  const { isOpen: isColOpen, onOpen: onColOpen, onClose: onColClose } = useDisclosure();

  const [data,        setData]        = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [sortKey,     setSortKey]     = useState('visitors');
  const [sortDir,     setSortDir]     = useState('desc');
  const [visibleCols, setVisibleCols] = useState(loadSavedCols() ?? DEFAULT_COLS);
  const [draftCols,   setDraftCols]   = useState([]);

  // 색상 토큰
  const cardBg          = useColorModeValue('white', 'navy.800');
  const headerBg        = useColorModeValue('gray.50', 'navy.900');
  const borderColor     = useColorModeValue('gray.100', 'whiteAlpha.100');
  const rowHoverBg      = useColorModeValue('blue.50', 'whiteAlpha.50');
  const thColor         = useColorModeValue('gray.500', 'gray.400');
  const textColor       = useColorModeValue('secondaryGray.900', 'white');
  const brandColor      = useColorModeValue('brand.500', 'brand.400');
  const selectedBg      = useColorModeValue('brand.50', 'whiteAlpha.100');
  const inputBg         = useColorModeValue('white', 'navy.700');
  const bgHover         = useColorModeValue('secondaryGray.100', 'whiteAlpha.100');
  const popoverBorder   = useColorModeValue('gray.200', 'whiteAlpha.100');

  const fetchData = useCallback(async () => {
    const key = _cacheKey(advertiserId, startDate, endDate);
    if (!_cache[key]) setLoading(true);
    try {
      const result = await getKeywordBreakdown({
        advertiserId,
        availableAdvertiserIds,
        startDate,
        endDate,
      });
      _cache[key] = result;
      setData(result);
    } catch (err) {
      console.error('유입 키워드 데이터 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [advertiserId, availableAdvertiserIds, startDate, endDate]);

  useEffect(() => {
    const key = _cacheKey(advertiserId, startDate, endDate);
    if (_cache[key]) {
      setData(_cache[key]);
    } else {
      fetchData();
    }
  }, [fetchData, advertiserId, startDate, endDate]);

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

  const handleOpenColPicker = () => {
    setDraftCols([...visibleCols]);
    onColOpen();
  };

  const toggleDraftCol = (key) =>
    setDraftCols((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  const handleSaveCurrentCols = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleCols));
      toast({ title: '열 설정이 저장되었습니다.', status: 'success', duration: 2000, isClosable: true, position: 'top-right' });
    } catch {
      toast({ title: '저장에 실패했습니다.', status: 'error', duration: 2000, position: 'top-right' });
    }
  };

  const handleCancelCols = () => onColClose();

  const handleSaveCols = () => {
    setVisibleCols(draftCols);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draftCols));
      toast({ title: '열 설정이 저장되었습니다.', status: 'success', duration: 2000, isClosable: true, position: 'top-right' });
    } catch {
      toast({ title: '저장에 실패했습니다.', status: 'error', duration: 2000, position: 'top-right' });
    }
    onColClose();
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

  // 검색엔진별 방문자 합산 (요약 배지용)
  const engineSummary = data.reduce((acc, row) => {
    acc[row.engine] = (acc[row.engine] || 0) + row.visitors;
    return acc;
  }, {});

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
        <Flex align="center" gap={3} flexWrap="wrap">
          <Text fontSize="lg" fontWeight="700" color={textColor}>
            유입 키워드
          </Text>
          {/* 검색엔진별 요약 배지 */}
          {Object.entries(engineSummary).map(([engine, count]) => {
            const cfg = getEngineCfg(engine);
            return (
              <Badge
                key={engine}
                px={2} py={0.5}
                borderRadius="full"
                fontSize="xs"
                bg={cfg.bg}
                color={cfg.color}
              >
                {engine} {count.toLocaleString()}명
              </Badge>
            );
          })}
        </Flex>

        <Flex gap={2} align="center">
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

                <Text fontSize="xs" color={thColor} mb={2} fontWeight="600">추가 지표</Text>
                <VStack spacing="6px" align="stretch" maxH="160px" overflowY="auto" mb={3}>
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
            <Text fontSize="3xl">🔍</Text>
            <Text color="gray.400" fontWeight="600">데이터가 없습니다</Text>
            <Text color="gray.300" fontSize="sm">선택한 기간에 검색 유입 데이터가 없습니다</Text>
          </Flex>
        ) : (
          <Table variant="simple" size="sm">
            <Thead>
              <Tr bg={headerBg}>
                <Th
                  {...thProps}
                  pl={6}
                  minW="240px"
                  onClick={() => handleSort('keyword')}
                >
                  <Flex align="center" gap={1}>
                    키워드
                    <SortIcon colKey="keyword" sortKey={sortKey} sortDir={sortDir} />
                  </Flex>
                </Th>
                <Th
                  {...thProps}
                  minW="110px"
                  onClick={() => handleSort('engine')}
                >
                  <Flex align="center" gap={1}>
                    검색엔진
                    <SortIcon colKey="engine" sortKey={sortKey} sortDir={sortDir} />
                  </Flex>
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
                  bg={headerBg}
                >
                  <Td py={3} pl={6} pr={3} borderColor={borderColor} minW="240px">
                    <Text fontSize="sm" fontWeight="700" color={textColor}>합계</Text>
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
              {sortedData.map((row, i) => (
                <Tr
                  key={i}
                  borderBottomWidth="1px"
                  borderColor={borderColor}
                  _hover={{ bg: rowHoverBg }}
                  transition="background 0.1s"
                >
                  <Td py={3} pl={6} pr={3} borderColor={borderColor} minW="240px">
                    <KeywordCell keyword={row.keyword} />
                  </Td>
                  <Td py={3} px={3} borderColor={borderColor} minW="110px">
                    <EngineCell engine={row.engine} engineDomain={row.engineDomain} />
                  </Td>
                  {activeMetricCols.map((col) => (
                    <Td key={col.key} isNumeric py={3} px={3} borderColor={borderColor}>
                      <MetricCell value={row[col.key]} format={col.format} highlighted={sortKey === col.key} />
                    </Td>
                  ))}
                </Tr>
              ))}
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
          <Text fontSize="xs" color={thColor}>총 {sortedData.length}개 키워드</Text>
          <Flex align="center" gap={1}>
            <Icon as={MdInfoOutline} boxSize="12px" color={thColor} />
            <Text fontSize="xs" color={thColor}>
              Google 유기검색 키워드는 HTTPS 암호화로 확인 불가 — 추후 Search Console 연동 예정
            </Text>
          </Flex>
        </Flex>
      )}
    </Card>
  );
}
