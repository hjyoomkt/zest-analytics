/**
 * ============================================================================
 * GscKeywordSection — Google Search Console 유입 키워드
 *
 * 상태 흐름:
 *   loading → not_connected  : 연동 없음 → 연동 버튼 표시
 *   loading → selecting_site : 토큰은 있으나 사이트 미선택 → 사이트 선택 UI
 *   loading → connected      : 정상 연동 → 데이터 테이블
 *   OAuth 리다이렉트 감지(URL ?code=) → processing → selecting_site
 * ============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  Spinner,
  Icon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Select,
  Input,
  Alert,
  AlertIcon,
  Badge,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import {
  MdOpenInNew,
  MdCheckCircle,
  MdLinkOff,
  MdSearch,
  MdArrowUpward,
  MdArrowDownward,
  MdUnfoldMore,
} from 'react-icons/md';
import Card from 'components/card/Card';
import { supabase } from 'config/supabase';

// ── 환경 변수 ────────────────────────────────────────────────────────────────
const SUPABASE_URL     = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const GOOGLE_CLIENT_ID  = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const GSC_SCOPE         = 'https://www.googleapis.com/auth/webmasters.readonly';

const getRedirectUri = () => `${window.location.origin}${window.location.pathname}`;

// ── Edge Function 호출 헬퍼 ───────────────────────────────────────────────────
async function callEdge(funcName, body) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? SUPABASE_ANON_KEY;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${funcName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// ── 정렬 아이콘 ───────────────────────────────────────────────────────────────
function SortIcon({ colKey, sortKey, sortDir }) {
  if (colKey !== sortKey) return <Icon as={MdUnfoldMore} boxSize="14px" opacity={0.3} />;
  return sortDir === 'asc'
    ? <Icon as={MdArrowUpward}   boxSize="14px" color="brand.500" />
    : <Icon as={MdArrowDownward} boxSize="14px" color="brand.500" />;
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function GscKeywordSection({ advertiserId, startDate, endDate }) {
  const toast = useToast();

  // 'loading' | 'not_connected' | 'processing' | 'selecting_site' | 'connected' | 'error'
  const [status,       setStatus]       = useState('loading');
  const [sites,        setSites]        = useState([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [connectedUrl, setConnectedUrl] = useState('');
  const [rows,         setRows]         = useState([]);
  const [sortKey,      setSortKey]      = useState('clicks');
  const [sortDir,      setSortDir]      = useState('desc');
  const [errorMsg,     setErrorMsg]     = useState('');

  // 색상 토큰
  const cardBg      = useColorModeValue('white', 'navy.800');
  const borderColor = useColorModeValue('gray.100', 'whiteAlpha.100');
  const headerBg    = useColorModeValue('gray.50', 'navy.900');
  const thColor     = useColorModeValue('gray.500', 'gray.400');
  const textColor   = useColorModeValue('secondaryGray.900', 'white');
  const rowHoverBg  = useColorModeValue('blue.50', 'whiteAlpha.50');

  // ── 연결 상태 확인 ────────────────────────────────────────────────────────
  const checkConnection = useCallback(async () => {
    if (!advertiserId) { setStatus('not_connected'); return; }
    setStatus('loading');
    try {
      const data = await callEdge('gsc-data', {
        advertiser_id: advertiserId,
        start_date:    startDate ?? null,
        end_date:      endDate   ?? null,
      });
      if (!data.connected) {
        setStatus('not_connected');
      } else if (data.connected && !data.site_url && data.sites) {
        setSites(data.sites || []);
        setSelectedSite(data.sites?.[0]?.siteUrl || '');
        setStatus('selecting_site');
      } else if (data.connected && !data.site_url && !data.sites) {
        // 토큰은 있는데 site_url 미설정 (날짜 없어서 sites 목록 안 온 경우)
        setStatus('selecting_site');
        setSites([]);
        setSelectedSite('');
      } else {
        setConnectedUrl(data.site_url);
        setRows(data.rows || []);
        setStatus('connected');
      }
    } catch {
      // Edge Function 미배포 또는 네트워크 오류 → 미연동으로 처리
      setStatus('not_connected');
    }
  }, [advertiserId, startDate, endDate]);

  // ── 마운트 시: URL code 파라미터 또는 연결 상태 확인 ─────────────────────
  useEffect(() => {
    if (!advertiserId) { setStatus('not_connected'); return; }

    const params = new URLSearchParams(window.location.search);
    const code   = params.get('code');
    const state  = params.get('state');

    if (code && state === advertiserId) {
      window.history.replaceState({}, '', window.location.pathname);
      setStatus('processing');

      callEdge('gsc-connect', {
        code,
        advertiser_id: advertiserId,
        redirect_uri:  getRedirectUri(),
      })
        .then((data) => {
          setSites(data.sites || []);
          setSelectedSite(data.sites?.[0]?.siteUrl || '');
          setStatus('selecting_site');
          toast({
            title: 'Google 계정 연결 완료',
            description: '사용할 Search Console 사이트를 선택해주세요.',
            status: 'success',
            duration: 4000,
            position: 'top-right',
          });
        })
        .catch((err) => {
          setErrorMsg(err.message);
          setStatus('error');
        });
    } else {
      checkConnection();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advertiserId]);

  // ── 날짜 변경 시 데이터 재조회 (날짜 있을 때만) ───────────────────────────
  useEffect(() => {
    if (status === 'connected' && advertiserId && startDate && endDate) {
      callEdge('gsc-data', {
        advertiser_id: advertiserId,
        start_date:    startDate,
        end_date:      endDate,
      })
        .then((data) => { if (data.rows) setRows(data.rows); })
        .catch(console.error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  // ── Google OAuth 시작 ─────────────────────────────────────────────────────
  const handleConnect = () => {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id',     GOOGLE_CLIENT_ID);
    url.searchParams.set('redirect_uri',  getRedirectUri());
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope',         GSC_SCOPE);
    url.searchParams.set('access_type',   'offline');
    url.searchParams.set('prompt',        'consent');
    url.searchParams.set('state',         advertiserId);
    window.location.href = url.toString();
  };

  // ── 사이트 저장 ───────────────────────────────────────────────────────────
  const handleSaveSite = async () => {
    if (!selectedSite) return;
    try {
      await callEdge('gsc-connect', { advertiser_id: advertiserId, site_url: selectedSite });
      setConnectedUrl(selectedSite);
      await checkConnection();
      toast({ title: '사이트 연결 완료', status: 'success', duration: 2000, position: 'top-right' });
    } catch (err) {
      toast({ title: '사이트 저장 실패', description: err.message, status: 'error', duration: 3000, position: 'top-right' });
    }
  };

  // ── 연결 해제 ─────────────────────────────────────────────────────────────
  const handleDisconnect = async () => {
    try {
      await callEdge('gsc-connect', { advertiser_id: advertiserId, action: 'disconnect' });
      setStatus('not_connected');
      setRows([]);
      setConnectedUrl('');
      toast({ title: '연결이 해제되었습니다.', status: 'info', duration: 2000, position: 'top-right' });
    } catch (err) {
      toast({ title: '연결 해제 실패', description: err.message, status: 'error', duration: 2000, position: 'top-right' });
    }
  };

  // ── 정렬 ──────────────────────────────────────────────────────────────────
  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sortedRows = [...rows].sort((a, b) => {
    const mult = sortDir === 'asc' ? 1 : -1;
    if (sortKey === 'keyword') return mult * String(a.keyword).localeCompare(String(b.keyword));
    return mult * ((a[sortKey] || 0) - (b[sortKey] || 0));
  });

  // ── 브랜드 미선택 ─────────────────────────────────────────────────────────
  if (!advertiserId) {
    return (
      <Card bg={cardBg} mt={5}>
        <Flex p={6} align="center" justify="center" minH="100px">
          <Text color={thColor} fontSize="sm">
            브랜드를 선택하면 Google Search Console 데이터를 확인할 수 있습니다.
          </Text>
        </Flex>
      </Card>
    );
  }

  const thProps = {
    py: 3, px: 3,
    color: thColor,
    fontWeight: '700', fontSize: 'xs',
    textTransform: 'none', letterSpacing: 'normal',
    borderColor,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    _hover: { color: 'brand.500' },
  };

  const COLS = [
    { key: 'keyword',     label: '검색 키워드', isNumeric: false, minW: '240px' },
    { key: 'clicks',      label: '클릭수',      isNumeric: true,  minW: '90px'  },
    { key: 'impressions', label: '노출수',      isNumeric: true,  minW: '90px'  },
    { key: 'ctr',         label: 'CTR',         isNumeric: true,  minW: '80px'  },
    { key: 'position',    label: '평균 순위',   isNumeric: true,  minW: '90px'  },
  ];

  return (
    <Card p={0} bg={cardBg} mt={5}>

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
            Google Search Console
          </Text>
          {status === 'connected' && (
            <Badge colorScheme="green" borderRadius="full" px={2} fontSize="xs" py={0.5} textTransform="none">
              연동됨 · {connectedUrl}
            </Badge>
          )}
        </Flex>
        {status === 'connected' && (
          <Button
            size="sm"
            variant="ghost"
            colorScheme="red"
            leftIcon={<Icon as={MdLinkOff} />}
            onClick={handleDisconnect}
            fontSize="sm"
          >
            연결 해제
          </Button>
        )}
      </Flex>

      {/* ── 본문 ── */}
      <Box p={status === 'connected' ? 0 : 6}>

        {/* 로딩 / 처리 중 */}
        {(status === 'loading' || status === 'processing') && (
          <Flex justify="center" align="center" minH="140px" direction="column" gap={3}>
            <Spinner size="lg" color="brand.500" thickness="3px" speed="0.7s" />
            <Text color={thColor} fontSize="sm">
              {status === 'processing' ? 'Google 계정 연결 중...' : '연결 상태 확인 중...'}
            </Text>
          </Flex>
        )}

        {/* 미연동 */}
        {status === 'not_connected' && (
          <Flex direction="column" align="center" justify="center" minH="160px" gap={4}>
            <Text color={textColor} fontWeight="600" fontSize="sm" textAlign="center">
              Google Search Console과 연동하면 Google 유기검색 키워드를 확인할 수 있습니다.
            </Text>
            <Text color={thColor} fontSize="xs" textAlign="center">
              클릭수 · 노출수 · CTR · 평균 순위 데이터 제공
            </Text>
            <Button
              colorScheme="brand"
              leftIcon={<Icon as={MdOpenInNew} />}
              onClick={handleConnect}
            >
              Google Search Console 연동
            </Button>
          </Flex>
        )}

        {/* 사이트 선택 */}
        {status === 'selecting_site' && (
          <Flex direction="column" gap={4} maxW="500px">
            <Text fontWeight="600" color={textColor} fontSize="sm">
              연결할 Search Console 속성(사이트)을 선택해주세요.
            </Text>
            {sites.length > 0 && (
              <Select
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                borderRadius="lg"
                fontSize="sm"
              >
                {sites.map((s) => (
                  <option key={s.siteUrl} value={s.siteUrl}>
                    {s.siteUrl}
                  </option>
                ))}
              </Select>
            )}

            {sites.length === 0 && (
              <Alert status="warning" borderRadius="lg" fontSize="sm">
                <AlertIcon />
                이 Google 계정에 Search Console 속성이 없습니다.
                사이트 URL을 직접 입력해주세요.
              </Alert>
            )}

            {/* 수동 URL 입력 */}
            <Flex direction="column" gap={2}>
              <Text fontSize="xs" color={thColor} fontWeight="600">
                {sites.length > 0 ? '또는 직접 URL 입력' : 'Search Console Property URL 입력'}
              </Text>
              <Input
                placeholder="https://example.com/ 또는 sc-domain:example.com"
                value={sites.length === 0 ? selectedSite : undefined}
                defaultValue={sites.length === 0 ? '' : undefined}
                onChange={(e) => setSelectedSite(e.target.value)}
                borderRadius="lg"
                fontSize="sm"
              />
              <Text fontSize="xs" color={thColor}>
                도메인 속성: <strong>sc-domain:zestmkt.co.kr</strong> &nbsp;|&nbsp;
                URL 속성: <strong>https://zestmkt.co.kr/</strong>
              </Text>
            </Flex>

            <Button
              colorScheme="brand"
              onClick={handleSaveSite}
              alignSelf="flex-start"
              isDisabled={!selectedSite}
            >
              이 사이트로 연결
            </Button>
          </Flex>
        )}

        {/* 에러 */}
        {status === 'error' && (
          <Flex direction="column" gap={3} align="flex-start">
            <Alert status="error" borderRadius="lg" fontSize="sm">
              <AlertIcon />
              {errorMsg || '오류가 발생했습니다.'}
            </Alert>
            <Button size="sm" variant="outline" onClick={checkConnection}>
              다시 시도
            </Button>
          </Flex>
        )}

        {/* 데이터 테이블 */}
        {status === 'connected' && (
          <Box overflowX="auto">
            {sortedRows.length === 0 ? (
              <Flex justify="center" align="center" minH="160px" direction="column" gap={2}>
                <Text fontSize="2xl">🔍</Text>
                <Text color="gray.400" fontWeight="600">데이터가 없습니다</Text>
                <Text color="gray.300" fontSize="sm">선택한 기간에 Google 검색 데이터가 없습니다</Text>
              </Flex>
            ) : (
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr bg={headerBg}>
                    {COLS.map((col) => (
                      <Th
                        key={col.key}
                        {...thProps}
                        isNumeric={col.isNumeric}
                        minW={col.minW}
                        pl={col.key === 'keyword' ? 6 : 3}
                        color={sortKey === col.key ? 'brand.500' : thColor}
                        onClick={() => handleSort(col.key)}
                      >
                        <Flex align="center" justify={col.isNumeric ? 'flex-end' : 'flex-start'} gap={1}>
                          {col.label}
                          <SortIcon colKey={col.key} sortKey={sortKey} sortDir={sortDir} />
                        </Flex>
                      </Th>
                    ))}
                  </Tr>
                </Thead>
                <Tbody>
                  {sortedRows.map((row, i) => (
                    <Tr
                      key={i}
                      borderBottomWidth="1px"
                      borderColor={borderColor}
                      _hover={{ bg: rowHoverBg }}
                      transition="background 0.1s"
                    >
                      {/* 키워드 */}
                      <Td py={3} pl={6} pr={3} borderColor={borderColor} minW="240px">
                        <Flex align="center" gap={2}>
                          <Icon as={MdSearch} boxSize="14px" color="blue.400" flexShrink={0} />
                          <Text fontSize="sm" fontWeight="600" color={textColor} noOfLines={1} maxW="220px" title={row.keyword}>
                            {row.keyword}
                          </Text>
                        </Flex>
                      </Td>
                      {/* 클릭수 */}
                      <Td isNumeric py={3} px={3} borderColor={borderColor}>
                        <Text fontSize="sm" fontWeight="700" color={textColor}>
                          {row.clicks.toLocaleString()}
                        </Text>
                      </Td>
                      {/* 노출수 */}
                      <Td isNumeric py={3} px={3} borderColor={borderColor}>
                        <Text fontSize="sm" color={textColor}>
                          {row.impressions.toLocaleString()}
                        </Text>
                      </Td>
                      {/* CTR */}
                      <Td isNumeric py={3} px={3} borderColor={borderColor}>
                        <Text fontSize="sm" color={textColor}>
                          {row.ctr}%
                        </Text>
                      </Td>
                      {/* 평균 순위 */}
                      <Td isNumeric py={3} px={3} borderColor={borderColor}>
                        <Text
                          fontSize="sm"
                          fontWeight="700"
                          color={
                            row.position <= 3  ? 'green.500'  :
                            row.position <= 10 ? 'orange.400' :
                            'gray.400'
                          }
                        >
                          {row.position}
                        </Text>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </Box>
        )}
      </Box>

      {/* ── 푸터 ── */}
      {status === 'connected' && sortedRows.length > 0 && (
        <Flex
          px={6} py={3}
          borderTopWidth="1px"
          borderColor={borderColor}
          justify="space-between"
          align="center"
        >
          <Text fontSize="xs" color={thColor}>
            총 {sortedRows.length}개 키워드
          </Text>
          <Flex align="center" gap={1}>
            <Icon as={MdCheckCircle} boxSize="12px" color="green.400" />
            <Text fontSize="xs" color={thColor}>
              Google Search Console 데이터
            </Text>
          </Flex>
        </Flex>
      )}
    </Card>
  );
}
