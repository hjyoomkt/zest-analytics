import React, { useState } from 'react';
import { useStableFetch } from 'hooks/useStableFetch';
import {
  Box, Flex, Text, Skeleton, Progress, Divider, useColorModeValue,
} from '@chakra-ui/react';
import Card from 'components/card/Card';
import { useAuth } from 'contexts/AuthContext';
import { useDateRange } from 'contexts/DateRangeContext';
import { getOsStats, getBrowserStats } from 'views/admin/zestAnalytics/services/zaService';

const OS_COLORS = {
  Windows: '#4318FF',
  Android: '#39B8FF',
  iOS: '#6AD2FF',
  macOS: '#E56BF0',
  Linux: '#FFB547',
  Unknown: '#A0AEC0',
};

const BROWSER_COLORS = {
  Chrome: '#4318FF',
  Safari: '#39B8FF',
  Edge: '#6AD2FF',
  Firefox: '#E56BF0',
  IE: '#FFB547',
  Unknown: '#A0AEC0',
};

function StatBar({ label, events, users, totalEvents, color, barBg }) {
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const subColor = 'secondaryGray.600';
  const pct = totalEvents > 0 ? Math.round((events / totalEvents) * 100) : 0;

  return (
    <Box mb='10px'>
      <Flex justify='space-between' mb='4px' align='center'>
        <Text color={textColor} fontSize='sm' fontWeight='500' flex='1' minW='0' noOfLines={1}>
          {label}
        </Text>
        <Flex gap='12px' align='center' ms='8px' flexShrink={0}>
          <Flex align='center' gap='3px'>
            <Text color={subColor} fontSize='xs'>이벤트</Text>
            <Text color={textColor} fontSize='xs' fontWeight='700'>{events.toLocaleString()}</Text>
          </Flex>
          <Flex align='center' gap='3px'>
            <Text color={subColor} fontSize='xs'>사용자</Text>
            <Text color={textColor} fontSize='xs' fontWeight='700'>{users.toLocaleString()}</Text>
          </Flex>
          <Text color={subColor} fontSize='xs' minW='28px' textAlign='right'>{pct}%</Text>
        </Flex>
      </Flex>
      <Progress
        value={pct}
        size='xs'
        borderRadius='full'
        bg={barBg}
        sx={{ '& > div': { background: color } }}
      />
    </Box>
  );
}

export default function OsBrowserStats() {
  const { currentAdvertiserId, availableAdvertisers } = useAuth();
  const { startDate, endDate } = useDateRange();
  const [osData, setOsData] = useState([]);
  const [browserData, setBrowserData] = useState([]);
  const [loading, setLoading] = useState(true);

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const subColor = 'secondaryGray.600';
  const dividerColor = useColorModeValue('secondaryGray.200', 'whiteAlpha.200');
  const barBg = useColorModeValue('secondaryGray.200', 'whiteAlpha.100');

  const fetchData = async () => {
    try {
      setLoading(true);
      const ids = (availableAdvertisers || []).map(a => a.id);
      const params = {
        advertiserId: currentAdvertiserId,
        availableAdvertiserIds: ids,
        startDate,
        endDate,
      };
      const [os, browser] = await Promise.all([
        getOsStats(params),
        getBrowserStats(params),
      ]);
      setOsData(os);
      setBrowserData(browser);
    } catch (e) {
      console.error('OsBrowserStats error:', e);
    } finally {
      setLoading(false);
    }
  };

  useStableFetch(fetchData, [currentAdvertiserId, availableAdvertisers, startDate, endDate]);

  const osTotal = osData.reduce((s, r) => s + r.events, 0);
  const browserTotal = browserData.reduce((s, r) => s + r.events, 0);

  return (
    <Card p='20px'>
      <Text color={textColor} fontSize='md' fontWeight='700' mb='16px'>OS / 브라우저</Text>
      {loading ? (
        <Flex direction='column' gap='10px'>
          {[...Array(6)].map((_, i) => <Skeleton key={i} h='28px' borderRadius='8px' />)}
        </Flex>
      ) : (
        <Flex direction='column'>
          {/* OS 섹션 */}
          <Text color={subColor} fontSize='xs' fontWeight='700' textTransform='uppercase' mb='10px'>
            운영체제
          </Text>
          {osData.length === 0 ? (
            <Text color={subColor} fontSize='sm' mb='12px'>데이터가 없습니다</Text>
          ) : (
            osData.map(r => (
              <StatBar
                key={r.os}
                label={r.os}
                events={r.events}
                users={r.users}
                totalEvents={osTotal}
                color={OS_COLORS[r.os] || '#A0AEC0'}
                barBg={barBg}
              />
            ))
          )}

          <Divider borderColor={dividerColor} my='12px' />

          {/* 브라우저 섹션 */}
          <Text color={subColor} fontSize='xs' fontWeight='700' textTransform='uppercase' mb='10px'>
            브라우저
          </Text>
          {browserData.length === 0 ? (
            <Text color={subColor} fontSize='sm'>데이터가 없습니다</Text>
          ) : (
            browserData.map(r => (
              <StatBar
                key={r.browser}
                label={r.browser}
                events={r.events}
                users={r.users}
                totalEvents={browserTotal}
                color={BROWSER_COLORS[r.browser] || '#A0AEC0'}
                barBg={barBg}
              />
            ))
          )}
        </Flex>
      )}
    </Card>
  );
}
