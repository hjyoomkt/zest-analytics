import React, { useState } from 'react';
import { useStableFetch } from 'hooks/useStableFetch';
import { Box, Flex, Text, useColorModeValue, Skeleton } from '@chakra-ui/react';
import ReactApexChart from 'react-apexcharts';
import Card from 'components/card/Card';
import { useAuth } from 'contexts/AuthContext';
import { useDateRange } from 'contexts/DateRangeContext';
import { getDailyVisitorTrend } from 'views/admin/zestAnalytics/services/zaService';

export default function VisitorTrendChart() {
  const { currentAdvertiserId, availableAdvertisers } = useAuth();
  const { startDate, endDate } = useDateRange();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const gridColor = useColorModeValue('#E2E8F0', '#2D3748');

  const fetchData = async () => {
    try {
      setLoading(true);
      const ids = (availableAdvertisers || []).map(a => a.id);
      const result = await getDailyVisitorTrend({
        advertiserId: currentAdvertiserId,
        availableAdvertiserIds: ids,
        startDate,
        endDate,
      });
      setData(result);
    } catch (e) {
      console.error('VisitorTrendChart error:', e);
    } finally {
      setLoading(false);
    }
  };

  useStableFetch(fetchData, [currentAdvertiserId, availableAdvertisers, startDate, endDate]);

  const categories = data.map(d => d.date);
  const visitors = data.map(d => d.visitors);
  const pageviews = data.map(d => d.pageviews);

  const series = [
    { name: '방문자수', data: visitors },
    { name: '페이지뷰', data: pageviews },
  ];

  const options = {
    chart: { type: 'line', toolbar: { show: false }, zoom: { enabled: false } },
    stroke: { curve: 'smooth', width: [2, 2] },
    colors: ['#4318FF', '#39B8FF'],
    xaxis: {
      categories,
      labels: {
        style: { colors: '#A0AEC0', fontSize: '11px' },
        formatter: (val) => val ? val.slice(5) : val, // MM-DD만 표시
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { colors: '#A0AEC0', fontSize: '11px' } },
    },
    grid: { borderColor: gridColor, strokeDashArray: 3 },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '12px',
      labels: { colors: '#A0AEC0' },
    },
    tooltip: { x: { show: true } },
    dataLabels: { enabled: false },
  };

  return (
    <Card p='20px'>
      <Flex justify='space-between' align='center' mb='16px'>
        <Text color={textColor} fontSize='md' fontWeight='700'>
          방문자 & 페이지뷰 추이
        </Text>
      </Flex>
      {loading ? (
        <Skeleton h='240px' borderRadius='12px' />
      ) : data.length === 0 ? (
        <Flex h='240px' align='center' justify='center'>
          <Text color='secondaryGray.600' fontSize='sm'>데이터가 없습니다</Text>
        </Flex>
      ) : (
        <Box h='240px'>
          <ReactApexChart options={options} series={series} type='line' width='100%' height='100%' />
        </Box>
      )}
    </Card>
  );
}
