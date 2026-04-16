import './assets/css/App.css';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from './layouts/auth';
import AdminLayout from './layouts/admin';
import SuperAdminLayout from './layouts/superadmin';
import MasterAdminLayout from './layouts/masteradmin';
import ClientAdminLayout from './layouts/clientadmin';
import {
  ChakraProvider,
  Center,
  Spinner,
  // extendTheme
} from '@chakra-ui/react';
import initialTheme from './theme/theme'; //  { themeGreen }
import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DateRangeProvider } from './contexts/DateRangeContext';
import { HelmetProvider } from 'react-helmet-async';
// Chakra imports

function RoleBasedRedirect() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <Center h="100vh">
        <Spinner
          thickness="4px"
          speed="0.65s"
          emptyColor="gray.200"
          color="brand.500"
          size="xl"
        />
      </Center>
    );
  }

  if (!user) {
    return <Navigate to="/auth/sign-in" replace />;
  }

  if (role === 'master' || role === 'agency_admin' || role === 'agency_manager') {
    return <Navigate to="/superadmin" replace />;
  } else if (role === 'advertiser_admin' || role === 'advertiser_staff' || role === 'viewer') {
    return <Navigate to="/clientadmin" replace />;
  }

  return <Navigate to="/admin/default" replace />;
}

export default function Main() {
  // eslint-disable-next-line
  const [currentTheme, setCurrentTheme] = useState(initialTheme);
  return (
    <HelmetProvider>
      <ChakraProvider theme={currentTheme}>
        <AuthProvider>
          <DateRangeProvider>
            <Routes>
              <Route path="auth/*" element={<AuthLayout />} />
              <Route
                path="admin/*"
                element={
                  <AdminLayout theme={currentTheme} setTheme={setCurrentTheme} />
                }
              />
              <Route
                path="superadmin/*"
                element={
                  <SuperAdminLayout theme={currentTheme} setTheme={setCurrentTheme} />
                }
              />
              <Route
                path="masteradmin/*"
                element={
                  <MasterAdminLayout theme={currentTheme} setTheme={setCurrentTheme} />
                }
              />
              <Route
                path="clientadmin/*"
                element={
                  <ClientAdminLayout theme={currentTheme} setTheme={setCurrentTheme} />
                }
              />
              <Route path="/" element={<RoleBasedRedirect />} />
            </Routes>
          </DateRangeProvider>
        </AuthProvider>
      </ChakraProvider>
    </HelmetProvider>
  );
}
