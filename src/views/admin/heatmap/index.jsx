import React from 'react';
import { Box } from '@chakra-ui/react';
import { PageHelmet } from 'components/HelmetProvider';
import { useAuth } from 'contexts/AuthContext';
import HeatmapViewer from 'views/admin/zestAnalytics/components/HeatmapViewer';

export default function Heatmap() {
  const { currentAdvertiserId, availableAdvertisers } = useAuth();
  const availableAdvertiserIds = availableAdvertisers.map((a) => a.id);

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <PageHelmet
        title="UX 히트맵 | Growth Analytics"
        description="스크롤 도달률 기반 UX 히트맵"
        keywords="히트맵, 스크롤 분석, UX, 도달률"
      />
      <HeatmapViewer
        advertiserId={currentAdvertiserId}
        availableAdvertiserIds={availableAdvertiserIds}
      />
    </Box>
  );
}
