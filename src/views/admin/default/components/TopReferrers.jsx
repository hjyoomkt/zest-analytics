import React, { useState } from 'react';
import { useStableFetch } from 'hooks/useStableFetch';
import {
  Box, Flex, Text, Skeleton, useColorModeValue,
  Button, Menu, MenuButton, MenuList, MenuItem, Icon,
} from '@chakra-ui/react';
import { MdKeyboardArrowDown } from 'react-icons/md';
import ReactApexChart from 'react-apexcharts';
import Card from 'components/card/Card';
import { useAuth } from 'contexts/AuthContext';
import { useDateRange } from 'contexts/DateRangeContext';
import { getTopReferrers } from 'views/admin/zestAnalytics/services/zaService';

const ATTRIBUTION_OPTIONS = [
  { value: 'first_touch', label: '퍼스트터치' },
  { value: 'visitor',     label: '방문자'     },
  { value: 'session',     label: '세션'       },
];

const COLORS = ['#4318FF', '#39B8FF', '#6AD2FF', '#E56BF0', '#FFB547'];

export default function TopReferrers() {
  const { currentAdvertiserId, availableAdvertisers } = useAuth();
  const { startDate, endDate } = useDateRange();
  const [refs, setRefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attributionModel, setAttributionModel] = useState('first_touch');

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const subColor = 'secondaryGray.600';
  const inputBg = useColorModeValue('white', 'navy.700');
  const borderColor = useColorModeValue('gray.300', 'whiteAlpha.300');
  const bgHover = useColorModeValue('secondaryGray.100', 'whiteAlpha.100');
  const dropdownTextColor = useColorModeValue('gray.700', 'white');
  const brandColor = useColorModeValue('brand.500', 'brand.400');

  const fetchData = async () => {
    try {
      setLoading(true);
      const ids = (availableAdvertisers || []).map(a => a.id);
      const result = await getTopReferrers({
        advertiserId: currentAdvertiserId,
        availableAdvertiserIds: ids,
        startDate,
        endDate,
        limit: 5,
        attributionModel,
      });
      setRefs(result);
    } catch (e) {
      console.error('TopReferrers error:', e);
    } finally {
      setLoading(false);
    }
  };

  useStableFetch(fetchData, [currentAdvertiserId, availableAdvertisers, startDate, endDate, attributionModel]);

  const total = refs.reduce((s, r) => s + r.count, 0);
  const series = refs.map(r => r.count);
  const labels = refs.map(r => r.referrer);

  const options = {
    chart: { type: 'donut' },
    labels,
    colors: COLORS.slice(0, refs.length),
    legend: { show: false },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: '68%',
          labels: {
            show: true,
            total: {
              show: true,
              label: '합계',
              color: '#A0AEC0',
              fontSize: '12px',
              formatter: () => total.toLocaleString(),
            },
            value: { color: textColor, fontSize: '18px', fontWeight: '700' },
          },
        },
      },
    },
    tooltip: { y: { formatter: (val) => `${val.toLocaleString()}명` } },
  };

  return (
    <Card p='20px'>
      <Flex justify='space-between' align='center' mb='16px'>
        <Text color={textColor} fontSize='md' fontWeight='700'>
          유입경로 Top5
        </Text>
        <Menu>
          <MenuButton
            as={Button}
            rightIcon={<Icon as={MdKeyboardArrowDown} />}
            bg={inputBg}
            border='1px solid'
            borderColor={borderColor}
            color={dropdownTextColor}
            fontWeight='600'
            fontSize='xs'
            _hover={{ bg: bgHover }}
            _active={{ bg: bgHover }}
            px='10px'
            h='36px'
            borderRadius='8px'
          >
            {ATTRIBUTION_OPTIONS.find(o => o.value === attributionModel)?.label}
          </MenuButton>
          <MenuList minW='auto' w='fit-content' px='8px' py='8px' zIndex={2000}>
            {ATTRIBUTION_OPTIONS.map(opt => (
              <MenuItem
                key={opt.value}
                onClick={() => setAttributionModel(opt.value)}
                bg={attributionModel === opt.value ? brandColor : 'transparent'}
                color={attributionModel === opt.value ? 'white' : dropdownTextColor}
                _hover={{ bg: attributionModel === opt.value ? brandColor : bgHover }}
                fontWeight={attributionModel === opt.value ? '600' : '500'}
                fontSize='sm'
                px='12px'
                py='8px'
                borderRadius='8px'
                justifyContent='center'
                minH='auto'
              >
                {opt.label}
              </MenuItem>
            ))}
          </MenuList>
        </Menu>
      </Flex>
      {loading ? (
        <Skeleton h='200px' borderRadius='12px' />
      ) : refs.length === 0 ? (
        <Flex h='200px' align='center' justify='center'>
          <Text color={subColor} fontSize='sm'>데이터가 없습니다</Text>
        </Flex>
      ) : (
        <Flex direction={{ base: 'column', md: 'row' }} gap='20px' align='center'>
          <Box minW='160px' h='160px'>
            <ReactApexChart options={options} series={series} type='donut' width='100%' height='100%' />
          </Box>
          <Flex direction='column' flex='1' gap='10px' w='100%'>
            {refs.map((r, idx) => (
              <Flex key={r.referrer} justify='space-between' align='center'>
                <Flex align='center' gap='8px' flex='1' minW='0'>
                  <Box h='8px' w='8px' borderRadius='50%' bg={COLORS[idx]} flexShrink={0} />
                  <Text color={textColor} fontSize='sm' fontWeight='500' noOfLines={1} title={r.referrer}>
                    {r.referrer}
                  </Text>
                </Flex>
                <Flex align='center' gap='12px' ms='8px'>
                  <Text color={subColor} fontSize='sm'>{r.pct}%</Text>
                  <Text color={textColor} fontSize='sm' fontWeight='700'>{r.count.toLocaleString()}</Text>
                </Flex>
              </Flex>
            ))}
          </Flex>
        </Flex>
      )}
    </Card>
  );
}
