import React, { useState } from 'react';
import { useStableFetch } from 'hooks/useStableFetch';
import { Box, Flex, Text, useColorModeValue, Skeleton } from '@chakra-ui/react';
import ReactApexChart from 'react-apexcharts';
import Card from 'components/card/Card';
import { VSeparator } from 'components/separator/Separator';
import { useAuth } from 'contexts/AuthContext';
import { useDateRange } from 'contexts/DateRangeContext';
import { getDeviceStats } from 'views/admin/zestAnalytics/services/zaService';

const DEVICE_LABELS = {
  desktop: 'PC',
  mobile: '모바일',
  tablet: '태블릿',
  unknown: '기타',
};

const COLORS = ['#4318FF', '#39B8FF', '#6AD2FF', '#A0AEC0'];

export default function DeviceStatsChart() {
  const { currentAdvertiserId, availableAdvertisers } = useAuth();
  const { startDate, endDate } = useDateRange();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const cardColor = useColorModeValue('white', 'navy.700');
  const cardShadow = useColorModeValue('0px 18px 40px rgba(112,144,176,0.12)', 'unset');

  const fetchData = async () => {
    try {
      setLoading(true);
      const ids = (availableAdvertisers || []).map(a => a.id);
      const result = await getDeviceStats({
        advertiserId: currentAdvertiserId,
        availableAdvertiserIds: ids,
        startDate,
        endDate,
      });
      setData(result);
    } catch (e) {
      console.error('DeviceStatsChart error:', e);
    } finally {
      setLoading(false);
    }
  };

  useStableFetch(fetchData, [currentAdvertiserId, availableAdvertisers, startDate, endDate]);

  const total = data.reduce((s, d) => s + d.count, 0);
  const labels = data.map(d => DEVICE_LABELS[d.device_type] || d.device_type);
  const series = data.map(d => d.count);
  const colors = COLORS.slice(0, data.length);

  const options = {
    chart: { type: 'donut' },
    labels,
    colors,
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
          기기 통계
        </Text>
      </Flex>

      {loading ? (
        <Skeleton h='200px' w='100%' borderRadius='12px' />
      ) : data.length === 0 ? (
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
            px='16px'
            mt='12px'
            mx='auto'
            flexWrap='wrap'
            gap='8px'
            justify='center'>
            {data.map((item, idx) => {
              const pct = total > 0 ? ((item.count / total) * 100).toFixed(1) : 0;
              return (
                <React.Fragment key={item.device_type}>
                  {idx > 0 && <VSeparator mx={{ base: '12px', xl: '16px' }} />}
                  <Flex direction='column' py='4px' align='center'>
                    <Flex align='center'>
                      <Box h='8px' w='8px' bg={colors[idx]} borderRadius='50%' me='4px' />
                      <Text fontSize='xs' color='secondaryGray.600' fontWeight='700' mb='3px'>
                        {DEVICE_LABELS[item.device_type] || item.device_type}
                      </Text>
                    </Flex>
                    <Text fontSize='md' color={textColor} fontWeight='700'>{pct}%</Text>
                  </Flex>
                </React.Fragment>
              );
            })}
          </Card>
        </>
      )}
    </Card>
  );
}
