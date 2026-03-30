import {
  Box,
  Text,
  Badge,
  Flex,
  Icon,
  useColorModeValue,
  VStack,
  HStack,
} from "@chakra-ui/react";
import Card from "components/card/Card";
import React from "react";
import {
  MdBusiness,
  MdEmail,
  MdPhone,
  MdCalendarToday,
  MdVerifiedUser,
} from "react-icons/md";

export default function BrandCard({ brand }) {
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const textColorSecondary = useColorModeValue("secondaryGray.600", "secondaryGray.400");
  const brandColor = useColorModeValue("brand.500", "brand.400");
  const bgHover = useColorModeValue("secondaryGray.100", "whiteAlpha.100");

  const getRoleBadge = (role) => {
    const roleMap = {
      advertiser_admin: { label: "관리자", color: "purple" },
      manager: { label: "매니저", color: "blue" },
      editor: { label: "에디터", color: "green" },
      viewer: { label: "뷰어", color: "gray" },
    };
    return roleMap[role] || { label: role, color: "gray" };
  };

  const roleBadge = getRoleBadge(brand.role);

  return (
    <Card
      p="20px"
      cursor="pointer"
      transition="all 0.2s"
      _hover={{
        transform: "translateY(-4px)",
        shadow: "lg",
        bg: bgHover,
      }}
    >
      <VStack align="stretch" spacing="15px">
        {/* 헤더 */}
        <Flex justify="space-between" align="flex-start">
          <HStack spacing="10px">
            <Icon as={MdBusiness} w="24px" h="24px" color={brandColor} />
            <Text color={textColor} fontSize="lg" fontWeight="700">
              {brand.name}
            </Text>
          </HStack>
          <HStack spacing="5px">
            <Badge colorScheme={roleBadge.color} fontSize="xs">
              {roleBadge.label}
            </Badge>
            {brand.status === "active" && (
              <Badge colorScheme="green" fontSize="xs">
                활성
              </Badge>
            )}
          </HStack>
        </Flex>

        {/* 조직 정보 */}
        <Box>
          <HStack spacing="8px" mb="8px">
            <Icon as={MdVerifiedUser} w="16px" h="16px" color={textColorSecondary} />
            <Text color={textColorSecondary} fontSize="sm">
              소속: {brand.organizationName}
            </Text>
          </HStack>
        </Box>

        {/* 사업자 번호 */}
        {brand.businessNumber && (
          <Text color={textColorSecondary} fontSize="sm">
            사업자등록번호: {brand.businessNumber}
          </Text>
        )}

        {/* 연락처 정보 */}
        <VStack align="stretch" spacing="8px">
          {brand.contactEmail && (
            <HStack spacing="8px">
              <Icon as={MdEmail} w="16px" h="16px" color={textColorSecondary} />
              <Text color={textColorSecondary} fontSize="sm" noOfLines={1}>
                {brand.contactEmail}
              </Text>
            </HStack>
          )}
          {brand.contactPhone && (
            <HStack spacing="8px">
              <Icon as={MdPhone} w="16px" h="16px" color={textColorSecondary} />
              <Text color={textColorSecondary} fontSize="sm">
                {brand.contactPhone}
              </Text>
            </HStack>
          )}
        </VStack>

        {/* 생성일 */}
        <HStack spacing="8px" pt="10px" borderTop="1px solid" borderColor={useColorModeValue("secondaryGray.300", "whiteAlpha.200")}>
          <Icon as={MdCalendarToday} w="14px" h="14px" color={textColorSecondary} />
          <Text color={textColorSecondary} fontSize="xs">
            {brand.createdAt} 추가됨
          </Text>
        </HStack>
      </VStack>
    </Card>
  );
}
