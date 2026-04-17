/**
 * ============================================================================
 * NavigationFlow - 경로 탐색 분석
 *
 * - 세션 내 페이지 이동 흐름을 단계별 컬럼으로 시각화
 * - 카드 클릭 → 해당 페이지 필터 → 다음 단계 데이터 갱신
 * - 표시 모드: 타이틀명 | 전체경로(/shop/?idx=79) | 경로만(/shop/)
 * - 기본 7단계 표시 / 데이터 있으면 1단계씩 확장 가능 (최대 20단계)
 * - 단계별 최대 8개 카드(더 보기 가능) / 가로 스크롤 지원
 * ============================================================================
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  HStack,
  VStack,
  Icon,
  Spinner,
  Badge,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  MdArrowForward,
  MdClose,
  MdExitToApp,
  MdKeyboardArrowRight,
} from 'react-icons/md';
import Card from 'components/card/Card';
import { getNavigationPaths, analyticsCacheVersion } from 'views/admin/zestAnalytics/services/zaService';

// ── 설정 ─────────────────────────────────────────────────────────────────────

const INITIAL_STEPS   = 7;       // 기본 표시 단계 수 (이후 1씩 확장 가능)
const ABSOLUTE_MAX    = 20;      // 전체 계산 상한
const PAGE_LIMIT      = 8;
const SESSION_LIMIT   = 100000;

// ── 라벨 추출 ─────────────────────────────────────────────────────────────────

/**
 * { path, title } 방문 객체에서 표시 모드에 맞는 라벨 반환
 * - 'title'      : page_title (없으면 전체 경로로 fallback)
 * - 'title_path' : page_title | /shop/
 * - 'title_full' : page_title | /shop/?idx=79
 * - 'full'       : /shop/?idx=79
 * - 'path'       : /shop/
 */
function getLabel(visit, mode) {
  if (!visit) return '(알 수 없음)';
  const { path, title } = visit;

  if (mode === 'title') {
    return (title && title.trim()) ? title.trim() : normPathStr(path, 'full');
  }
  if (mode === 'title_path') {
    const t = (title && title.trim()) ? title.trim() : null;
    const p = normPathStr(path, 'path');
    return t ? `${t} (${p})` : p;
  }
  if (mode === 'title_full') {
    const t = (title && title.trim()) ? title.trim() : null;
    const p = normPathStr(path, 'full');
    return t ? `${t} (${p})` : p;
  }
  return normPathStr(path, mode);
}

function normPathStr(raw, mode) {
  if (!raw) return '/';
  try {
    const base = raw.includes('://') ? raw : `https://x.com${raw}`;
    const u    = new URL(base);
    if (mode === 'path') return u.pathname || '/';
    const full = u.pathname + (u.search || '');
    return full || '/';
  } catch {
    return raw.length > 200 ? `${raw.slice(0, 200)}…` : raw;
  }
}

// ── step 데이터 계산 ───────────────────────────────────────────────────────────

/**
 * @param {Array<Array<{path:string, title:string|null}>>} allSessions
 * @param {(string|null)[]} selectedPath  각 단계에서 선택된 라벨
 * @param {'title'|'full'|'path'} mode
 * @param {number} maxSteps
 */
function computeStepData(allSessions, selectedPath, mode, maxSteps) {
  const label = (visit) => getLabel(visit, mode);
  const steps = [];

  for (let stepIdx = 0; stepIdx < maxSteps; stepIdx++) {
    // 이전 단계 선택 기준으로 세션 필터
    const relevant = allSessions.filter((sess) => {
      for (let i = 0; i < stepIdx; i++) {
        const sel = selectedPath[i];
        if (sel != null) {
          if (!sess[i] || label(sess[i]) !== sel) return false;
        }
      }
      return true;
    });

    // 이 단계 페이지 집계
    const counts = {};
    let reachCount = 0;

    relevant.forEach((sess) => {
      if (sess[stepIdx]) {
        const lbl = label(sess[stepIdx]);
        counts[lbl] = (counts[lbl] || 0) + 1;
        reachCount++;
      }
    });

    const exitCount = relevant.length - reachCount;

    const pages = Object.entries(counts)
      .map(([lbl, count]) => ({ lbl, count }))
      .sort((a, b) => b.count - a.count);

    steps.push({ stepIdx, pages, relevant: relevant.length, reachCount, exitCount });

    if (reachCount === 0 && stepIdx > 0) break;
  }

  return steps;
}

// ── 모듈 레벨 캐시 ─────────────────────────────────────────────────────────────

const _cache = {};
const _cacheKey = (aId, ids, s, e) => `nav|${aId ?? 'all'}|${ids.join(',')}|${s}|${e}|ip${analyticsCacheVersion.v}`;

// ── 하위 컴포넌트 ──────────────────────────────────────────────────────────────

function PageCard({ lbl, count, maxCount, totalInStep, isSelected, onClick }) {
  const barWidth = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
  const pct      = totalInStep > 0 ? ((count / totalInStep) * 100).toFixed(1) : '0.0';

  const textColor  = useColorModeValue('gray.800', 'white');
  const subColor   = useColorModeValue('gray.500', 'gray.400');
  const barBg      = useColorModeValue('gray.100', 'whiteAlpha.100');
  const cardBg     = useColorModeValue('white', 'navy.700');
  const selectedBg = useColorModeValue('brand.50', 'whiteAlpha.100');
  const borderNorm = useColorModeValue('gray.200', 'whiteAlpha.200');
  const brandColor = useColorModeValue('brand.500', 'brand.400');
  const barColor   = useColorModeValue('brand.400', 'brand.300');

  return (
    <Tooltip label={lbl} placement="top" hasArrow openDelay={400}>
      <Box
        p="10px 12px"
        borderRadius="10px"
        border="2px solid"
        borderColor={isSelected ? brandColor : borderNorm}
        bg={isSelected ? selectedBg : cardBg}
        cursor="pointer"
        onClick={onClick}
        _hover={{ borderColor: brandColor }}
        transition="all 0.15s"
        w="210px"
        flexShrink={0}
      >
        <Text
          fontSize="xs"
          fontWeight={isSelected ? '700' : '600'}
          color={isSelected ? brandColor : textColor}
          noOfLines={2}
          mb="8px"
          lineHeight="1.5"
          minH="2.8em"
          wordBreak="break-all"
        >
          {lbl}
        </Text>

        <Box bg={barBg} borderRadius="full" h="3px" mb="6px">
          <Box
            bg={isSelected ? brandColor : barColor}
            borderRadius="full"
            h="3px"
            w={`${barWidth}%`}
            transition="width 0.3s ease"
          />
        </Box>

        <Flex justify="space-between" align="center">
          <Text fontSize="xs" fontWeight="700" color={isSelected ? brandColor : textColor}>
            {count.toLocaleString()}세션
          </Text>
          <Text fontSize="xs" color={subColor}>{pct}%</Text>
        </Flex>
      </Box>
    </Tooltip>
  );
}

function ExitCard({ count, totalInStep }) {
  const pct         = totalInStep > 0 ? ((count / totalInStep) * 100).toFixed(1) : '0.0';
  const subColor    = useColorModeValue('gray.400', 'gray.500');
  const exitBg      = useColorModeValue('gray.50', 'whiteAlpha.50');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');

  if (count === 0) return null;
  return (
    <Box
      p="8px 12px"
      borderRadius="10px"
      border="1px dashed"
      borderColor={borderColor}
      bg={exitBg}
      w="210px"
      flexShrink={0}
    >
      <Flex align="center" gap="6px" mb="4px">
        <Icon as={MdExitToApp} boxSize="11px" color={subColor} />
        <Text fontSize="xs" color={subColor} fontWeight="600">세션 종료</Text>
      </Flex>
      <Flex justify="space-between">
        <Text fontSize="xs" fontWeight="700" color={subColor}>{count.toLocaleString()}</Text>
        <Text fontSize="xs" color={subColor}>{pct}%</Text>
      </Flex>
    </Box>
  );
}

function StepColumn({ step, selectedLabel, onPageClick, onExpand }) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { setExpanded(false); }, [step.pages]);

  const thColor    = useColorModeValue('gray.500', 'gray.400');
  const dividerBg  = useColorModeValue('gray.100', 'whiteAlpha.100');
  const brandColor = useColorModeValue('brand.500', 'brand.400');

  const maxCount  = step.pages[0]?.count ?? 1;
  const displayed = expanded ? step.pages : step.pages.slice(0, PAGE_LIMIT);
  const more      = step.pages.length - PAGE_LIMIT;
  const stepLabel = step.stepIdx === 0 ? '시작 페이지' : `${step.stepIdx + 1}단계`;

  return (
    <Flex direction="column" flexShrink={0} w="210px">
      <Box mb="10px" textAlign="center">
        <Flex justify="center" align="center" gap="3px">
          <Text fontSize="11px" fontWeight="700" color={thColor} textTransform="uppercase" letterSpacing="0.06em">
            {stepLabel}
          </Text>
          {onExpand && <Icon as={MdKeyboardArrowRight} boxSize="13px" color={brandColor} />}
        </Flex>
        <Text fontSize="11px" color={thColor} mt="2px">
          {step.relevant.toLocaleString()}세션
        </Text>
        <Box h="1px" bg={dividerBg} mt="6px" />
      </Box>

      <VStack spacing="6px" align="stretch">
        {displayed.map(({ lbl, count }) => (
          <PageCard
            key={lbl}
            lbl={lbl}
            count={count}
            maxCount={maxCount}
            totalInStep={step.reachCount}
            isSelected={selectedLabel === lbl}
            onClick={() => { onPageClick(step.stepIdx, lbl); if (onExpand) onExpand(); }}
          />
        ))}

        {!expanded && more > 0 && (
          <Button size="xs" variant="ghost" colorScheme="gray" fontSize="11px" color={thColor}
            onClick={() => setExpanded(true)}>
            {more.toLocaleString()}개 더 보기
          </Button>
        )}
        {expanded && step.pages.length > PAGE_LIMIT && (
          <Button size="xs" variant="ghost" colorScheme="gray" fontSize="11px" color={thColor}
            onClick={() => setExpanded(false)}>
            접기
          </Button>
        )}

        <ExitCard count={step.exitCount} totalInStep={step.relevant} />
      </VStack>
    </Flex>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────────

const PATH_MODES = [
  { value: 'title',      label: '타이틀명',        example: '상품 상세 페이지'                    },
  { value: 'title_path', label: '타이틀(경로)',     example: '상품 상세 페이지 (/shop/)'           },
  { value: 'title_full', label: '타이틀(전체경로)', example: '상품 상세 페이지 (/shop/?idx=79)'    },
  { value: 'full',       label: '전체 경로',        example: '/shop/?idx=79'                       },
  { value: 'path',       label: '경로만',           example: '/shop/'                              },
];

export default function NavigationFlow({
  advertiserId,
  availableAdvertiserIds,
  startDate,
  endDate,
}) {
  const [sessions,      setSessions]     = useState([]);
  const [loading,       setLoading]      = useState(false);
  const [pathMode,      setPathMode]     = useState('title');
  const [selectedPath,  setSelectedPath] = useState([]);
  const [visibleSteps,  setVisibleSteps] = useState(INITIAL_STEPS);

  const textColor     = useColorModeValue('secondaryGray.900', 'white');
  const subColor      = useColorModeValue('gray.500', 'gray.400');
  const borderColor   = useColorModeValue('gray.100', 'whiteAlpha.100');
  const arrowColor    = useColorModeValue('gray.300', 'gray.600');
  const modActiveBg   = useColorModeValue('brand.500', 'brand.400');
  const modInactiveBg = useColorModeValue('gray.100', 'navy.700');
  const breadcrumbBg  = useColorModeValue('brand.50', 'whiteAlpha.50');
  const noTitleBg     = useColorModeValue('orange.50', 'whiteAlpha.50');
  const noTitleColor  = useColorModeValue('orange.600', 'orange.300');

  const ids = useMemo(() => availableAdvertiserIds ?? [], [availableAdvertiserIds]);

  const fetchData = useCallback(async () => {
    const key = _cacheKey(advertiserId, ids, startDate, endDate);
    if (_cache[key]) { setSessions(_cache[key]); return; }
    setLoading(true);
    try {
      const result = await getNavigationPaths({ advertiserId, availableAdvertiserIds: ids, startDate, endDate });
      _cache[key] = result;
      setSessions(result);
    } catch (err) {
      console.error('경로 탐색 데이터 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [advertiserId, ids, startDate, endDate]);

  useEffect(() => { fetchData(); setVisibleSteps(INITIAL_STEPS); }, [fetchData]);
  useEffect(() => { setSelectedPath([]); setVisibleSteps(INITIAL_STEPS); }, [pathMode]);

  // ABSOLUTE_MAX까지 전체 계산 후 visibleSteps만큼 잘라서 표시
  const allStepData = useMemo(
    () => computeStepData(sessions, selectedPath, pathMode, ABSOLUTE_MAX),
    [sessions, selectedPath, pathMode],
  );
  const stepData   = allStepData.slice(0, visibleSteps);
  const hasMore    = allStepData.length > visibleSteps;

  const handlePageClick = useCallback((stepIdx, lbl) => {
    setSelectedPath((prev) => {
      const next = prev.slice(0, stepIdx);
      if (prev[stepIdx] === lbl) return next;
      next[stepIdx] = lbl;
      return next;
    });
  }, []);

  const selectedLabels = selectedPath.filter(Boolean);

  // 타이틀 모드인데 타이틀 데이터가 없는지 체크
  const hasTitleData = useMemo(() => {
    if (!['title', 'title_path', 'title_full'].includes(pathMode)) return true;
    return sessions.some((sess) => sess.some((v) => v.title && v.title.trim()));
  }, [sessions, pathMode]);

  return (
    <Card p={0}>
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
        <Box>
          <Text fontSize="lg" fontWeight="700" color={textColor}>경로 탐색 분석</Text>
          <Text fontSize="xs" color={subColor} mt="2px">
            세션 내 페이지 이동 흐름 · 카드를 클릭하면 해당 경로로 필터됩니다
          </Text>
        </Box>

        <HStack spacing={3}>
          {/* 표시 모드 토글 */}
          <HStack
            spacing={0}
            borderRadius="8px"
            border="1px solid"
            borderColor={borderColor}
            overflow="hidden"
          >
            {PATH_MODES.map((mode) => (
              <Tooltip key={mode.value} label={`예: ${mode.example}`} placement="top" hasArrow>
                <Button
                  size="sm"
                  px="10px"
                  py="6px"
                  h="auto"
                  borderRadius={0}
                  bg={pathMode === mode.value ? modActiveBg : modInactiveBg}
                  color={pathMode === mode.value ? 'white' : subColor}
                  fontWeight={pathMode === mode.value ? '700' : '500'}
                  fontSize="xs"
                  onClick={() => setPathMode(mode.value)}
                  _hover={{ bg: pathMode === mode.value ? modActiveBg : 'gray.200' }}
                >
                  {mode.label}
                </Button>
              </Tooltip>
            ))}
          </HStack>

          {selectedLabels.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              colorScheme="gray"
              leftIcon={<Icon as={MdClose} boxSize="14px" />}
              borderRadius="8px"
              fontSize="xs"
              onClick={() => setSelectedPath([])}
            >
              필터 초기화
            </Button>
          )}
        </HStack>
      </Flex>

      {/* ── 타이틀 데이터 없음 안내 ── */}
      {['title', 'title_path', 'title_full'].includes(pathMode) && !loading && sessions.length > 0 && !hasTitleData && (
        <Flex
          px={6} py="10px"
          align="center"
          gap={2}
          borderBottomWidth="1px"
          borderColor={borderColor}
          bg={noTitleBg}
        >
          <Text fontSize="xs" color={noTitleColor}>
            ⚠ 현재 기간의 데이터에 페이지 타이틀 정보가 없습니다. Supabase에 <Text as="code" fontSize="xs" fontFamily="mono">page_title</Text> 컬럼 추가 후 새로 수집된 데이터부터 표시됩니다. 전체 경로로 표시 중입니다.
          </Text>
        </Flex>
      )}

      {/* ── 선택 경로 breadcrumb ── */}
      {selectedLabels.length > 0 && (
        <Flex
          px={6} py="10px"
          align="center"
          gap="6px"
          borderBottomWidth="1px"
          borderColor={borderColor}
          flexWrap="wrap"
          bg={breadcrumbBg}
        >
          <Text fontSize="11px" color={subColor} fontWeight="600" flexShrink={0}>선택 경로:</Text>
          {selectedLabels.map((lbl, i) => (
            <React.Fragment key={i}>
              {i > 0 && <Icon as={MdArrowForward} boxSize="11px" color={arrowColor} flexShrink={0} />}
              <Tooltip label="클릭하면 이 단계까지 이동" placement="top" hasArrow>
                <Badge
                  colorScheme="brand"
                  variant="subtle"
                  fontSize="11px"
                  px={2} py="2px"
                  borderRadius="md"
                  cursor="pointer"
                  maxW="200px"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                  title={lbl}
                  onClick={() => setSelectedPath(selectedPath.slice(0, i))}
                >
                  {lbl.length > 35 ? `${lbl.slice(0, 35)}…` : lbl}
                </Badge>
              </Tooltip>
            </React.Fragment>
          ))}
          <Text fontSize="11px" color={subColor}>(배지 클릭으로 해당 단계로 이동)</Text>
        </Flex>
      )}

      {/* ── 메인 콘텐츠 ── */}
      <Box px={6} py={5}>
        {loading ? (
          <Flex justify="center" align="center" minH="320px">
            <Spinner size="xl" color="brand.500" thickness="3px" speed="0.7s" />
          </Flex>
        ) : sessions.length === 0 ? (
          <Flex justify="center" align="center" minH="320px" direction="column" gap={2}>
            <Text fontSize="3xl">🔍</Text>
            <Text color="gray.400" fontWeight="600">데이터가 없습니다</Text>
            <Text color="gray.300" fontSize="sm">선택한 기간에 추적된 세션이 없습니다</Text>
          </Flex>
        ) : (
          <Box overflowX={visibleSteps > INITIAL_STEPS ? 'auto' : 'hidden'} pb={2}>
            <Flex gap={0} align="flex-start" minW="fit-content">
              {stepData.map((step, idx) => {
                const isLast   = idx === stepData.length - 1;
                const canExpand = isLast && hasMore;
                return (
                  <React.Fragment key={step.stepIdx}>
                    {idx > 0 && (
                      <Flex align="flex-start" pt="38px" px="6px" flexShrink={0}>
                        <Icon as={MdArrowForward} boxSize="18px" color={arrowColor} />
                      </Flex>
                    )}
                    <StepColumn
                      step={step}
                      selectedLabel={selectedPath[step.stepIdx] ?? null}
                      onPageClick={handlePageClick}
                      onExpand={canExpand ? () => setVisibleSteps((v) => v + 1) : undefined}
                    />
                  </React.Fragment>
                );
              })}

              {/* ── 접기 버튼 (확장 상태일 때만) ── */}
              {visibleSteps > INITIAL_STEPS && (
                <Flex align="flex-start" pt="34px" pl="8px" flexShrink={0}>
                  <Tooltip label={`${INITIAL_STEPS}단계로 접기`} placement="top" hasArrow>
                    <Button
                      size="xs"
                      variant="ghost"
                      colorScheme="gray"
                      fontSize="10px"
                      color={subColor}
                      px="6px"
                      onClick={() => setVisibleSteps(INITIAL_STEPS)}
                    >
                      접기
                    </Button>
                  </Tooltip>
                </Flex>
              )}
            </Flex>
          </Box>
        )}
      </Box>

      {/* ── 푸터 ── */}
      {!loading && sessions.length > 0 && (
        <Flex
          px={6} py={3}
          borderTopWidth="1px"
          borderColor={borderColor}
          justify="space-between"
          align="center"
          flexWrap="wrap"
          gap={2}
        >
          <Text fontSize="xs" color={subColor}>
            총 {sessions.length.toLocaleString()}개 세션 분석
            {sessions.length >= SESSION_LIMIT && (
              <Text as="span" color="orange.400" ml={2}>
                (최근 {SESSION_LIMIT.toLocaleString()}개 세션 기준)
              </Text>
            )}
          </Text>
          <Text fontSize="xs" color={subColor}>
            카드 클릭으로 경로 필터 · 다시 클릭하면 해제
          </Text>
        </Flex>
      )}
    </Card>
  );
}
