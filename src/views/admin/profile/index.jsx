import { Box, Grid } from "@chakra-ui/react";

import Banner from "views/admin/profile/components/Banner";
import APIStatus from "views/admin/profile/components/APIStatus";
import Notifications from "views/admin/profile/components/Notifications";
import Upload from "views/admin/profile/components/Upload";
import BrandsList from "views/admin/profile/components/BrandsList";
import MiniCalendar from "components/calendar/MiniCalendar";

import banner from "assets/img/auth/banner.png";
import avatar from "assets/img/avatars/avatar4.png";
import React from "react";
import { useAuth } from "contexts/AuthContext";
import { PageHelmet } from "components/HelmetProvider";

export default function Overview() {
  const { user, role, userName, availableAdvertisers } = useAuth();

  const roleLabels = {
    master: '마스터',
    agency_admin: '대행사 최고관리자',
    agency_manager: '대행사 관리자',
    advertiser_admin: '브랜드 대표운영자',
    advertiser_staff: '브랜드 부운영자',
    viewer: '뷰어',
  };

  const displayName = userName || user?.email?.split('@')[0] || 'User';

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <PageHelmet
        title="프로필 | 제스트 애널리틱스"
        description="계정 정보 및 브랜드 관리"
        keywords="프로필, 계정 설정, 브랜드 관리, 제스트 애널리틱스"
      />
      <Grid
        templateColumns={{ base: "1fr", lg: "1.34fr 1fr 1.62fr" }}
        templateRows={{ base: "repeat(3, 1fr)", lg: "1fr" }}
        gap={{ base: "20px", xl: "20px" }}>
        <Banner
          gridArea='1 / 1 / 2 / 2'
          banner={banner}
          avatar={avatar}
          name={displayName}
          job={roleLabels[role] || role}
          roleLevel={roleLabels[role] || role}
          brandCount={availableAdvertisers?.length || 0}
          h={{ base: "auto", lg: "365px" }}
        />
        <MiniCalendar
          gridArea={{ base: "2 / 1 / 3 / 2", lg: "1 / 2 / 2 / 3" }}
          h={{ base: "auto", lg: "365px" }}
        />
        <Upload
          gridArea={{ base: "3 / 1 / 4 / 2", lg: "1 / 3 / 2 / 4" }}
          h={{ base: "auto", lg: "365px" }}
          pe='20px'
          pb={{ base: "100px", lg: "20px" }}
        />
      </Grid>
      <Grid
        mb='20px'
        templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)", "2xl": "repeat(3, 1fr)" }}
        templateRows={{ base: "repeat(3, 1fr)", lg: "repeat(2, 1fr)", "2xl": "1fr" }}
        gap={{ base: "20px", xl: "20px" }}
        alignItems="start">
        <BrandsList
          brands={availableAdvertisers}
          gridArea={{ base: "1 / 1 / 2 / 2", lg: "1 / 1 / 2 / 2", "2xl": "1 / 1 / 2 / 2" }}
          h={{ base: "auto", lg: "550px" }}
        />
        <APIStatus
          gridArea={{ base: "2 / 1 / 3 / 2", lg: "1 / 2 / 2 / 3", "2xl": "1 / 2 / 2 / 3" }}
          h={{ base: "auto", lg: "550px" }}
          pe='20px'
        />
        <Notifications
          gridArea={{ base: "3 / 1 / 4 / 2", lg: "2 / 1 / 3 / 3", "2xl": "1 / 3 / 2 / 4" }}
          h={{ base: "auto", lg: "550px" }}
        />
      </Grid>
    </Box>
  );
}
