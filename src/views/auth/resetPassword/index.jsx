import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Alert,
  AlertIcon,
  AlertDescription,
  Spinner,
} from "@chakra-ui/react";
import illustration from "assets/img/auth/lemon.jpg";
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { RiEyeCloseLine } from "react-icons/ri";
import { supabase } from "config/supabase";

function ResetPassword() {
  const navigate = useNavigate();

  const textColor = useColorModeValue("navy.700", "white");
  const textColorSecondary = "gray.400";
  const textColorBrand = useColorModeValue("brand.500", "white");
  const bgColor = useColorModeValue("white", "navy.900");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [loading, setLoading] = useState(true);

  // 토큰 검증 및 세션 확인 (재시도 로직 포함)
  useEffect(() => {
    let retryCount = 0;
    const MAX_RETRIES = 15;
    const RETRY_DELAY = 2000;

    const checkToken = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Session error:', error);

          if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`토큰 검증 재시도 중... (${retryCount}/${MAX_RETRIES})`);
            setTimeout(checkToken, RETRY_DELAY);
            return;
          }

          setError("유효하지 않거나 만료된 링크입니다. 비밀번호 찾기를 다시 시도해주세요.");
          setIsValidToken(false);
          setLoading(false);
          return;
        }

        if (!session) {
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`세션 확인 재시도 중... (${retryCount}/${MAX_RETRIES})`);
            setTimeout(checkToken, RETRY_DELAY);
            return;
          }

          setError("유효하지 않거나 만료된 링크입니다. 비밀번호 찾기를 다시 시도해주세요.");
          setIsValidToken(false);
          setLoading(false);
          return;
        }

        setIsValidToken(true);
        setLoading(false);
      } catch (err) {
        console.error('Unexpected error:', err);

        if (retryCount < MAX_RETRIES) {
          retryCount++;
          setTimeout(checkToken, RETRY_DELAY);
          return;
        }

        setError("링크 검증 중 오류가 발생했습니다. 다시 시도해주세요.");
        setIsValidToken(false);
        setLoading(false);
      }
    };

    checkToken();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!password || !confirmPassword) {
      setError("모든 필드를 입력해주세요.");
      return;
    }

    if (password.length < 8) {
      setError("비밀번호는 최소 8자 이상이어야 합니다.");
      return;
    }

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        const errorMessages = {
          'New password should be different from the old password': '이전 비밀번호와 다른 비밀번호를 사용해주세요.',
          'Password should be at least 6 characters': '비밀번호는 최소 8자 이상이어야 합니다.',
          'Invalid token': '유효하지 않은 링크입니다.',
          'Token expired': '만료된 링크입니다. 비밀번호 찾기를 다시 시도해주세요.',
        };
        setError(errorMessages[error.message] || error.message);
        return;
      }

      setIsSuccess(true);

      setTimeout(() => {
        navigate("/auth/sign-in");
      }, 3000);
    } catch (err) {
      setError("비밀번호 재설정 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
  };

  // 로딩 중
  if (loading) {
    return (
      <Flex w="100vw" h="100vh" bg={bgColor} justify="center" align="center">
        <Flex direction="column" align="center" gap="20px">
          <Spinner size="xl" color="brand.500" thickness="4px" />
          <Text color={textColor} fontSize="lg" fontWeight="500">
            링크 검증 중...
          </Text>
        </Flex>
      </Flex>
    );
  }

  // 유효하지 않은 토큰
  if (!isValidToken) {
    return (
      <Flex w="100vw" h="100vh" bg={bgColor} justify="center" align="center" px="20px">
        <Box textAlign="center" maxW="440px">
          <Heading color={textColor} fontSize="28px" mb="20px" fontWeight="700">
            유효하지 않거나 만료된 링크
          </Heading>
          <Alert status="error" mb="20px" borderRadius="10px">
            <AlertIcon />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button
            variant="brand"
            fontSize="sm"
            fontWeight="500"
            w="100%"
            h="50px"
            borderRadius="10px"
            onClick={() => navigate("/auth/forgot-password")}
          >
            새 링크 요청
          </Button>
        </Box>
      </Flex>
    );
  }

  return (
    <Flex w="100vw" h="100vh" bg={bgColor} overflow="hidden">
      {/* 왼쪽: 비밀번호 재설정 폼 */}
      <Flex
        w={{ base: "100%", lg: "50%" }}
        direction="column"
        justify="center"
        align="center"
        px={{ base: "20px", md: "50px", lg: "80px" }}
        py={{ base: "40px", md: "60px" }}
      >
        <Box w="100%" maxW="440px">
          {!isSuccess ? (
            <>
              <Heading
                color={textColor}
                fontSize={{ base: "28px", md: "36px" }}
                mb="10px"
                fontWeight="700"
              >
                비밀번호 재설정
              </Heading>
              <Text
                mb="36px"
                color={textColorSecondary}
                fontWeight="400"
                fontSize={{ base: "sm", md: "md" }}
              >
                새 비밀번호를 입력해주세요.
              </Text>

              {error && (
                <Alert status="error" mb="20px" borderRadius="10px">
                  <AlertIcon />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit}>
                {/* 새 비밀번호 입력 */}
                <FormControl mb="20px">
                  <FormLabel fontSize="sm" fontWeight="500" color={textColor} mb="8px">
                    새 비밀번호
                  </FormLabel>
                  <InputGroup size="md">
                    <Input
                      isRequired={true}
                      fontSize="sm"
                      placeholder="최소 8자 이상"
                      size="lg"
                      type={showPassword ? "text" : "password"}
                      variant="auth"
                      borderRadius="10px"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <InputRightElement display="flex" alignItems="center" mt="4px">
                      <Icon
                        color={textColorSecondary}
                        _hover={{ cursor: "pointer" }}
                        as={showPassword ? RiEyeCloseLine : MdOutlineRemoveRedEye}
                        onClick={() => setShowPassword(!showPassword)}
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>

                {/* 비밀번호 확인 입력 */}
                <FormControl mb="24px">
                  <FormLabel fontSize="sm" fontWeight="500" color={textColor} mb="8px">
                    비밀번호 확인
                  </FormLabel>
                  <InputGroup size="md">
                    <Input
                      isRequired={true}
                      fontSize="sm"
                      placeholder="비밀번호를 다시 입력해주세요"
                      size="lg"
                      type={showConfirmPassword ? "text" : "password"}
                      variant="auth"
                      borderRadius="10px"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <InputRightElement display="flex" alignItems="center" mt="4px">
                      <Icon
                        color={textColorSecondary}
                        _hover={{ cursor: "pointer" }}
                        as={showConfirmPassword ? RiEyeCloseLine : MdOutlineRemoveRedEye}
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      />
                    </InputRightElement>
                  </InputGroup>
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
                  비밀번호 재설정
                </Button>
              </form>

              <Text
                color={textColorSecondary}
                fontWeight="400"
                fontSize="14px"
                textAlign="center"
              >
                비밀번호가 기억나시나요?{" "}
                <Text
                  color={textColorBrand}
                  as="span"
                  fontWeight="600"
                  cursor="pointer"
                  _hover={{ textDecoration: "underline" }}
                  onClick={() => navigate("/auth/sign-in")}
                >
                  로그인
                </Text>
              </Text>
            </>
          ) : (
            <>
              <Heading
                color={textColor}
                fontSize={{ base: "28px", md: "36px" }}
                mb="10px"
                fontWeight="700"
              >
                비밀번호 재설정 완료!
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
                  비밀번호가 성공적으로 재설정되었습니다. 곧 로그인 페이지로 이동합니다.
                </AlertDescription>
              </Alert>

              <Button
                fontSize="sm"
                variant="brand"
                fontWeight="500"
                w="100%"
                h="50px"
                borderRadius="10px"
                onClick={() => navigate("/auth/sign-in")}
              >
                지금 로그인
              </Button>
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
  );
}

export default ResetPassword;
