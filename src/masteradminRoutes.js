import React from 'react';
import { Icon } from '@chakra-ui/react';
import { MdShield, MdHome } from 'react-icons/md';

import IpFilterConsole from 'views/masteradmin/ipFilter';

const masteradminRoutes = [
  {
    name: 'Home',
    layout: '/superadmin',
    path: '/default',
    icon: <Icon as={MdHome} width="20px" height="20px" color="inherit" />,
    component: null,
    isExternal: true,
  },
  {
    name: 'IP 필터 관리',
    layout: '/masteradmin',
    path: '/ip-filter',
    icon: <Icon as={MdShield} width="20px" height="20px" color="inherit" />,
    component: <IpFilterConsole />,
  },
];

export default masteradminRoutes;
