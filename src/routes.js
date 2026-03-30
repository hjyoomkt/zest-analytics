import React from 'react';

import { Icon } from '@chakra-ui/react';
import {
  MdBarChart,
  MdPerson,
  MdHome,
  MdLock,
  MdOutlineShoppingCart,
  MdTrackChanges,
  MdSecurity,
  MdBusiness,
} from 'react-icons/md';

// Admin Imports
import MainDashboard from 'views/admin/default';
import NFTMarketplace from 'views/admin/marketplace';
import Profile from 'views/admin/profile';
import DataTables from 'views/admin/dataTables';
import ZestAnalytics from 'views/admin/zestAnalytics';

// SuperAdmin Imports
import SuperAdminDashboard from 'views/superadmin/default';

// ClientAdmin Imports
import ClientAdminDashboard from 'views/clientadmin/default';

// Auth Imports
import SignInCentered from 'views/auth/signIn';
import SignUp from 'views/auth/signUp';
import ForgotPassword from 'views/auth/forgotPassword';
import ResetPassword from 'views/auth/resetPassword';

const routes = [
  {
    name: 'Main Dashboard',
    layout: '/admin',
    path: '/default',
    icon: <Icon as={MdHome} width="20px" height="20px" color="inherit" />,
    component: <MainDashboard />,
  },
  {
    name: '슈퍼어드민',
    layout: '/superadmin',
    path: '',
    icon: <Icon as={MdSecurity} width="20px" height="20px" color="inherit" />,
    component: <SuperAdminDashboard />,
    requiresPermission: 'superadmin',
    showInSidebar: true,
  },
  {
    name: '브랜드어드민',
    layout: '/clientadmin',
    path: '',
    icon: <Icon as={MdBusiness} width="20px" height="20px" color="inherit" />,
    component: <ClientAdminDashboard />,
    requiresPermission: 'brandadmin',
    showInSidebar: true,
  },
  {
    name: 'NFT Marketplace',
    layout: '/admin',
    path: '/nft-marketplace',
    icon: (
      <Icon
        as={MdOutlineShoppingCart}
        width="20px"
        height="20px"
        color="inherit"
      />
    ),
    component: <NFTMarketplace />,
    secondary: true,
    hidden: true,
  },
  {
    name: 'Data Tables',
    layout: '/admin',
    icon: <Icon as={MdBarChart} width="20px" height="20px" color="inherit" />,
    path: '/data-tables',
    component: <DataTables />,
  },
  {
    name: 'Profile',
    layout: '/admin',
    path: '/profile',
    icon: <Icon as={MdPerson} width="20px" height="20px" color="inherit" />,
    component: <Profile />,
  },
  {
    name: 'Zest Analytics',
    layout: '/admin',
    path: '/zest-analytics',
    icon: <Icon as={MdTrackChanges} width="20px" height="20px" color="inherit" />,
    component: <ZestAnalytics />,
  },
  {
    name: 'Sign In',
    layout: '/auth',
    path: '/sign-in',
    icon: <Icon as={MdLock} width="20px" height="20px" color="inherit" />,
    component: <SignInCentered />,
    hidden: true,
  },
  {
    name: 'Sign Up',
    layout: '/auth',
    path: '/sign-up',
    icon: <Icon as={MdPerson} width="20px" height="20px" color="inherit" />,
    component: <SignUp />,
    hidden: true,
  },
  {
    name: 'Forgot Password',
    layout: '/auth',
    path: '/forgot-password',
    component: <ForgotPassword />,
    hidden: true,
  },
  {
    name: 'Reset Password',
    layout: '/auth',
    path: '/reset-password',
    component: <ResetPassword />,
    hidden: true,
  },
];

export default routes;
