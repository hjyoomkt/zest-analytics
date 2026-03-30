/**
 * ============================================================================
 * TrackingCodeManager - 추적 코드 관리 컴포넌트
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Code,
  useDisclosure,
  IconButton,
  Tooltip,
  Text,
  Flex,
  Heading,
} from '@chakra-ui/react';
import { MdContentCopy, MdRefresh, MdVisibility, MdDelete } from 'react-icons/md';
import Card from 'components/card/Card';
import {
  getTrackingCodes,
  createTrackingCode,
  regenerateTrackingCode,
  deleteTrackingCode,
} from '../services/zaService';

export default function TrackingCodeManager({ advertiserId, role }) {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedCode, setSelectedCode] = useState(null);
  const toast = useToast();

  useEffect(() => {
    fetchCodes();
  }, [advertiserId]);

  const fetchCodes = async () => {
    try {
      setLoading(true);
      const data = await getTrackingCodes(advertiserId);
      setCodes(data);
    } catch (error) {
      toast({
        title: '조회 실패',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!advertiserId) {
      toast({
        title: '광고주를 선택해주세요',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      await createTrackingCode(advertiserId);
      toast({
        title: '추적 코드 생성 완료',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      fetchCodes();
    } catch (error) {
      toast({
        title: '생성 실패',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleRegenerate = async (codeId) => {
    if (!window.confirm('정말 재생성하시겠습니까? 기존 코드는 비활성화됩니다.')) return;

    try {
      await regenerateTrackingCode(codeId);
      toast({
        title: '추적 코드 재생성 완료',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      fetchCodes();
    } catch (error) {
      toast({
        title: '재생성 실패',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDelete = async (codeId) => {
    if (!window.confirm('정말 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.')) return;

    try {
      await deleteTrackingCode(codeId);
      toast({
        title: '추적 코드 삭제 완료',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      fetchCodes();
    } catch (error) {
      toast({
        title: '삭제 실패',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({
      title: '복사 완료',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const getInstallCode = (trackingId) => {
    const sdkUrl = 'https://www.zestdot.com/sdk/za-sdk.js';
    return `<!-- 1. 모든 페이지의 <head> 또는 </body> 직전에 추가 -->
<script src="${sdkUrl}"></script>
<script>
  zestAnalytics.init('${trackingId}');
</script>

<!-- 2. 전환 이벤트 추적 (각 완료 페이지에서 호출) -->

<!-- 구매 완료 -->
<script>
  zestAnalytics.track('purchase', {
    value: 50000,        // 구매 금액 (필수)
    currency: 'KRW',     // 통화 (선택, 기본값: KRW)
    orderId: 'ORDER-123' // 주문 ID (선택, 중복 방지)
  });
</script>

<!-- 회원가입 완료 -->
<script>
  zestAnalytics.track('signup');
</script>

<!-- 리드 수집 (문의 폼 제출 등) -->
<script>
  zestAnalytics.track('lead', {
    value: 10000 // 리드 가치 (선택)
  });
</script>

<!-- 장바구니 담기 -->
<script>
  zestAnalytics.track('add_to_cart', {
    value: 30000 // 상품 가격 (선택)
  });
</script>

<!-- 커스텀 이벤트 (버튼 클릭, 다운로드 등) -->
<script>
  zestAnalytics.track('custom', {
    eventName: '전자책_다운로드', // 커스텀 이벤트명 (필수)
    value: 5000                 // 가치 (선택)
  });
</script>

<!-- 3. 광고 링크에 UTM 파라미터 추가 -->
<!-- 예시: https://yoursite.com/?za_source=google&za_campaign=summer_sale&za_medium=cpc -->`;
  };

  return (
    <Card>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="md">추적 코드 관리</Heading>
        <Button colorScheme="brand" onClick={handleCreate} isLoading={loading}>
          새 추적 코드 생성
        </Button>
      </Flex>

      {codes.length === 0 && !loading ? (
        <Text color="gray.500">추적 코드가 없습니다. 새로 생성해주세요.</Text>
      ) : (
        <Box overflowX="auto">
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>추적 ID</Th>
                <Th>상태</Th>
                <Th>총 이벤트 수</Th>
                <Th>마지막 사용</Th>
                <Th>생성일</Th>
                <Th>작업</Th>
              </Tr>
            </Thead>
            <Tbody>
              {codes.map((code) => (
                <Tr key={code.id}>
                  <Td>
                    <Code fontSize="sm">{code.tracking_id}</Code>
                  </Td>
                  <Td>
                    <Badge colorScheme={code.status === 'active' ? 'green' : 'gray'}>
                      {code.status === 'active' ? '활성' : '비활성'}
                    </Badge>
                  </Td>
                  <Td>{code.total_events?.toLocaleString() || 0}</Td>
                  <Td>
                    {code.last_event_at
                      ? new Date(code.last_event_at).toLocaleString('ko-KR')
                      : '-'}
                  </Td>
                  <Td>{new Date(code.created_at).toLocaleDateString('ko-KR')}</Td>
                  <Td>
                    <Flex gap={2}>
                      <Tooltip label="설치 코드 보기">
                        <IconButton
                          icon={<MdVisibility />}
                          size="sm"
                          onClick={() => {
                            setSelectedCode(code);
                            onOpen();
                          }}
                        />
                      </Tooltip>
                      <Tooltip label="재생성">
                        <IconButton
                          icon={<MdRefresh />}
                          size="sm"
                          onClick={() => handleRegenerate(code.id)}
                        />
                      </Tooltip>
                      <Tooltip label="삭제">
                        <IconButton
                          icon={<MdDelete />}
                          size="sm"
                          colorScheme="red"
                          onClick={() => handleDelete(code.id)}
                        />
                      </Tooltip>
                    </Flex>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}

      {/* 설치 코드 모달 */}
      <Modal isOpen={isOpen} onClose={onClose} size="4xl">
        <ModalOverlay />
        <ModalContent maxH="90vh">
          <ModalHeader>추적 코드 설치 가이드</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6} overflowY="auto">
            <Box>
              <Text mb={4} fontSize="md" color="blue.600" fontWeight="medium">
                📋 아래 코드를 복사하여 웹사이트에 설치하세요
              </Text>
              <Box bg="gray.50" p={4} borderRadius="md" position="relative" border="1px solid" borderColor="gray.200">
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    lineHeight: '1.6',
                    margin: 0,
                  }}
                >
                  {selectedCode && getInstallCode(selectedCode.tracking_id)}
                </pre>
                <IconButton
                  icon={<MdContentCopy />}
                  position="absolute"
                  top={2}
                  right={2}
                  size="sm"
                  colorScheme="brand"
                  onClick={() =>
                    selectedCode && copyToClipboard(getInstallCode(selectedCode.tracking_id))
                  }
                />
              </Box>

              <Box mt={6} p={4} bg="blue.50" borderRadius="md" borderLeft="4px solid" borderColor="blue.500">
                <Text fontSize="sm" fontWeight="bold" mb={2} color="blue.800">
                  💡 사용 팁
                </Text>
                <Text fontSize="sm" color="blue.700" mb={2}>
                  • <strong>기본 스크립트</strong>는 모든 페이지에 설치하세요
                </Text>
                <Text fontSize="sm" color="blue.700" mb={2}>
                  • <strong>전환 이벤트</strong>는 각 완료 페이지(구매 완료, 회원가입 완료 등)에서 호출하세요
                </Text>
                <Text fontSize="sm" color="blue.700" mb={2}>
                  • <strong>광고 링크</strong>에는 za_source, za_campaign, za_medium 파라미터를 추가하세요
                </Text>
                <Text fontSize="sm" color="blue.700">
                  • utm_* 파라미터도 지원하지만 <strong>za_* 파라미터가 우선</strong>됩니다
                </Text>
              </Box>

              <Box mt={4} p={4} bg="green.50" borderRadius="md" borderLeft="4px solid" borderColor="green.500">
                <Text fontSize="sm" fontWeight="bold" mb={2} color="green.800">
                  ✅ 설치 준비 완료
                </Text>
                <Text fontSize="sm" color="green.700">
                  • SDK URL이 프로덕션 도메인(www.zestdot.com)으로 설정되어 있습니다
                </Text>
              </Box>
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Card>
  );
}
