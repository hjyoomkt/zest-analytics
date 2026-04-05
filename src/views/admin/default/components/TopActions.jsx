import React, { useState } from 'react';
import { useStableFetch } from 'hooks/useStableFetch';
import { Flex, Text, Skeleton, Badge, useColorModeValue } from '@chakra-ui/react';
import Card from 'components/card/Card';
import { useAuth } from 'contexts/AuthContext';
import { useDateRange } from 'contexts/DateRangeContext';
import { getTopActions } from 'views/admin/zestAnalytics/services/zaService';

const EVENT_BADGE = {
  pageview: { label: '방문', color: 'purple' },
  scroll: { label: '스크롤', color: 'blue' },
  click: { label: '클릭', color: 'green' },
  purchase: { label: '구매', color: 'orange' },
  add_to_cart: { label: '장바구니', color: 'cyan' },
  signup: { label: '가입', color: 'pink' },
};

export default function TopActions() {
  const { currentAdvertiserId, availableAdvertisers } = useAuth();
  const { startDate, endDate } = useDateRange();
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const subColor = 'secondaryGray.600';
  const rowBorderColor = useColorModeValue('secondaryGray.100', 'whiteAlpha.100');

  const fetchData = async () => {
    try {
      setLoading(true);
      const ids = (availableAdvertisers || []).map(a => a.id);
      const result = await getTopActions({
        advertiserId: currentAdvertiserId,
        availableAdvertiserIds: ids,
        startDate,
        endDate,
        limit: 10,
      });
      setActions(result);
    } catch (e) {
      console.error('TopActions error:', e);
    } finally {
      setLoading(false);
    }
  };

  useStableFetch(fetchData, [currentAdvertiserId, availableAdvertisers, startDate, endDate]);

  return (
    <Card p='20px'>
      <Flex justify='space-between' align='center' mb='16px'>
        <Text color={textColor} fontSize='md' fontWeight='700'>자주 하는 행동</Text>
      </Flex>
      {loading ? (
        <Flex direction='column' gap='10px'>
          {[...Array(5)].map((_, i) => <Skeleton key={i} h='32px' borderRadius='8px' />)}
        </Flex>
      ) : actions.length === 0 ? (
        <Flex h='120px' align='center' justify='center'>
          <Text color={subColor} fontSize='sm'>데이터가 없습니다</Text>
        </Flex>
      ) : (
        <Flex direction='column' gap='8px'>
          {actions.map((a, idx) => {
            const badge = EVENT_BADGE[a.event_type] || { label: a.event_type, color: 'gray' };
            return (
              <Flex key={idx} justify='space-between' align='center' py='6px'
                borderBottom='1px solid' borderColor={rowBorderColor}>
                <Flex align='center' gap='8px' flex='1' minW='0'>
                  <Text color={subColor} fontSize='xs' fontWeight='600' minW='16px'>{idx + 1}</Text>
                  <Badge colorScheme={badge.color} fontSize='10px' borderRadius='4px' px='6px'>
                    {badge.label}
                  </Badge>
                  <Text color={textColor} fontSize='sm' fontWeight='500' noOfLines={1} title={a.label}>
                    {a.label}
                  </Text>
                </Flex>
                <Text color={textColor} fontSize='sm' fontWeight='700' ms='8px'>
                  {a.count.toLocaleString()}회
                </Text>
              </Flex>
            );
          })}
        </Flex>
      )}
    </Card>
  );
}
