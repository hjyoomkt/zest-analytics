/**
 * ============================================================================
 * AttributionAnalysis - 어트리뷰션 윈도우별 분석 차트
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  SimpleGrid,
  Heading,
  Text,
  Flex,
  Badge,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Progress,
} from '@chakra-ui/react';
import Card from 'components/card/Card';
import { getAttributionStats } from '../services/zaService';

export default function AttributionAnalysis({
  advertiserId,
  availableAdvertiserIds,
  startDate,
  endDate,
}) {
  const [stats, setStats] = useState({
    window1Day: 0,
    window7Day: 0,
    window28Day: 0,
    avgDaysSinceClick: 0,
  });

  useEffect(() => {
    fetchStats();
  }, [advertiserId, startDate, endDate]);

  const fetchStats = async () => {
    try {
      const data = await getAttributionStats({
        advertiserId,
        availableAdvertiserIds,
        startDate,
        endDate,
      });
      setStats(data);
    } catch (error) {
      console.error('어트리뷰션 통계 조회 실패:', error);
    }
  };

  // 총 전환 수
  const totalConversions = stats.window28Day;

  // 각 윈도우별 비율 계산
  const window1DayPercent =
    totalConversions > 0 ? (stats.window1Day / totalConversions) * 100 : 0;
  const window7DayPercent =
    totalConversions > 0 ? (stats.window7Day / totalConversions) * 100 : 0;
  const window28DayPercent =
    totalConversions > 0 ? (stats.window28Day / totalConversions) * 100 : 0;

  return (
    <Card>
      <Heading size="md" mb={4}>
        어트리뷰션 윈도우 분석
      </Heading>

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={6}>
        {/* 1일 윈도우 */}
        <Box
          p={4}
          borderRadius="lg"
          bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          color="white"
        >
          <Flex justify="space-between" align="center" mb={2}>
            <Text fontSize="sm" fontWeight="medium" opacity={0.9}>
              1일 이내 전환
            </Text>
            <Badge colorScheme="purple" fontSize="xs">
              즉시 반응
            </Badge>
          </Flex>
          <Text fontSize="3xl" fontWeight="bold">
            {stats.window1Day.toLocaleString()}
          </Text>
          <Progress
            value={window1DayPercent}
            size="sm"
            colorScheme="purple"
            mt={3}
            bg="whiteAlpha.300"
            borderRadius="full"
          />
          <Text fontSize="sm" mt={2} opacity={0.9}>
            전체의 {window1DayPercent.toFixed(1)}%
          </Text>
        </Box>

        {/* 7일 윈도우 */}
        <Box
          p={4}
          borderRadius="lg"
          bg="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
          color="white"
        >
          <Flex justify="space-between" align="center" mb={2}>
            <Text fontSize="sm" fontWeight="medium" opacity={0.9}>
              7일 이내 전환
            </Text>
            <Badge colorScheme="pink" fontSize="xs">
              단기 고려
            </Badge>
          </Flex>
          <Text fontSize="3xl" fontWeight="bold">
            {stats.window7Day.toLocaleString()}
          </Text>
          <Progress
            value={window7DayPercent}
            size="sm"
            colorScheme="pink"
            mt={3}
            bg="whiteAlpha.300"
            borderRadius="full"
          />
          <Text fontSize="sm" mt={2} opacity={0.9}>
            전체의 {window7DayPercent.toFixed(1)}%
          </Text>
        </Box>

        {/* 28일 윈도우 */}
        <Box
          p={4}
          borderRadius="lg"
          bg="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
          color="white"
        >
          <Flex justify="space-between" align="center" mb={2}>
            <Text fontSize="sm" fontWeight="medium" opacity={0.9}>
              28일 이내 전환
            </Text>
            <Badge colorScheme="cyan" fontSize="xs">
              장기 고려
            </Badge>
          </Flex>
          <Text fontSize="3xl" fontWeight="bold">
            {stats.window28Day.toLocaleString()}
          </Text>
          <Progress
            value={window28DayPercent}
            size="sm"
            colorScheme="cyan"
            mt={3}
            bg="whiteAlpha.300"
            borderRadius="full"
          />
          <Text fontSize="sm" mt={2} opacity={0.9}>
            전체의 {window28DayPercent.toFixed(1)}%
          </Text>
        </Box>
      </SimpleGrid>

      {/* 인사이트 카드 */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <Box p={4} bg="gray.50" borderRadius="md">
          <Stat>
            <StatLabel>평균 전환 소요 시간</StatLabel>
            <StatNumber>{stats.avgDaysSinceClick.toFixed(1)}일</StatNumber>
            <StatHelpText>
              {stats.avgDaysSinceClick < 3
                ? '빠른 전환율 ⚡'
                : stats.avgDaysSinceClick < 10
                ? '적절한 고려 시간 ✅'
                : '긴 고려 시간 🕐'}
            </StatHelpText>
          </Stat>
        </Box>

        <Box p={4} bg="gray.50" borderRadius="md">
          <Stat>
            <StatLabel>즉시 전환 비율</StatLabel>
            <StatNumber>{window1DayPercent.toFixed(1)}%</StatNumber>
            <StatHelpText>
              {window1DayPercent > 50
                ? '높은 즉시 전환 🎯'
                : window1DayPercent > 30
                ? '중간 즉시 전환 📊'
                : '낮은 즉시 전환 💭'}
            </StatHelpText>
          </Stat>
        </Box>
      </SimpleGrid>

      {/* 설명 */}
      <Box mt={4} p={3} bg="blue.50" borderRadius="md">
        <Text fontSize="sm" color="blue.800">
          💡 <strong>어트리뷰션 윈도우란?</strong> 광고 클릭 후 전환이 발생하기까지의
          시간입니다. 1일/7일/28일 이내 전환을 각각 추적하여 광고의 즉각적 효과와 장기적
          영향을 모두 파악할 수 있습니다.
        </Text>
      </Box>
    </Card>
  );
}
