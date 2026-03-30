import React, { useState } from "react";
import {
  Box,
  Text,
  Button,
  useColorModeValue,
  Flex,
  Icon,
  Badge,
  Collapse,
  HStack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
} from "@chakra-ui/react";
import { MdChevronRight, MdExpandMore, MdMoreVert, MdBusiness, MdStorefront, MdDelete } from "react-icons/md";

export default function AdvertisersTree({ organizations = [], onAddBrand, onEditBrand, onDeleteBrand, onDeleteAgency, currentUserRole, currentUserOrgId }) {
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");
  const hoverBg = useColorModeValue("secondaryGray.100", "whiteAlpha.100");
  const orgBg = useColorModeValue("gray.50", "navy.800");
  const brandBg = useColorModeValue("white", "navy.900");

  // 확장/축소 상태 관리
  const [expandedOrgs, setExpandedOrgs] = useState({});

  const toggleOrg = (orgId) => {
    setExpandedOrgs(prev => ({
      ...prev,
      [orgId]: !prev[orgId]
    }));
  };

  const handleEditBrand = (brand) => {
    onEditBrand(brand);
  };

  // 브랜드 삭제 권한 체크
  const canDeleteBrand = (brand) => {
    if (currentUserRole === 'master') return true;
    if (currentUserRole === 'agency_admin' && brand.organization_id === currentUserOrgId) {
      return true;
    }
    return false;
  };

  // 에이전시 삭제 권한 체크 (master만 가능)
  const canDeleteAgency = () => {
    return currentUserRole === 'master';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.').replace(/\.$/, '');
  };

  return (
    <Box>
      <Text fontSize="xl" fontWeight="700" mb="20px" color={textColor}>
        조직별 광고주(브랜드) 트리
      </Text>

      {organizations.length === 0 ? (
        <Text fontSize="sm" color="gray.500" textAlign="center" py="40px">
          등록된 조직이 없습니다.
        </Text>
      ) : (
        organizations.map((org) => {
          const isExpanded = expandedOrgs[org.id];
          const brandCount = org.advertisers?.length || 0;

          return (
            <Box
              key={org.id}
              mb="16px"
              border="1px solid"
              borderColor={borderColor}
              borderRadius="12px"
              overflow="hidden"
            >
              {/* 조직 헤더 */}
              <Flex
                align="center"
                gap="12px"
                p="16px"
                bg={orgBg}
                transition="all 0.2s"
              >
                <Icon
                  as={isExpanded ? MdExpandMore : MdChevronRight}
                  w="24px"
                  h="24px"
                  color={textColor}
                  cursor="pointer"
                  onClick={() => toggleOrg(org.id)}
                />
                <Icon
                  as={MdBusiness}
                  w="20px"
                  h="20px"
                  color={org.type === 'agency' ? 'purple.500' : 'blue.500'}
                />
                <Box flex="1" cursor="pointer" onClick={() => toggleOrg(org.id)} _hover={{ opacity: 0.8 }}>
                  <HStack spacing="8px" mb="4px">
                    <Text fontSize="md" fontWeight="700" color={textColor}>
                      {org.name}
                    </Text>
                    <Badge colorScheme={org.type === 'agency' ? 'purple' : 'blue'} fontSize="xs">
                      {org.type === 'agency' ? '대행사' : '광고주'}
                    </Badge>
                  </HStack>
                  <Text fontSize="xs" color="gray.500">
                    브랜드 {brandCount}개
                  </Text>
                </Box>

                {/* 에이전시 삭제 메뉴 (master만) */}
                {canDeleteAgency() && (
                  <Menu>
                    <MenuButton
                      as={IconButton}
                      icon={<Icon as={MdMoreVert} />}
                      variant="ghost"
                      size="sm"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <MenuList>
                      <MenuItem
                        icon={<Icon as={MdDelete} />}
                        color="red.500"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteAgency(org);
                        }}
                      >
                        에이전시 삭제
                      </MenuItem>
                    </MenuList>
                  </Menu>
                )}
              </Flex>

              {/* 광고주(브랜드) 목록 */}
              <Collapse in={isExpanded} animateOpacity>
                <Box p="16px" bg={brandBg}>
                  {brandCount === 0 ? (
                    <Text fontSize="sm" color="gray.500" textAlign="center" py="20px">
                      등록된 브랜드가 없습니다.
                    </Text>
                  ) : (
                    <Box>
                      {org.advertisers.map((brand, idx) => {
                        const otherBrandsInGroup = brand.advertiser_group_id
                          ? org.advertisers
                              .filter(b =>
                                b.advertiser_group_id === brand.advertiser_group_id &&
                                b.id !== brand.id
                              )
                              .map(b => b.name)
                          : [];

                        return (
                          <Flex
                            key={brand.id}
                            align="center"
                            justify="space-between"
                            p="12px 16px"
                            mb={idx < brandCount - 1 ? "8px" : "0"}
                            border="1px solid"
                            borderColor={borderColor}
                            borderRadius="8px"
                            _hover={{ bg: hoverBg }}
                            transition="all 0.2s"
                          >
                            <Flex align="center" gap="12px" flex="1">
                              <Icon as={MdStorefront} w="18px" h="18px" color="brand.500" />
                              <Box flex="1">
                                <HStack spacing="8px" mb="4px">
                                  <Text fontSize="sm" fontWeight="600" color={textColor}>
                                    {brand.name}
                                  </Text>
                                  {otherBrandsInGroup.length > 0 && (
                                    <Text fontSize="xs" color="gray.500" fontWeight="400">
                                      ({otherBrandsInGroup.join(', ')})
                                    </Text>
                                  )}
                                </HStack>
                                <HStack spacing="16px" fontSize="xs" color="gray.500">
                                  {brand.business_number && <Text>사업자: {brand.business_number}</Text>}
                                  {brand.contact_email && <Text>이메일: {brand.contact_email}</Text>}
                                  {brand.contact_phone && <Text>연락처: {brand.contact_phone}</Text>}
                                  <Text>생성일: {formatDate(brand.created_at)}</Text>
                                </HStack>
                              </Box>
                            </Flex>

                            <Menu>
                              <MenuButton
                                as={IconButton}
                                icon={<Icon as={MdMoreVert} />}
                                variant="ghost"
                                size="sm"
                              />
                              <MenuList>
                                <MenuItem onClick={() => handleEditBrand(brand)}>
                                  정보 수정
                                </MenuItem>
                                {canDeleteBrand(brand) && (
                                  <MenuItem
                                    icon={<Icon as={MdDelete} />}
                                    color="red.500"
                                    onClick={() => onDeleteBrand(brand)}
                                  >
                                    브랜드 삭제
                                  </MenuItem>
                                )}
                              </MenuList>
                            </Menu>
                          </Flex>
                        );
                      })}
                    </Box>
                  )}
                </Box>
              </Collapse>
            </Box>
          );
        })
      )}
    </Box>
  );
}
