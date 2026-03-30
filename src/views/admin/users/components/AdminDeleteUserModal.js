import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  Text,
  Alert,
  AlertIcon,
  AlertDescription,
  Input,
  FormControl,
  FormLabel,
  useToast,
  useColorModeValue,
  RadioGroup,
  Radio,
  Stack,
  Box,
  Spinner,
  Divider,
} from '@chakra-ui/react';
import { deleteUserAccount, getBrandUsersForTransfer, logChangelog } from 'services/supabaseService';

export default function AdminDeleteUserModal({
  isOpen,
  onClose,
  targetUser,
  onDeleteSuccess
}) {
  const toast = useToast();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [brandUsers, setBrandUsers] = useState([]);
  const [newOwnerId, setNewOwnerId] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const inputBg = useColorModeValue('white', 'navy.800');
  const placeholderColor = useColorModeValue('gray.400', 'gray.500');
  const radioBg = useColorModeValue('white', 'navy.800');
  const radioBorder = useColorModeValue('gray.200', 'whiteAlpha.200');

  useEffect(() => {
    if (isOpen && targetUser && targetUser.role === 'advertiser_admin' && targetUser.advertiser_id) {
      fetchBrandUsers();
    } else {
      setBrandUsers([]);
      setNewOwnerId('');
    }
  }, [isOpen, targetUser]);

  const fetchBrandUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const users = await getBrandUsersForTransfer(
        targetUser.advertiser_id,
        targetUser.id
      );
      setBrandUsers(users || []);
    } catch (error) {
      console.error('[AdminDeleteUserModal] Error loading brand users:', error);
      toast({
        title: '브랜드 사용자 조회 실패',
        description: '브랜드 사용자 목록을 불러올 수 없습니다.',
        status: 'error',
        duration: 3000,
        isClosable: true,
        position: 'top',
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleDelete = async () => {
    if (targetUser.role === 'advertiser_admin' && brandUsers.length === 0) {
      toast({
        title: '삭제 불가',
        description: '다른 브랜드 사용자가 없어 삭제할 수 없습니다. 먼저 브랜드에 다른 사용자를 추가하거나 브랜드를 삭제해주세요.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
        position: 'top',
      });
      return;
    }

    if (targetUser.role === 'advertiser_admin' && brandUsers.length > 0 && !newOwnerId) {
      toast({
        title: '소유권 이전 필요',
        description: '브랜드 대표자를 삭제하려면 새 대표자를 선택해야 합니다.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
        position: 'top',
      });
      return;
    }

    if (confirmText !== '회원삭제') {
      toast({
        title: '확인 텍스트 불일치',
        description: '"회원삭제"를 정확히 입력해주세요.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
        position: 'top',
      });
      return;
    }

    try {
      setIsDeleting(true);

      await deleteUserAccount(targetUser.id, newOwnerId || null);

      await logChangelog({
        targetType: 'user',
        targetId: targetUser.id,
        targetName: targetUser.name || targetUser.email,
        actionType: 'delete',
        actionDetail: `사용자 삭제: ${targetUser.name || targetUser.email} (${targetUser.email})`,
        advertiserId: targetUser.advertiser_id,
        advertiserName: targetUser.advertiser_name,
        organizationId: targetUser.organization_id,
        organizationName: targetUser.organization_name,
      });

      toast({
        title: '회원삭제 완료',
        description: `${targetUser.name || targetUser.email} 계정이 성공적으로 삭제되었습니다.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top',
      });

      if (onDeleteSuccess) {
        onDeleteSuccess();
      }

      handleClose();

    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: '삭제 실패',
        description: error.message || '계정 삭제 중 오류가 발생했습니다.',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmText('');
      setNewOwnerId('');
      setBrandUsers([]);
      onClose();
    }
  };

  if (!targetUser) return null;

  const isAdvertiserAdmin = targetUser.role === 'advertiser_admin';
  const hasOtherUsers = brandUsers.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md" closeOnOverlayClick={!isDeleting}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="md" fontWeight="600" color="red.500">
          회원삭제 확인
        </ModalHeader>
        <ModalCloseButton isDisabled={isDeleting} />
        <ModalBody>
          <VStack align="stretch" spacing={4}>
            <Alert status="error" borderRadius="8px">
              <AlertIcon />
              <AlertDescription fontSize="sm">
                사용자 계정을 삭제하면 복구할 수 없습니다.
              </AlertDescription>
            </Alert>

            <Box>
              <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                삭제 대상 사용자:
              </Text>
              <Box p={3} borderRadius="8px" border="1px solid" borderColor={borderColor} bg={inputBg}>
                <Text fontSize="sm" fontWeight="600" color={textColor}>
                  {targetUser.name || '이름 없음'}
                </Text>
                <Text fontSize="xs" color="gray.500" mt={1}>{targetUser.email}</Text>
                <Text fontSize="xs" color="gray.500" mt={1}>역할: {targetUser.role}</Text>
              </Box>
            </Box>

            {isAdvertiserAdmin && (
              <>
                <Divider />
                <Box>
                  <Text fontSize="sm" fontWeight="600" color="orange.500" mb={2}>
                    소유권 이전 필요
                  </Text>

                  {isLoadingUsers ? (
                    <Box textAlign="center" py={4}>
                      <Spinner size="sm" />
                      <Text fontSize="xs" color="gray.500" mt={2}>브랜드 사용자 목록 조회 중...</Text>
                    </Box>
                  ) : hasOtherUsers ? (
                    <>
                      <Text fontSize="sm" color={textColor} mb={3}>
                        브랜드 대표자를 삭제하려면 다른 사용자에게 소유권을 이전해야 합니다.
                        새 대표자를 선택해주세요:
                      </Text>
                      <RadioGroup value={newOwnerId} onChange={setNewOwnerId}>
                        <Stack spacing={2}>
                          {brandUsers.map((user) => (
                            <Radio
                              key={user.id}
                              value={user.id}
                              bg={radioBg}
                              borderColor={radioBorder}
                              p={2}
                              borderRadius="6px"
                              border="1px solid"
                              _checked={{ bg: 'brand.50', borderColor: 'brand.500' }}
                            >
                              <Box>
                                <Text fontSize="sm" fontWeight="500" color={textColor}>{user.name}</Text>
                                <Text fontSize="xs" color="gray.500">{user.email} ({user.role})</Text>
                              </Box>
                            </Radio>
                          ))}
                        </Stack>
                      </RadioGroup>
                    </>
                  ) : (
                    <Alert status="warning" borderRadius="8px">
                      <AlertIcon />
                      <AlertDescription fontSize="sm">
                        다른 브랜드 사용자가 없어 삭제할 수 없습니다.
                        먼저 브랜드에 다른 사용자를 추가해주세요.
                      </AlertDescription>
                    </Alert>
                  )}
                </Box>
                <Divider />
              </>
            )}

            <Text fontSize="sm" color={textColor} fontWeight="500">
              다음 데이터가 영구적으로 삭제됩니다:
            </Text>
            <VStack align="stretch" spacing={2} pl={4}>
              <Text fontSize="sm" color={textColor}>• 사용자 정보</Text>
              <Text fontSize="sm" color={textColor}>• 초대 코드</Text>
              <Text fontSize="sm" color={textColor}>• 브랜드 접근 권한</Text>
            </VStack>

            <Text fontSize="sm" color={textColor} fontWeight="500">
              다음 데이터는 보존됩니다:
            </Text>
            <VStack align="stretch" spacing={2} pl={4}>
              <Text fontSize="sm" color={textColor}>• API 토큰 (브랜드 소유, 계속 사용 가능)</Text>
              <Text fontSize="sm" color={textColor}>• 광고 성과 데이터</Text>
              <Text fontSize="sm" color={textColor}>• 작성한 게시글 (작성자는 "알 수 없음"으로 표시)</Text>
            </VStack>

            <FormControl>
              <FormLabel fontSize="sm" fontWeight="500" color={textColor}>
                확인을 위해 "회원삭제"를 입력하세요
              </FormLabel>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="회원삭제"
                bg={inputBg}
                border="1px solid"
                borderColor={borderColor}
                color={textColor}
                fontSize="sm"
                h="44px"
                borderRadius="12px"
                _placeholder={{ color: placeholderColor }}
                isDisabled={isDeleting || (isAdvertiserAdmin && !hasOtherUsers)}
              />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button
            variant="ghost" mr={3} onClick={handleClose}
            fontSize="sm" isDisabled={isDeleting}
          >
            취소
          </Button>
          <Button
            colorScheme="red"
            onClick={handleDelete}
            fontSize="sm"
            fontWeight="500"
            isLoading={isDeleting}
            loadingText="삭제 중..."
            isDisabled={isAdvertiserAdmin && !hasOtherUsers}
          >
            회원삭제
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
