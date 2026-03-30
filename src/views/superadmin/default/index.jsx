// Chakra imports
import {
  Box,
  SimpleGrid,
  Text,
  useColorModeValue,
  Icon,
} from "@chakra-ui/react";
import MiniStatistics from "components/card/MiniStatistics";
import IconBox from "components/icons/IconBox";
import React, { useState, useEffect } from "react";
import {
  MdPeople,
  MdSecurity,
  MdBarChart,
} from "react-icons/md";
import { getUserStats } from "services/supabaseService";
import { useAuth } from "contexts/AuthContext";

export default function SuperAdminDashboard() {
  const brandColor = useColorModeValue("brand.500", "white");
  const boxBg = useColorModeValue("secondaryGray.300", "whiteAlpha.100");
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const cardBg = useColorModeValue("white", "navy.700");

  const { user, role, organizationId } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    adminUsers: 0,
    activeUsers: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const currentUser = {
          id: user.id,
          role,
          organization_id: organizationId,
        };
        const data = await getUserStats(currentUser);
        setStats(data);
      } catch (error) {
        console.error('[SuperAdminDashboard] 통계 조회 실패:', error);
      }
    };

    if (user) {
      fetchStats();
    }
  }, [user, role, organizationId]);

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <Text
        color={textColor}
        fontSize="2xl"
        fontWeight="700"
        mb="20px"
      >
        관리자 대시보드
      </Text>

      <SimpleGrid
        columns={{ base: 1, md: 2, lg: 3, "2xl": 3 }}
        gap='20px'
        mb='20px'>
        <MiniStatistics
          startContent={
            <IconBox
              w='56px'
              h='56px'
              bg={boxBg}
              icon={
                <Icon w='32px' h='32px' as={MdPeople} color={brandColor} />
              }
            />
          }
          name='총 사용자'
          value={stats.totalUsers.toString()}
        />
        <MiniStatistics
          startContent={
            <IconBox
              w='56px'
              h='56px'
              bg={boxBg}
              icon={
                <Icon w='32px' h='32px' as={MdSecurity} color={brandColor} />
              }
            />
          }
          name='관리자 계정'
          value={stats.adminUsers.toString()}
        />
        <MiniStatistics
          startContent={
            <IconBox
              w='56px'
              h='56px'
              bg={boxBg}
              icon={
                <Icon w='32px' h='32px' as={MdBarChart} color={brandColor} />
              }
            />
          }
          name='활성 사용자'
          value={stats.activeUsers.toString()}
        />
      </SimpleGrid>

      <Box
        bg={cardBg}
        p="20px"
        borderRadius="20px"
        mt="20px"
      >
        <Text color={textColor} fontSize="lg" fontWeight="700" mb="10px">
          관리자 기능
        </Text>
        <Text color={textColor} fontSize="sm">
          왼쪽 사이드바에서 조직 관리, 광고주 관리, 브랜드 관리, 권한 관리 등의 메뉴를 이용할 수 있습니다.
        </Text>
        <Text color={textColor} fontSize="sm" mt="10px">
          Home 버튼을 클릭하면 메인 대시보드로 돌아갑니다.
        </Text>
      </Box>
    </Box>
  );
}
