import React from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  Text,
  useColorModeValue,
  Box,
} from "@chakra-ui/react";

export default function BrandListModal({ isOpen, onClose, userName, brands }) {
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const bgColor = useColorModeValue('white', 'navy.700');

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>담당 브랜드 목록</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing="16px" align="stretch">
            <Box>
              <Text fontSize="sm" color="gray.500" mb="4px">사용자</Text>
              <Text fontWeight="600" fontSize="md" color={textColor}>
                {userName}
              </Text>
            </Box>

            <Box>
              <Text fontSize="sm" color="gray.500" mb="8px">브랜드 목록</Text>
              {brands && brands.length > 0 ? (
                <VStack align="stretch" spacing="8px">
                  {brands.map((brand, index) => (
                    <Box
                      key={index}
                      p="12px"
                      borderRadius="8px"
                      border="1px solid"
                      borderColor={borderColor}
                      bg={bgColor}
                    >
                      <Text fontSize="sm" color={textColor} fontWeight="500">
                        {index + 1}. {brand}
                      </Text>
                    </Box>
                  ))}
                </VStack>
              ) : (
                <Box p="12px" borderRadius="8px" border="1px solid" borderColor={borderColor} bg={bgColor}>
                  <Text fontSize="sm" color="gray.400" textAlign="center">전체 브랜드</Text>
                </Box>
              )}
            </Box>

            {brands && brands.length > 0 && (
              <Text fontSize="xs" color="gray.500">총 {brands.length}개 브랜드</Text>
            )}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
