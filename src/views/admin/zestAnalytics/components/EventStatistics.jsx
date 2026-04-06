/**
 * ============================================================================
 * EventStatistics - 이벤트 통계 KPI 카드
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { SimpleGrid, Icon, useColorModeValue, Box, Flex, Text, Divider } from '@chakra-ui/react';
import MiniStatistics from 'components/card/MiniStatistics';
import IconBox from 'components/icons/IconBox';
import Card from 'components/card/Card';
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

  const brandColor = useColorModeValue('brand.500', 'white');
  const boxBg = useColorModeValue('secondaryGray.300', 'whiteAlpha.100');
  const attrLabelColor = useColorModeValue('gray.400', 'gray.500');
  const attrValueColor = useColorModeValue('gray.700', 'white');
  const attrTitleColor = useColorModeValue('gray.500', 'gray.400');
  const attrBrandColor = useColorModeValue('brand.500', 'brand.400');

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
              bg={boxBg}
              icon={<Icon w="32px" h="32px" as={MdBarChart} color={brandColor} />}
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
              bg={boxBg}
              icon={<Icon w="32px" h="32px" as={MdShoppingCart} color={brandColor} />}
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
              bg={boxBg}
              icon={<Icon w="32px" h="32px" as={MdPerson} color={brandColor} />}
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
              bg={boxBg}
              icon={<Icon w="32px" h="32px" as={MdTrendingUp} color={brandColor} />}
            />
          }
          name="전환 매출"
          value={`₩${stats.revenue.toLocaleString()}`}
        />
      </SimpleGrid>

      {/* 두 번째 줄: 어트리뷰션 통계 - 단일 카드 */}
      <Card mb="20px" px="24px" py="16px">
        <Text fontSize="sm" fontWeight="700" color={attrTitleColor} mb="12px">
          어트리뷰션 윈도우
        </Text>
        <Flex
          direction={{ base: 'column', md: 'row' }}
          align={{ base: 'flex-start', md: 'center' }}
          gap={{ base: '12px', md: '0' }}
          divider={<Divider orientation="vertical" h="40px" display={{ base: 'none', md: 'block' }} />}
        >
          {[
            { label: '1일 이내 전환',    value: attribution.window1Day.toLocaleString(),  sub: attribution.window28Day > 0 ? `${((attribution.window1Day / attribution.window28Day) * 100).toFixed(1)}%` : '-' },
            { label: '7일 이내 전환',    value: attribution.window7Day.toLocaleString(),  sub: attribution.window28Day > 0 ? `${((attribution.window7Day / attribution.window28Day) * 100).toFixed(1)}%` : '-' },
            { label: '28일 이내 전환',   value: attribution.window28Day.toLocaleString(), sub: '100%' },
            { label: '평균 전환 소요일', value: `${attribution.avgDaysSinceClick.toFixed(1)}일`, sub: null },
          ].map((item, i) => (
            <Flex key={i} flex="1" direction="column" align="center" px={{ base: '0', md: '16px' }} gap="2px">
              <Text fontSize="xs" color={attrLabelColor} fontWeight="500">
                {item.label}
              </Text>
              <Text fontSize="lg" fontWeight="700" color={attrValueColor}>
                {item.value}
              </Text>
              <Text fontSize="xs" color={attrBrandColor} fontWeight="600" visibility={item.sub ? 'visible' : 'hidden'}>
                {item.sub ?? '-'}
              </Text>
            </Flex>
          ))}
        </Flex>
      </Card>
    </>
  );
}
