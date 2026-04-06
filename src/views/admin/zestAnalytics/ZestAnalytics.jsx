/**
 * ============================================================================
 * Zest Analytics - 메인 페이지
 * ============================================================================
 */

import React from 'react';
import { Box } from '@chakra-ui/react';
import { PageHelmet } from 'components/HelmetProvider';
import { useDateRange } from 'contexts/DateRangeContext';
import { useAuth } from 'contexts/AuthContext';
import DateRangePicker from 'components/fields/DateRangePicker';
import EventStatistics from './components/EventStatistics';
import ChannelAnalytics from './components/ChannelAnalytics';

export default function ZestAnalytics() {
  const { currentAdvertiserId, availableAdvertisers } = useAuth();
  const { startDate, endDate } = useDateRange();

  const availableAdvertiserIds = availableAdvertisers.map((a) => a.id);

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <PageHelmet
        title="Zest Analytics | Growth Analytics"
        description="웹사이트 전환 이벤트 추적 및 분석"
        keywords="전환 추적, 이벤트 분석, UTM 파라미터, 어트리뷰션"
      />

      {/* 날짜 선택 */}
      <DateRangePicker />

      {/* KPI 카드 */}
      <EventStatistics
        advertiserId={currentAdvertiserId}
        availableAdvertiserIds={availableAdvertiserIds}
        startDate={startDate}
        endDate={endDate}
      />

      {/* 채널 분석 테이블 */}
      <Box mt="20px">
        <ChannelAnalytics
          advertiserId={currentAdvertiserId}
          availableAdvertiserIds={availableAdvertiserIds}
          startDate={startDate}
          endDate={endDate}
        />
      </Box>
    </Box>
  );
}
