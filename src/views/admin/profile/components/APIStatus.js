import { Box, Text, useColorModeValue, Table, Thead, Tbody, Tr, Th, Td, Badge, Icon, Flex } from "@chakra-ui/react";
import Card from "components/card/Card.js";
import React from "react";
import { MdCheckCircle, MdOutlineError, MdSchedule, MdConstruction } from "react-icons/md";

export default function APIStatus(props) {
  const { ...rest } = props;
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const textColorSecondary = "gray.400";
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");
  const grayColor = useColorModeValue("gray.300", "gray.600");

  const demoTokens = [
    { id: 1, advertiser: '브랜드 A', platform: 'Google Ads', lastUpdated: '-', dataCollectionStatus: 'pending' },
    { id: 2, advertiser: '브랜드 A', platform: 'Meta Ads', lastUpdated: '-', dataCollectionStatus: 'pending' },
    { id: 3, advertiser: '브랜드 B', platform: 'Naver Ads', lastUpdated: '-', dataCollectionStatus: 'pending' },
  ];

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'success': return { icon: MdCheckCircle, color: 'green.500', label: '정상' };
      case 'error': return { icon: MdOutlineError, color: 'red.500', label: '오류' };
      case 'pending': return { icon: MdSchedule, color: 'orange.500', label: '대기' };
      default: return { icon: MdSchedule, color: 'gray.500', label: '알 수 없음' };
    }
  };

  return (
    <Card mb={{ base: "0px", "2xl": "20px" }} display="flex" flexDirection="column" position="relative" {...rest}>
      {/* 서비스 개발중 오버레이 */}
      <Box
        position="absolute" top="0" left="0" right="0" bottom="0"
        bg={useColorModeValue("whiteAlpha.800", "blackAlpha.700")}
        borderRadius="20px" zIndex="1"
        display="flex" flexDirection="column" alignItems="center" justifyContent="center"
      >
        <Icon as={MdConstruction} w='60px' h='60px' color={grayColor} mb="16px" />
        <Text fontSize='xl' fontWeight='700' color={grayColor}>서비스 개발중</Text>
        <Text fontSize='sm' fontWeight='500' color={textColorSecondary} mt="8px">곧 서비스가 제공될 예정입니다</Text>
      </Box>

      <Box opacity="0.3" filter="grayscale(100%)">
        <Box p="20px">
          <Text color={textColor} fontWeight="700" fontSize="lg" mb="5px">API 연동 상태</Text>
          <Text color={textColorSecondary} fontSize="sm" mb="20px">광고 플랫폼별 데이터 수집 상태를 확인합니다</Text>
        </Box>
        <Box flex="1" overflowY="auto" px="20px" pb="20px">
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th borderColor={borderColor} color="gray.400" fontSize="xs">광고주</Th>
                <Th borderColor={borderColor} color="gray.400" fontSize="xs">플랫폼</Th>
                <Th borderColor={borderColor} color="gray.400" fontSize="xs">수정 상태</Th>
                <Th borderColor={borderColor} color="gray.400" fontSize="xs">수집 상태</Th>
              </Tr>
            </Thead>
            <Tbody>
              {demoTokens.map((token) => {
                const statusDisplay = getStatusDisplay(token.dataCollectionStatus);
                return (
                  <Tr key={token.id}>
                    <Td borderColor={borderColor} fontSize="sm" color={textColor} fontWeight="600">{token.advertiser}</Td>
                    <Td borderColor={borderColor} fontSize="sm">
                      <Badge colorScheme={token.platform === 'Google Ads' ? 'red' : token.platform === 'Meta Ads' ? 'purple' : 'green'} fontSize="xs" px="8px" py="2px" borderRadius="5px">
                        {token.platform}
                      </Badge>
                    </Td>
                    <Td borderColor={borderColor} fontSize="xs" color={textColorSecondary}>{token.lastUpdated}</Td>
                    <Td borderColor={borderColor}>
                      <Flex align="center">
                        <Icon as={statusDisplay.icon} w="18px" h="18px" color={statusDisplay.color} mr="6px" />
                        <Text color={textColor} fontSize="sm" fontWeight="600">{statusDisplay.label}</Text>
                      </Flex>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </Box>
      </Box>
    </Card>
  );
}
