import { Box, Flex, Icon, Text, useColorModeValue } from "@chakra-ui/react";
import Card from "components/card/Card.js";
import React from "react";
import { MdUpload, MdConstruction } from "react-icons/md";

export default function Upload(props) {
  const { ...rest } = props;
  const textColorSecondary = useColorModeValue("gray.400", "gray.500");
  const grayColor = useColorModeValue("gray.300", "gray.600");

  return (
    <Card {...rest} mb='20px' align='center' p='20px' position="relative">
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

      <Flex h='100%' direction={{ base: "column", "2xl": "row" }} opacity="0.3" filter="grayscale(100%)">
        <Box
          w={{ base: "100%", "2xl": "268px" }} me='36px'
          maxH={{ base: "60%", lg: "50%", "2xl": "100%" }}
          minH={{ base: "60%", lg: "50%", "2xl": "100%" }}
          border="2px dashed" borderColor={grayColor} borderRadius="16px"
          display="flex" alignItems="center" justifyContent="center" p="20px"
        >
          <Box textAlign="center">
            <Icon as={MdUpload} w='80px' h='80px' color={grayColor} />
            <Flex justify='center' mx='auto' mb='12px'>
              <Text fontSize='xl' fontWeight='700' color={grayColor}>Upload Files</Text>
            </Flex>
            <Text fontSize='sm' fontWeight='500' color={textColorSecondary}>PNG, JPG and GIF files are allowed</Text>
          </Box>
        </Box>
        <Flex direction='column' pe='44px'>
          <Text color={grayColor} fontWeight='bold' textAlign='start' fontSize='2xl' mt={{ base: "20px", "2xl": "50px" }}>
            Complete your profile
          </Text>
          <Text color={textColorSecondary} fontSize='md' my={{ base: "auto", "2xl": "10px" }} mx='auto' textAlign='start'>
            Stay on the pulse of distributed projects with an online whiteboard to plan, coordinate and discuss
          </Text>
        </Flex>
      </Flex>
    </Card>
  );
}
