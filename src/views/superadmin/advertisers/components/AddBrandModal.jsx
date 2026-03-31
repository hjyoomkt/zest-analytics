import React, { useState, useEffect } from "react";
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
  useToast,
} from "@chakra-ui/react";
import { supabase } from "config/supabase";
import { useAuth } from "contexts/AuthContext";

export default function AddBrandModal({ isOpen, onClose, organizationId }) {
  const [formData, setFormData] = useState({
    organizationId: organizationId || "",
    brandName: "",
    businessNumber: "",
    contactEmail: "",
    contactPhone: "",
  });
  const [organizations, setOrganizations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const { role, organizationId: currentUserOrgId } = useAuth();
  const toast = useToast();
  const textColor = useColorModeValue("navy.700", "white");
  const inputBg = useColorModeValue("white", "navy.900");

  // organizationId가 없을 때만 조직 목록 로드
  useEffect(() => {
    if (isOpen && !organizationId) {
      fetchOrganizations();
    }
  }, [isOpen, organizationId]);

  useEffect(() => {
    if (organizationId) {
      setFormData(prev => ({ ...prev, organizationId }));
    }
  }, [organizationId]);

  const fetchOrganizations = async () => {
    try {
      let query = supabase
        .from('organizations')
        .select('id, name, type')
        .is('deleted_at', null)
        .order('name');

      // agency 역할은 자신의 조직만
      if (role === 'agency_admin' || role === 'agency_manager') {
        query = query.eq('id', currentUserOrgId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setOrganizations(data || []);
    } catch (err) {
      console.error('조직 목록 조회 실패:', err);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.organizationId) {
      setError("조직을 선택해주세요.");
      return;
    }
    if (!formData.brandName.trim()) {
      setError("브랜드명을 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const { error: insertError } = await supabase
        .from('advertisers')
        .insert({
          name: formData.brandName.trim(),
          organization_id: formData.organizationId,
          business_number: formData.businessNumber.trim() || null,
          contact_email: formData.contactEmail.trim() || null,
          contact_phone: formData.contactPhone.trim() || null,
        });

      if (insertError) throw insertError;

      toast({
        title: "브랜드 추가 완료",
        description: `${formData.brandName} 브랜드가 추가되었습니다.`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      handleClose();
    } catch (err) {
      console.error('브랜드 추가 실패:', err);
      setError(err.message || "브랜드 추가에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      organizationId: organizationId || "",
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
                  {organizations.map((org) => (
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
