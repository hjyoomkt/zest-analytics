/**
 * ============================================================================
 * ChannelAnalytics - GA 스타일 채널 분석 테이블
 *
 * 채널 / 소스 / 미디엄 / 캠페인을 컬럼으로 나란히 보여주고,
 * 우측에 사용자수·페이지뷰수·체류시간 등 지표 컬럼이 이어집니다.
 * "열 선택" 버튼으로 지표 컬럼 추가/제거 가능합니다.
 * ============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
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
  MdSearch,
  MdEmail,
  MdLink,
  MdKeyboardArrowDown,
} from 'react-icons/md';
import { FaFacebook, FaInstagram, FaYoutube, FaTwitter } from 'react-icons/fa';
import Card from 'components/card/Card';
import { getUTMBreakdown } from '../services/zaService';

// 컴포넌트 언마운트 후에도 데이터를 유지하는 모듈 레벨 캐시
const _cache = {};
const _cacheKey = (advertiserId, startDate, endDate, attributionModel) =>
  `${advertiserId ?? 'all'}|${startDate}|${endDate}|${attributionModel}`;

const ATTRIBUTION_OPTIONS = [
  { value: 'first_touch', label: '퍼스트터치' },
  { value: 'visitor',     label: '방문자'     },
  { value: 'session',     label: '세션'       },
];

const ATTRIBUTION_USER_LABEL = {
  first_touch: '사용자수',
  visitor:     '사용자수*',
  session:     '세션수',
};

// ============================================================================
// 채널/소스 아이콘 설정
// ============================================================================

const CHANNEL_CONFIG = {
  facebook:       { icon: FaFacebook,  bg: '#1877F2',  color: 'white',   label: 'Facebook'        },
  meta:           { icon: FaFacebook,  bg: '#1877F2',  color: 'white',   label: 'Meta'            },
  instagram:      { icon: FaInstagram, bg: '#E1306C',  color: 'white',   label: 'Instagram'       },
  youtube:        { icon: FaYoutube,   bg: '#FF0000',  color: 'white',   label: 'YouTube'         },
  twitter:        { icon: FaTwitter,   bg: '#1DA1F2',  color: 'white',   label: 'Twitter/X'       },
  google:         { icon: null, abbr: 'G', bg: '#4285F4', color: 'white', label: 'Google'         },
  google_ads:     { icon: null, abbr: 'G', bg: '#4285F4', color: 'white', label: 'Google Ads'    },
  naver:          { icon: null, abbr: 'N', bg: '#03C75A', color: 'white', label: '네이버'          },
  naver_ads:      { icon: null, abbr: 'N', bg: '#03C75A', color: 'white', label: '네이버 광고'    },
  kakao:          { icon: null, abbr: 'K', bg: '#FEE500', color: '#3A1D1D', label: '카카오'       },
  tiktok:         { icon: null, abbr: 'T', bg: '#010101', color: 'white', label: 'TikTok'        },
  direct:         { icon: MdPublic,    bg: '#718096',  color: 'white',   label: '직접 유입'       },
  referral:       { icon: MdLink,      bg: '#9F7AEA',  color: 'white',   label: '추천 (외부링크)'  },
  email:          { icon: MdEmail,     bg: '#F6AD55',  color: 'white',   label: '이메일'          },
  organic:        { icon: MdSearch,    bg: '#48BB78',  color: 'white',   label: '오가닉'          },
  paid_search:    { icon: MdSearch,    bg: '#4285F4',  color: 'white',   label: 'Paid Search'    },
  paid_social:    { icon: FaFacebook,  bg: '#1877F2',  color: 'white',   label: 'Paid Social'    },
  organic_search: { icon: MdSearch,    bg: '#48BB78',  color: 'white',   label: 'Organic Search' },
  organic_social: { icon: null, abbr: 'S', bg: '#E1306C', color: 'white', label: 'Organic Social'},
  '(직접 유입)':  { icon: MdPublic,    bg: '#718096',  color: 'white',   label: '직접 유입'       },
};

const getChannelCfg = (value) => {
  if (!value || value === '-') return { bg: '#CBD5E0', color: '#2D3748', label: '-', abbr: '-' };
  const cfg = CHANNEL_CONFIG[value.toLowerCase()];
  return cfg || {
    bg: '#667eea',
    color: 'white',
    label: value,
    abbr: value.charAt(0).toUpperCase(),
  };
};

// ============================================================================
// 지표 컬럼 정의
// ============================================================================

const METRIC_COLUMNS = [
  { key: 'users',                 label: '사용자수',      format: 'number',   defaultOn: true  },
  { key: 'pageviews',             label: '페이지뷰수',    format: 'number',   defaultOn: true  },
  { key: 'avgPageviewsPerUser',   label: '평균 페이지뷰', format: 'decimal',  defaultOn: false },
  { key: 'avgTimeOnPage',         label: '평균 체류시간', format: 'duration', defaultOn: true  },
  { key: 'avgScrollDepth',        label: '평균 도달률',   format: 'percent',  defaultOn: false },
  { key: 'purchases',             label: '구매',          format: 'number',   defaultOn: true  },
  { key: 'revenue',               label: '구매전환액수',  format: 'currency', defaultOn: true  },
  { key: 'purchaseConversionRate',label: '구매전환율',    format: 'rate',     defaultOn: false },
  { key: 'addToCarts',            label: '장바구니담기',  format: 'number',   defaultOn: false },
  { key: 'signups',               label: '회원가입',      format: 'number',   defaultOn: true  },
  { key: 'memberConversionRate',  label: '회원전환율',    format: 'rate',     defaultOn: false },
  { key: 'leads',                 label: '리드',          format: 'number',   defaultOn: false },
];

// localStorage 열 저장 키
const CHANNEL_STORAGE_KEY = 'channel_analytics_visible_cols';

const loadChannelSavedCols = () => {
  try {
    const raw = localStorage.getItem(CHANNEL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const validKeys = new Set(METRIC_COLUMNS.map((c) => c.key));
    return parsed.filter((k) => validKeys.has(k));
  } catch {
    return null;
  }
};

// 차원 컬럼 (항상 표시, 정렬 가능)
const DIM_COLUMNS = [
  { key: 'channel',  label: '채널'   },
  { key: 'source',   label: '소스'   },
  { key: 'medium',   label: '미디엄' },
  { key: 'campaign', label: '캠페인' },
];

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
  if (colKey !== sortKey) return <Icon as={MdUnfoldMore} boxSize="14px" opacity={0.3} />;
  return sortDir === 'asc'
    ? <Icon as={MdArrowUpward}   boxSize="14px" color="brand.500" />
    : <Icon as={MdArrowDownward} boxSize="14px" color="brand.500" />;
}

/** 채널 컬럼: 아이콘 + 이름 */
function ChannelCell({ value }) {
  const cfg = getChannelCfg(value);
  const textColor = useColorModeValue('gray.800', 'white');

  if (value === '-' || !value) {
    return <Text fontSize="sm" color="gray.400">-</Text>;
  }

  return (
    <Flex align="center" gap="10px">
      {/* 아이콘 원 */}
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
      <Text fontSize="sm" fontWeight="600" color={textColor} noOfLines={1}>
        {cfg.label !== value ? cfg.label : value}
      </Text>
    </Flex>
  );
}

/** 일반 텍스트 차원 셀 (소스/미디엄/캠페인) */
function DimTextCell({ value }) {
  const textColor = useColorModeValue('gray.700', 'gray.200');
  if (!value || value === '-') return <Text fontSize="sm" color="gray.400">-</Text>;
  return (
    <Text fontSize="sm" color={textColor} noOfLines={1} maxW="160px" title={value}>
      {value}
    </Text>
  );
}

/** 지표 셀 */
function MetricCell({ value, format, highlighted }) {
  const highlightColor = useColorModeValue('brand.600', 'brand.300');
  const normalColor    = useColorModeValue('gray.700', 'gray.200');
  const color = highlighted ? highlightColor : normalColor;
  return (
    <Text fontSize="sm" fontWeight={highlighted ? '700' : '500'} color={color} textAlign="right">
      {fmt(value, format)}
    </Text>
  );
}

/** 열 선택용 커스텀 체크 항목 (EditUserModal 브랜드 선택 디자인) */
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
// 메인 컴포넌트
// ============================================================================

export default function ChannelAnalytics({
  advertiserId,
  availableAdvertiserIds,
  startDate,
  endDate,
}) {
  const toast = useToast();
  const { isOpen: isColOpen, onOpen: onColOpen, onClose: onColClose } = useDisclosure();

  const [attributionModel, setAttributionModel] = useState('first_touch');

  const [data,       setData]       = useState(() => {
    const key = _cacheKey(advertiserId, startDate, endDate, 'first_touch');
    return _cache[key] ?? [];
  });
  const [loading,    setLoading]    = useState(false);
  const [sortKey,    setSortKey]    = useState('users');
  const [sortDir,    setSortDir]    = useState('desc');
  const [visibleCols, setVisibleCols] = useState(
    loadChannelSavedCols() ?? METRIC_COLUMNS.filter((c) => c.defaultOn).map((c) => c.key)
  );
  const [draftCols,  setDraftCols]  = useState([]);

  // 색상
  const cardBg      = useColorModeValue('white', 'navy.800');
  const headerBg    = useColorModeValue('gray.50', 'navy.900');
  const borderColor = useColorModeValue('gray.100', 'whiteAlpha.100');
  const rowHoverBg  = useColorModeValue('blue.50', 'whiteAlpha.50');
  const thColor     = useColorModeValue('gray.500', 'gray.400');
  const textColor   = useColorModeValue('secondaryGray.900', 'white');
  // 브랜드 선택 스타일용
  const brandColor   = useColorModeValue('brand.500', 'brand.400');
  const selectedBg   = useColorModeValue('brand.50', 'whiteAlpha.100');
  const inputBg      = useColorModeValue('white', 'navy.700');
  const bgHover      = useColorModeValue('secondaryGray.100', 'whiteAlpha.100');
  const popoverBorder = useColorModeValue('gray.200', 'whiteAlpha.100');
  const dropdownTextColor = useColorModeValue('gray.700', 'white');
  const dropdownBorderColor = useColorModeValue('gray.300', 'whiteAlpha.300');

  const fetchData = useCallback(async () => {
    const key = _cacheKey(advertiserId, startDate, endDate, attributionModel);
    if (!_cache[key]) setLoading(true);
    try {
      const result = await getUTMBreakdown({
        advertiserId,
        availableAdvertiserIds,
        startDate,
        endDate,
        attributionModel,
      });
      _cache[key] = result;
      setData(result);
    } catch (err) {
      console.error('채널 분석 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [advertiserId, availableAdvertiserIds, startDate, endDate, attributionModel]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    const mult = sortDir === 'asc' ? 1 : -1;
    const aVal = a[sortKey] ?? '';
    const bVal = b[sortKey] ?? '';
    if (typeof aVal === 'number') return mult * (aVal - bVal);
    return mult * String(aVal).localeCompare(String(bVal));
  });

  const activeMetricCols = METRIC_COLUMNS
    .filter((c) => visibleCols.includes(c.key))
    .map((c) => c.key === 'users' ? { ...c, label: ATTRIBUTION_USER_LABEL[attributionModel] } : c);

  // 헤더 "열 저장" 버튼: 현재 적용된 컬럼을 localStorage에 즉시 저장
  const handleSaveCurrentCols = () => {
    try {
      localStorage.setItem(CHANNEL_STORAGE_KEY, JSON.stringify(visibleCols));
      toast({ title: '열 설정이 저장되었습니다.', status: 'success', duration: 2000, isClosable: true, position: 'top-right' });
    } catch {
      toast({ title: '저장에 실패했습니다.', status: 'error', duration: 2000, position: 'top-right' });
    }
  };

  // 열 선택 Popover 열기 (draft 초기화)
  const handleOpenColPicker = () => {
    setDraftCols([...visibleCols]);
    onColOpen();
  };

  const toggleDraftCol = (key) =>
    setDraftCols((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  const handleCancelCols = () => {
    onColClose();
  };

  const handleSaveCols = () => {
    setVisibleCols(draftCols);
    try {
      localStorage.setItem(CHANNEL_STORAGE_KEY, JSON.stringify(draftCols));
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

  // 공통 Th 스타일
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
          채널 분석
        </Text>

        <Flex gap={2} align="center">
          {/* 어트리뷰션 기준 선택 */}
          <Menu>
            <MenuButton
              as={Button}
              rightIcon={<MdKeyboardArrowDown />}
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
              {ATTRIBUTION_OPTIONS.find((o) => o.value === attributionModel)?.label}
            </MenuButton>
            <MenuList minW="auto" w="fit-content" px="8px" py="8px" zIndex={2000}>
              {ATTRIBUTION_OPTIONS.map((opt) => (
                <MenuItem
                  key={opt.value}
                  onClick={() => setAttributionModel(opt.value)}
                  bg={attributionModel === opt.value ? brandColor : 'transparent'}
                  color={attributionModel === opt.value ? 'white' : textColor}
                  _hover={{ bg: attributionModel === opt.value ? brandColor : bgHover }}
                  fontWeight={attributionModel === opt.value ? '600' : '500'}
                  fontSize="sm"
                  px="12px"
                  py="8px"
                  borderRadius="8px"
                  justifyContent="center"
                  textAlign="center"
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
              <VStack spacing="6px" align="stretch" maxH="320px" overflowY="auto" mb={3}>
                {METRIC_COLUMNS.map((col) => (
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

                {/* ── 차원 컬럼 헤더 (채널/소스/미디엄/캠페인) ── */}
                {DIM_COLUMNS.map((dim, i) => (
                  <Th
                    key={dim.key}
                    {...thProps}
                    pl={i === 0 ? 6 : 3}
                    minW={dim.key === 'campaign' ? '180px' : dim.key === 'channel' ? '160px' : '120px'}
                    onClick={() => handleSort(dim.key)}
                  >
                    <Flex align="center" gap={1}>
                      {dim.label}
                      <SortIcon colKey={dim.key} sortKey={sortKey} sortDir={sortDir} />
                    </Flex>
                  </Th>
                ))}

                {/* ── 지표 컬럼 헤더 ── */}
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
              {sortedData.map((row, i) => (
                <Tr
                  key={i}
                  borderBottomWidth="1px"
                  borderColor={borderColor}
                  _hover={{ bg: rowHoverBg }}
                  transition="background 0.1s"
                >
                  {/* 채널 */}
                  <Td py={3} pl={6} pr={3} borderColor={borderColor} minW="160px">
                    <ChannelCell value={row.channel} />
                  </Td>

                  {/* 소스 */}
                  <Td py={3} px={3} borderColor={borderColor} minW="120px">
                    <DimTextCell value={row.source} />
                  </Td>

                  {/* 미디엄 */}
                  <Td py={3} px={3} borderColor={borderColor} minW="120px">
                    <DimTextCell value={row.medium} />
                  </Td>

                  {/* 캠페인 */}
                  <Td py={3} px={3} borderColor={borderColor} minW="180px">
                    <DimTextCell value={row.campaign} />
                  </Td>

                  {/* 지표들 */}
                  {activeMetricCols.map((col) => (
                    <Td key={col.key} isNumeric py={3} px={3} borderColor={borderColor}>
                      <MetricCell
                        value={row[col.key]}
                        format={col.format}
                        highlighted={sortKey === col.key}
                      />
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
          <Text fontSize="xs" color={thColor}>
            총 {sortedData.length}개 채널-소스-미디엄-캠페인 조합
          </Text>
          <Flex gap={2} flexWrap="wrap">
            <Badge colorScheme="blue"  variant="subtle" fontSize="xs">세션 기준 사용자</Badge>
            <Badge colorScheme="green" variant="subtle" fontSize="xs">세션당 체류시간</Badge>
          </Flex>
        </Flex>
      )}
    </Card>
  );
}
