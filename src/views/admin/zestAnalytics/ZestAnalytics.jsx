/**
 * ============================================================================
 * Zest Analytics - 메인 페이지
 * ============================================================================
 */

import React from 'react';
import { Box, Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react';
import { PageHelmet } from 'components/HelmetProvider';
import { useDateRange } from 'contexts/DateRangeContext';
import { useAuth } from 'contexts/AuthContext';
import TrackingCodeManager from './components/TrackingCodeManager';
import EventStatistics from './components/EventStatistics';
import CampaignPerformance from './components/CampaignPerformance';
import AttributionAnalysis from './components/AttributionAnalysis';

export default function ZestAnalytics() {
  const { currentAdvertiserId, availableAdvertisers, role } = useAuth();
  const { startDate, endDate } = useDateRange();

  // 접근 가능한 광고주 ID 목록
  const availableAdvertiserIds = availableAdvertisers.map((a) => a.id);

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <PageHelmet
        title="Zest Analytics | Growth Analytics"
        description="웹사이트 전환 이벤트 추적 및 분석"
        keywords="전환 추적, 이벤트 분석, UTM 파라미터, 어트리뷰션"
      />

      <Tabs variant="soft-rounded" colorScheme="brand">
        <TabList mb="1em">
          <Tab>대시보드</Tab>
          <Tab>추적 코드 관리</Tab>
        </TabList>

        <TabPanels>
          {/* 대시보드 */}
          <TabPanel>
            <EventStatistics
              advertiserId={currentAdvertiserId}
              availableAdvertiserIds={availableAdvertiserIds}
              startDate={startDate}
              endDate={endDate}
            />
            <AttributionAnalysis
              advertiserId={currentAdvertiserId}
              availableAdvertiserIds={availableAdvertiserIds}
              startDate={startDate}
              endDate={endDate}
            />
            <CampaignPerformance
              advertiserId={currentAdvertiserId}
              availableAdvertiserIds={availableAdvertiserIds}
              startDate={startDate}
              endDate={endDate}
            />
          </TabPanel>

          {/* 추적 코드 관리 */}
          <TabPanel>
            <TrackingCodeManager advertiserId={currentAdvertiserId} role={role} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}
