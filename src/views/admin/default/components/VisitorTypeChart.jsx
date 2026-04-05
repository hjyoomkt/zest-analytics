import React, { useState } from 'react';
import { useStableFetch } from 'hooks/useStableFetch';
import { Box, Flex, Text, useColorModeValue, Skeleton } from '@chakra-ui/react';
import ReactApexChart from 'react-apexcharts';
import Card from 'components/card/Card';
import { VSeparator } from 'components/separator/Separator';
import { useAuth } from 'contexts/AuthContext';
import { useDateRange } from 'contexts/DateRangeContext';
import { getVisitorTypeStats } from 'views/admin/zestAnalytics/services/zaService';

export default function VisitorTypeChart() {
  const { currentAdvertiserId, availableAdvertisers } = useAuth();
  const { startDate, endDate } = useDateRange();
  const [stats, setStats] = useState({ newVisitors: 0, returningVisitors: 0 });
  const [loading, setLoading] = useState(true);

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const cardColor = useColorModeValue('white', 'navy.700');
  const cardShadow = useColorModeValue('0px 18px 40px rgba(112,144,176,0.12)', 'unset');

  const fetchData = async () => {
    try {
      setLoading(true);
      const ids = (availableAdvertisers || []).map(a => a.id);
      const result = await getVisitorTypeStats({
        advertiserId: currentAdvertiserId,
        availableAdvertiserIds: ids,
        startDate,
        endDate,
      });
      setStats(result);
    } catch (e) {
      console.error('VisitorTypeChart error:', e);
    } finally {
      setLoading(false);
    }
  };

  useStableFetch(fetchData, [currentAdvertiserId, availableAdvertisers, startDate, endDate]);

  const total = stats.newVisitors + stats.returningVisitors;
  const newPct = total > 0 ? ((stats.newVisitors / total) * 100).toFixed(1) : 0;
  const retPct = total > 0 ? ((stats.returningVisitors / total) * 100).toFixed(1) : 0;

  const series = [stats.newVisitors, stats.returningVisitors];
  const options = {
    chart: { type: 'donut' },
    labels: ['신규 방문', '재방문'],
    colors: ['#4318FF', '#39B8FF'],
    legend: { show: false },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            total: {
              show: true,
              label: '전체',
              color: '#A0AEC0',
              fontSize: '12px',
              formatter: () => total.toLocaleString(),
            },
            value: {
              color: textColor,
              fontSize: '20px',
              fontWeight: '700',
            },
          },
        },
      },
    },
    tooltip: { y: { formatter: (val) => `${val.toLocaleString()}명` } },
  };

  return (
    <Card p='20px' align='center'>
      <Flex justify='space-between' align='center' w='100%' mb='8px'>
        <Text color={textColor} fontSize='md' fontWeight='700'>
          방문 유형
        </Text>
      </Flex>

      {loading ? (
        <Skeleton h='200px' w='100%' borderRadius='12px' />
      ) : total === 0 ? (
        <Flex h='200px' align='center' justify='center'>
          <Text color='secondaryGray.600' fontSize='sm'>데이터가 없습니다</Text>
        </Flex>
      ) : (
        <>
          <Box h='160px' w='100%'>
            <ReactApexChart options={options} series={series} type='donut' width='100%' height='100%' />
          </Box>
          <Card
            bg={cardColor}
            flexDirection='row'
            boxShadow={cardShadow}
            w='100%'
            p='12px'
            px='20px'
            mt='12px'
            mx='auto'
            justify='center'>
            <Flex direction='column' py='4px' align='center'>
              <Flex align='center'>
                <Box h='8px' w='8px' bg='brand.500' borderRadius='50%' me='4px' />
                <Text fontSize='xs' color='secondaryGray.600' fontWeight='700' mb='3px'>신규 방문</Text>
              </Flex>
              <Text fontSize='md' color={textColor} fontWeight='700'>{newPct}%</Text>
            </Flex>
            <VSeparator mx={{ base: '40px', xl: '50px' }} />
            <Flex direction='column' py='4px' align='center'>
              <Flex align='center'>
                <Box h='8px' w='8px' bg='#39B8FF' borderRadius='50%' me='4px' />
                <Text fontSize='xs' color='secondaryGray.600' fontWeight='700' mb='3px'>재방문</Text>
              </Flex>
              <Text fontSize='md' color={textColor} fontWeight='700'>{retPct}%</Text>
            </Flex>
          </Card>
        </>
      )}
    </Card>
  );
}
