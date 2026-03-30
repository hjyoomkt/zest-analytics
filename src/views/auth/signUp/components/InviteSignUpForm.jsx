import React, { useState, useEffect } from "react";
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
  AlertTitle,
  AlertDescription,
  Spinner,
  useColorModeValue,
  VStack,
  HStack,
  Divider,
  Heading,
  Flex,
  Radio,
  RadioGroup,
} from "@chakra-ui/react";
import { MdOutlineRemoveRedEye, MdCheckCircle } from "react-icons/md";
import { RiEyeCloseLine } from "react-icons/ri";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import { supabase } from "config/supabase";

function InviteSignUpForm({ initialCode, onSuccess }) {
  const [inviteCode, setInviteCode] = useState(initialCode || "");
  const [inviteData, setInviteData] = useState(null);
  const [validatingCode, setValidatingCode] = useState(false);
  const [codeError, setCodeError] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    organizationName: "",
    businessNumber: "",
    websiteUrl: "",
    contactEmail: "",
    contactPhone: "",
    selectedMainAdvertiserId: null,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const textColor = useColorModeValue("navy.700", "white");
  const brandColor = useColorModeValue("brand.500", "white");
  const socialBtnBg = useColorModeValue("white", "navy.800");
  const socialBtnBorder = useColorModeValue("gray.200", "whiteAlpha.200");
  const socialBtnHover = useColorModeValue(
    { bg: "gray.50" },
    { bg: "whiteAlpha.100" }
  );
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const selectedBg = useColorModeValue('brand.50', 'whiteAlpha.100');
  const bgHover = useColorModeValue('gray.50', 'whiteAlpha.50');
  const inputBg = useColorModeValue('white', 'navy.700');

  // 초대 코드 자동 검증 (initialCode가 있을 때)
  useEffect(() => {
    if (initialCode) {
      validateInviteCode(initialCode);
    }
  }, [initialCode]);

  const validateInviteCode = async (code) => {
    if (!code) return;

    setValidatingCode(true);
    setCodeError(null);

    try {
      const { data, error } = await supabase
        .from('invitation_codes')
        .select('*')
        .eq('code', code)
        .single();

      if (error || !data) {
        setCodeError('유효하지 않은 초대 코드입니다.');
        setInviteData(null);
        setValidatingCode(false);
        return;
      }

      if (data.used_by) {
        setCodeError('이미 사용된 초대 코드입니다.');
        setInviteData(null);
        setValidatingCode(false);
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setCodeError('만료된 초대 코드입니다.');
        setInviteData(null);
        setValidatingCode(false);
        return;
      }

      const isNewAdvertiser = data.invite_type === 'new_organization';
      const isNewBrand = data.invite_type === 'new_brand';
      const isNewAgency = data.invite_type === 'new_agency';

      let organizationName = null;
      let advertiserName = null;

      if (data.organization_id && !isNewAdvertiser) {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', data.organization_id)
          .single();
        organizationName = orgData?.name;
      }

      if (data.advertiser_id) {
        const { data: advData } = await supabase
          .from('advertisers')
          .select('name')
          .eq('id', data.advertiser_id)
          .single();
        advertiserName = advData?.name;
      }

      let advertiserBrands = [];
      if (data.advertiser_ids && data.advertiser_ids.length > 0) {
        advertiserBrands = data.advertiser_ids.map((id, index) => ({
          id: id,
          name: data.advertiser_names?.[index] || '알 수 없는 브랜드'
        }));
        console.log('✅ 브랜드 목록:', advertiserBrands);
      }

      setInviteData({
        organizationName: organizationName,
        advertiserName: advertiserName,
        advertiserBrands: advertiserBrands,
        role: data.role,
        invitedBy: '관리자',
        invitedEmail: data.invited_email,
        isNewAdvertiser: isNewAdvertiser,
        isNewBrand: isNewBrand,
        isNewAgency: isNewAgency,
        existingOrganizationName: isNewBrand ? organizationName : null,
        invitationId: data.id,
        organizationId: data.organization_id,
        advertiserId: data.advertiser_id,
        advertiserIds: data.advertiser_ids,
        parentAdvertiserId: data.parent_advertiser_id,
      });

      if (data.advertiser_ids && data.advertiser_ids.length > 1) {
        setFormData(prev => ({
          ...prev,
          selectedMainAdvertiserId: data.advertiser_ids[0]
        }));
      }

      setCodeError(null);
    } catch (err) {
      console.error('초대 코드 검증 오류:', err);
      setCodeError('초대 코드 확인 중 오류가 발생했습니다.');
      setInviteData(null);
    } finally {
      setValidatingCode(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!inviteData) {
      setError("먼저 초대 코드를 확인해주세요.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (formData.password.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    if ((inviteData.isNewAdvertiser || inviteData.isNewBrand || inviteData.isNewAgency) && !formData.organizationName) {
      setError(inviteData.isNewAgency ? "대행사명을 입력해주세요." : inviteData.isNewBrand ? "브랜드명을 입력해주세요." : "광고주명을 입력해주세요.");
      return;
    }

    if (inviteData.advertiserBrands && inviteData.advertiserBrands.length > 1 &&
        ['viewer', 'editor', 'advertiser_staff'].includes(inviteData.role) &&
        !formData.selectedMainAdvertiserId) {
      setError("메인 소속 브랜드를 선택해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔍 회원가입 시도:', {
        email: inviteData.invitedEmail,
        name: formData.name,
        role: inviteData.role,
      });

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: inviteData.invitedEmail,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            name: formData.name,
          }
        }
      });

      if (authError) {
        console.error('❌ Auth 계정 생성 실패:', authError);
        throw authError;
      }

      console.log('✅ Auth 계정 생성 성공:', {
        user_id: authData.user?.id,
        session: authData.session ? '세션 있음' : '❌ 세션 없음',
      });

      if (!authData.session) {
        throw new Error('이메일 확인이 필요합니다. Supabase 설정에서 "Enable email confirmations"를 비활성화해주세요.');
      }

      await supabase.auth.setSession({
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      let finalOrganizationId = inviteData.organizationId;

      let finalAdvertiserId = inviteData.advertiserId;
      if (inviteData.advertiserIds && inviteData.advertiserIds.length > 0) {
        finalAdvertiserId = formData.selectedMainAdvertiserId || inviteData.advertiserIds[0];
      }

      // 신규 광고주(조직) 생성
      if (inviteData.isNewAdvertiser) {
        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: formData.organizationName,
            type: 'advertiser',
          })
          .select()
          .single();

        if (orgError) throw orgError;
        finalOrganizationId = newOrg.id;

        const { data: newAdv, error: advError } = await supabase
          .from('advertisers')
          .insert({
            name: formData.organizationName,
            organization_id: newOrg.id,
            business_number: formData.businessNumber,
            website_url: formData.websiteUrl,
            contact_email: formData.contactEmail || formData.email,
            contact_phone: formData.contactPhone,
          })
          .select()
          .single();

        if (advError) throw advError;
        finalAdvertiserId = newAdv.id;
      }

      // 신규 대행사 조직 생성
      if (inviteData.isNewAgency) {
        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: formData.organizationName,
            type: 'agency',
          })
          .select()
          .single();

        if (orgError) throw orgError;
        finalOrganizationId = newOrg.id;
        finalAdvertiserId = null;
      }

      // 기존 조직에 신규 브랜드 추가
      if (inviteData.isNewBrand) {
        const { data: newAdv, error: advError } = await supabase
          .from('advertisers')
          .insert({
            name: formData.organizationName,
            organization_id: inviteData.organizationId,
            business_number: formData.businessNumber,
            website_url: formData.websiteUrl,
            contact_email: formData.contactEmail || formData.email,
            contact_phone: formData.contactPhone,
          })
          .select()
          .single();

        if (advError) throw advError;
        finalAdvertiserId = newAdv.id;

        if (inviteData.parentAdvertiserId) {
          try {
            const { data: groupData, error: groupError } = await supabase.functions.invoke(
              'assign-advertiser-group',
              {
                body: {
                  parentAdvertiserId: inviteData.parentAdvertiserId,
                  newAdvertiserId: newAdv.id,
                },
              }
            );

            if (groupError) {
              console.error('❌ 브랜드 그룹 설정 실패:', groupError);
              setError(`브랜드 그룹 설정 중 오류가 발생했습니다: ${groupError.message || JSON.stringify(groupError)}`);
            }
          } catch (err) {
            console.error('❌ Edge Function 호출 실패:', err);
            setError(`브랜드 그룹 설정 중 오류가 발생했습니다: ${err.message}`);
          }
        }
      }

      // Users 테이블에 추가 정보 저장
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          organization_id: finalOrganizationId,
          advertiser_id: finalAdvertiserId,
          email: inviteData.invitedEmail,
          name: formData.name,
          role: inviteData.role,
          status: 'active',
        });

      if (userError) throw userError;

      // 초대 코드 사용 처리
      await supabase
        .from('invitation_codes')
        .update({
          used: true,
          used_at: new Date().toISOString(),
          used_by: authData.user.id,
        })
        .eq('code', inviteCode);

      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('회원가입 오류:', err);
      setError(err.message || '회원가입 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    if (!inviteData) {
      setError("먼저 초대 코드를 확인해주세요.");
      return;
    }
    console.log(`${provider} login with invite code:`, inviteCode);
  };

  return (
    <Box as="form" onSubmit={handleSubmit}>
      {/* 초대 코드 입력 (initialCode 없을 때만) */}
      {!initialCode && (
        <FormControl mb="20px">
          <FormLabel fontSize="sm" fontWeight="500" color={textColor}>
            초대 코드 *
          </FormLabel>
          <HStack>
            <Input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              variant="auth"
              fontSize="sm"
              placeholder="예: INVITE-A1B2C3D4"
              size="lg"
              borderRadius="10px"
            />
            <Button
              onClick={() => validateInviteCode(inviteCode)}
              isLoading={validatingCode}
              colorScheme="brand"
              size="lg"
            >
              확인
            </Button>
          </HStack>
          {codeError && (
            <Text color="red.500" fontSize="sm" mt="8px">
              {codeError}
            </Text>
          )}
        </FormControl>
      )}

      {/* 검증 중 로딩 */}
      {validatingCode && initialCode && (
        <Alert status="info" mb="20px" borderRadius="10px" flexDirection="row" alignItems="center">
          <Spinner size="sm" mr="12px" />
          <Text fontSize="sm">초대 코드 확인 중...</Text>
        </Alert>
      )}

      {/* 초대 정보 표시 */}
      {inviteData && !validatingCode && (
        <Alert
          status="success"
          mb="20px"
          borderRadius="10px"
          flexDirection="column"
          alignItems="flex-start"
        >
          <HStack mb="8px">
            <AlertIcon as={MdCheckCircle} />
            <AlertTitle fontSize="sm">초대 코드 확인 완료</AlertTitle>
          </HStack>
          <AlertDescription fontSize="xs" w="100%">
            <VStack align="flex-start" spacing="4px">
              {inviteData.isNewAgency ? (
                <>
                  <Text><strong>신규 광고대행사 조직 등록</strong></Text>
                  <Text>새로운 광고대행사를 등록합니다</Text>
                  <Text><strong>권한:</strong> 대행사 최고관리자 (agency_admin)</Text>
                </>
              ) : inviteData.isNewAdvertiser ? (
                <>
                  <Text><strong>신규 클라이언트 조직 등록</strong></Text>
                  <Text>새로운 클라이언트로 초대되었습니다</Text>
                  <Text><strong>권한:</strong> 클라이언트 최고관리자</Text>
                </>
              ) : inviteData.isNewBrand ? (
                <>
                  <Text><strong>신규 브랜드 추가</strong></Text>
                  <Text><strong>조직:</strong> {inviteData.existingOrganizationName}</Text>
                  <Text>기존 조직에 새로운 브랜드를 추가합니다</Text>
                  <Text><strong>권한:</strong> 클라이언트 최고관리자</Text>
                </>
              ) : (
                <>
                  <Text><strong>조직:</strong> {inviteData.organizationName}</Text>
                  {inviteData.advertiserBrands && inviteData.advertiserBrands.length > 0 ? (
                    <Text><strong>접근 가능한 브랜드:</strong> {inviteData.advertiserBrands.map(b => b.name).join(', ')}</Text>
                  ) : inviteData.advertiserName && (
                    <Text><strong>광고주:</strong> {inviteData.advertiserName}</Text>
                  )}
                  <Text><strong>권한:</strong> {
                    inviteData.role === 'org_admin' ? '대행사 최고관리자' :
                    inviteData.role === 'org_manager' ? '대행사 관리자' :
                    inviteData.role === 'org_staff' ? '대행사 직원' :
                    inviteData.role === 'advertiser_admin' ? '클라이언트 최고관리자' :
                    inviteData.role === 'manager' ? '클라이언트 관리자' :
                    inviteData.role === 'editor' ? '편집자' :
                    inviteData.role === 'viewer' ? '뷰어' :
                    inviteData.role
                  }</Text>
                </>
              )}
              <Text><strong>초대자:</strong> {inviteData.invitedBy}</Text>
            </VStack>
          </AlertDescription>
        </Alert>
      )}

      {/* 이름 입력 */}
      <FormControl mb="20px" isDisabled={!inviteData}>
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

      {/* 이메일 입력 */}
      <FormControl mb="20px" isDisabled={true}>
        <FormLabel fontSize="sm" fontWeight="500" color={textColor}>
          이메일 주소 *
        </FormLabel>
        <Input
          name="email"
          type="email"
          value={inviteData?.invitedEmail || formData.email}
          onChange={handleChange}
          isRequired
          variant="auth"
          fontSize="sm"
          placeholder="your.email@company.com"
          size="lg"
          borderRadius="10px"
          isReadOnly
          bg={useColorModeValue('gray.100', 'navy.800')}
        />
      </FormControl>

      {/* 비밀번호 입력 */}
      <FormControl mb="20px" isDisabled={!inviteData}>
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

      {/* 비밀번호 확인 */}
      <FormControl mb="20px" isDisabled={!inviteData}>
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

      {/* 메인 소속 브랜드 선택 */}
      {inviteData && inviteData.advertiserBrands && inviteData.advertiserBrands.length > 1 &&
       ['viewer', 'editor', 'advertiser_staff'].includes(inviteData.role) && (
        <>
          <Divider my="24px" />
          <Heading size="sm" color={textColor} mb="16px">
            메인 소속 브랜드 선택
          </Heading>
          <FormControl mb="20px">
            <FormLabel fontSize="sm" fontWeight="500" color={textColor}>
              메인 브랜드 *
            </FormLabel>
            <Text fontSize="xs" color="gray.500" mb="12px">
              여러 브랜드에 접근 가능하지만, 하나의 메인 브랜드를 지정해야 합니다.
            </Text>
            <RadioGroup
              value={formData.selectedMainAdvertiserId}
              onChange={(value) => setFormData({ ...formData, selectedMainAdvertiserId: value })}
            >
              <VStack align="stretch" spacing="8px">
                {inviteData.advertiserBrands && inviteData.advertiserBrands.map((brand) => (
                  <Box
                    key={brand.id}
                    p="12px"
                    borderRadius="8px"
                    border="1px solid"
                    borderColor={formData.selectedMainAdvertiserId === brand.id ? brandColor : borderColor}
                    bg={formData.selectedMainAdvertiserId === brand.id ? selectedBg : inputBg}
                    cursor="pointer"
                    onClick={() => setFormData({ ...formData, selectedMainAdvertiserId: brand.id })}
                    _hover={{ borderColor: brandColor, bg: bgHover }}
                  >
                    <Radio value={brand.id} colorScheme="brand">
                      <Text fontSize="sm" fontWeight="500" color={textColor}>
                        {brand.name}
                      </Text>
                    </Radio>
                  </Box>
                ))}
              </VStack>
            </RadioGroup>
          </FormControl>
        </>
      )}

      {/* 신규 조직/브랜드 정보 입력 섹션 */}
      {(inviteData?.isNewAdvertiser || inviteData?.isNewBrand || inviteData?.isNewAgency) && (
        <>
          <Divider my="24px" />
          <Heading size="sm" color={textColor} mb="16px">
            {inviteData?.isNewAgency ? '대행사 정보' : '브랜드 정보'}
          </Heading>

          <FormControl mb="20px">
            <FormLabel fontSize="sm" fontWeight="500" color={textColor}>
              {inviteData?.isNewAgency ? '대행사명 *' : '브랜드명 *'}
            </FormLabel>
            <Input
              name="organizationName"
              value={formData.organizationName}
              onChange={handleChange}
              isRequired
              variant="auth"
              fontSize="sm"
              placeholder={inviteData?.isNewAgency ? "예: 회사명" : "예: 브랜드명"}
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
              홈페이지 주소
            </FormLabel>
            <Input
              name="websiteUrl"
              type="url"
              value={formData.websiteUrl}
              onChange={handleChange}
              variant="auth"
              fontSize="sm"
              placeholder="예: https://www.example.com"
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
              placeholder="contact@company.com (미입력 시 로그인 이메일 사용)"
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
        </>
      )}

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
        isDisabled={!inviteData}
      >
        회원가입
      </Button>

      {/* OAuth 간편 로그인 */}
      {inviteData && !inviteData.isNewAdvertiser && !inviteData.isNewBrand && !inviteData.isNewAgency && (
        <>
          <Flex align="center" my="20px">
            <Box flex="1" h="1px" bg="gray.200" />
            <Text color="gray.400" mx="14px" fontSize="sm">
              또는 간편 로그인
            </Text>
            <Box flex="1" h="1px" bg="gray.200" />
          </Flex>

          <Flex gap="12px" mb="0px">
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
              onClick={() => handleSocialLogin('google')}
              isDisabled={!inviteData}
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
              onClick={() => handleSocialLogin('facebook')}
              isDisabled={!inviteData}
            >
              Facebook
            </Button>
          </Flex>
        </>
      )}
    </Box>
  );
}

export default InviteSignUpForm;
