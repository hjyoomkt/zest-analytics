/**
 * ============================================================================
 * 유입 경로 분석 - 메인 페이지
 * ============================================================================
 */

import React, { useState, useCallback } from 'react';
import { Box, Text, Flex } from '@chakra-ui/react';
import { PageHelmet } from 'components/HelmetProvider';
import { useDateRange } from 'contexts/DateRangeContext';
import { useAuth } from 'contexts/AuthContext';
import DateRangePicker from 'components/fields/DateRangePicker';
import ReferrerChart from './components/ReferrerChart';
import ReferrerTable from './components/ReferrerTable';

export default function TrafficSource() {
  const { currentAdvertiserId, availableAdvertisers } = useAuth();
  const { startDate, endDate } = useDateRange();

  // 선택된 소스(들) - 차트에 표시할 항목
  const [selectedSources, setSelectedSources] = useState(['합계']);
  const [attributionModel, setAttributionModel] = useState('first_touch');

  const availableAdvertiserIds = availableAdvertisers.map((a) => a.id);

  /**
   * 테이블 행 클릭 시 차트 소스 선택
   * Ctrl/Cmd + Click → 비교 추가, 일반 클릭 → 단독 선택
   */
  const handleSourceSelect = useCallback((source, isMulti) => {
    if (isMulti) {
      setSelectedSources((prev) =>
        prev.includes(source)
          ? prev.filter((s) => s !== source)
          : [...prev, source]
      );
    } else {
      setSelectedSources([source]);
    }
  }, []);

  const handleRemoveSource = useCallback((source) => {
    setSelectedSources((prev) => {
      const next = prev.filter((s) => s !== source);
      return next.length === 0 ? ['합계'] : next;
    });
  }, []);

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <PageHelmet
        title="유입 경로 분석 | Growth Analytics"
        description="유입 경로별 방문자 수 및 전환 지표 분석"
        keywords="유입 경로, 레퍼러, 방문자 분석, 전환율"
      />

      {/* 날짜 선택 */}
      <DateRangePicker />

      {/* 시간대별 방문자 차트 */}
      <ReferrerChart
        advertiserId={currentAdvertiserId}
        availableAdvertiserIds={availableAdvertiserIds}
        startDate={startDate}
        endDate={endDate}
        selectedSources={selectedSources}
        onRemoveSource={handleRemoveSource}
      />

      {/* 유입 경로 테이블 */}
      <Box mt="20px">
        <ReferrerTable
          advertiserId={currentAdvertiserId}
          availableAdvertiserIds={availableAdvertiserIds}
          startDate={startDate}
          endDate={endDate}
          selectedSources={selectedSources}
          onSourceSelect={handleSourceSelect}
          attributionModel={attributionModel}
          onAttributionChange={setAttributionModel}
        />
      </Box>
    </Box>
  );
}
