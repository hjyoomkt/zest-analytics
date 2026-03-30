import React, { useState, useEffect } from "react";
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
  Alert,
  AlertIcon,
  Text,
  Code,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorModeValue,
  Box,
  Switch,
  HStack,
  useToast,
  IconButton,
  Flex,
} from "@chakra-ui/react";
import { useAuth } from "contexts/AuthContext";
import { MdKeyboardArrowDown, MdContentCopy } from "react-icons/md";
import { createInviteCode, logChangelog } from "services/supabaseService";
import { supabase } from "config/supabase";

export default function InviteUserModal({ isOpen, onClose }) {
  const { isAgency, isMaster, role: currentUserRole, user, organizationId, advertiserId, availableAdvertisers } = useAuth();
  const toast = useToast();

  const [formData, setFormData] = useState({
    email: "",
    role: "viewer",
    advertiserIds: [],
    isNewAdvertiser: false,
    isNewBrand: false,
    parentAdvertiserId: "",
    targetOrganizationId: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);
  const [clients, setClients] = useState([]);

  // Color mode values
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const brandColor = useColorModeValue('brand.500', 'brand.400');
  const bgHover = useColorModeValue('secondaryGray.100', 'whiteAlpha.100');
  const inputBg = useColorModeValue('white', 'navy.700');
  const selectedBg = useColorModeValue('brand.50', 'whiteAlpha.100');
  const codeBgHover = useColorModeValue('gray.100', 'whiteAlpha.200');

  // 조직 목록 조회
  React.useEffect(() => {
    if (isOpen && (isMaster() || currentUserRole === 'agency_admin' || currentUserRole === 'agency_manager')) {
      fetchOrganizations();
    }
  }, [isOpen, isMaster, currentUserRole]);

  const fetchOrganizations = async () => {
    setIsLoadingOrgs(true);
    try {
      let query = supabase
        .from('advertisers')
        .select('id, name, organization_id, advertiser_group_id')
        .is('deleted_at', null);

      if (currentUserRole === 'agency_admin' || currentUserRole === 'agency_manager') {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query.order('name', { ascending: true });

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('브랜드 목록 조회 실패:', error);
      toast({
        title: '브랜드 목록 조회 실패',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  // 권한 계층 구조 정의
  const roleHierarchy = {
    master: 8,
    agency_admin: 7,
    agency_manager: 6,
    advertiser_admin: 4,
    advertiser_staff: 3,
    viewer: 1,
  };

  const canAssignRole = (targetRole) => {
    if (targetRole === 'agency_admin') {
      return false;
    }

    if (formData.isNewAdvertiser) {
      return targetRole === 'advertiser_admin';
    }

    if (formData.isNewBrand) {
      return targetRole === 'advertiser_admin';
    }

    if (['agency_admin', 'agency_manager'].includes(currentUserRole)) {
      return ['agency_manager', 'advertiser_admin', 'advertiser_staff', 'viewer'].includes(targetRole);
    }

    if (currentUserRole === 'advertiser_admin') {
      return ['advertiser_staff', 'viewer'].includes(targetRole);
    }

    return roleHierarchy[targetRole] < roleHierarchy[currentUserRole];
  };

  // 그룹 브랜드 포함하여 클라이언트 목록 조회
  useEffect(() => {
    const fetchGroupClients = async () => {
      if (!availableAdvertisers || availableAdvertisers.length === 0) {
        setClients([]);
        return;
      }

      try {
        let baseAdvertisers = availableAdvertisers;
        if (['advertiser_admin', 'advertiser_staff'].includes(currentUserRole) && advertiserId) {
          baseAdvertisers = availableAdvertisers.filter(adv => adv.id === advertiserId);
        }

        const myAdvertiserIds = baseAdvertisers.map(adv => adv.id);

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

        setClients((allBrands || []).map(adv => ({
          id: adv.id,
          name: adv.name
        })));
      } catch (error) {
        console.error('그룹 클라이언트 조회 실패:', error);
        setClients(
          (availableAdvertisers || [])
            .filter(adv => {
              if (['advertiser_admin', 'advertiser_staff'].includes(currentUserRole) && advertiserId) {
                return adv.id === advertiserId;
              }
              return true;
            })
            .map(adv => ({
              id: adv.id,
              name: adv.name
            }))
        );
      }
    };

    fetchGroupClients();
  }, [availableAdvertisers, currentUserRole, advertiserId]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRoleChange = (newRole) => {
    setFormData({
      ...formData,
      role: newRole,
    });
  };

  const getRoleLabel = (role) => {
    const roleLabels = {
      viewer: '뷰어',
      advertiser_staff: '브랜드 부운영자',
      advertiser_admin: '브랜드 대표운영자',
      agency_manager: '에이전시 관리자',
      agency_admin: '에이전시 대표',
    };
    return roleLabels[role] || role;
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      let inviteType = 'existing_member';
      let targetOrgId = organizationId;
      let parentAdvertiserId = null;

      const isAgencyRole = ['agency_admin', 'agency_manager'].includes(formData.role);
      let targetAdvId = null;

      if (!isAgencyRole) {
        targetAdvId = formData.advertiserIds.length > 0 ? formData.advertiserIds[0] : advertiserId;
      }

      if (formData.isNewAdvertiser) {
        inviteType = 'new_brand';
        targetOrgId = organizationId;
        targetAdvId = null;
      } else if (formData.isNewBrand) {
        inviteType = 'new_brand';
        targetOrgId = formData.targetOrganizationId;
        targetAdvId = null;
        parentAdvertiserId = formData.parentAdvertiserId;
      }

      let organizationName = null;
      if (targetOrgId) {
        organizationName = '해당 조직';
      }

      const inviteData = {
        email: formData.email,
        role: formData.role,
        organizationId: targetOrgId,
        advertiserId: targetAdvId,
        createdBy: user.id,
        inviteType: inviteType,
        advertiserIds: formData.advertiserIds.length > 0 ? formData.advertiserIds : null,
        inviterName: user.name || '관리자',
        organizationName: organizationName,
        parentAdvertiserId: parentAdvertiserId,
      };

      const result = await createInviteCode(inviteData);
      setInviteCode(result.code);

      const advertiserData = availableAdvertisers?.find(a => a.id === (targetAdvId || formData.advertiserIds[0]));
      await logChangelog({
        targetType: 'user',
        targetId: null,
        targetName: formData.email,
        actionType: 'invite',
        actionDetail: `사용자 초대: ${formData.email} (권한: ${formData.role})`,
        advertiserId: targetAdvId || (formData.advertiserIds.length > 0 ? formData.advertiserIds[0] : null),
        advertiserName: advertiserData?.name,
        organizationId: targetOrgId,
        organizationName: organizationName,
        newValue: {
          email: formData.email,
          role: formData.role,
          advertiserIds: formData.advertiserIds
        },
      });

      toast({
        title: '초대 코드 생성 완료',
        description: `${formData.email}님에게 초대 코드가 생성되었습니다.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      console.error('초대 실패:', err);
      toast({
        title: '초대 코드 생성 실패',
        description: err.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "복사 완료",
        description: `${label}가 클립보드에 복사되었습니다.`,
        status: "success",
        duration: 2000,
        isClosable: true,
        position: "top",
      });
    } catch (err) {
      toast({
        title: "복사 실패",
        description: "클립보드 복사에 실패했습니다.",
        status: "error",
        duration: 2000,
        isClosable: true,
        position: "top",
      });
    }
  };

  const handleClose = () => {
    setFormData({
      email: "",
      role: "viewer",
      advertiserIds: [],
      isNewAdvertiser: false,
      isNewBrand: false,
      parentAdvertiserId: "",
      targetOrganizationId: "",
    });
    setInviteCode(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {['master', 'agency_admin', 'agency_manager'].includes(currentUserRole) ? '직원 초대' : '팀원 초대'}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {!inviteCode ? (
            <VStack spacing="24px">
              {/* 대행사 및 Master 전용: 신규 광고주 초대 옵션 */}
              {(isMaster() || ['agency_admin', 'agency_manager'].includes(currentUserRole)) && (
                <VStack spacing="16px" w="100%">
                  <FormControl>
                    <HStack justify="space-between" align="center">
                      <Box>
                        <FormLabel fontSize="sm" color={textColor} mb="4px">신규 클라이언트 조직 초대</FormLabel>
                        <Text fontSize="xs" color="gray.500">
                          새로운 광고주 회사를 등록하고 관리자를 초대합니다
                        </Text>
                      </Box>
                      <Switch
                        isChecked={formData.isNewAdvertiser}
                        onChange={(e) => {
                          const isNew = e.target.checked;
                          setFormData({
                            ...formData,
                            isNewAdvertiser: isNew,
                            isNewBrand: false,
                            role: isNew ? 'advertiser_admin' : 'viewer',
                            advertiserIds: isNew ? [] : formData.advertiserIds,
                          });
                        }}
                        colorScheme="brand"
                        size="lg"
                      />
                    </HStack>
                  </FormControl>

                  <FormControl>
                    <HStack justify="space-between" align="center">
                      <Box>
                        <FormLabel fontSize="sm" color={textColor} mb="4px">기존 브랜드에 하위 브랜드 추가</FormLabel>
                        <Text fontSize="xs" color="gray.500">
                          관리 중인 브랜드에 새로운 하위 브랜드를 추가합니다
                        </Text>
                      </Box>
                      <Switch
                        isChecked={formData.isNewBrand}
                        onChange={(e) => {
                          const isNew = e.target.checked;
                          setFormData({
                            ...formData,
                            isNewBrand: isNew,
                            isNewAdvertiser: false,
                            role: isNew ? 'advertiser_admin' : 'viewer',
                            advertiserIds: isNew ? [] : formData.advertiserIds,
                            targetOrganizationId: isNew ? "" : formData.targetOrganizationId,
                          });
                        }}
                        colorScheme="brand"
                        size="lg"
                      />
                    </HStack>
                  </FormControl>

                  {/* 하위 브랜드를 추가할 부모 브랜드 선택 (isNewBrand일 때만) */}
                  {formData.isNewBrand && (
                    <FormControl isRequired>
                      <FormLabel fontSize="sm" color="gray.500">하위 브랜드를 추가할 부모 브랜드 선택</FormLabel>
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
                          {formData.parentAdvertiserId
                            ? organizations.find(adv => adv.id === formData.parentAdvertiserId)?.name
                            : isLoadingOrgs ? "로딩 중..." : "브랜드를 선택하세요"}
                        </MenuButton>
                        <MenuList minW='auto' w='400px' px='8px' py='8px'>
                          {organizations.map((advertiser) => (
                            <MenuItem
                              key={advertiser.id}
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  parentAdvertiserId: advertiser.id,
                                  targetOrganizationId: advertiser.organization_id,
                                });
                              }}
                              bg={formData.parentAdvertiserId === advertiser.id ? brandColor : 'transparent'}
                              color={formData.parentAdvertiserId === advertiser.id ? 'white' : textColor}
                              _hover={{
                                bg: formData.parentAdvertiserId === advertiser.id ? brandColor : bgHover,
                              }}
                              fontWeight={formData.parentAdvertiserId === advertiser.id ? '600' : '500'}
                              fontSize='sm'
                              px='12px'
                              py='10px'
                              borderRadius='8px'
                            >
                              <Box>
                                <Text>{advertiser.name}</Text>
                                {advertiser.advertiser_group_id && (
                                  <Text fontSize="xs" opacity="0.7">
                                    그룹 ID: {advertiser.advertiser_group_id.substring(0, 8)}...
                                  </Text>
                                )}
                              </Box>
                            </MenuItem>
                          ))}
                        </MenuList>
                      </Menu>
                    </FormControl>
                  )}
                </VStack>
              )}

              <FormControl isRequired>
                <FormLabel fontSize="sm" color="gray.500">이메일 주소</FormLabel>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="user@example.com"
                  bg={inputBg}
                  border='1px solid'
                  borderColor={borderColor}
                  color={textColor}
                  h='44px'
                  borderRadius='12px'
                  _hover={{ borderColor: brandColor }}
                  _focus={{ borderColor: brandColor, boxShadow: `0 0 0 1px ${brandColor}` }}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontSize="sm" color="gray.500">권한</FormLabel>
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

                    {(isMaster() || ['agency_admin', 'agency_manager'].includes(currentUserRole)) && (formData.isNewAdvertiser || formData.isNewBrand) && (
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
                    )}

                    {(isMaster() || ['agency_admin', 'agency_manager'].includes(currentUserRole)) && (
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

              {/* 브랜드/클라이언트 선택 */}
              {!formData.isNewAdvertiser && !formData.isNewBrand && (currentUserRole === 'master' || currentUserRole === 'agency_admin' || currentUserRole === 'agency_manager' || currentUserRole === 'advertiser_admin' || currentUserRole === 'advertiser_staff') && (
                <FormControl>
                  <FormLabel fontSize="sm" color="gray.500">
                    {['master', 'agency_admin', 'agency_manager'].includes(currentUserRole) ? '담당 클라이언트 (복수 선택 가능)' : '접근 가능한 브랜드 (복수 선택 가능)'}
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
                      <Text fontSize="sm" color={textColor} fontWeight="600">전체 클라이언트</Text>
                    </HStack>

                    {clients.map((client) => (
                      <HStack
                        key={client.id}
                        p="12px" borderRadius="8px" border="1px solid"
                        borderColor={formData.advertiserIds.includes(client.id) ? brandColor : borderColor}
                        bg={formData.advertiserIds.includes(client.id) ? selectedBg : inputBg}
                        cursor="pointer"
                        onClick={() => {
                          const newIds = formData.advertiserIds.includes(client.id)
                            ? formData.advertiserIds.filter(id => id !== client.id)
                            : [...formData.advertiserIds, client.id];
                          setFormData({ ...formData, advertiserIds: newIds });
                        }}
                        _hover={{ borderColor: brandColor, bg: bgHover }}
                      >
                        <Box w="16px" h="16px" borderRadius="4px" border="2px solid"
                          borderColor={formData.advertiserIds.includes(client.id) ? brandColor : borderColor}
                          bg={formData.advertiserIds.includes(client.id) ? brandColor : 'transparent'}
                          display="flex" alignItems="center" justifyContent="center"
                        >
                          {formData.advertiserIds.includes(client.id) && (
                            <Box w="8px" h="8px" bg="white" borderRadius="2px" />
                          )}
                        </Box>
                        <Text fontSize="sm" color={textColor} fontWeight="500">{client.name}</Text>
                      </HStack>
                    ))}
                  </VStack>
                  <Text fontSize="xs" color="gray.500" mt="8px">
                    {formData.advertiserIds.length === 0
                      ? "전체 클라이언트 데이터에 접근할 수 있습니다."
                      : `${formData.advertiserIds.length}개 클라이언트 선택됨`}
                  </Text>
                </FormControl>
              )}

              <Alert status="info" borderRadius="8px">
                <AlertIcon />
                <Text fontSize="sm">초대 이메일이 발송되며, 7일 이내에 가입해야 합니다.</Text>
              </Alert>
            </VStack>
          ) : (
            <VStack spacing="16px" align="stretch">
              <Alert status="success" borderRadius="8px">
                <AlertIcon />
                <Text fontSize="sm">초대 코드가 생성되었습니다!</Text>
              </Alert>

              <FormControl>
                <FormLabel>초대 코드</FormLabel>
                <Flex gap="8px">
                  <Code
                    flex="1" p="12px" fontSize="lg" fontWeight="bold" borderRadius="8px"
                    cursor="pointer"
                    onClick={() => copyToClipboard(inviteCode, "초대 코드")}
                    _hover={{ bg: codeBgHover }} transition="all 0.2s"
                  >
                    {inviteCode}
                  </Code>
                  <IconButton
                    icon={<MdContentCopy />}
                    onClick={() => copyToClipboard(inviteCode, "초대 코드")}
                    aria-label="초대 코드 복사"
                    colorScheme="brand" variant="outline" size="md"
                  />
                </Flex>
              </FormControl>

              <FormControl>
                <FormLabel>초대 링크</FormLabel>
                <Flex gap="8px">
                  <Code
                    flex="1" p="12px" fontSize="sm" borderRadius="8px" wordBreak="break-all"
                    cursor="pointer"
                    onClick={() => copyToClipboard(`${window.location.origin}/auth/sign-up?code=${inviteCode}`, "초대 링크")}
                    _hover={{ bg: codeBgHover }} transition="all 0.2s"
                  >
                    {`${window.location.origin}/auth/sign-up?code=${inviteCode}`}
                  </Code>
                  <IconButton
                    icon={<MdContentCopy />}
                    onClick={() => copyToClipboard(`${window.location.origin}/auth/sign-up?code=${inviteCode}`, "초대 링크")}
                    aria-label="초대 링크 복사"
                    colorScheme="brand" variant="outline" size="md"
                  />
                </Flex>
              </FormControl>

              <Alert status="warning" borderRadius="8px">
                <AlertIcon />
                <Text fontSize="sm">
                  이 코드를 {formData.email}에게 전달하거나, 초대 이메일을 확인하도록 안내하세요.
                </Text>
              </Alert>
            </VStack>
          )}
        </ModalBody>

        <ModalFooter>
          {!inviteCode ? (
            <>
              <Button variant="ghost" mr={3} onClick={handleClose}>취소</Button>
              <Button
                colorScheme="brand" onClick={handleSubmit}
                isLoading={isLoading} isDisabled={!formData.email}
              >
                초대 코드 생성
              </Button>
            </>
          ) : (
            <Button colorScheme="brand" onClick={handleClose}>완료</Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
