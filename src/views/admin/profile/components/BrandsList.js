import {
  Box,
  Text,
  Badge,
  Flex,
  Icon,
  useColorModeValue,
  SimpleGrid,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  useDisclosure,
} from "@chakra-ui/react";
import Card from "components/card/Card";
import React, { useState, useEffect } from "react";
import {
  MdBusiness,
  MdEmail,
  MdPhone,
  MdCalendarToday,
  MdVerifiedUser,
  MdLanguage,
} from "react-icons/md";
import { supabase } from "config/supabase";

function SimpleBrandCard({ brand, onClick }) {
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const brandColor = useColorModeValue("brand.500", "brand.400");
  const bgHover = useColorModeValue("secondaryGray.100", "whiteAlpha.100");

  return (
    <Card p="15px" cursor="pointer" transition="all 0.2s" _hover={{ transform: "translateY(-2px)", shadow: "md", bg: bgHover }} onClick={() => onClick(brand)}>
      <Flex align="center" justify="space-between">
        <Flex align="center">
          <Icon as={MdBusiness} w="20px" h="20px" color={brandColor} mr="10px" />
          <Text color={textColor} fontSize="md" fontWeight="600">{brand.name}</Text>
        </Flex>
        <Badge colorScheme="green" fontSize="xs">활성</Badge>
      </Flex>
    </Card>
  );
}

function BrandDetailModal({ isOpen, onClose, brand }) {
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const textColorSecondary = useColorModeValue("secondaryGray.600", "secondaryGray.400");
  const brandColor = useColorModeValue("brand.500", "brand.400");
  const borderColor = useColorModeValue("secondaryGray.300", "whiteAlpha.200");
  const [brandDetails, setBrandDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !brand?.id) return;

    setIsLoading(true);
    supabase.from('advertisers').select(`
      id, name, business_number, website_url, contact_email, contact_phone, created_at, organization_id,
      organizations (name)
    `).eq('id', brand.id).single()
      .then(({ data, error }) => {
        if (!error && data) {
          setBrandDetails({
            organizationName: data.organizations?.name || "-",
            businessNumber: data.business_number || "-",
            contactEmail: data.contact_email || "-",
            contactPhone: data.contact_phone || "-",
            websiteUrl: data.website_url || "-",
            createdAt: data.created_at ? new Date(data.created_at).toISOString().split('T')[0].replace(/-/g, '.') : "-",
          });
        }
        setIsLoading(false);
      });
  }, [isOpen, brand]);

  if (!brand) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <HStack spacing="10px">
            <Icon as={MdBusiness} w="24px" h="24px" color={brandColor} />
            <Text>{brand.name}</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          {isLoading ? (
            <Box textAlign="center" py="40px">
              <Text color={textColorSecondary}>로딩중...</Text>
            </Box>
          ) : !brandDetails ? (
            <Box textAlign="center" py="40px">
              <Text color={textColorSecondary}>브랜드 정보를 불러올 수 없습니다</Text>
            </Box>
          ) : (
            <VStack align="stretch" spacing="20px">
              <Box>
                <HStack spacing="8px" mb="8px">
                  <Icon as={MdVerifiedUser} w="18px" h="18px" color={textColorSecondary} />
                  <Text color={textColor} fontSize="sm" fontWeight="600">소속</Text>
                </HStack>
                <Text color={textColorSecondary} fontSize="md" pl="26px">{brandDetails.organizationName}</Text>
              </Box>

              {brandDetails.businessNumber && brandDetails.businessNumber !== "-" && (
                <Box>
                  <Text color={textColor} fontSize="sm" fontWeight="600" mb="8px">사업자등록번호</Text>
                  <Text color={textColorSecondary} fontSize="md">{brandDetails.businessNumber}</Text>
                </Box>
              )}

              <Box>
                <Text color={textColor} fontSize="sm" fontWeight="600" mb="12px">연락처 정보</Text>
                <VStack align="stretch" spacing="12px">
                  {brandDetails.contactEmail && brandDetails.contactEmail !== "-" && (
                    <HStack spacing="10px">
                      <Icon as={MdEmail} w="18px" h="18px" color={textColorSecondary} />
                      <Text color={textColorSecondary} fontSize="md">{brandDetails.contactEmail}</Text>
                    </HStack>
                  )}
                  {brandDetails.contactPhone && brandDetails.contactPhone !== "-" && (
                    <HStack spacing="10px">
                      <Icon as={MdPhone} w="18px" h="18px" color={textColorSecondary} />
                      <Text color={textColorSecondary} fontSize="md">{brandDetails.contactPhone}</Text>
                    </HStack>
                  )}
                </VStack>
              </Box>

              {brandDetails.websiteUrl && brandDetails.websiteUrl !== "-" && (
                <Box>
                  <HStack spacing="8px" mb="8px">
                    <Icon as={MdLanguage} w="18px" h="18px" color={textColorSecondary} />
                    <Text color={textColor} fontSize="sm" fontWeight="600">웹사이트</Text>
                  </HStack>
                  <Text color="brand.500" fontSize="md" pl="26px" cursor="pointer" _hover={{ textDecoration: "underline" }} onClick={() => window.open(brandDetails.websiteUrl, '_blank')}>
                    {brandDetails.websiteUrl}
                  </Text>
                </Box>
              )}

              <Box pt="10px" borderTop="1px solid" borderColor={borderColor}>
                <HStack spacing="10px">
                  <Icon as={MdCalendarToday} w="16px" h="16px" color={textColorSecondary} />
                  <Text color={textColorSecondary} fontSize="sm">{brandDetails.createdAt} 추가됨</Text>
                </HStack>
              </Box>
            </VStack>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

export default function BrandsList({ brands = [], ...rest }) {
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const textColorSecondary = useColorModeValue("secondaryGray.600", "secondaryGray.400");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedBrand, setSelectedBrand] = useState(null);

  const handleBrandClick = (brand) => {
    setSelectedBrand(brand);
    onOpen();
  };

  return (
    <>
      <Card mb={{ base: "0px", "2xl": "20px" }} display="flex" flexDirection="column" {...rest}>
        <Box p="20px">
          <Text color={textColor} fontSize="lg" fontWeight="700" mb="5px">담당 브랜드</Text>
          <Text color={textColorSecondary} fontSize="sm" mb="20px">현재 관리 중인 브랜드 목록입니다</Text>
        </Box>
        <Box flex="1" overflowY="auto" px="20px" pb="20px">
          {brands.length === 0 ? (
            <Box textAlign="center" py="20px">
              <Icon as={MdBusiness} w="40px" h="40px" color="secondaryGray.400" mx="auto" mb="10px" />
              <Text color={textColorSecondary} fontSize="sm">담당 브랜드가 없습니다</Text>
            </Box>
          ) : (
            <SimpleGrid columns={{ base: 1 }} gap="10px">
              {brands.map((brand, index) => (
                <SimpleBrandCard key={index} brand={brand} onClick={handleBrandClick} />
              ))}
            </SimpleGrid>
          )}
        </Box>
      </Card>
      <BrandDetailModal isOpen={isOpen} onClose={onClose} brand={selectedBrand} />
    </>
  );
}
