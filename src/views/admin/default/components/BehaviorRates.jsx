import React, { useState } from 'react';
import { useStableFetch } from 'hooks/useStableFetch';
import { Flex, Text, Skeleton, useColorModeValue } from '@chakra-ui/react';
import Card from 'components/card/Card';
import MiniStatistics from 'components/card/MiniStatistics';
import IconBox from 'components/icons/IconBox';
import { Icon, SimpleGrid } from '@chakra-ui/react';
import { MdCallMissed, MdRefresh, MdArrowBack } from 'react-icons/md';
import { useAuth } from 'contexts/AuthContext';
import { useDateRange } from 'contexts/DateRangeContext';
import { getBehaviorRates } from 'views/admin/zestAnalytics/services/zaService';

export default function BehaviorRates() {
  const { currentAdvertiserId, availableAdvertisers } = useAuth();
  const { startDate, endDate } = useDateRange();
  const [rates, setRates] = useState({ bounceRate: 0, refreshRate: 0, backRate: 0 });
  const [loading, setLoading] = useState(true);

  const brandColor = useColorModeValue('brand.500', 'white');
  const boxBg = useColorModeValue('secondaryGray.300', 'whiteAlpha.100');

  const fetchData = async () => {
    try {
      setLoading(true);
      const ids = (availableAdvertisers || []).map(a => a.id);
      const result = await getBehaviorRates({
        advertiserId: currentAdvertiserId,
        availableAdvertiserIds: ids,
        startDate,
        endDate,
      });
      setRates(result);
    } catch (e) {
      console.error('BehaviorRates error:', e);
    } finally {
      setLoading(false);
    }
  };

  useStableFetch(fetchData, [currentAdvertiserId, availableAdvertisers, startDate, endDate]);

  return (
    <SimpleGrid columns={{ base: 1, md: 3 }} gap='20px'>
      <MiniStatistics
        startContent={
          <IconBox w='56px' h='56px' bg={boxBg}
            icon={<Icon w='32px' h='32px' as={MdCallMissed} color={brandColor} />}
          />
        }
        name='이탈률'
        value={loading ? '...' : `${rates.bounceRate}%`}
      />
      <MiniStatistics
        startContent={
          <IconBox w='56px' h='56px' bg={boxBg}
            icon={<Icon w='32px' h='32px' as={MdRefresh} color={brandColor} />}
          />
        }
        name='새로고침률'
        value={loading ? '...' : `${rates.refreshRate}%`}
      />
      <MiniStatistics
        startContent={
          <IconBox w='56px' h='56px' bg={boxBg}
            icon={<Icon w='32px' h='32px' as={MdArrowBack} color={brandColor} />}
          />
        }
        name='뒤로가기율'
        value={loading ? '...' : `${rates.backRate}%`}
      />
    </SimpleGrid>
  );
}
