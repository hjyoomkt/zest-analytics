import React, { useEffect, useState } from 'react';
import { Box, Flex, Text, useColorModeValue, Skeleton } from '@chakra-ui/react';
import ReactApexChart from 'react-apexcharts';
import Card from 'components/card/Card';
import { useAuth } from 'contexts/AuthContext';
import { useDateRange } from 'contexts/DateRangeContext';
import { getHourlyVisitors } from 'views/admin/zestAnalytics/services/zaService';

export default function HourlyVisitorChart() {
  const { currentAdvertiserId, availableAdvertisers } = useAuth();
  const { startDate, endDate } = useDateRange();
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const gridColor = useColorModeValue('#E2E8F0', '#2D3748');
  const fillColor = useColorModeValue('#E9E3FF', '#3B2F7A');

  useEffect(() => {
    fetchData();
  }, [currentAdvertiserId, availableAdvertisers, startDate, endDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const ids = (availableAdvertisers || []).map(a => a.id);
      const result = await getHourlyVisitors({
        advertiserId: currentAdvertiserId,
        availableAdvertiserIds: ids,
        startDate,
        endDate,
      });
      setData(result);
      setTotal(result.reduce((s, r) => s + r.visitor_count, 0));
    } catch (e) {
      console.error('HourlyVisitorChart error:', e);
    } finally {
      setLoading(false);
    }
  };

  const categories = data.map(d => `${String(d.hour).padStart(2, '0')}시`);
  const series = [{ name: '방문자', data: data.map(d => d.visitor_count) }];

  const options = {
    chart: { type: 'area', toolbar: { show: false }, zoom: { enabled: false }, sparkline: { enabled: false } },
    stroke: { curve: 'smooth', width: 2, colors: ['#4318FF'] },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.05,
        stops: [0, 90, 100],
        colorStops: [{ offset: 0, color: '#4318FF', opacity: 0.4 }, { offset: 100, color: '#4318FF', opacity: 0.05 }],
      },
    },
    colors: ['#4318FF'],
    xaxis: {
      categories,
      labels: { style: { colors: '#A0AEC0', fontSize: '10px' }, rotate: 0 },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tickAmount: 6,
    },
    yaxis: { labels: { style: { colors: '#A0AEC0', fontSize: '11px' } }, min: 0 },
    grid: { borderColor: gridColor, strokeDashArray: 3 },
    dataLabels: { enabled: false },
    tooltip: { x: { show: true }, y: { formatter: (val) => `${val.toLocaleString()}명` } },
    legend: { show: false },
  };

  return (
    <Card p='20px'>
      <Flex justify='space-between' align='flex-start' mb='8px'>
        <Box>
          <Text color='secondaryGray.600' fontSize='sm' fontWeight='500' mb='4px'>
            들어온 인원 추이
          </Text>
          <Text color={textColor} fontSize='2xl' fontWeight='700' lineHeight='100%'>
            {loading ? '...' : total.toLocaleString()}
          </Text>
        </Box>
      </Flex>
      {loading ? (
        <Skeleton h='180px' borderRadius='12px' mt='12px' />
      ) : (
        <Box h='180px' mt='8px'>
          <ReactApexChart options={options} series={series} type='area' width='100%' height='100%' />
        </Box>
      )}
    </Card>
  );
}
