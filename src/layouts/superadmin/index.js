// Chakra imports
import { Portal, Box, useDisclosure, useColorModeValue, Button, VStack, Text, Icon, Heading } from '@chakra-ui/react';
import { MdError } from 'react-icons/md';
import Footer from 'components/footer/FooterAdmin.js';
// Layout components
import Navbar from 'components/navbar/NavbarAdmin.js';
import Sidebar from 'components/sidebar/Sidebar.js';
import { SidebarContext } from 'contexts/SidebarContext';
import React, { useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import superadminRoutes from 'superadminRoutes.js';
import { useAuth } from 'contexts/AuthContext';

export default function SuperAdminLayout(props) {
  const { ...rest } = props;
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const { onOpen } = useDisclosure();

  const [fixed] = useState(false);
  const [toggleSidebar, setToggleSidebar] = useState(false);

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const bgColor = useColorModeValue('secondaryGray.300', 'navy.900');
  const cardBg = useColorModeValue('white', 'navy.800');

  const canAccessSuperAdmin = () => {
    return ['master', 'agency_admin', 'agency_manager'].includes(role);
  };

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/auth/sign-in" replace />;
  }

  if (!canAccessSuperAdmin()) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        minH="100vh"
        bg={bgColor}
        p={{ base: '20px', md: '40px' }}
      >
        <Box
          bg={cardBg}
          borderRadius="20px"
          p={{ base: '30px', md: '50px' }}
          maxW="600px"
          w="100%"
          boxShadow="14px 17px 40px 4px rgba(112, 144, 176, 0.08)"
        >
          <VStack spacing="24px" align="center">
            <Box
              w="80px"
              h="80px"
              bg="red.50"
              borderRadius="50%"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Icon as={MdError} color="red.500" boxSize="40px" />
            </Box>

            <Box textAlign="center">
              <Heading
                color={textColor}
                fontSize={{ base: '24px', md: '28px' }}
                fontWeight="700"
                mb="8px"
              >
                접근 권한이 없습니다
              </Heading>
              <Text
                color="secondaryGray.600"
                fontSize={{ base: 'sm', md: 'md' }}
                fontWeight="400"
              >
                이 페이지는 관리자만 접근할 수 있습니다.
              </Text>
            </Box>

            <Button
              variant="brand"
              fontSize="sm"
              fontWeight="500"
              w="100%"
              h="50px"
              borderRadius="10px"
              onClick={() => navigate('/admin/default')}
              mt="10px"
            >
              메인 대시보드로 이동
            </Button>
          </VStack>
        </Box>
      </Box>
    );
  }

  const getRoute = () => {
    return window.location.pathname !== '/superadmin/full-screen-maps';
  };
  const getActiveRoute = (routes) => {
    let activeRoute = 'Default Brand Text';
    for (let i = 0; i < routes.length; i++) {
      if (routes[i].collapse) {
        let collapseActiveRoute = getActiveRoute(routes[i].items);
        if (collapseActiveRoute !== activeRoute) {
          return collapseActiveRoute;
        }
      } else if (routes[i].category) {
        let categoryActiveRoute = getActiveRoute(routes[i].items);
        if (categoryActiveRoute !== activeRoute) {
          return categoryActiveRoute;
        }
      } else {
        if (
          window.location.href.indexOf(routes[i].layout + routes[i].path) !== -1
        ) {
          return routes[i].name;
        }
      }
    }
    return activeRoute;
  };
  const getActiveNavbar = (routes) => {
    let activeNavbar = false;
    for (let i = 0; i < routes.length; i++) {
      if (routes[i].collapse) {
        let collapseActiveNavbar = getActiveNavbar(routes[i].items);
        if (collapseActiveNavbar !== activeNavbar) {
          return collapseActiveNavbar;
        }
      } else if (routes[i].category) {
        let categoryActiveNavbar = getActiveNavbar(routes[i].items);
        if (categoryActiveNavbar !== activeNavbar) {
          return categoryActiveNavbar;
        }
      } else {
        if (
          window.location.href.indexOf(routes[i].layout + routes[i].path) !== -1
        ) {
          return routes[i].secondary;
        }
      }
    }
    return activeNavbar;
  };
  const getActiveNavbarText = (routes) => {
    let activeNavbar = false;
    for (let i = 0; i < routes.length; i++) {
      if (routes[i].collapse) {
        let collapseActiveNavbar = getActiveNavbarText(routes[i].items);
        if (collapseActiveNavbar !== activeNavbar) {
          return collapseActiveNavbar;
        }
      } else if (routes[i].category) {
        let categoryActiveNavbar = getActiveNavbarText(routes[i].items);
        if (categoryActiveNavbar !== activeNavbar) {
          return categoryActiveNavbar;
        }
      } else {
        if (
          window.location.href.indexOf(routes[i].layout + routes[i].path) !== -1
        ) {
          return routes[i].messageNavbar;
        }
      }
    }
    return activeNavbar;
  };
  const getRoutes = (routes) => {
    return routes.map((route, key) => {
      if (route.layout === '/superadmin') {
        return (
          <Route path={`${route.path}`} element={route.component} key={key} />
        );
      }
      if (route.collapse) {
        return getRoutes(route.items);
      } else {
        return null;
      }
    });
  };
  document.documentElement.dir = 'ltr';
  return (
    <Box>
      <Box>
        <SidebarContext.Provider
          value={{
            toggleSidebar,
            setToggleSidebar,
          }}
        >
          <Sidebar routes={superadminRoutes} display="none" {...rest} />
          <Box
            float="right"
            minHeight="100vh"
            height="100%"
            overflow="auto"
            position="relative"
            maxHeight="100%"
            w={{ base: '100%', xl: 'calc( 100% - 230px )' }}
            maxWidth={{ base: '100%', xl: 'calc( 100% - 230px )' }}
            transition="all 0.33s cubic-bezier(0.685, 0.0473, 0.346, 1)"
            transitionDuration=".2s, .2s, .35s"
            transitionProperty="top, bottom, width"
            transitionTimingFunction="linear, linear, ease"
          >
            <Portal>
              <Box>
                <Navbar
                  onOpen={onOpen}
                  logoText={'Growth Analytics - SuperAdmin'}
                  brandText={getActiveRoute(superadminRoutes)}
                  secondary={getActiveNavbar(superadminRoutes)}
                  message={getActiveNavbarText(superadminRoutes)}
                  fixed={fixed}
                  routes={superadminRoutes}
                  {...rest}
                />
              </Box>
            </Portal>

            {getRoute() ? (
              <Box
                minH="100vh"
                pt="50px"
                px={{ base: '20px', md: '30px' }}
              >
                <Routes>
                  {getRoutes(superadminRoutes)}
                  <Route
                    path="/"
                    element={<Navigate to="/superadmin/default" replace />}
                  />
                </Routes>
              </Box>
            ) : null}
            <Box>
              <Footer />
            </Box>
          </Box>
        </SidebarContext.Provider>
      </Box>
    </Box>
  );
}
