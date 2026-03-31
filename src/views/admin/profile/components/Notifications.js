import { Flex, Text, useColorModeValue, Box, Icon, Badge, Divider } from "@chakra-ui/react";
import Card from "components/card/Card.js";
import Menu from "components/menu/MainMenu";
import { useAuth } from "contexts/AuthContext";
import { MdCheckCircle } from "react-icons/md";
import React from "react";

export default function Notifications(props) {
  const { ...rest } = props;
  const textColorPrimary = useColorModeValue("secondaryGray.900", "white");
  const textColorSecondary = useColorModeValue("secondaryGray.600", "secondaryGray.400");
  const boardNotificationBg = useColorModeValue("purple.50", "purple.900");
  const boardNotificationBorder = useColorModeValue("purple.200", "purple.700");
  const listBorderColor = useColorModeValue("gray.200", "whiteAlpha.100");
  const listHoverBg = useColorModeValue("gray.50", "whiteAlpha.50");

  const { allNotifications } = useAuth();
  const boardNotifications = allNotifications || [];

  return (
    <Card mb={{ base: "0px", "2xl": "20px" }} display="flex" flexDirection="column" {...rest}>
      <Flex align="center" w="100%" justify="space-between" mb="30px" p="20px" pb="0">
        <Text color={textColorPrimary} fontWeight="bold" fontSize="lg" mb="4px">Notifications</Text>
        <Menu />
      </Flex>
      <Flex flex="1" overflowY="auto" direction="column" px="20px" pb="20px">
        {boardNotifications.filter(n => !n.isRead).length > 0 && (
          <>
            <Box mb="20px">
              <Text fontSize="sm" fontWeight="600" color={textColorPrimary} mb="12px">게시판 알림</Text>
              {boardNotifications.filter(n => !n.isRead).slice(0, 3).map((notification) => (
                <Box key={notification.id} p="12px" mb="8px" borderRadius="8px" bg={boardNotificationBg} border="1px solid" borderColor={boardNotificationBorder}>
                  <Flex align="center" mb="4px">
                    <Icon as={MdCheckCircle} color="purple.500" w="16px" h="16px" mr="8px" />
                    <Text fontSize="sm" fontWeight="600" color={textColorPrimary} flex="1">
                      {notification.title || notification.message}
                    </Text>
                  </Flex>
                  <Text fontSize="xs" color={textColorSecondary} ml="24px">{notification.message}</Text>
                </Box>
              ))}
            </Box>
            <Divider mb="20px" />
          </>
        )}

        <Text fontSize="sm" fontWeight="600" color={textColorPrimary} mb="12px">게시판 알림 목록</Text>
        <Box maxH="400px" overflowY="auto">
          {boardNotifications.length > 0 ? (
            boardNotifications.map((notification, index, array) => (
              <Box
                key={notification.id} py="12px" px="8px"
                borderBottom={index < array.length - 1 ? "1px solid" : "none"}
                borderColor={listBorderColor} cursor="pointer"
                _hover={{ bg: listHoverBg }} transition="background 0.2s"
              >
                <Flex align="center" justify="space-between">
                  <Flex align="center" flex="1">
                    <Icon as={MdCheckCircle} color="purple.500" w="16px" h="16px" mr="8px" />
                    <Text fontSize="sm" color={textColorPrimary} fontWeight={!notification.isRead ? "600" : "400"}>
                      {notification.title || notification.message}
                    </Text>
                  </Flex>
                  {!notification.isRead && <Badge colorScheme="purple" fontSize="xs" ml="8px">New</Badge>}
                </Flex>
              </Box>
            ))
          ) : (
            <Box py="20px" textAlign="center">
              <Text fontSize="sm" color={textColorSecondary}>게시판 알림이 없습니다</Text>
            </Box>
          )}
        </Box>
      </Flex>
    </Card>
  );
}
