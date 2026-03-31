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
  Radio,
  RadioGroup,
  Text,
  Box,
  useToast,
  Spinner,
  useColorModeValue,
  Alert,
  AlertIcon,
  AlertDescription,
} from '@chakra-ui/react';
import { getBrandUsersForTransfer } from 'services/supabaseService';

export default function OwnershipTransferModal({
  isOpen,
  onClose,
  onTransferComplete,
  currentUser,
  onDeleteBrand
}) {
  const toast = useToast();
  const [brandUsers, setBrandUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(true);

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const bgColor = useColorModeValue('white', 'navy.800');
  const hoverBg = useColorModeValue('gray.50', 'navy.700');

  useEffect(() => {
    if (isOpen && currentUser?.advertiser_id) {
      loadBrandUsers();
    }
  }, [isOpen, currentUser]);

  const loadBrandUsers = async () => {
    try {
      setLoading(true);
      const users = await getBrandUsersForTransfer(currentUser.advertiser_id, currentUser.id);
      setBrandUsers(users);

      if (users.length === 0) {
        toast({
          title: '소유권 이전 불가',
          description: '브랜드에 다른 사용자가 없어 탈퇴할 수 없습니다.',
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top',
        });
      }
    } catch (error) {
      toast({
        title: '오류 발생',
        description: `브랜드 사용자 목록을 불러오는데 실패했습니다: ${error.message}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = () => {
    if (!selectedUserId && brandUsers.length > 0) {
      toast({
        title: '사용자 선택 필요',
        description: '새로운 브랜드 관리자를 선택해주세요.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
        position: 'top',
      });
      return;
    }
    if (brandUsers.length > 0) {
      onTransferComplete(selectedUserId);
    }
  };

  const handleClose = () => {
    setSelectedUserId('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="md" fontWeight="600">브랜드 소유권 이전</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack align="stretch" spacing={4}>
            <Text fontSize="sm" color="gray.600">
              브랜드 관리자는 탈퇴 전 다른 사용자에게 소유권을 이전해야 합니다.
            </Text>

            {loading ? (
              <Box textAlign="center" py={6}>
                <Spinner />
                <Text fontSize="sm" color="gray.500" mt={2}>사용자 목록을 불러오는 중...</Text>
              </Box>
            ) : brandUsers.length === 0 ? (
              <VStack align="stretch" spacing={3}>
                <Alert status="warning" borderRadius="8px">
                  <AlertIcon />
                  <AlertDescription fontSize="sm">브랜드에 다른 사용자가 없습니다.</AlertDescription>
                </Alert>
                {onDeleteBrand && (
                  <>
                    <Button colorScheme="red" variant="outline" size="sm" onClick={() => { onClose(); onDeleteBrand(); }}>
                      브랜드 삭제
                    </Button>
                    <Text fontSize="xs" color="red.400">* 브랜드 삭제 시 모든 데이터가 영구 삭제됩니다.</Text>
                  </>
                )}
              </VStack>
            ) : (
              <RadioGroup value={selectedUserId} onChange={setSelectedUserId}>
                <VStack align="stretch" spacing={3}>
                  {brandUsers.map(user => (
                    <Box
                      key={user.id}
                      p={3}
                      borderRadius="8px"
                      border="1px solid"
                      borderColor={selectedUserId === user.id ? 'brand.500' : borderColor}
                      bg={selectedUserId === user.id ? 'brand.50' : bgColor}
                      _hover={{ bg: hoverBg }}
                      cursor="pointer"
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      <Radio value={user.id}>
                        <Box>
                          <Text fontSize="sm" fontWeight="500" color={textColor}>{user.name || user.email}</Text>
                          <Text fontSize="xs" color="gray.500">{user.email}</Text>
                        </Box>
                      </Radio>
                    </Box>
                  ))}
                </VStack>
              </RadioGroup>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleClose} fontSize="sm">취소</Button>
          <Button
            colorScheme="brand"
            onClick={handleTransfer}
            fontSize="sm"
            fontWeight="500"
            isDisabled={!selectedUserId || brandUsers.length === 0}
          >
            다음
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
