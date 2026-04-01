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
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorModeValue,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  VStack,
  HStack,
} from '@chakra-ui/react';
import { MdContentCopy, MdRefresh, MdVisibility, MdDelete, MdKeyboardArrowDown, MdCheck } from 'react-icons/md';
import Card from 'components/card/Card';
import {
  getTrackingCodes,
  createTrackingCode,
  regenerateTrackingCode,
  deleteTrackingCode,
} from '../services/zaService';

export default function TrackingCodeManager({
  advertiserId,
  role,
  availableAdvertisers,
  selectedBrandId,
  onBrandChange,
}) {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedCode, setSelectedCode] = useState(null);
  const toast = useToast();

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const inputBg = useColorModeValue('white', 'navy.700');
  const bgHover = useColorModeValue('secondaryGray.100', 'whiteAlpha.100');
  const brandMenuColor = useColorModeValue('brand.500', 'white');
  const tabListBg = useColorModeValue('secondaryGray.300', 'navy.800');
  const tabSelectedBg = useColorModeValue('white', 'navy.700');
  const tabSelectedColor = useColorModeValue('brand.500', 'white');
  const descCardBg = useColorModeValue('secondaryGray.300', 'navy.800');
  const codeBlockBg = useColorModeValue('gray.900', 'navy.900');

  const hasBrandSelector = availableAdvertisers && availableAdvertisers.length > 0 && onBrandChange;

  useEffect(() => {
    if (advertiserId) {
      fetchCodes();
    } else {
      setCodes([]);
    }
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

  const [copiedKey, setCopiedKey] = useState(null);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    toast({
      title: '복사 완료',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const sdkUrl = 'https://analytics.zestdot.com/sdk/za-sdk.js';

  const codeSnippets = (trackingId) => ({
    init: `<!-- Zest Analytics -->
<script src="${sdkUrl}"></script>
<script>
  zestAnalytics.init('${trackingId}');
</script>
<!-- End Zest Analytics -->`,
    purchase: `<!-- Zest Analytics - Purchase -->
<script>
  zestAnalytics.track('purchase', {
    value: 50000,        // 구매 금액 (필수)
    currency: 'KRW',     // 통화 (선택, 기본값: KRW)
    orderId: 'ORDER-123' // 주문 ID (선택, 중복 방지)
  });
</script>
<!-- End Zest Analytics - Purchase -->`,
    signup: `<!-- Zest Analytics - Signup -->
<script>
  zestAnalytics.track('signup');
</script>
<!-- End Zest Analytics - Signup -->`,
    lead: `<!-- Zest Analytics - Lead -->
<script>
  zestAnalytics.track('lead', {
    value: 10000 // 리드 가치 (선택)
  });
</script>
<!-- End Zest Analytics - Lead -->`,
    add_to_cart: `<!-- Zest Analytics - Add to Cart -->
<script>
  zestAnalytics.track('add_to_cart', {
    value: 30000 // 상품 가격 (선택)
  });
</script>
<!-- End Zest Analytics - Add to Cart -->`,
    custom: `<!-- Zest Analytics - Custom Event -->
<script>
  zestAnalytics.track('custom', {
    eventName: '전자책_다운로드', // 이벤트명 (필수)
    value: 5000                 // 가치 (선택)
  });
</script>
<!-- End Zest Analytics - Custom Event -->`,
    utm: `<!-- 광고 링크에 파라미터 추가 예시 -->
https://yoursite.com/
  ?za_source=google
  &za_medium=cpc
  &za_campaign=summer_sale
  &za_term=키워드
  &za_content=배너_A

<!-- utm_* 파라미터도 동일하게 지원됩니다 -->
https://yoursite.com/
  ?utm_source=naver
  &utm_medium=display
  &utm_campaign=brand`,
  });

  return (
    <Card>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="md">추적 코드 관리</Heading>
        <Flex gap={3} align="center">
          {hasBrandSelector && (
            <Menu>
              <MenuButton
                as={Button}
                rightIcon={<MdKeyboardArrowDown />}
                bg={inputBg}
                border="1px solid"
                borderColor={borderColor}
                color={textColor}
                fontWeight="500"
                fontSize="sm"
                _hover={{ bg: bgHover }}
                _active={{ bg: bgHover }}
                h="40px"
                borderRadius="12px"
                minW="160px"
              >
                {selectedBrandId
                  ? availableAdvertisers.find((a) => a.id === selectedBrandId)?.name
                  : '브랜드 선택'}
              </MenuButton>
              <MenuList minW="auto" w="280px" px="8px" py="8px">
                {availableAdvertisers.map((adv) => (
                  <MenuItem
                    key={adv.id}
                    onClick={() => onBrandChange(adv.id)}
                    bg={selectedBrandId === adv.id ? brandMenuColor : 'transparent'}
                    color={selectedBrandId === adv.id ? 'white' : textColor}
                    _hover={{ bg: selectedBrandId === adv.id ? brandMenuColor : bgHover }}
                    fontWeight={selectedBrandId === adv.id ? '600' : '500'}
                    fontSize="sm"
                    px="12px"
                    py="10px"
                    borderRadius="8px"
                  >
                    {adv.name}
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
          )}
          <Button colorScheme="brand" onClick={handleCreate} isLoading={loading}>
            새 추적 코드 생성
          </Button>
        </Flex>
      </Flex>

      {!advertiserId ? (
        <Text color="gray.500">브랜드를 선택하면 추적 코드를 조회하고 발급할 수 있습니다.</Text>
      ) : codes.length === 0 && !loading ? (
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
      <Modal isOpen={isOpen} onClose={onClose} size="3xl">
        <ModalOverlay backdropFilter="blur(2px)" />
        <ModalContent borderRadius="20px" maxH="90vh" overflow="hidden">
          <ModalHeader px="28px" pt="24px" pb="0">
            <Text fontSize="xl" fontWeight="700" color={textColor}>
              추적 코드 설치 가이드
            </Text>
            {selectedCode && (
              <HStack mt="8px" spacing="8px">
                <Text fontSize="sm" color="gray.500" fontWeight="400">추적 ID</Text>
                <Code
                  fontSize="sm"
                  px="10px"
                  py="3px"
                  borderRadius="8px"
                  colorScheme="brand"
                  fontWeight="600"
                >
                  {selectedCode.tracking_id}
                </Code>
              </HStack>
            )}
          </ModalHeader>
          <ModalCloseButton top="20px" right="20px" borderRadius="10px" />
          <ModalBody px="28px" pt="20px" pb="28px" overflowY="auto">
            {selectedCode && (() => {
              const snippets = codeSnippets(selectedCode.tracking_id);
              const tabs = [
                {
                  key: 'init',
                  label: '기본 설치',
                  emoji: '',
                  desc: '모든 페이지의 <head> 태그 안에 반드시 설치하세요. 이 코드가 없으면 이벤트가 수집되지 않습니다.',
                  badge: '필수',
                  badgeColor: 'red',
                },
                {
                  key: 'purchase',
                  label: '구매',
                  emoji: '',
                  desc: '결제 완료 페이지에 추가하세요. value(구매금액)와 orderId(주문번호)를 함께 전달하면 중복 집계를 방지할 수 있습니다.',
                  badge: '전환',
                  badgeColor: 'green',
                },
                {
                  key: 'signup',
                  label: '회원가입',
                  emoji: '',
                  desc: '회원가입 완료 페이지에 추가하세요. 파라미터 없이 호출합니다.',
                  badge: '전환',
                  badgeColor: 'green',
                },
                {
                  key: 'lead',
                  label: '리드',
                  emoji: '',
                  desc: '문의 폼 제출, 상담 신청 등 리드 수집 완료 시 호출하세요. value로 예상 리드 가치를 설정할 수 있습니다.',
                  badge: '전환',
                  badgeColor: 'green',
                },
                {
                  key: 'add_to_cart',
                  label: '장바구니',
                  emoji: '',
                  desc: '상품을 장바구니에 담을 때 호출하세요. value에 상품 가격을 전달하세요.',
                  badge: '이벤트',
                  badgeColor: 'blue',
                },
                {
                  key: 'custom',
                  label: '커스텀',
                  emoji: '',
                  desc: '버튼 클릭, 파일 다운로드 등 직접 정의한 이벤트에 사용하세요. eventName은 필수입니다.',
                  badge: '이벤트',
                  badgeColor: 'purple',
                },
                {
                  key: 'utm',
                  label: 'UTM 파라미터',
                  emoji: '',
                  desc: '광고 링크에 za_* 또는 utm_* 파라미터를 추가하면 유입 채널별 전환을 추적할 수 있습니다. za_* 파라미터가 utm_* 보다 우선 적용됩니다.',
                  badge: '설정',
                  badgeColor: 'orange',
                },
              ];

              return (
                <Tabs variant="unstyled">
                  <TabList
                    bg={tabListBg}
                    borderRadius="12px"
                    p="4px"
                    gap="2px"
                    flexWrap="wrap"
                    mb="20px"
                  >
                    {tabs.map((tab) => (
                      <Tab
                        key={tab.key}
                        borderRadius="10px"
                        fontSize="sm"
                        fontWeight="500"
                        color="gray.500"
                        px="12px"
                        py="7px"
                        _selected={{
                          bg: tabSelectedBg,
                          boxShadow: '0px 2px 8px rgba(112,144,176,0.18)',
                          color: tabSelectedColor,
                          fontWeight: '700',
                        }}
                        _hover={{ color: textColor }}
                      >
                        {tab.label}
                      </Tab>
                    ))}
                  </TabList>

                  <TabPanels>
                    {tabs.map((tab) => (
                      <TabPanel key={tab.key} p="0">
                        <VStack align="stretch" spacing="14px">
                          {/* 설명 카드 */}
                          <HStack
                            bg={descCardBg}
                            borderRadius="14px"
                            px="16px"
                            py="12px"
                            spacing="10px"
                            align="flex-start"
                          >
                            <Badge
                              colorScheme={tab.badgeColor}
                              borderRadius="6px"
                              px="8px"
                              py="2px"
                              fontSize="xs"
                              flexShrink={0}
                              mt="1px"
                            >
                              {tab.badge}
                            </Badge>
                            <Text fontSize="sm" color={textColor} lineHeight="1.6">
                              {tab.desc}
                            </Text>
                          </HStack>

                          {/* 코드 블록 */}
                          <Box
                            bg={codeBlockBg}
                            borderRadius="14px"
                            overflow="hidden"
                          >
                            <Flex
                              px="16px"
                              py="10px"
                              align="center"
                              justify="space-between"
                              borderBottom="1px solid"
                              borderColor="whiteAlpha.100"
                            >
                              <HStack spacing="6px">
                                <Box w="10px" h="10px" borderRadius="full" bg="red.400" />
                                <Box w="10px" h="10px" borderRadius="full" bg="yellow.400" />
                                <Box w="10px" h="10px" borderRadius="full" bg="green.400" />
                              </HStack>
                              <Button
                                size="xs"
                                variant="ghost"
                                color={copiedKey === tab.key ? 'green.300' : 'whiteAlpha.600'}
                                leftIcon={copiedKey === tab.key ? <MdCheck /> : <MdContentCopy />}
                                _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
                                borderRadius="8px"
                                onClick={() => copyToClipboard(snippets[tab.key], tab.key)}
                              >
                                {copiedKey === tab.key ? '복사됨' : '복사'}
                              </Button>
                            </Flex>
                            <Box px="20px" py="16px" overflowX="auto">
                              <pre
                                style={{
                                  whiteSpace: 'pre',
                                  fontSize: '13px',
                                  fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
                                  lineHeight: '1.7',
                                  margin: 0,
                                  color: '#e2e8f0',
                                }}
                              >
                                {snippets[tab.key]}
                              </pre>
                            </Box>
                          </Box>
                        </VStack>
                      </TabPanel>
                    ))}
                  </TabPanels>
                </Tabs>
              );
            })()}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Card>
  );
}
