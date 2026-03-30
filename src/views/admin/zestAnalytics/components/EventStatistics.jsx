/**
 * ============================================================================
 * EventStatistics - 이벤트 통계 KPI 카드
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { SimpleGrid } from '@chakra-ui/react';
import MiniStatistics from 'components/card/MiniStatistics';
import IconBox from 'components/icons/IconBox';
import { MdBarChart, MdShoppingCart, MdPerson, MdTrendingUp } from 'react-icons/md';
import { getEventStatistics, getAttributionStats } from '../services/zaService';

export default function EventStatistics({
  advertiserId,
  availableAdvertiserIds,
  startDate,
  endDate,
}) {
  const [stats, setStats] = useState({
    totalEvents: 0,
    purchases: 0,
    signups: 0,
    revenue: 0,
    attributedEvents: 0,
  });

  const [attribution, setAttribution] = useState({
    window1Day: 0,
    window7Day: 0,
    window28Day: 0,
    avgDaysSinceClick: 0,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStatistics();
  }, [advertiserId, startDate, endDate]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const [statsData, attrData] = await Promise.all([
        getEventStatistics({
          advertiserId,
          availableAdvertiserIds,
          startDate,
          endDate,
        }),
        getAttributionStats({
          advertiserId,
          availableAdvertiserIds,
          startDate,
          endDate,
        }),
      ]);
      setStats(statsData);
      setAttribution(attrData);
    } catch (error) {
      console.error('통계 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 첫 번째 줄: 주요 KPI */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap="20px" mb="20px">
        <MiniStatistics
          startContent={
            <IconBox
              w="56px"
              h="56px"
              bg="linear-gradient(90deg, #4481EB 0%, #04BEFE 100%)"
              icon={<MdBarChart size="32px" color="white" />}
            />
          }
          name="총 이벤트"
          value={stats.totalEvents.toLocaleString()}
        />
        <MiniStatistics
          startContent={
            <IconBox
              w="56px"
              h="56px"
              bg="linear-gradient(90deg, #FF9966 0%, #FF5E62 100%)"
              icon={<MdShoppingCart size="28px" color="white" />}
            />
          }
          name="구매 전환"
          value={stats.purchases.toLocaleString()}
        />
        <MiniStatistics
          startContent={
            <IconBox
              w="56px"
              h="56px"
              bg="linear-gradient(90deg, #868CFF 0%, #4318FF 100%)"
              icon={<MdPerson size="28px" color="white" />}
            />
          }
          name="회원가입"
          value={stats.signups.toLocaleString()}
        />
        <MiniStatistics
          startContent={
            <IconBox
              w="56px"
              h="56px"
              bg="linear-gradient(90deg, #56CCF2 0%, #2F80ED 100%)"
              icon={<MdTrendingUp size="28px" color="white" />}
            />
          }
          name="전환 매출"
          value={`₩${stats.revenue.toLocaleString()}`}
        />
      </SimpleGrid>

      {/* 두 번째 줄: 어트리뷰션 통계 */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap="20px" mb="20px">
        <MiniStatistics
          name="1일 이내 전환"
          value={attribution.window1Day.toLocaleString()}
          growth={
            attribution.window28Day > 0
              ? `${((attribution.window1Day / attribution.window28Day) * 100).toFixed(1)}%`
              : '0%'
          }
        />
        <MiniStatistics
          name="7일 이내 전환"
          value={attribution.window7Day.toLocaleString()}
          growth={
            attribution.window28Day > 0
              ? `${((attribution.window7Day / attribution.window28Day) * 100).toFixed(1)}%`
              : '0%'
          }
        />
        <MiniStatistics
          name="28일 이내 전환"
          value={attribution.window28Day.toLocaleString()}
          growth={
            attribution.window28Day > 0
              ? `${((attribution.window28Day / attribution.window28Day) * 100).toFixed(1)}%`
              : '0%'
          }
        />
        <MiniStatistics
          name="평균 전환 소요 일수"
          value={`${attribution.avgDaysSinceClick.toFixed(1)}일`}
        />
      </SimpleGrid>
    </>
  );
}
