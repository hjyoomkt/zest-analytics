import React, { useState } from 'react';
import { useStableFetch } from 'hooks/useStableFetch';
import {
  Box, Flex, Text, Skeleton, Link,
  useColorModeValue,
} from '@chakra-ui/react';
import Card from 'components/card/Card';
import { useAuth } from 'contexts/AuthContext';
import { useDateRange } from 'contexts/DateRangeContext';
import { getTopPages } from 'views/admin/zestAnalytics/services/zaService';

const decodeUrl = (url) => { try { return decodeURIComponent(url); } catch { return url; } };

export default function TopPages() {
  const { currentAdvertiserId, availableAdvertisers } = useAuth();
  const { startDate, endDate } = useDateRange();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const subColor = 'secondaryGray.600';
  const barBg = useColorModeValue('secondaryGray.200', 'whiteAlpha.100');
  const barFill = useColorModeValue('brand.500', 'brand.400');

  const fetchData = async () => {
    try {
      setLoading(true);
      const ids = (availableAdvertisers || []).map(a => a.id);
      const result = await getTopPages({
        advertiserId: currentAdvertiserId,
        availableAdvertiserIds: ids,
        startDate,
        endDate,
        limit: 10,
      });
      setPages(result);
    } catch (e) {
      console.error('TopPages error:', e);
    } finally {
      setLoading(false);
    }
  };

  useStableFetch(fetchData, [currentAdvertiserId, availableAdvertisers, startDate, endDate]);

  const maxPv = pages.length > 0 ? pages[0].pageviews : 1;

  return (
    <Card p='20px'>
      <Flex justify='space-between' align='center' mb='16px'>
        <Text color={textColor} fontSize='md' fontWeight='700'>많이 방문한 페이지</Text>
      </Flex>
      {loading ? (
        <Flex direction='column' gap='12px'>
          {[...Array(5)].map((_, i) => <Skeleton key={i} h='36px' borderRadius='8px' />)}
        </Flex>
      ) : pages.length === 0 ? (
        <Flex h='120px' align='center' justify='center'>
          <Text color={subColor} fontSize='sm'>데이터가 없습니다</Text>
        </Flex>
      ) : (
        <Flex direction='column' gap='10px'>
          {pages.map((p, idx) => (
            <Box key={p.page_url}>
              <Flex justify='space-between' mb='4px'>
                <Flex align='center' gap='8px' flex='1' minW='0'>
                  <Text color={subColor} fontSize='xs' fontWeight='600' minW='16px'>{idx + 1}</Text>
                  <Text
                    color={textColor}
                    fontSize='sm'
                    fontWeight='500'
                    noOfLines={1}
                    title={decodeUrl(p.page_url)}>
                    {decodeUrl(p.page_url)}
                  </Text>
                </Flex>
                <Text color={textColor} fontSize='sm' fontWeight='700' ms='8px'>
                  {p.pageviews.toLocaleString()}
                </Text>
              </Flex>
              <Box bg={barBg} borderRadius='full' h='4px'>
                <Box
                  bg={barFill}
                  borderRadius='full'
                  h='4px'
                  w={`${Math.round((p.pageviews / maxPv) * 100)}%`}
                  transition='width 0.4s'
                />
              </Box>
            </Box>
          ))}
        </Flex>
      )}
    </Card>
  );
}
