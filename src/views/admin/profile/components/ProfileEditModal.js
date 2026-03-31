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
  FormControl,
  FormLabel,
  Input,
  VStack,
  Avatar,
  Box,
  Text,
  useColorModeValue,
  Flex,
  IconButton,
  useToast,
  useDisclosure,
  Divider,
  Tooltip,
} from '@chakra-ui/react';
import { MdCamera, MdDelete } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import DeleteAccountConfirmModal from './DeleteAccountConfirmModal';
import OwnershipTransferModal from './OwnershipTransferModal';
import DeleteBrandModal from 'views/superadmin/advertisers/components/DeleteBrandModal';
import DeleteAgencyWithEmailModal from './DeleteAgencyWithEmailModal';
import { useAuth } from 'contexts/AuthContext';
import { deleteBrand, canDeleteBrand } from 'services/supabaseService';
import { supabase } from 'config/supabase';

export default function ProfileEditModal({ isOpen, onClose, currentData }) {
  const toast = useToast();
  const { user, role, advertiserId, organizationId, signOut } = useAuth();
  const [formData, setFormData] = useState({
    name: currentData?.name || '',
    job: currentData?.job || '',
    email: currentData?.email || '',
    phone: currentData?.phone || '',
  });

  const { isOpen: isDeleteConfirmOpen, onOpen: onDeleteConfirmOpen, onClose: onDeleteConfirmClose } = useDisclosure();
  const { isOpen: isTransferOpen, onOpen: onTransferOpen, onClose: onTransferClose } = useDisclosure();
  const { isOpen: isDeleteBrandOpen, onOpen: onDeleteBrandOpen, onClose: onDeleteBrandClose } = useDisclosure();
  const { isOpen: isDeleteAgencyOpen, onOpen: onDeleteAgencyOpen, onClose: onDeleteAgencyClose } = useDisclosure();

  const [newOwnerId, setNewOwnerId] = useState(null);
  const [currentBrand, setCurrentBrand] = useState(null);
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [isDeletingBrand, setIsDeletingBrand] = useState(false);
  const navigate = useNavigate();

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const inputBg = useColorModeValue('white', 'navy.800');
  const placeholderColor = useColorModeValue('gray.400', 'gray.500');

  const isAdvertiserAdmin = role === 'advertiser_admin';
  const isAgencyAdmin = role === 'agency_admin';
  const isMaster = role === 'master';

  React.useEffect(() => {
    if (!isOpen) return;

    if (isAdvertiserAdmin && advertiserId) {
      supabase.from('advertisers').select('id, name, business_number, website_url, contact_email, contact_phone').eq('id', advertiserId).single()
        .then(({ data, error }) => {
          if (!error) setCurrentBrand(data);
        });
    }

    if (isAgencyAdmin && organizationId) {
      supabase.from('organizations').select('id, name, type, advertisers (id, name)').eq('id', organizationId).single()
        .then(({ data, error }) => {
          if (!error) setCurrentOrganization(data);
        });
    }
  }, [isOpen, isAdvertiserAdmin, isAgencyAdmin, advertiserId, organizationId]);

  const handleSubmit = () => {
    toast({ title: '서비스 준비중', description: '프로필 편집 기능은 현재 준비 중입니다.', status: 'info', duration: 3000, isClosable: true, position: 'top' });
    onClose();
  };

  const handleAvatarUpload = () => {
    toast({ title: '서비스 준비중', description: '프로필 이미지 업로드 기능은 현재 준비 중입니다.', status: 'info', duration: 3000, isClosable: true, position: 'top' });
  };

  const handleDeleteClick = () => {
    if (isAdvertiserAdmin) {
      onTransferOpen();
    } else {
      onDeleteConfirmOpen();
    }
  };

  const handleTransferComplete = (selectedUserId) => {
    setNewOwnerId(selectedUserId);
    onTransferClose();
    onDeleteConfirmOpen();
  };

  const handleDeleteBrandClick = () => {
    if (!currentBrand) {
      toast({ title: '오류', description: '브랜드 정보를 불러올 수 없습니다.', status: 'error', duration: 3000, isClosable: true, position: 'top' });
      return;
    }
    onDeleteBrandOpen();
  };

  const confirmDeleteBrand = async (brandId) => {
    try {
      setIsDeletingBrand(true);
      const permissionCheck = await canDeleteBrand(user.id, brandId);
      if (!permissionCheck.canDelete) throw new Error(permissionCheck.reason);

      const result = await deleteBrand(brandId, currentBrand.name);
      if (!result || !result.success) throw new Error('브랜드 삭제 실패');

      toast({ title: '서비스 탈퇴 완료', description: `${currentBrand.name} 브랜드와 관련된 모든 데이터가 삭제되었습니다.`, status: 'success', duration: 3000, isClosable: true, position: 'top' });
      onDeleteBrandClose();
      onClose();

      setTimeout(async () => {
        await signOut();
        navigate('/auth/sign-in');
      }, 1000);
    } catch (error) {
      toast({ title: '브랜드 삭제 실패', description: error.message || '삭제 중 오류가 발생했습니다.', status: 'error', duration: 8000, isClosable: true, position: 'top' });
    } finally {
      setIsDeletingBrand(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="md" fontWeight="600">프로필 편집</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4} align="stretch">
            {/* 프로필 이미지 */}
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="500" color="gray.500">프로필 이미지</FormLabel>
              <Flex align="center" gap={4}>
                <Box position="relative">
                  <Avatar size="xl" border="2px solid" borderColor={borderColor} name={formData.name} />
                  <IconButton icon={<MdCamera />} aria-label="프로필 이미지 업로드" position="absolute" bottom="0" right="0" size="sm" borderRadius="50%" onClick={handleAvatarUpload} />
                </Box>
                <Text fontSize="xs" color={placeholderColor}>JPG, PNG 파일을 업로드하세요</Text>
              </Flex>
            </FormControl>

            {/* 이름 */}
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="500" color="gray.500">이름</FormLabel>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="이름을 입력하세요"
                bg={inputBg}
                border="1px solid"
                borderColor={borderColor}
                color={textColor}
                fontSize="sm"
                h="44px"
                borderRadius="12px"
                _placeholder={{ color: placeholderColor }}
              />
            </FormControl>

            {/* 이메일 (읽기 전용) */}
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="500" color="gray.500">이메일</FormLabel>
              <Input
                value={user?.email || ''}
                isReadOnly
                bg={inputBg}
                border="1px solid"
                borderColor={borderColor}
                color={textColor}
                fontSize="sm"
                h="44px"
                borderRadius="12px"
                opacity={0.7}
              />
            </FormControl>

            <Divider my={4} />

            {/* 회원탈퇴 */}
            <VStack align="stretch" spacing={2}>
              <Text fontSize="sm" fontWeight="500" color="red.500">위험 영역</Text>
              <Tooltip label={isMaster ? 'Master 계정은 삭제할 수 없습니다.' : ''} placement="top" hasArrow>
                <Button leftIcon={<MdDelete />} colorScheme="red" variant="outline" size="sm" onClick={handleDeleteClick} isDisabled={isMaster}>
                  회원탈퇴
                </Button>
              </Tooltip>
              {isMaster && <Text fontSize="xs" color="gray.500">Master 계정은 삭제할 수 없습니다.</Text>}
            </VStack>

            {/* 브랜드 삭제 (advertiser_admin만) */}
            {isAdvertiserAdmin && currentBrand && (
              <>
                <Divider my={2} />
                <VStack align="stretch" spacing={2}>
                  <Text fontSize="sm" fontWeight="500" color="red.600">서비스 탈퇴</Text>
                  <Button leftIcon={<MdDelete />} colorScheme="red" size="sm" onClick={handleDeleteBrandClick}>
                    서비스 탈퇴 (브랜드 삭제)
                  </Button>
                  <Text fontSize="xs" color="red.400">브랜드 및 소속된 모든 사용자, 데이터가 영구 삭제됩니다.</Text>
                </VStack>
              </>
            )}

            {/* 에이전시 삭제 (agency_admin만) */}
            {isAgencyAdmin && currentOrganization && (
              <>
                <Divider my={2} />
                <VStack align="stretch" spacing={2}>
                  <Text fontSize="sm" fontWeight="500" color="red.700">에이전시 서비스 탈퇴</Text>
                  <Button leftIcon={<MdDelete />} colorScheme="red" size="sm" onClick={onDeleteAgencyOpen}>
                    에이전시 삭제
                  </Button>
                  <Text fontSize="xs" color="red.500">
                    조직, 소속 브랜드({currentOrganization.advertisers?.length || 0}개), 모든 직원 및 데이터가 영구 삭제됩니다.
                  </Text>
                </VStack>
              </>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose} fontSize="sm">취소</Button>
          <Button colorScheme="brand" onClick={handleSubmit} fontSize="sm" fontWeight="500">저장</Button>
        </ModalFooter>
      </ModalContent>

      {isAdvertiserAdmin && (
        <OwnershipTransferModal
          isOpen={isTransferOpen}
          onClose={onTransferClose}
          onTransferComplete={handleTransferComplete}
          currentUser={{ ...user, advertiser_id: advertiserId }}
          onDeleteBrand={handleDeleteBrandClick}
        />
      )}

      <DeleteAccountConfirmModal isOpen={isDeleteConfirmOpen} onClose={onDeleteConfirmClose} user={user} newOwnerId={newOwnerId} />

      {currentBrand && (
        <DeleteBrandModal isOpen={isDeleteBrandOpen} onClose={onDeleteBrandClose} brand={currentBrand} onConfirm={confirmDeleteBrand} isLoading={isDeletingBrand} />
      )}

      {currentOrganization && (
        <DeleteAgencyWithEmailModal isOpen={isDeleteAgencyOpen} onClose={onDeleteAgencyClose} organization={currentOrganization} />
      )}
    </Modal>
  );
}
