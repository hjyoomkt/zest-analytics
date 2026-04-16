import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Icon,
  Input,
  InputGroup,
  InputRightElement,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  useToast,
  Badge,
  IconButton,
  Alert,
  AlertIcon,
  AlertDescription,
} from '@chakra-ui/react';
import { MdAdd, MdDelete, MdShield, MdMyLocation, MdInfo, MdCheckCircle } from 'react-icons/md';
import Card from 'components/card/Card.js';
import { getBlockedIps, addBlockedIp, removeBlockedIp } from 'views/admin/zestAnalytics/services/zaService';
import { useAuth } from 'contexts/AuthContext';

// IP 주소 유효성 검사 (IPv4 / IPv6 기본)
const isValidIp = (ip) => {
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6 = /^[0-9a-fA-F:]+$/;
  if (ipv4.test(ip)) {
    return ip.split('.').every((part) => parseInt(part, 10) <= 255);
  }
  return ipv6.test(ip) && ip.includes(':');
};

export default function IpFilterConsole() {
  const { user } = useAuth();
  const toast = useToast();

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const subTextColor = useColorModeValue('secondaryGray.600', 'secondaryGray.400');
  const cardBg = useColorModeValue('white', 'navy.700');
  const tableBg = useColorModeValue('white', 'navy.800');
  const borderColor = useColorModeValue('gray.100', 'whiteAlpha.100');
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.50');
  const inputBg = useColorModeValue('secondaryGray.300', 'navy.900');

  const [blockedIps, setBlockedIps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newIp, setNewIp] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [myIp, setMyIp] = useState(null);
  const [fetchingMyIp, setFetchingMyIp] = useState(false);

  const loadBlockedIps = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBlockedIps();
      setBlockedIps(data);
    } catch (err) {
      toast({
        title: '목록 조회 실패',
        description: err.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadBlockedIps();
  }, [loadBlockedIps]);

  const handleFetchMyIp = async () => {
    setFetchingMyIp(true);
    try {
      const res = await fetch('https://api64.cloudflare.com/cdn-cgi/trace');
      const text = await res.text();
      const match = text.match(/ip=([^\n]+)/);
      if (match) {
        setMyIp(match[1].trim());
        setNewIp(match[1].trim());
      }
    } catch {
      toast({
        title: 'IP 조회 실패',
        description: '현재 IP를 자동으로 가져올 수 없습니다. 직접 입력해 주세요.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setFetchingMyIp(false);
    }
  };

  const handleAdd = async () => {
    const trimmed = newIp.trim();
    if (!trimmed) {
      toast({ title: 'IP를 입력해 주세요', status: 'warning', duration: 2000, isClosable: true });
      return;
    }
    if (!isValidIp(trimmed)) {
      toast({ title: '올바른 IP 형식이 아닙니다', description: 'IPv4 또는 IPv6 형식으로 입력해 주세요.', status: 'error', duration: 3000, isClosable: true });
      return;
    }
    if (blockedIps.some((item) => item.ip_address === trimmed)) {
      toast({ title: '이미 등록된 IP입니다', status: 'warning', duration: 2000, isClosable: true });
      return;
    }

    setAdding(true);
    try {
      await addBlockedIp(trimmed, newDesc.trim() || null, user?.id);
      toast({ title: `${trimmed} 차단 등록 완료`, status: 'success', duration: 2000, isClosable: true });
      setNewIp('');
      setNewDesc('');
      await loadBlockedIps();
    } catch (err) {
      toast({
        title: '등록 실패',
        description: err.message?.includes('duplicate') ? '이미 등록된 IP입니다.' : err.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id, ip) => {
    setDeletingId(id);
    try {
      await removeBlockedIp(id);
      toast({ title: `${ip} 차단 해제됨`, status: 'success', duration: 2000, isClosable: true });
      await loadBlockedIps();
    } catch (err) {
      toast({ title: '삭제 실패', description: err.message, status: 'error', duration: 3000, isClosable: true });
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      {/* 헤더 */}
      <Flex justify="space-between" align="flex-start" mb="20px" flexWrap="wrap" gap="12px">
        <Box>
          <Flex align="center" gap="10px" mb="6px">
            <Icon as={MdShield} color="brand.500" boxSize="28px" />
            <Text color={textColor} fontSize="2xl" fontWeight="700" lineHeight="100%">
              IP 필터 관리
            </Text>
          </Flex>
          <Text color={subTextColor} fontSize="md" fontWeight="400">
            등록된 IP에서 수집된 데이터는 Analytics에서 자동으로 제외됩니다.
          </Text>
        </Box>
        <Badge
          colorScheme="purple"
          variant="solid"
          px="12px"
          py="6px"
          borderRadius="8px"
          fontSize="sm"
        >
          Master 전용 콘솔
        </Badge>
      </Flex>

      {/* 안내 */}
      <Alert status="info" borderRadius="12px" mb="20px">
        <AlertIcon />
        <AlertDescription fontSize="sm">
          내부 직원, QA, 관리자 IP를 등록하면 해당 IP의 방문/이벤트 데이터가 Analytics 집계에서 제외됩니다.
          RPC 기반 쿼리(시간대별 방문자, 스크롤 히트맵 등)에 필터를 적용하려면 Supabase 함수 업데이트가 필요합니다.
        </AlertDescription>
      </Alert>

      {/* IP 등록 폼 */}
      <Card mb="24px" bg={cardBg}>
        <Text color={textColor} fontSize="lg" fontWeight="700" mb="16px">
          IP 차단 등록
        </Text>
        <Flex gap="12px" flexWrap="wrap" align="flex-end">
          <FormControl flex="1" minW="200px">
            <FormLabel color={subTextColor} fontSize="sm" fontWeight="600" mb="6px">
              IP 주소
            </FormLabel>
            <InputGroup>
              <Input
                placeholder="192.168.0.1"
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                bg={inputBg}
                border="1px solid"
                borderColor={borderColor}
                borderRadius="10px"
                fontSize="sm"
                fontFamily="mono"
              />
              <InputRightElement w="auto" pr="6px">
                <Button
                  size="xs"
                  leftIcon={fetchingMyIp ? <Spinner size="xs" /> : <Icon as={MdMyLocation} />}
                  onClick={handleFetchMyIp}
                  isDisabled={fetchingMyIp}
                  variant="ghost"
                  colorScheme="brand"
                  fontSize="xs"
                  px="8px"
                >
                  내 IP
                </Button>
              </InputRightElement>
            </InputGroup>
            {myIp && (
              <Text color="green.500" fontSize="xs" mt="4px">
                현재 IP: {myIp}
              </Text>
            )}
          </FormControl>

          <FormControl flex="2" minW="200px">
            <FormLabel color={subTextColor} fontSize="sm" fontWeight="600" mb="6px">
              메모 (선택)
            </FormLabel>
            <Input
              placeholder="예: 서울 오피스 내부망, QA 테스트 PC"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              bg={inputBg}
              border="1px solid"
              borderColor={borderColor}
              borderRadius="10px"
              fontSize="sm"
            />
          </FormControl>

          <Button
            leftIcon={<Icon as={MdAdd} />}
            colorScheme="brand"
            onClick={handleAdd}
            isLoading={adding}
            loadingText="등록 중..."
            h="40px"
            px="20px"
            borderRadius="10px"
            fontSize="sm"
            flexShrink={0}
          >
            차단 등록
          </Button>
        </Flex>
      </Card>

      {/* 차단 목록 테이블 */}
      <Card bg={cardBg}>
        <Flex justify="space-between" align="center" mb="16px">
          <Text color={textColor} fontSize="lg" fontWeight="700">
            차단된 IP 목록
          </Text>
          <Badge colorScheme={blockedIps.length > 0 ? 'red' : 'gray'} borderRadius="6px" px="10px" py="4px">
            {blockedIps.length}개
          </Badge>
        </Flex>

        {loading ? (
          <Flex justify="center" py="40px">
            <Spinner color="brand.500" size="lg" />
          </Flex>
        ) : blockedIps.length === 0 ? (
          <Flex
            direction="column"
            align="center"
            justify="center"
            py="60px"
            gap="12px"
          >
            <Icon as={MdInfo} color="secondaryGray.400" boxSize="40px" />
            <Text color={subTextColor} fontSize="md" fontWeight="500">
              등록된 차단 IP가 없습니다
            </Text>
            <Text color={subTextColor} fontSize="sm">
              위 폼에서 내부 관리자 IP를 등록하면 Analytics 데이터에서 제외됩니다.
            </Text>
          </Flex>
        ) : (
          <Box overflowX="auto">
            <Table variant="simple" bg={tableBg} borderRadius="10px">
              <Thead>
                <Tr>
                  <Th color={subTextColor} fontSize="xs" fontWeight="600" borderColor={borderColor} pl="0">
                    IP 주소
                  </Th>
                  <Th color={subTextColor} fontSize="xs" fontWeight="600" borderColor={borderColor}>
                    메모
                  </Th>
                  <Th color={subTextColor} fontSize="xs" fontWeight="600" borderColor={borderColor}>
                    등록일시
                  </Th>
                  <Th color={subTextColor} fontSize="xs" fontWeight="600" borderColor={borderColor} w="80px">
                    해제
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {blockedIps.map((item) => (
                  <Tr
                    key={item.id}
                    _hover={{ bg: hoverBg }}
                    transition="background 0.15s"
                  >
                    <Td borderColor={borderColor} pl="0">
                      <Text
                        color={textColor}
                        fontSize="sm"
                        fontFamily="mono"
                        fontWeight="600"
                      >
                        {item.ip_address}
                      </Text>
                    </Td>
                    <Td borderColor={borderColor}>
                      <Text color={subTextColor} fontSize="sm">
                        {item.description || '-'}
                      </Text>
                    </Td>
                    <Td borderColor={borderColor}>
                      <Text color={subTextColor} fontSize="sm">
                        {formatDate(item.created_at)}
                      </Text>
                    </Td>
                    <Td borderColor={borderColor}>
                      <IconButton
                        icon={
                          deletingId === item.id ? (
                            <Spinner size="xs" />
                          ) : (
                            <Icon as={MdDelete} />
                          )
                        }
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        aria-label="차단 해제"
                        isDisabled={deletingId === item.id}
                        onClick={() => handleRemove(item.id, item.ip_address)}
                        borderRadius="8px"
                      />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </Card>

    </Box>
  );
}
