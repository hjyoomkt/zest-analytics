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
    metaConversionType: "purchase",
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
        metaConversionType: brand.meta_conversion_type || "purchase",
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
          meta_conversion_type: formData.metaConversionType,
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

              {/* 메타 전환 설정 */}
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="500" color={textColor}>
                  메타 전환 설정
                </FormLabel>
                <Menu>
                  <MenuButton
                    as={Button}
                    rightIcon={<MdKeyboardArrowDown />}
                    bg={inputBg}
                    border="1px solid"
                    borderColor={borderColor}
                    color={textColor}
                    fontWeight="500"
                    fontSize="sm"
                    _hover={{ bg: bgHover }}
                    _active={{ bg: bgHover }}
                    px="16px"
                    h="44px"
                    borderRadius="10px"
                    textAlign="left"
                    w="100%"
                  >
                    {formData.metaConversionType === 'purchase' ? '구매 (conversions)' : '회원가입 (등록완료)'}
                  </MenuButton>
                  <MenuList minW="auto" w="100%" px="8px" py="8px">
                    <MenuItem
                      onClick={() => setFormData({ ...formData, metaConversionType: 'purchase' })}
                      bg={formData.metaConversionType === 'purchase' ? brandColor : 'transparent'}
                      color={formData.metaConversionType === 'purchase' ? 'white' : textColor}
                      _hover={{
                        bg: formData.metaConversionType === 'purchase' ? brandColor : bgHover,
                      }}
                      fontWeight={formData.metaConversionType === 'purchase' ? '600' : '500'}
                      fontSize="sm"
                      px="12px"
                      py="8px"
                      borderRadius="8px"
                      justifyContent="flex-start"
                      minH="auto"
                    >
                      구매 (conversions)
                    </MenuItem>
                    <MenuItem
                      onClick={() => setFormData({ ...formData, metaConversionType: 'complete_registration' })}
                      bg={formData.metaConversionType === 'complete_registration' ? brandColor : 'transparent'}
                      color={formData.metaConversionType === 'complete_registration' ? 'white' : textColor}
                      _hover={{
                        bg: formData.metaConversionType === 'complete_registration' ? brandColor : bgHover,
                      }}
                      fontWeight={formData.metaConversionType === 'complete_registration' ? '600' : '500'}
                      fontSize="sm"
                      px="12px"
                      py="8px"
                      borderRadius="8px"
                      justifyContent="flex-start"
                      minH="auto"
                    >
                      회원가입 (등록완료)
                    </MenuItem>
                  </MenuList>
                </Menu>
                <Text fontSize="xs" color="gray.500" mt="8px">
                  메타 광고의 전환 지표를 선택하세요. 구매 또는 회원가입 중 하나를 선택할 수 있습니다.
                </Text>
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
