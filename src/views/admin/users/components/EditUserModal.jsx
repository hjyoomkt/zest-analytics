import React, { useState, useEffect, useRef } from "react";
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
  VStack,
  Text,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorModeValue,
  Box,
  HStack,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from "@chakra-ui/react";
import { useAuth } from "contexts/AuthContext";
import { MdKeyboardArrowDown } from "react-icons/md";
import { updateUserRoleAndAdvertisers, logChangelog } from "services/supabaseService";
import { supabase } from "config/supabase";

export default function EditUserModal({ isOpen, onClose, user, onUpdate }) {
  const { isAgency, role: currentUserRole, isMaster, organizationType, availableAdvertisers, user: currentUser } = useAuth();
  const toast = useToast();
  const [formData, setFormData] = useState({
    role: "",
    advertiserIds: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const cancelRef = useRef();

  // Color mode values
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const brandColor = useColorModeValue('brand.500', 'brand.400');
  const bgHover = useColorModeValue('secondaryGray.100', 'whiteAlpha.100');
  const inputBg = useColorModeValue('white', 'navy.700');
  const selectedBg = useColorModeValue('brand.50', 'whiteAlpha.100');

  const roleHierarchy = {
    specialist: 7.5,
    agency_admin: 7,
    agency_manager: 6,
    agency_staff: 5,
    advertiser_admin: 4,
    advertiser_staff: 3,
    editor: 2,
    viewer: 1,
  };

  const canAssignRole = (targetRole) => {
    if (targetRole === 'master') return false;
    if (['specialist', 'editor', 'agency_staff'].includes(targetRole)) return false;
    if (isMaster()) return true;
    return roleHierarchy[targetRole] < roleHierarchy[currentUserRole];
  };

  const canEditUser = (targetUser) => {
    if (!targetUser) return false;
    if (isMaster()) return targetUser.role !== 'master';
    const targetRoleLevel = roleHierarchy[targetUser.role] || 0;
    const currentRoleLevel = roleHierarchy[currentUserRole] || 0;
    return targetRoleLevel < currentRoleLevel;
  };

  const [advertisers, setAdvertisers] = useState([]);

  useEffect(() => {
    const fetchGroupAdvertisers = async () => {
      if (!availableAdvertisers || availableAdvertisers.length === 0) {
        setAdvertisers([]);
        return;
      }

      try {
        const myAdvertiserIds = availableAdvertisers.map(adv => adv.id);

        const { data: myAdvertisers } = await supabase
          .from('advertisers')
          .select('id, advertiser_group_id')
          .in('id', myAdvertiserIds);

        const groupIds = [...new Set(
          myAdvertisers.map(adv => adv.advertiser_group_id).filter(Boolean)
        )];

        let allBrandIds = [...myAdvertiserIds];

        if (groupIds.length > 0) {
          const { data: groupBrands } = await supabase
            .from('advertisers')
            .select('id')
            .in('advertiser_group_id', groupIds);

          allBrandIds = [
            ...allBrandIds,
            ...groupBrands.map(adv => adv.id)
          ];
        }

        allBrandIds = [...new Set(allBrandIds)];

        const { data: allBrands } = await supabase
          .from('advertisers')
          .select('id, name')
          .in('id', allBrandIds)
          .is('deleted_at', null)
          .order('name');

        setAdvertisers(allBrands || []);
      } catch (error) {
        console.error('그룹 브랜드 조회 실패:', error);
        setAdvertisers(availableAdvertisers || []);
      }
    };

    fetchGroupAdvertisers();
  }, [availableAdvertisers]);

  useEffect(() => {
    if (user) {
      const clientIds = user.advertiserIds || (user.client ? [user.client] : []);
      setFormData({
        role: user.role || "",
        advertiserIds: clientIds,
      });
    }
  }, [user]);

  const handleRoleChange = (newRole) => {
    setFormData({ ...formData, role: newRole });
  };

  const getRoleLabel = (role) => {
    const roleLabels = {
      master: '마스터',
      specialist: '스페셜리스트',
      agency_admin: '에이전시 대표',
      agency_manager: '에이전시 관리자',
      agency_staff: '에이전시 직원',
      advertiser_admin: '브랜드 대표운영자',
      advertiser_staff: '브랜드 부운영자',
      editor: '편집자',
      viewer: '뷰어',
    };
    return roleLabels[role] || role;
  };

  const BRAND_ROLES = ['viewer', 'advertiser_admin', 'advertiser_staff'];

  const isBrandChanged = () => {
    const originalIds = user.advertiserIds || [];
    const newIds = formData.advertiserIds || [];
    if (originalIds.length !== newIds.length) return true;
    const sortedOriginal = [...originalIds].sort();
    const sortedNew = [...newIds].sort();
    return !sortedOriginal.every((id, index) => id === sortedNew[index]);
  };

  const performSave = async () => {
    setIsLoading(true);

    try {
      const updatedUser = await updateUserRoleAndAdvertisers(
        user.id,
        formData.role,
        formData.advertiserIds,
        { ...currentUser, role: currentUserRole }
      );

      await logChangelog({
        targetType: 'role',
        targetId: user.id,
        targetName: user.name || user.email,
        actionType: 'update',
        actionDetail: `${user.name || user.email}의 권한 변경: ${getRoleLabel(user.role)} → ${getRoleLabel(formData.role)}`,
        advertiserId: user.advertiser_id,
        advertiserName: user.advertiser_name,
        organizationId: user.organization_id,
        organizationName: user.organization_name,
        oldValue: { role: user.role },
        newValue: { role: formData.role },
      });

      toast({
        title: "업데이트 완료",
        description: "사용자 권한 및 브랜드 접근 권한이 성공적으로 변경되었습니다.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      if (onUpdate) {
        onUpdate(user.id, {
          role: formData.role,
          advertiserIds: formData.advertiserIds,
        });
      }

      onClose();
    } catch (err) {
      console.error('업데이트 실패:', err);
      toast({
        title: "업데이트 실패",
        description: err.message || "사용자 정보를 업데이트하는 중 오류가 발생했습니다.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    if (BRAND_ROLES.includes(formData.role) && isBrandChanged()) {
      setIsConfirmOpen(true);
    } else {
      performSave();
    }
  };

  const handleConfirmSave = () => {
    setIsConfirmOpen(false);
    performSave();
  };

  const handleCancelSave = () => {
    setIsConfirmOpen(false);
  };

  const handleClose = () => {
    setFormData({ role: "", advertiserIds: [] });
    onClose();
  };

  if (!user) return null;

  const hasEditPermission = canEditUser(user);

  return (
    <>
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>사용자 권한 변경</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing="24px" align="stretch">
            {!hasEditPermission && (
              <Box p="12px" bg="red.50" border="1px solid" borderColor="red.200" borderRadius="8px">
                <Text fontSize="sm" color="red.600" fontWeight="600">
                  ⚠️ 이 사용자를 수정할 권한이 없습니다
                </Text>
                <Text fontSize="xs" color="red.500" mt="4px">
                  자신과 동급이거나 상위 권한을 가진 사용자는 수정할 수 없습니다.
                </Text>
              </Box>
            )}

            <Box>
              <Text fontSize="sm" color="gray.500" mb="8px">사용자</Text>
              <Text fontWeight="600" fontSize="md" color={textColor}>
                {user.name} ({user.email})
              </Text>

              {user.clients && user.clients.length > 0 ? (
                <Text fontSize="sm" color="gray.600" mt="4px">
                  현재 소속: <Text as="span" fontWeight="600" color={brandColor}>
                    {user.clients.join(", ")}
                  </Text>
                </Text>
              ) : user.client ? (
                <Text fontSize="sm" color="gray.600" mt="4px">
                  현재 소속: <Text as="span" fontWeight="600" color={brandColor}>{user.client}</Text>
                </Text>
              ) : null}
            </Box>

            <FormControl isRequired>
              <FormLabel fontSize="sm" color="gray.500">권한 변경</FormLabel>
              <Menu>
                <MenuButton
                  as={Button}
                  rightIcon={<MdKeyboardArrowDown />}
                  bg={inputBg}
                  border='1px solid'
                  borderColor={borderColor}
                  color={textColor}
                  fontWeight='500'
                  fontSize='sm'
                  _hover={{ bg: bgHover }}
                  _active={{ bg: bgHover }}
                  w="100%"
                  h='44px'
                  borderRadius='12px'
                  textAlign="left"
                >
                  {getRoleLabel(formData.role)}
                </MenuButton>
                <MenuList minW='auto' w='300px' px='8px' py='8px'>
                  <MenuItem
                    onClick={() => canAssignRole('viewer') && handleRoleChange('viewer')}
                    bg={formData.role === 'viewer' ? brandColor : 'transparent'}
                    color={formData.role === 'viewer' ? 'white' : textColor}
                    _hover={{ bg: formData.role === 'viewer' ? brandColor : bgHover }}
                    fontWeight={formData.role === 'viewer' ? '600' : '500'}
                    fontSize='sm' px='12px' py='10px' borderRadius='8px'
                    isDisabled={!canAssignRole('viewer')}
                    opacity={!canAssignRole('viewer') ? 0.4 : 1}
                  >
                    <Box>
                      <Text fontWeight="600">뷰어</Text>
                      <Text fontSize="xs" opacity="0.8">읽기 전용 권한</Text>
                    </Box>
                  </MenuItem>

                  <MenuItem
                    onClick={() => canAssignRole('advertiser_staff') && handleRoleChange('advertiser_staff')}
                    bg={formData.role === 'advertiser_staff' ? brandColor : 'transparent'}
                    color={formData.role === 'advertiser_staff' ? 'white' : textColor}
                    _hover={{ bg: formData.role === 'advertiser_staff' ? brandColor : bgHover }}
                    fontWeight={formData.role === 'advertiser_staff' ? '600' : '500'}
                    fontSize='sm' px='12px' py='10px' borderRadius='8px' mt='4px'
                    isDisabled={!canAssignRole('advertiser_staff')}
                    opacity={!canAssignRole('advertiser_staff') ? 0.4 : 1}
                  >
                    <Box>
                      <Text fontWeight="600">브랜드 부운영자</Text>
                      <Text fontSize="xs" opacity="0.8">브랜드 어드민 접근 가능</Text>
                    </Box>
                  </MenuItem>

                  <MenuItem
                    onClick={() => canAssignRole('advertiser_admin') && handleRoleChange('advertiser_admin')}
                    bg={formData.role === 'advertiser_admin' ? brandColor : 'transparent'}
                    color={formData.role === 'advertiser_admin' ? 'white' : textColor}
                    _hover={{ bg: formData.role === 'advertiser_admin' ? brandColor : bgHover }}
                    fontWeight={formData.role === 'advertiser_admin' ? '600' : '500'}
                    fontSize='sm' px='12px' py='10px' borderRadius='8px' mt='4px'
                    isDisabled={!canAssignRole('advertiser_admin')}
                    opacity={!canAssignRole('advertiser_admin') ? 0.4 : 1}
                  >
                    <Box>
                      <Text fontWeight="600">브랜드 대표운영자</Text>
                      <Text fontSize="xs" opacity="0.8">브랜드 어드민 접근, 전체 관리 권한</Text>
                    </Box>
                  </MenuItem>

                  {(isMaster() || organizationType === 'agency') && (
                    <>
                      <MenuItem
                        onClick={() => canAssignRole('agency_manager') && handleRoleChange('agency_manager')}
                        bg={formData.role === 'agency_manager' ? brandColor : 'transparent'}
                        color={formData.role === 'agency_manager' ? 'white' : textColor}
                        _hover={{ bg: formData.role === 'agency_manager' ? brandColor : bgHover }}
                        fontWeight={formData.role === 'agency_manager' ? '600' : '500'}
                        fontSize='sm' px='12px' py='10px' borderRadius='8px' mt='4px'
                        isDisabled={!canAssignRole('agency_manager')}
                        opacity={!canAssignRole('agency_manager') ? 0.4 : 1}
                      >
                        <Box>
                          <Text fontWeight="600">에이전시 관리자</Text>
                          <Text fontSize="xs" opacity="0.8">슈퍼 어드민 접근, 직원 관리</Text>
                        </Box>
                      </MenuItem>

                      <MenuItem
                        onClick={() => canAssignRole('agency_admin') && handleRoleChange('agency_admin')}
                        bg={formData.role === 'agency_admin' ? brandColor : 'transparent'}
                        color={formData.role === 'agency_admin' ? 'white' : textColor}
                        _hover={{ bg: formData.role === 'agency_admin' ? brandColor : bgHover }}
                        fontWeight={formData.role === 'agency_admin' ? '600' : '500'}
                        fontSize='sm' px='12px' py='10px' borderRadius='8px' mt='4px'
                        isDisabled={!canAssignRole('agency_admin')}
                        opacity={!canAssignRole('agency_admin') ? 0.4 : 1}
                      >
                        <Box>
                          <Text fontWeight="600">에이전시 대표</Text>
                          <Text fontSize="xs" opacity="0.8">슈퍼 어드민 접근, 대행사 전체 관리</Text>
                        </Box>
                      </MenuItem>
                    </>
                  )}
                </MenuList>
              </Menu>
            </FormControl>

            {/* 브랜드 할당 */}
            {(currentUserRole === 'master' || currentUserRole === 'agency_admin' || currentUserRole === 'agency_manager' || currentUserRole === 'advertiser_admin' || currentUserRole === 'advertiser_staff') && (
              <FormControl>
                <FormLabel fontSize="sm" color="gray.500">
                  {isAgency() ? '담당 브랜드 (복수 선택 가능)' : '접근 가능한 브랜드 (복수 선택 가능)'}
                </FormLabel>
                <VStack align="stretch" spacing="8px">
                  <HStack
                    p="12px" borderRadius="8px" border="1px solid"
                    borderColor={formData.advertiserIds.length === 0 ? brandColor : borderColor}
                    bg={formData.advertiserIds.length === 0 ? selectedBg : inputBg}
                    cursor="pointer"
                    onClick={() => setFormData({ ...formData, advertiserIds: [] })}
                    _hover={{ borderColor: brandColor, bg: bgHover }}
                  >
                    <Box w="16px" h="16px" borderRadius="4px" border="2px solid"
                      borderColor={formData.advertiserIds.length === 0 ? brandColor : borderColor}
                      bg={formData.advertiserIds.length === 0 ? brandColor : 'transparent'}
                      display="flex" alignItems="center" justifyContent="center"
                    >
                      {formData.advertiserIds.length === 0 && (
                        <Box w="8px" h="8px" bg="white" borderRadius="2px" />
                      )}
                    </Box>
                    <Text fontSize="sm" color={textColor} fontWeight="600">전체 브랜드</Text>
                  </HStack>

                  {advertisers.map((advertiser) => (
                    <HStack
                      key={advertiser.id}
                      p="12px" borderRadius="8px" border="1px solid"
                      borderColor={formData.advertiserIds.includes(advertiser.id) ? brandColor : borderColor}
                      bg={formData.advertiserIds.includes(advertiser.id) ? selectedBg : inputBg}
                      cursor="pointer"
                      onClick={() => {
                        const newIds = formData.advertiserIds.includes(advertiser.id)
                          ? formData.advertiserIds.filter(id => id !== advertiser.id)
                          : [...formData.advertiserIds, advertiser.id];
                        setFormData({ ...formData, advertiserIds: newIds });
                      }}
                      _hover={{ borderColor: brandColor, bg: bgHover }}
                    >
                      <Box w="16px" h="16px" borderRadius="4px" border="2px solid"
                        borderColor={formData.advertiserIds.includes(advertiser.id) ? brandColor : borderColor}
                        bg={formData.advertiserIds.includes(advertiser.id) ? brandColor : 'transparent'}
                        display="flex" alignItems="center" justifyContent="center"
                      >
                        {formData.advertiserIds.includes(advertiser.id) && (
                          <Box w="8px" h="8px" bg="white" borderRadius="2px" />
                        )}
                      </Box>
                      <Text fontSize="sm" color={textColor} fontWeight="500">{advertiser.name}</Text>
                    </HStack>
                  ))}
                </VStack>
                <Text fontSize="xs" color="gray.500" mt="8px">
                  {formData.advertiserIds.length === 0
                    ? "전체 브랜드 데이터에 접근할 수 있습니다."
                    : `${formData.advertiserIds.length}개 브랜드 선택됨`}
                </Text>
              </FormControl>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleClose}>취소</Button>
          <Button
            colorScheme="brand"
            onClick={handleSubmit}
            isLoading={isLoading}
            isDisabled={!hasEditPermission}
          >
            저장
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>

    <AlertDialog isOpen={isConfirmOpen} leastDestructiveRef={cancelRef} onClose={handleCancelSave}>
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            담당 브랜드 변경 확인
          </AlertDialogHeader>
          <AlertDialogBody>
            타 광고주 목록이 선택된 것이 아닌지 주의하세요.
            <br />
            정말 변경하시겠습니까?
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={handleCancelSave}>아니요</Button>
            <Button colorScheme="brand" onClick={handleConfirmSave} ml={3}>예</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  </>
  );
}
