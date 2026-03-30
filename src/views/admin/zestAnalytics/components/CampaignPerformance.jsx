/**
 * ============================================================================
 * CampaignPerformance - 캠페인별 성과 테이블
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Heading,
  Flex,
  Badge,
  Text,
  Spinner,
} from '@chakra-ui/react';
import Card from 'components/card/Card';
import { getCampaignPerformance } from '../services/zaService';

export default function CampaignPerformance({
  advertiserId,
  availableAdvertiserIds,
  startDate,
  endDate,
}) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, [advertiserId, startDate, endDate]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const data = await getCampaignPerformance({
        advertiserId,
        availableAdvertiserIds,
        startDate,
        endDate,
      });
      setCampaigns(data);
    } catch (error) {
      console.error('캠페인 성과 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <Flex justify="center" align="center" minH="200px">
          <Spinner size="xl" color="brand.500" />
        </Flex>
      </Card>
    );
  }

  return (
    <Card>
      <Heading size="md" mb={4}>
        캠페인별 성과
      </Heading>

      {campaigns.length === 0 ? (
        <Text color="gray.500">캠페인 데이터가 없습니다.</Text>
      ) : (
        <Box overflowX="auto">
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>소스</Th>
                <Th>미디엄</Th>
                <Th>캠페인</Th>
                <Th isNumeric>총 이벤트</Th>
                <Th isNumeric>전환</Th>
                <Th isNumeric>어트리뷰션 전환</Th>
                <Th isNumeric>전환율</Th>
                <Th isNumeric>매출</Th>
                <Th isNumeric>평균 전환 소요</Th>
              </Tr>
            </Thead>
            <Tbody>
              {campaigns.map((campaign, index) => (
                <Tr key={index}>
                  <Td>
                    <Badge colorScheme="blue" fontSize="xs">
                      {campaign.source}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge colorScheme="purple" fontSize="xs">
                      {campaign.medium}
                    </Badge>
                  </Td>
                  <Td fontWeight="medium">{campaign.campaign}</Td>
                  <Td isNumeric>{campaign.totalEvents.toLocaleString()}</Td>
                  <Td isNumeric>
                    <Text fontWeight="bold">{campaign.conversions.toLocaleString()}</Text>
                  </Td>
                  <Td isNumeric>
                    <Text color="green.500">
                      {campaign.attributedConversions.toLocaleString()}
                    </Text>
                  </Td>
                  <Td isNumeric>
                    <Badge
                      colorScheme={campaign.conversionRate > 5 ? 'green' : 'orange'}
                      fontSize="xs"
                    >
                      {campaign.conversionRate.toFixed(2)}%
                    </Badge>
                  </Td>
                  <Td isNumeric fontWeight="bold">
                    ₩{campaign.revenue.toLocaleString()}
                  </Td>
                  <Td isNumeric>
                    <Text fontSize="sm" color="gray.600">
                      {campaign.avgDaysSinceClick.toFixed(1)}일
                    </Text>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          {/* 요약 통계 */}
          <Flex
            mt={4}
            p={3}
            bg="gray.50"
            borderRadius="md"
            justify="space-around"
            flexWrap="wrap"
            gap={4}
          >
            <Box textAlign="center">
              <Text fontSize="sm" color="gray.600">
                총 캠페인 수
              </Text>
              <Text fontSize="xl" fontWeight="bold">
                {campaigns.length}
              </Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="sm" color="gray.600">
                총 이벤트
              </Text>
              <Text fontSize="xl" fontWeight="bold">
                {campaigns.reduce((sum, c) => sum + c.totalEvents, 0).toLocaleString()}
              </Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="sm" color="gray.600">
                총 전환
              </Text>
              <Text fontSize="xl" fontWeight="bold" color="green.500">
                {campaigns.reduce((sum, c) => sum + c.conversions, 0).toLocaleString()}
              </Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="sm" color="gray.600">
                총 매출
              </Text>
              <Text fontSize="xl" fontWeight="bold" color="blue.500">
                ₩{campaigns.reduce((sum, c) => sum + c.revenue, 0).toLocaleString()}
              </Text>
            </Box>
          </Flex>
        </Box>
      )}
    </Card>
  );
}
