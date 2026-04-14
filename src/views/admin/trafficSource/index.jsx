/**
 * ============================================================================
 * 유입 경로 분석 - 메인 페이지
 * ============================================================================
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useColorModeValue,
} from '@chakra-ui/react';
import { PageHelmet } from 'components/HelmetProvider';
import { useDateRange } from 'contexts/DateRangeContext';
import { useAuth } from 'contexts/AuthContext';
import DateRangePicker from 'components/fields/DateRangePicker';
import ReferrerChart from './components/ReferrerChart';
import ReferrerTable from './components/ReferrerTable';
import KeywordTable from './components/KeywordTable';
import NavigationFlow from './components/NavigationFlow';

export default function TrafficSource() {
  const { currentAdvertiserId, availableAdvertisers } = useAuth();
  const { startDate, endDate } = useDateRange();

  const [selectedSources, setSelectedSources] = useState(['합계']);
  const [attributionModel, setAttributionModel] = useState('first_touch');

  const availableAdvertiserIds = availableAdvertisers.map((a) => a.id);

  const tabColor        = useColorModeValue('gray.500', 'gray.400');
  const tabSelectedColor = useColorModeValue('brand.500', 'brand.300');
  const tabBorderColor  = useColorModeValue('brand.500', 'brand.300');

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
        keywords="유입 경로, 레퍼러, 방문자 분석, 전환율, 유입 키워드"
      />

      {/* 날짜 선택 */}
      <DateRangePicker />

      <Tabs variant="unstyled" mt="20px">
        <TabList mb="20px" borderBottomWidth="1px" borderColor={useColorModeValue('gray.100', 'whiteAlpha.100')}>
          <Tab
            fontSize="sm"
            fontWeight="600"
            color={tabColor}
            pb="12px"
            px="16px"
            _selected={{
              color: tabSelectedColor,
              borderBottomWidth: '2px',
              borderColor: tabBorderColor,
              mb: '-1px',
            }}
          >
            유입 경로
          </Tab>
          <Tab
            fontSize="sm"
            fontWeight="600"
            color={tabColor}
            pb="12px"
            px="16px"
            _selected={{
              color: tabSelectedColor,
              borderBottomWidth: '2px',
              borderColor: tabBorderColor,
              mb: '-1px',
            }}
          >
            유입 키워드
          </Tab>
          <Tab
            fontSize="sm"
            fontWeight="600"
            color={tabColor}
            pb="12px"
            px="16px"
            _selected={{
              color: tabSelectedColor,
              borderBottomWidth: '2px',
              borderColor: tabBorderColor,
              mb: '-1px',
            }}
          >
            경로 탐색
          </Tab>
        </TabList>

        <TabPanels>
          {/* ── 유입 경로 탭 ── */}
          <TabPanel p={0}>
            <ReferrerChart
              advertiserId={currentAdvertiserId}
              availableAdvertiserIds={availableAdvertiserIds}
              startDate={startDate}
              endDate={endDate}
              selectedSources={selectedSources}
              onRemoveSource={handleRemoveSource}
            />
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
          </TabPanel>

          {/* ── 유입 키워드 탭 ── */}
          <TabPanel p={0}>
            <KeywordTable
              advertiserId={currentAdvertiserId}
              availableAdvertiserIds={availableAdvertiserIds}
              startDate={startDate}
              endDate={endDate}
            />
          </TabPanel>

          {/* ── 경로 탐색 탭 ── */}
          <TabPanel p={0}>
            <NavigationFlow
              advertiserId={currentAdvertiserId}
              availableAdvertiserIds={availableAdvertiserIds}
              startDate={startDate}
              endDate={endDate}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}
