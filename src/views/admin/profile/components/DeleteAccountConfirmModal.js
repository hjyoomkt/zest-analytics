import React, { useState } from 'react';
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
} from '@chakra-ui/react';
import { deleteUserAccount } from 'services/supabaseService';
import { useAuth } from 'contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function DeleteAccountConfirmModal({
  isOpen,
  onClose,
  user,
  newOwnerId = null
}) {
  const toast = useToast();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const inputBg = useColorModeValue('white', 'navy.800');
  const placeholderColor = useColorModeValue('gray.400', 'gray.500');

  const handleDelete = async () => {
    if (confirmText !== '회원탈퇴') {
      toast({
        title: '확인 텍스트 불일치',
        description: '"회원탈퇴"를 정확히 입력해주세요.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
        position: 'top',
      });
      return;
    }

    try {
      setIsDeleting(true);
      await deleteUserAccount(user.id, newOwnerId);

      toast({
        title: '회원탈퇴 완료',
        description: '계정이 성공적으로 삭제되었습니다.',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top',
      });

      await signOut();
      navigate('/auth/sign-in');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: '탈퇴 실패',
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
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md" closeOnOverlayClick={!isDeleting}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="md" fontWeight="600" color="red.500">
          회원탈퇴 확인
        </ModalHeader>
        <ModalCloseButton isDisabled={isDeleting} />
        <ModalBody>
          <VStack align="stretch" spacing={4}>
            <Alert status="error" borderRadius="8px">
              <AlertIcon />
              <AlertDescription fontSize="sm">
                계정을 삭제하면 복구할 수 없습니다.
              </AlertDescription>
            </Alert>

            <Text fontSize="sm" color={textColor} fontWeight="500">
              다음 데이터가 영구적으로 삭제됩니다:
            </Text>
            <VStack align="stretch" spacing={2} pl={4}>
              <Text fontSize="sm" color={textColor}>• 사용자 정보</Text>
              <Text fontSize="sm" color={textColor}>• 초대 코드</Text>
              <Text fontSize="sm" color={textColor}>• 브랜드 접근 권한</Text>
            </VStack>

            <FormControl>
              <FormLabel fontSize="sm" fontWeight="500" color={textColor}>
                확인을 위해 "회원탈퇴"를 입력하세요
              </FormLabel>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="회원탈퇴"
                bg={inputBg}
                border="1px solid"
                borderColor={borderColor}
                color={textColor}
                fontSize="sm"
                h="44px"
                borderRadius="12px"
                _placeholder={{ color: placeholderColor }}
                isDisabled={isDeleting}
              />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleClose} fontSize="sm" isDisabled={isDeleting}>
            취소
          </Button>
          <Button
            colorScheme="red"
            onClick={handleDelete}
            fontSize="sm"
            fontWeight="500"
            isLoading={isDeleting}
            loadingText="삭제 중..."
          >
            회원탈퇴
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
