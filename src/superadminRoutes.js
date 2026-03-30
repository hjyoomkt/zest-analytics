import React from 'react';

import { Icon } from '@chakra-ui/react';
import {
  MdPeople,
  MdHome,
  MdDashboard,
  MdBusiness,
  MdStorefront,
} from 'react-icons/md';

// Superadmin Imports
import SuperAdminDashboard from 'views/superadmin/default';
import UserManagement from 'views/superadmin/users';
import AdvertisersManagement from 'views/superadmin/advertisers';
import BrandsManagement from 'views/clientadmin/brands';

const superadminRoutes = [
  {
    name: 'Home',
    layout: '/admin',
    path: '/default',
    icon: <Icon as={MdHome} width="20px" height="20px" color="inherit" />,
    component: null,
    isExternal: true,
  },
  {
    name: 'Admin Dashboard',
    layout: '/superadmin',
    path: '/default',
    icon: <Icon as={MdDashboard} width="20px" height="20px" color="inherit" />,
    component: <SuperAdminDashboard />,
  },
  {
    name: '광고주 관리',
    layout: '/superadmin',
    path: '/advertisers',
    icon: <Icon as={MdBusiness} width="20px" height="20px" color="inherit" />,
    component: <AdvertisersManagement />,
    agencyAdminOnly: true,
  },
  {
    name: '브랜드 관리',
    layout: '/superadmin',
    path: '/brands',
    icon: <Icon as={MdStorefront} width="20px" height="20px" color="inherit" />,
    component: <BrandsManagement />,
  },
  {
    name: '권한 관리',
    layout: '/superadmin',
    path: '/users',
    icon: <Icon as={MdPeople} width="20px" height="20px" color="inherit" />,
    component: <UserManagement />,
    orgAdminOnly: true,
  },
];

export default superadminRoutes;
