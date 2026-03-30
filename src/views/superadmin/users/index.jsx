// Chakra imports
import { Box, Button, Text, useDisclosure, Flex, useColorModeValue } from "@chakra-ui/react";
import UserTable from "views/admin/users/components/UserTable";
import InviteUserModal from "views/admin/users/components/InviteUserModal";
import React from "react";
import { useAuth } from "contexts/AuthContext";

export default function UserManagement() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { canAccessSuperAdmin, isAgency } = useAuth();
  const textColor = useColorModeValue('secondaryGray.900', 'white');

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      {/* Page Header */}
      <Flex justify="space-between" align="center" mb="20px">
        <Box>
          <Text
            color={textColor}
            fontSize="2xl"
            fontWeight="700"
            lineHeight="100%"
            mb="10px"
          >
            {isAgency() ? '직원 관리' : '팀원 관리'}
          </Text>
          <Text color="secondaryGray.600" fontSize="md" fontWeight="400">
            {isAgency()
              ? '대행사 직원을 초대하고 관리할 수 있습니다.'
              : '팀원을 초대하고 관리할 수 있습니다.'}
          </Text>
        </Box>

        {canAccessSuperAdmin() && (
          <Button colorScheme="brand" onClick={onOpen}>
            + {isAgency() ? '직원 초대' : '팀원 초대'}
          </Button>
        )}
      </Flex>

      <UserTable />

      <InviteUserModal isOpen={isOpen} onClose={onClose} />
    </Box>
  );
}
