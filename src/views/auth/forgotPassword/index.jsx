import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Text,
  useColorModeValue,
  Image,
  Alert,
  AlertIcon,
  AlertDescription,
} from "@chakra-ui/react";
import illustration from "assets/img/auth/lemon.jpg";
import { supabase } from "config/supabase";
import { PageHelmet } from "components/HelmetProvider";

function ForgotPassword() {
  const textColor = useColorModeValue("navy.700", "white");
  const textColorSecondary = "gray.400";
  const textColorBrand = useColorModeValue("brand.500", "white");
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // 이메일 유효성 검사
    if (!email) {
      setError("이메일을 입력해주세요.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("올바른 이메일 형식이 아닙니다.");
      return;
    }

    try {
      // Supabase Edge Function을 통해 비밀번호 재설정 이메일 발송
      const { error } = await supabase.functions.invoke('send-password-reset-email', {
        body: {
          email: email,
          redirectTo: `${window.location.origin}/auth/reset-password`,
        },
      });

      if (error) {
        console.error('Password reset email error:', error);
        const errorMessages = {
          'User not found': '등록되지 않은 이메일입니다.',
          'Email not confirmed': '이메일 인증이 완료되지 않았습니다.',
          'Invalid email': '올바른 이메일 형식이 아닙니다.',
        };
        setError(errorMessages[error.message] || error.message || '이메일 발송에 실패했습니다.');
        return;
      }

      setIsSubmitted(true);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('비밀번호 재설정 요청 중 오류가 발생했습니다.');
    }
  };

  return (
    <>
      <PageHelmet
        title="비밀번호 찾기 | 제스트 애널리틱스"
        description="비밀번호 재설정 이메일을 받으세요"
        keywords="비밀번호 찾기, 계정 복구, 제스트 애널리틱스"
      />
    <Flex
      w="100vw"
      h="100vh"
      bg={useColorModeValue("white", "navy.900")}
      overflow="hidden"
    >
      {/* 왼쪽: 비밀번호 찾기 폼 */}
      <Flex
        w={{ base: "100%", lg: "50%" }}
        direction="column"
        justify="center"
        align="center"
        px={{ base: "20px", md: "50px", lg: "80px" }}
        py={{ base: "40px", md: "60px" }}
      >
        <Box w="100%" maxW="440px">
          {!isSubmitted ? (
            <>
              <Heading
                color={textColor}
                fontSize={{ base: "28px", md: "36px" }}
                mb="10px"
                fontWeight="700"
              >
                비밀번호를 잊으셨나요?
              </Heading>
              <Text
                mb="36px"
                color={textColorSecondary}
                fontWeight="400"
                fontSize={{ base: "sm", md: "md" }}
              >
                이메일 주소를 입력하시면 비밀번호 재설정 안내를 보내드립니다.
              </Text>

              {error && (
                <Alert status="error" mb="20px" borderRadius="10px">
                  <AlertIcon />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* 이메일 입력 */}
              <form onSubmit={handleSubmit}>
                <FormControl mb="24px">
                  <FormLabel
                    fontSize="sm"
                    fontWeight="500"
                    color={textColor}
                    mb="8px"
                  >
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
                  />
                </FormControl>

                <Button
                  fontSize="sm"
                  variant="brand"
                  fontWeight="500"
                  w="100%"
                  h="50px"
                  mb="20px"
                  borderRadius="10px"
                  type="submit"
                >
                  재설정 링크 보내기
                </Button>
              </form>

              <Text
                color={textColorSecondary}
                fontWeight="400"
                fontSize="14px"
                textAlign="center"
              >
                비밀번호가 기억나셨나요?{" "}
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
          ) : (
            <>
              {/* Success Message */}
              <Heading
                color={textColor}
                fontSize={{ base: "28px", md: "36px" }}
                mb="10px"
                fontWeight="700"
              >
                이메일을 확인하세요
              </Heading>
              <Alert
                status="success"
                variant="subtle"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                textAlign="center"
                borderRadius="15px"
                p="40px"
                mb="24px"
              >
                <AlertIcon boxSize="40px" mr={0} mb="16px" />
                <AlertDescription maxW="sm" fontSize="md">
                  비밀번호 재설정 링크를{" "}
                  <Text as="span" fontWeight="600">
                    {email}
                  </Text>
                  (으)로 보냈습니다. 받은 편지함을 확인하고 안내에 따라 진행해주세요.
                </AlertDescription>
              </Alert>

              <Text
                color={textColorSecondary}
                fontWeight="400"
                fontSize="14px"
                textAlign="center"
                mb="20px"
              >
                이메일을 받지 못하셨나요? 스팸 폴더를 확인하거나{" "}
                <Text
                  as="span"
                  color={textColorBrand}
                  fontWeight="600"
                  cursor="pointer"
                  _hover={{ textDecoration: "underline" }}
                  onClick={() => setIsSubmitted(false)}
                >
                  다시 시도
                </Text>
                해주세요
              </Text>

              <NavLink to="/auth/sign-in">
                <Button
                  fontSize="sm"
                  variant="outline"
                  fontWeight="500"
                  w="100%"
                  h="50px"
                  borderRadius="10px"
                >
                  로그인으로 돌아가기
                </Button>
              </NavLink>
            </>
          )}

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
    </>
  );
}

export default ForgotPassword;
