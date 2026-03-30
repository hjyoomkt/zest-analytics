import React from 'react';

import { Icon } from '@chakra-ui/react';
import {
  MdPeopleOutline,
  MdHome,
  MdDashboard,
  MdBusiness,
} from 'react-icons/md';

// Client Admin Imports
import ClientAdminDashboard from 'views/clientadmin/default';
import UserManagement from 'views/admin/users';
import BrandManagement from 'views/clientadmin/brands';

const clientAdminRoutes = [
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
    layout: '/clientadmin',
    path: '/default',
    icon: <Icon as={MdDashboard} width="20px" height="20px" color="inherit" />,
    component: <ClientAdminDashboard />,
  },
  {
    name: '팀원 관리',
    layout: '/clientadmin',
    path: '/users',
    icon: <Icon as={MdPeopleOutline} width="20px" height="20px" color="inherit" />,
    component: <UserManagement />,
  },
  {
    name: '브랜드 관리',
    layout: '/clientadmin',
    path: '/brands',
    icon: <Icon as={MdBusiness} width="20px" height="20px" color="inherit" />,
    component: <BrandManagement />,
  },
];

export default clientAdminRoutes;
