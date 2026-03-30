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
  FormControl,
  FormLabel,
  Input,
  Select,
  VStack,
  Text,
  Alert,
  AlertIcon,
  useColorModeValue,
} from "@chakra-ui/react";

export default function AddBrandModal({ isOpen, onClose, organizationId }) {
  const [formData, setFormData] = useState({
    organizationId: organizationId || "",
    brandName: "",
    businessNumber: "",
    contactEmail: "",
    contactPhone: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const textColor = useColorModeValue("navy.700", "white");
  const inputBg = useColorModeValue("white", "navy.900");

  // Mock 조직 데이터
  const mockOrganizations = [
    { id: "org-booming", name: "부밍 대행사", type: "agency" },
    { id: "org-pepper", name: "페퍼스 주식회사", type: "advertiser" },
    { id: "org-nike", name: "나이키 코리아", type: "advertiser" },
    { id: "org-adidas", name: "아디다스 코리아", type: "advertiser" },
  ];

  React.useEffect(() => {
    if (organizationId) {
      setFormData(prev => ({ ...prev, organizationId }));
    }
  }, [organizationId]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.organizationId) {
      setError("조직을 선택해주세요.");
      return;
    }

    if (!formData.brandName) {
      setError("브랜드명을 입력해주세요.");
      return;
    }

    setIsLoading(true);

    // TODO: Supabase 연동
    setTimeout(() => {
      console.log("브랜드 추가:", formData);
      setIsLoading(false);
      handleClose();
    }, 1000);
  };

  const handleClose = () => {
    setFormData({
      organizationId: "",
      brandName: "",
      businessNumber: "",
      contactEmail: "",
      contactPhone: "",
    });
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>브랜드 추가</ModalHeader>
        <ModalCloseButton />

        <form onSubmit={handleSubmit}>
          <ModalBody>
            <VStack spacing="20px">
              {/* 조직 선택 */}
              <FormControl isRequired>
                <FormLabel fontSize="sm" fontWeight="500" color={textColor}>
                  조직 선택
                </FormLabel>
                <Select
                  name="organizationId"
                  value={formData.organizationId}
                  onChange={handleChange}
                  placeholder="조직을 선택하세요"
                  variant="auth"
                  fontSize="sm"
                  size="lg"
                  borderRadius="10px"
                  bg={inputBg}
                  isDisabled={!!organizationId}
                >
                  {mockOrganizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.type === 'agency' ? '대행사' : '광고주'})
                    </option>
                  ))}
                </Select>
                {organizationId && (
                  <Text fontSize="xs" color="gray.500" mt="8px">
                    선택된 조직에 브랜드가 추가됩니다.
                  </Text>
                )}
              </FormControl>

              {/* 브랜드명 */}
              <FormControl isRequired>
                <FormLabel fontSize="sm" fontWeight="500" color={textColor}>
                  브랜드명
                </FormLabel>
                <Input
                  name="brandName"
                  value={formData.brandName}
                  onChange={handleChange}
                  variant="auth"
                  fontSize="sm"
                  placeholder="예: 나이키 코리아"
                  size="lg"
                  borderRadius="10px"
                  bg={inputBg}
                />
              </FormControl>

              {/* 사업자등록번호 */}
              <FormControl>
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
                  bg={inputBg}
                />
              </FormControl>

              {/* 담당자 이메일 */}
              <FormControl>
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
                  placeholder="예: contact@example.com"
                  size="lg"
                  borderRadius="10px"
                  bg={inputBg}
                />
              </FormControl>

              {/* 담당자 연락처 */}
              <FormControl>
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
                  bg={inputBg}
                />
              </FormControl>

              {/* 에러 메시지 */}
              {error && (
                <Alert status="error" borderRadius="10px">
                  <AlertIcon />
                  <Text fontSize="sm">{error}</Text>
                </Alert>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleClose}>
              취소
            </Button>
            <Button
              colorScheme="brand"
              type="submit"
              isLoading={isLoading}
            >
              추가
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
