import React, { useState } from "react";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  Icon,
  Text,
  Alert,
  AlertIcon,
  useColorModeValue,
  VStack,
  Divider,
  Select,
  Heading,
} from "@chakra-ui/react";
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { RiEyeCloseLine } from "react-icons/ri";

function SelfSignUpForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    organizationType: "advertiser",
    organizationName: "",
    businessNumber: "",
    contactEmail: "",
    contactPhone: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const textColor = useColorModeValue("navy.700", "white");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (formData.password.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    if (!formData.organizationName) {
      setError("조직명을 입력해주세요.");
      return;
    }

    setIsLoading(true);

    // TODO: Supabase 회원가입 로직
    setTimeout(() => {
      console.log("Self signup:", formData);
      setIsLoading(false);
      if (onSuccess) onSuccess();
    }, 1000);
  };

  return (
    <Box as="form" onSubmit={handleSubmit}>
      {/* 개인 정보 섹션 */}
      <Heading size="sm" color={textColor} mb="16px">
        개인 정보
      </Heading>

      <FormControl mb="20px">
        <FormLabel fontSize="sm" fontWeight="500" color={textColor}>
          이름 *
        </FormLabel>
        <Input
          name="name"
          value={formData.name}
          onChange={handleChange}
          isRequired
          variant="auth"
          fontSize="sm"
          placeholder="홍길동"
          size="lg"
          borderRadius="10px"
        />
      </FormControl>

      <FormControl mb="20px">
        <FormLabel fontSize="sm" fontWeight="500" color={textColor}>
          이메일 주소 *
        </FormLabel>
        <Input
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          isRequired
          variant="auth"
          fontSize="sm"
          placeholder="email@example.com"
          size="lg"
          borderRadius="10px"
        />
      </FormControl>

      <FormControl mb="20px">
        <FormLabel fontSize="sm" fontWeight="500" color={textColor}>
          비밀번호 *
        </FormLabel>
        <InputGroup size="lg">
          <Input
            name="password"
            value={formData.password}
            onChange={handleChange}
            isRequired
            fontSize="sm"
            placeholder="최소 6자 이상"
            size="lg"
            type={showPassword ? "text" : "password"}
            variant="auth"
            borderRadius="10px"
          />
          <InputRightElement display="flex" alignItems="center" mt="4px">
            <Icon
              color="gray.400"
              _hover={{ cursor: "pointer" }}
              as={showPassword ? RiEyeCloseLine : MdOutlineRemoveRedEye}
              onClick={() => setShowPassword(!showPassword)}
            />
          </InputRightElement>
        </InputGroup>
      </FormControl>

      <FormControl mb="24px">
        <FormLabel fontSize="sm" fontWeight="500" color={textColor}>
          비밀번호 확인 *
        </FormLabel>
        <InputGroup size="lg">
          <Input
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            isRequired
            fontSize="sm"
            placeholder="비밀번호를 다시 입력하세요"
            size="lg"
            type={showConfirmPassword ? "text" : "password"}
            variant="auth"
            borderRadius="10px"
          />
          <InputRightElement display="flex" alignItems="center" mt="4px">
            <Icon
              color="gray.400"
              _hover={{ cursor: "pointer" }}
              as={showConfirmPassword ? RiEyeCloseLine : MdOutlineRemoveRedEye}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            />
          </InputRightElement>
        </InputGroup>
      </FormControl>

      <Divider mb="24px" />

      {/* 조직 정보 섹션 */}
      <Heading size="sm" color={textColor} mb="16px">
        조직 정보
      </Heading>

      <FormControl mb="20px">
        <FormLabel fontSize="sm" fontWeight="500" color={textColor}>
          조직 유형 *
        </FormLabel>
        <Select
          name="organizationType"
          value={formData.organizationType}
          onChange={handleChange}
          variant="auth"
          fontSize="sm"
          size="lg"
          borderRadius="10px"
        >
          <option value="advertiser">광고주 (직접 운영)</option>
          <option value="agency">광고대행사 (다수 클라이언트 관리)</option>
        </Select>
        <Text fontSize="xs" color="gray.500" mt="4px">
          {formData.organizationType === 'advertiser'
            ? '자사 광고를 직접 운영하는 경우 선택하세요'
            : '여러 클라이언트의 광고를 대행하는 경우 선택하세요'}
        </Text>
      </FormControl>

      <FormControl mb="20px">
        <FormLabel fontSize="sm" fontWeight="500" color={textColor}>
          {formData.organizationType === 'advertiser' ? '광고주명' : '대행사명'} *
        </FormLabel>
        <Input
          name="organizationName"
          value={formData.organizationName}
          onChange={handleChange}
          isRequired
          variant="auth"
          fontSize="sm"
          placeholder={formData.organizationType === 'advertiser' ? '예: 나이키 코리아' : '예: ABC 광고대행사'}
          size="lg"
          borderRadius="10px"
        />
      </FormControl>

      <FormControl mb="20px">
        <FormLabel fontSize="sm" fontWeight="500" color={textColor}>
          사업자등록번호
        </FormLabel>
        <Input
          name="businessNumber"
          value={formData.businessNumber}
          onChange={handleChange}
          variant="auth"
          fontSize="sm"
          placeholder="예: 123-45-67890"
          size="lg"
          borderRadius="10px"
        />
      </FormControl>

      <FormControl mb="20px">
        <FormLabel fontSize="sm" fontWeight="500" color={textColor}>
          담당자 이메일
        </FormLabel>
        <Input
          name="contactEmail"
          type="email"
          value={formData.contactEmail}
          onChange={handleChange}
          variant="auth"
          fontSize="sm"
          placeholder="미입력 시 로그인 이메일 사용"
          size="lg"
          borderRadius="10px"
        />
      </FormControl>

      <FormControl mb="24px">
        <FormLabel fontSize="sm" fontWeight="500" color={textColor}>
          담당자 연락처
        </FormLabel>
        <Input
          name="contactPhone"
          type="tel"
          value={formData.contactPhone}
          onChange={handleChange}
          variant="auth"
          fontSize="sm"
          placeholder="예: 02-1234-5678"
          size="lg"
          borderRadius="10px"
        />
      </FormControl>

      {/* 에러 메시지 */}
      {error && (
        <Alert status="error" mb="20px" borderRadius="10px">
          <AlertIcon />
          <Text fontSize="sm">{error}</Text>
        </Alert>
      )}

      {/* 회원가입 버튼 */}
      <Button
        type="submit"
        fontSize="sm"
        variant="brand"
        fontWeight="500"
        w="100%"
        h="50px"
        borderRadius="10px"
        isLoading={isLoading}
      >
        조직 생성 및 회원가입
      </Button>
    </Box>
  );
}

export default SelfSignUpForm;
