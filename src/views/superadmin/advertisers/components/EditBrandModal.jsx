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
  VStack,
  Text,
  Alert,
  AlertIcon,
  useColorModeValue,
  useToast,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
} from "@chakra-ui/react";
import { MdKeyboardArrowDown } from "react-icons/md";
import { supabase } from "config/supabase";

export default function EditBrandModal({ isOpen, onClose, brand }) {
  const [formData, setFormData] = useState({
    name: "",
    businessNumber: "",
    contactEmail: "",
    contactPhone: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();

  const textColor = useColorModeValue("navy.700", "white");
  const inputBg = useColorModeValue("white", "navy.900");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");
  const bgHover = useColorModeValue("secondaryGray.100", "whiteAlpha.100");
  const brandColor = useColorModeValue("brand.500", "white");

  useEffect(() => {
    if (brand) {
      setFormData({
        name: brand.name || "",
        businessNumber: brand.business_number || "",
        contactEmail: brand.contact_email || "",
        contactPhone: brand.contact_phone || "",
      });
    }
  }, [brand]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.name) {
      setError("브랜드명을 입력해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase
        .from('advertisers')
        .update({
          name: formData.name,
          business_number: formData.businessNumber,
          contact_email: formData.contactEmail,
          contact_phone: formData.contactPhone,
        })
        .eq('id', brand.id);

      if (updateError) throw updateError;

      toast({
        title: "브랜드 정보 수정 완료",
        description: `${formData.name} 브랜드 정보가 성공적으로 수정되었습니다.`,
        status: "success",
        duration: 3000,
      });

      handleClose();
    } catch (err) {
      console.error('브랜드 수정 실패:', err);
      setError(err.message);
      toast({
        title: "브랜드 수정 실패",
        description: err.message,
        status: "error",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      businessNumber: "",
      contactEmail: "",
      contactPhone: "",
      metaConversionType: "purchase",
    });
    setError(null);
    onClose();
  };

  if (!brand) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>브랜드 정보 수정</ModalHeader>
        <ModalCloseButton />

        <form onSubmit={handleSubmit}>
          <ModalBody>
            <VStack spacing="20px">
              {/* 브랜드명 */}
              <FormControl isRequired>
                <FormLabel fontSize="sm" fontWeight="500" color={textColor}>
                  브랜드명
                </FormLabel>
                <Input
                  name="name"
                  value={formData.name}
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
              수정
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
