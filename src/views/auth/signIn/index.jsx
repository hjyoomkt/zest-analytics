/* eslint-disable */
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
// Chakra imports
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Icon,
  Input,
  InputGroup,
  InputRightElement,
  Text,
  useColorModeValue,
  Image,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@chakra-ui/react";
// Assets
import illustration from "assets/img/auth/lemon.jpg";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { RiEyeCloseLine } from "react-icons/ri";
import { useAuth } from "contexts/AuthContext";
import { PageHelmet } from "components/HelmetProvider";

function SignIn() {
  // Chakra color mode
  const textColor = useColorModeValue("navy.700", "white");
  const textColorSecondary = "gray.400";
  const textColorBrand = useColorModeValue("brand.500", "white");
  const socialBtnBg = useColorModeValue("white", "navy.800");
  const socialBtnBorder = useColorModeValue("gray.200", "whiteAlpha.200");
  const socialBtnHover = useColorModeValue(
    { bg: "gray.50" },
    { bg: "whiteAlpha.100" }
  );
  const [show, setShow] = React.useState(false);
  const handleClick = () => setShow(!show);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const { signIn, accountError, clearAccountError } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  // accountError 감지하여 모달 표시
  React.useEffect(() => {
    if (accountError) {
      onOpen();
    }
  }, [accountError, onOpen]);

  const handleSignIn = async () => {
    if (!email || !password) {
      toast({
        title: "입력 오류",
        description: "이메일과 비밀번호를 입력하세요.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    const { data, error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      const errorMessages = {
        'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
        'Email not confirmed': '이메일 인증이 완료되지 않았습니다.',
        'User not found': '등록되지 않은 이메일입니다.',
        'Too many requests': '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.',
      };
      toast({
        title: "로그인 실패",
        description: errorMessages[error.message] || "이메일 또는 비밀번호를 확인하세요.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } else {
      toast({
        title: "로그인 성공",
        description: "환영합니다!",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
      navigate("/admin/default");
    }
  };

  return (
    <>
      <PageHelmet
        title="로그인 | 제스트 애널리틱스"
        description="제스트 애널리틱스 대시보드에 로그인하세요"
        keywords="로그인, 제스트 애널리틱스, 대시보드"
      />
      <Flex
        w="100vw"
        h="100vh"
        bg={useColorModeValue("white", "navy.900")}
        overflow="hidden"
      >
        {/* 왼쪽: 로그인 폼 */}
        <Flex
          w={{ base: "100%", lg: "50%" }}
          direction="column"
          justify="center"
          align="center"
          px={{ base: "20px", md: "50px", lg: "80px" }}
          py={{ base: "40px", md: "60px" }}
        >
          <Box w="100%" maxW="440px">
            <Heading
              color={textColor}
              fontSize={{ base: "28px", md: "36px" }}
              mb="10px"
              fontWeight="700"
            >
              안녕하세요👋
            </Heading>
            <Text
              mb="36px"
              color={textColorSecondary}
              fontWeight="400"
              fontSize={{ base: "sm", md: "md" }}
            >
              오늘은 새로운 날입니다. 당신의 하루를 시작하세요.
              <br />
              로그인하여 프로젝트 관리를 시작하세요.
            </Text>

            {/* 이메일 입력 */}
            <FormControl mb="20px">
              <FormLabel fontSize="sm" fontWeight="500" color={textColor} mb="8px">
                이메일
              </FormLabel>
              <Input
                isRequired={true}
                variant="auth"
                fontSize="sm"
                type="email"
                placeholder="example@email.com"
                fontWeight="500"
                size="lg"
                borderRadius="10px"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSignIn()}
              />
            </FormControl>

            {/* 비밀번호 입력 */}
            <FormControl mb="16px">
              <FormLabel fontSize="sm" fontWeight="500" color={textColor} mb="8px">
                비밀번호
              </FormLabel>
              <InputGroup size="md">
                <Input
                  isRequired={true}
                  fontSize="sm"
                  placeholder="최소 8자 이상"
                  size="lg"
                  type={show ? "text" : "password"}
                  variant="auth"
                  borderRadius="10px"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSignIn()}
                />
                <InputRightElement display="flex" alignItems="center" mt="4px">
                  <Icon
                    color={textColorSecondary}
                    _hover={{ cursor: "pointer" }}
                    as={show ? RiEyeCloseLine : MdOutlineRemoveRedEye}
                    onClick={handleClick}
                  />
                </InputRightElement>
              </InputGroup>
            </FormControl>

            {/* Forgot Password */}
            <Flex justify="flex-end" mb="24px">
              <NavLink to="/auth/forgot-password">
                <Text
                  color={textColorBrand}
                  fontSize="sm"
                  fontWeight="500"
                  _hover={{ textDecoration: "underline" }}
                >
                  비밀번호를 잊으셨나요?
                </Text>
              </NavLink>
            </Flex>

            {/* Sign in 버튼 */}
            <Button
              fontSize="sm"
              variant="brand"
              fontWeight="500"
              w="100%"
              h="50px"
              mb="20px"
              borderRadius="10px"
              onClick={handleSignIn}
              isLoading={loading}
            >
              로그인
            </Button>

            {/* Or sign in with */}
            <Flex align="center" mb="20px">
              <Box flex="1" h="1px" bg="gray.200" />
              <Text color="gray.400" mx="14px" fontSize="sm">
                또는 소셜 로그인
              </Text>
              <Box flex="1" h="1px" bg="gray.200" />
            </Flex>

            {/* Social 로그인 버튼 */}
            <Flex gap="12px" mb="24px">
              <Button
                flex="1"
                fontSize="sm"
                fontWeight="500"
                h="50px"
                borderRadius="10px"
                bg={socialBtnBg}
                border="1px solid"
                borderColor={socialBtnBorder}
                _hover={socialBtnHover}
                leftIcon={<Icon as={FcGoogle} w="20px" h="20px" />}
              >
                Google
              </Button>
              <Button
                flex="1"
                fontSize="sm"
                fontWeight="500"
                h="50px"
                borderRadius="10px"
                bg={socialBtnBg}
                border="1px solid"
                borderColor={socialBtnBorder}
                _hover={socialBtnHover}
                leftIcon={<Icon as={FaFacebook} w="20px" h="20px" color="#1877F2" />}
              >
                Facebook
              </Button>
            </Flex>

            {/* Sign up 링크 */}
            <Text
              color={textColorSecondary}
              fontWeight="400"
              fontSize="14px"
              textAlign="center"
            >
              아직 계정이 없으신가요?{" "}
              <NavLink to="/auth/sign-up">
                <Text
                  color={textColorBrand}
                  as="span"
                  fontWeight="600"
                  _hover={{ textDecoration: "underline" }}
                >
                  회원가입
                </Text>
              </NavLink>
            </Text>

            {/* Copyright */}
            <Text color="gray.400" fontSize="xs" textAlign="center" mt="40px">
              © 2026 Growth Analytics. All rights reserved.
            </Text>
          </Box>
        </Flex>

        {/* 우측: 이미지 영역 (데스크탑만) */}
        <Box
          w="50%"
          h="100%"
          display={{ base: "none", lg: "flex" }}
          alignItems="center"
          justifyContent="center"
          p="40px"
        >
          <Image
            src={illustration}
            alt="Auth Background"
            w="100%"
            h="100%"
            objectFit="cover"
            borderRadius="20px"
          />
        </Box>
      </Flex>

      {/* 계정 상태 에러 모달 */}
      <Modal
        isOpen={isOpen}
        onClose={() => {
          clearAccountError();
          onClose();
        }}
        isCentered
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>로그인 불가</ModalHeader>
          <ModalBody>{accountError}</ModalBody>
          <ModalFooter>
            <Button
              colorScheme="brand"
              onClick={() => {
                clearAccountError();
                onClose();
              }}
            >
              확인
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

export default SignIn;
