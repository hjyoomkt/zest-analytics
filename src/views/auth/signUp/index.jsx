import React, { useState, useEffect } from "react";
import { useSearchParams, NavLink, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  Image,
  useColorModeValue,
  Icon,
} from "@chakra-ui/react";
import { MdLock } from "react-icons/md";
import illustration from "assets/img/auth/lemon.jpg";
import InviteSignUpForm from "./components/InviteSignUpForm";
import SelfSignUpForm from "./components/SelfSignUpForm";
import { PageHelmet } from "components/HelmetProvider";

function SignUp() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlInviteCode = searchParams.get('code');
  const [mode, setMode] = useState(urlInviteCode ? 'invite' : 'self');
  // 'invite': 초대 코드로 가입
  // 'self': 셀프 회원가입 (새 조직 생성)

  const textColor = useColorModeValue("navy.700", "white");
  const textColorSecondary = "gray.400";
  const textColorBrand = useColorModeValue("brand.500", "white");
  const boxBg = useColorModeValue("gray.50", "navy.800");

  // Phase 1 설정: 셀프 회원가입 차단 여부
  const PHASE_1_INVITE_ONLY = true; // true: 초대 전용, false: 셀프 회원가입 허용

  return (
    <>
      <PageHelmet
        title="회원가입 | Growth Analytics"
        description="Growth Analytics 대시보드에 가입하세요"
        keywords="회원가입, 그로스 애널리틱스, 대시보드"
      />
      <Flex
        w="100vw"
        minH="100vh"
        bg={useColorModeValue("white", "navy.900")}
      >
        {/* 왼쪽: 회원가입 폼 */}
        <Flex
          w={{ base: "100%", lg: "50%" }}
          direction="column"
          justify="center"
          align="center"
          px={{ base: "20px", md: "50px", lg: "80px" }}
          py={{ base: "40px", md: "60px" }}
        >
          <Box w="100%" maxW="480px">
            {/* Welcome Header */}
            <Heading
              color={textColor}
              fontSize={{ base: "28px", md: "36px" }}
              mb="10px"
              fontWeight="700"
            >
              {mode === 'invite'
                ? 'Welcome to Growth Analytics'
                : 'Start Your Growth Journey'}
            </Heading>
            <Text
              mb="24px"
              color={textColorSecondary}
              fontWeight="400"
              fontSize={{ base: "sm", md: "md" }}
            >
              {mode === 'invite'
                ? '초대받으신 것을 환영합니다!'
                : '새로운 조직으로 시작하세요'}
            </Text>

            {/* Phase 1: 셀프 회원가입 차단 화면 */}
            {PHASE_1_INVITE_ONLY && mode === 'self' ? (
              <Box textAlign="center" py="40px">
                <Icon
                  as={MdLock}
                  boxSize="60px"
                  color="brand.500"
                  mb="24px"
                />
                <Heading size="md" mb="16px" color={textColor}>
                  초대 전용 서비스
                </Heading>
                <Text color={textColorSecondary} mb="24px" fontSize="sm">
                  현재 초대받은 분만 가입할 수 있습니다.
                </Text>

                <Box
                  bg={boxBg}
                  p="24px"
                  borderRadius="12px"
                  mb="24px"
                >
                  <Heading size="sm" mb="12px" color={textColor}>
                    서비스 도입을 원하시나요?
                  </Heading>
                  <Text color={textColorSecondary} fontSize="sm" mb="16px">
                    영업팀에 문의하시면 데모와 함께 자세한 안내를 드립니다.
                  </Text>
                  <Button
                    as="a"
                    href="mailto:sales@yourdomain.com"
                    colorScheme="brand"
                    size="lg"
                    w="100%"
                  >
                    영업팀 문의하기
                  </Button>
                </Box>

                <Button
                  variant="link"
                  colorScheme="brand"
                  onClick={() => setMode('invite')}
                >
                  초대 코드로 가입하기 →
                </Button>

                <Text
                  mt="32px"
                  color={textColorSecondary}
                  fontWeight="400"
                  fontSize="14px"
                >
                  이미 계정이 있으신가요?{" "}
                  <NavLink to="/auth/sign-in">
                    <Text
                      color={textColorBrand}
                      as="span"
                      fontWeight="600"
                      _hover={{ textDecoration: "underline" }}
                    >
                      로그인
                    </Text>
                  </NavLink>
                </Text>
              </Box>
            ) : (
              <>
                {/* 토글 버튼 (URL에 code 없을 때만 표시) */}
                {!urlInviteCode && (
                  <Button
                    variant="link"
                    colorScheme="brand"
                    onClick={() => setMode(mode === 'invite' ? 'self' : 'invite')}
                    mb="20px"
                    fontSize="sm"
                  >
                    {mode === 'invite'
                      ? '→ 새 조직으로 등록하기'
                      : '→ 초대 코드로 가입하기'}
                  </Button>
                )}

                {/* 회원가입 폼 */}
                {mode === 'invite' ? (
                  <InviteSignUpForm
                    initialCode={urlInviteCode}
                    onSuccess={() => {
                      window.location.href = '/admin/default';
                    }}
                  />
                ) : (
                  <SelfSignUpForm
                    onSuccess={() => {
                      window.location.href = '/admin/default';
                    }}
                  />
                )}

                {/* Already have account */}
                <Text
                  mt="32px"
                  color={textColorSecondary}
                  fontWeight="400"
                  fontSize="14px"
                  textAlign="center"
                >
                  이미 계정이 있으신가요?{" "}
                  <NavLink to="/auth/sign-in">
                    <Text
                      color={textColorBrand}
                      as="span"
                      fontWeight="600"
                      _hover={{ textDecoration: "underline" }}
                    >
                      로그인
                    </Text>
                  </NavLink>
                </Text>
              </>
            )}
          </Box>
        </Flex>

        {/* 우측: 이미지 영역 (데스크탑만) */}
        <Box
          w="50%"
          h="100vh"
          position="sticky"
          top="0"
          display={{ base: "none", lg: "flex" }}
          alignItems="center"
          justifyContent="center"
          p="40px"
        >
          <Image
            src={illustration}
            alt="Growth Analytics Illustration"
            w="100%"
            h="100%"
            objectFit="cover"
            borderRadius="20px"
          />
        </Box>
      </Flex>
    </>
  );
}

export default SignUp;
