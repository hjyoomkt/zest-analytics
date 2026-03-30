import React, { useState } from "react";
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
  useColorModeValue,
  useToast,
  IconButton,
  Flex,
} from "@chakra-ui/react";
import { useAuth } from "contexts/AuthContext";
import { MdContentCopy } from "react-icons/md";
import { createInviteCode } from "services/supabaseService";

export default function InviteAgencyModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const toast = useToast();

  const [formData, setFormData] = useState({
    email: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState(null);

  const textColor = useColorModeValue("secondaryGray.900", "white");
  const inputBg = useColorModeValue("white", "navy.700");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");
  const brandColor = useColorModeValue("brand.500", "brand.400");
  const codeBgHover = useColorModeValue("gray.100", "whiteAlpha.200");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      const inviteData = {
        email: formData.email,
        role: "agency_admin",
        organizationId: null,
        advertiserId: null,
        createdBy: user.id,
        inviteType: "new_agency",
      };

      const result = await createInviteCode(inviteData);
      setInviteCode(result.code);

      toast({
        title: "초대 코드 생성 완료",
        description: `${formData.email}님에게 대행사 관리자 초대 코드가 생성되었습니다.`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      console.error("초대 실패:", err);
      toast({
        title: "초대 코드 생성 실패",
        description: err.message,
        status: "error",
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
    setFormData({ email: "" });
    setInviteCode(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>광고대행사 초대</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {!inviteCode ? (
            <VStack spacing="24px">
              <Alert status="info" borderRadius="8px">
                <AlertIcon />
                <Text fontSize="sm">
                  새로운 광고대행사 조직을 생성하고 최고관리자(agency_admin)를
                  초대합니다.
                </Text>
              </Alert>

              <FormControl isRequired>
                <FormLabel fontSize="sm" color={textColor}>
                  이메일 주소
                </FormLabel>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="admin@agency.com"
                  bg={inputBg}
                  border="1px solid"
                  borderColor={borderColor}
                  color={textColor}
                  h="44px"
                  borderRadius="12px"
                  _hover={{ borderColor: brandColor }}
                  _focus={{
                    borderColor: brandColor,
                    boxShadow: `0 0 0 1px ${brandColor}`,
                  }}
                />
              </FormControl>

              <Alert status="warning" borderRadius="8px">
                <AlertIcon />
                <VStack align="flex-start" spacing="4px" fontSize="sm">
                  <Text fontWeight="600">
                    부여되는 권한: 대행사 최고관리자 (agency_admin)
                  </Text>
                  <Text fontSize="xs" color="gray.600">
                    • 클라이언트(광고주) 추가 및 관리
                    <br />
                    • 대행사 직원 초대 및 권한 관리
                    <br />• 전체 데이터 접근 권한
                  </Text>
                </VStack>
              </Alert>

              <Alert status="info" borderRadius="8px">
                <AlertIcon />
                <Text fontSize="sm">
                  초대 이메일이 발송되며, 7일 이내에 가입해야 합니다.
                </Text>
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
                    flex="1"
                    p="12px"
                    fontSize="lg"
                    fontWeight="bold"
                    borderRadius="8px"
                    cursor="pointer"
                    onClick={() => copyToClipboard(inviteCode, "초대 코드")}
                    _hover={{ bg: codeBgHover }}
                    transition="all 0.2s"
                  >
                    {inviteCode}
                  </Code>
                  <IconButton
                    icon={<MdContentCopy />}
                    onClick={() => copyToClipboard(inviteCode, "초대 코드")}
                    aria-label="초대 코드 복사"
                    colorScheme="brand"
                    variant="outline"
                    size="md"
                  />
                </Flex>
              </FormControl>

              <FormControl>
                <FormLabel>초대 링크</FormLabel>
                <Flex gap="8px">
                  <Code
                    flex="1"
                    p="12px"
                    fontSize="sm"
                    borderRadius="8px"
                    wordBreak="break-all"
                    cursor="pointer"
                    onClick={() =>
                      copyToClipboard(
                        `${window.location.origin}/auth/sign-up?code=${inviteCode}`,
                        "초대 링크"
                      )
                    }
                    _hover={{ bg: codeBgHover }}
                    transition="all 0.2s"
                  >
                    {`${window.location.origin}/auth/sign-up?code=${inviteCode}`}
                  </Code>
                  <IconButton
                    icon={<MdContentCopy />}
                    onClick={() =>
                      copyToClipboard(
                        `${window.location.origin}/auth/sign-up?code=${inviteCode}`,
                        "초대 링크"
                      )
                    }
                    aria-label="초대 링크 복사"
                    colorScheme="brand"
                    variant="outline"
                    size="md"
                  />
                </Flex>
              </FormControl>

              <Alert status="warning" borderRadius="8px">
                <AlertIcon />
                <Text fontSize="sm">
                  이 코드를 {formData.email}에게 전달하거나, 초대 이메일을
                  확인하도록 안내하세요.
                </Text>
              </Alert>
            </VStack>
          )}
        </ModalBody>

        <ModalFooter>
          {!inviteCode ? (
            <>
              <Button variant="ghost" mr={3} onClick={handleClose}>
                취소
              </Button>
              <Button
                colorScheme="brand"
                onClick={handleSubmit}
                isLoading={isLoading}
                isDisabled={!formData.email}
              >
                초대 코드 생성
              </Button>
            </>
          ) : (
            <Button colorScheme="brand" onClick={handleClose}>
              완료
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
