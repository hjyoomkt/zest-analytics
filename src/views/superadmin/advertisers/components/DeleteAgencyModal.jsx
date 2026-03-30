import React, { useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  Text,
  Input,
  FormControl,
  FormLabel,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  VStack,
  useColorModeValue,
} from "@chakra-ui/react";

export default function DeleteAgencyModal({ isOpen, onClose, organization, onConfirm, isLoading }) {
  const [confirmText, setConfirmText] = useState("");
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const expectedText = `${organization?.name} 에이전시 삭제에 동의합니다`;

  const isConfirmValid = confirmText === expectedText;

  const handleConfirm = () => {
    if (isConfirmValid) {
      onConfirm(organization.id);
    }
  };

  const handleClose = () => {
    setConfirmText("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>에이전시 삭제 확인</ModalHeader>
        <ModalCloseButton isDisabled={isLoading} />
        <ModalBody>
          <VStack spacing="20px" align="stretch">
            <Alert status="error" borderRadius="8px">
              <AlertIcon />
              <VStack align="flex-start" spacing="4px">
                <AlertTitle fontSize="md">⚠️ 경고: 모든 데이터가 영구 삭제됩니다</AlertTitle>
                <AlertDescription fontSize="sm">
                  이 작업은 되돌릴 수 없습니다. 다음 데이터가 모두 삭제됩니다:
                </AlertDescription>
              </VStack>
            </Alert>

            <VStack align="flex-start" pl="20px" spacing="8px">
              <Text fontSize="sm" color={textColor}>
                • 조직 정보: <strong>{organization?.name}</strong>
              </Text>
              <Text fontSize="sm" color={textColor}>
                • 소속된 모든 브랜드 ({organization?.advertisers?.length || 0}개)
              </Text>
              <Text fontSize="sm" color={textColor}>
                • 에이전시 직원 계정
              </Text>
              <Text fontSize="sm" color={textColor}>
                • 모든 브랜드의 광고 데이터
              </Text>
              <Text fontSize="sm" color={textColor}>
                • API 토큰 및 연동 정보
              </Text>
              <Text fontSize="sm" color={textColor}>
                • 크리에이티브 및 게시판 데이터
              </Text>
            </VStack>

            <FormControl>
              <FormLabel fontSize="sm" fontWeight="600" color={textColor}>
                삭제를 진행하려면 다음 문구를 정확히 입력하세요:
              </FormLabel>
              <Text
                fontSize="sm"
                fontWeight="600"
                color="red.500"
                mb="8px"
                p="8px"
                bg={useColorModeValue("red.50", "red.900")}
                borderRadius="6px"
              >
                {expectedText}
              </Text>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="위 문구를 정확히 입력하세요"
                size="md"
                borderRadius="8px"
                autoFocus
                isDisabled={isLoading}
              />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleClose} isDisabled={isLoading}>
            취소
          </Button>
          <Button
            colorScheme="red"
            onClick={handleConfirm}
            isLoading={isLoading}
            isDisabled={!isConfirmValid}
          >
            에이전시 삭제
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
