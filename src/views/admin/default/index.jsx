/*!
  _   _  ___  ____  ___ ________  _   _   _   _ ___
 | | | |/ _ \|  _ \|_ _|__  / _ \| \ | | | | | |_ _|
 | |_| | | | | |_) || |  / / | | |  \| | | | | || |
 |  _  | |_| |  _ < | | / /| |_| | |\  | | |_| || |
 |_| |_|\___/|_| \_\___/____\___/|_| \_|  \___/|___|

=========================================================
* Horizon UI - v1.1.0
=========================================================

* Product Page: https://www.horizon-ui.com/
* Copyright 2023 Horizon UI (https://www.horizon-ui.com/)

* Designed and Coded by Simmmple

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/

import React, { useState } from 'react';
import { useStableFetch } from 'hooks/useStableFetch';
import {
  Box,
  Icon,
  SimpleGrid,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  MdPeople,
  MdPageview,
  MdTimer,
  MdTrendingDown,
  MdPersonAdd,
  MdRepeat,
} from 'react-icons/md';
import { PageHelmet } from 'components/HelmetProvider';
import MiniStatistics from 'components/card/MiniStatistics';
import IconBox from 'components/icons/IconBox';
import DateRangePicker from 'components/fields/DateRangePicker';
import { useAuth } from 'contexts/AuthContext';
import { useDateRange } from 'contexts/DateRangeContext';
import { getDashboardKPIs } from 'views/admin/zestAnalytics/services/zaService';
import VisitorTrendChart from 'views/admin/default/components/VisitorTrendChart';
import DeviceStatsChart from 'views/admin/default/components/DeviceStatsChart';
import VisitorTypeChart from 'views/admin/default/components/VisitorTypeChart';
import TopPages from 'views/admin/default/components/TopPages';
import BehaviorRates from 'views/admin/default/components/BehaviorRates';
import TopActions from 'views/admin/default/components/TopActions';
import TopReferrers from 'views/admin/default/components/TopReferrers';
import OsBrowserStats from 'views/admin/default/components/OsBrowserStats';

export default function MainDashboard() {
  const brandColor = useColorModeValue('brand.500', 'white');
  const boxBg = useColorModeValue('secondaryGray.300', 'whiteAlpha.100');

  const { currentAdvertiserId, availableAdvertisers } = useAuth();
  const { startDate, endDate } = useDateRange();

  const [kpi, setKpi] = useState({
    visitors: 0,
    pageviews: 0,
    pagesPerVisit: 0,
    avgTimeOnSite: 0,
    avgScrollDepth: 0,
    newVisitors: 0,
    returningVisitors: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchKPIs = async () => {
    try {
      setLoading(true);
      const ids = (availableAdvertisers || []).map(a => a.id);
      const data = await getDashboardKPIs({
        advertiserId: currentAdvertiserId,
        availableAdvertiserIds: ids,
        startDate,
        endDate,
      });
      setKpi(data);
    } catch (e) {
      console.error('[MainDashboard] KPI 조회 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  useStableFetch(fetchKPIs, [currentAdvertiserId, availableAdvertisers, startDate, endDate]);

  const formatNum = (n) => (n ?? 0).toLocaleString('ko-KR');
  const formatTime = (secs) => {
    if (!secs) return '0초';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}분 ${s}초` : `${s}초`;
  };

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <PageHelmet
        title="대시보드 | 제스트 애널리틱스"
        description="방문자 수, 페이지뷰, 체류 시간 등 핵심 웹사이트 지표를 한눈에 확인하세요"
        keywords="대시보드, 방문자 분석, 페이지뷰, 체류 시간, 제스트 애널리틱스"
      />
      {/* 날짜 선택 */}
      <DateRangePicker />

      {/* KPI 카드 6개 */}
      <SimpleGrid
        columns={{ base: 1, md: 2, lg: 3, '2xl': 6 }}
        gap='20px'
        mb='20px'>
        <MiniStatistics
          startContent={
            <IconBox w='56px' h='56px' bg={boxBg}
              icon={<Icon w='32px' h='32px' as={MdPeople} color={brandColor} />}
            />
          }
          name='방문자수'
          value={loading ? '...' : formatNum(kpi.visitors)}
        />
        <MiniStatistics
          startContent={
            <IconBox w='56px' h='56px' bg={boxBg}
              icon={<Icon w='32px' h='32px' as={MdPageview} color={brandColor} />}
            />
          }
          name='방문자당 페이지뷰'
          value={loading ? '...' : kpi.pagesPerVisit.toFixed(2)}
        />
        <MiniStatistics
          startContent={
            <IconBox w='56px' h='56px' bg={boxBg}
              icon={<Icon w='32px' h='32px' as={MdTimer} color={brandColor} />}
            />
          }
          name='평균 체류시간'
          value={loading ? '...' : formatTime(kpi.avgTimeOnSite)}
        />
        <MiniStatistics
          startContent={
            <IconBox w='56px' h='56px' bg={boxBg}
              icon={<Icon w='32px' h='32px' as={MdTrendingDown} color={brandColor} />}
            />
          }
          name='평균 스크롤 깊이'
          value={loading ? '...' : `${kpi.avgScrollDepth}%`}
        />
        <MiniStatistics
          startContent={
            <IconBox
              w='56px' h='56px'
              bg={boxBg}
              icon={<Icon w='32px' h='32px' as={MdPersonAdd} color={brandColor} />}
            />
          }
          name='신규 방문'
          value={loading ? '...' : formatNum(kpi.newVisitors)}
        />
        <MiniStatistics
          startContent={
            <IconBox w='56px' h='56px' bg={boxBg}
              icon={<Icon w='32px' h='32px' as={MdRepeat} color={brandColor} />}
            />
          }
          name='재방문'
          value={loading ? '...' : formatNum(kpi.returningVisitors)}
        />
      </SimpleGrid>

      {/* 방문자 & 페이지뷰 추이 (전체 너비) */}
      <Box mb='20px'>
        <VisitorTrendChart />
      </Box>

      {/* 이탈/새로고침/뒤로가기율 */}
      <Box mb='20px'>
        <BehaviorRates />
      </Box>

      {/* 기기통계 + OS/브라우저 + 방문유형 */}
      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap='20px' mb='20px'>
        <DeviceStatsChart />
        <OsBrowserStats />
        <VisitorTypeChart />
      </SimpleGrid>

      {/* 많이 방문한 페이지 + 자주 하는 행동 */}
      <SimpleGrid columns={{ base: 1, md: 2 }} gap='20px' mb='20px'>
        <TopPages />
        <TopActions />
      </SimpleGrid>

      {/* 유입경로 Top5 */}
      <Box mb='20px'>
        <TopReferrers />
      </Box>
    </Box>
  );
}
