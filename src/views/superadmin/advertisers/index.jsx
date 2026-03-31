import React, { useState, useEffect } from "react";
import {
  Box,
  useDisclosure,
  useToast,
  Spinner,
  Center,
  Button,
  Flex,
  Icon,
} from "@chakra-ui/react";
import { MdAdd } from "react-icons/md";
import Card from "components/card/Card.js";
import AdvertisersTree from "./components/AdvertisersTree";
import AddBrandModal from "./components/AddBrandModal";
import EditBrandModal from "./components/EditBrandModal";
import DeleteBrandModal from "./components/DeleteBrandModal";
import DeleteAgencyModal from "./components/DeleteAgencyModal";
import InviteAgencyModal from "./components/InviteAgencyModal";
import { supabase } from "config/supabase";
import { useAuth } from "contexts/AuthContext";
import { deleteBrand, deleteAgency } from "services/supabaseService";

export default function AdvertisersManagement() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isDeleteAgencyOpen, onOpen: onDeleteAgencyOpen, onClose: onDeleteAgencyClose } = useDisclosure();
  const { isOpen: isInviteAgencyOpen, onOpen: onInviteAgencyOpen, onClose: onInviteAgencyClose } = useDisclosure();
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedOrganizationForDelete, setSelectedOrganizationForDelete] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingAgency, setIsDeletingAgency] = useState(false);
  const toast = useToast();
  const { role, organizationId, isMaster } = useAuth();

  // 데이터 로드
  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setIsLoading(true);

      // 권한에 따라 필터링
      let query = supabase
        .from('organizations')
        .select(`
          id,
          name,
          type,
          advertisers (
            id,
            name,
            business_number,
            website_url,
            contact_email,
            contact_phone,
            created_at,
            organization_id,
            advertiser_group_id
          )
        `);

      // agency_admin과 agency_manager는 자신의 조직만 조회
      if (role === 'agency_admin' || role === 'agency_manager') {
        query = query.eq('id', organizationId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      setOrganizations(data || []);
    } catch (error) {
      console.error('조직 데이터 조회 실패:', error);
      toast({
        title: "데이터 조회 실패",
        description: error.message,
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBrand = (organizationId) => {
    setSelectedOrganization(organizationId);
    onOpen();
  };

  const handleEditBrand = (brand) => {
    setSelectedBrand(brand);
    onEditOpen();
  };

  const handleDeleteBrand = (brand) => {
    setSelectedBrand(brand);
    onDeleteOpen();
  };

  const handleDeleteAgency = (organization) => {
    setSelectedOrganizationForDelete(organization);
    onDeleteAgencyOpen();
  };

  const confirmDelete = async (brandId) => {
    try {
      setIsDeleting(true);

      await deleteBrand(brandId, selectedBrand.name);

      toast({
        title: "브랜드 삭제 완료",
        description: `${selectedBrand.name} 브랜드와 관련된 모든 데이터가 삭제되었습니다.`,
        status: "success",
        duration: 3000,
      });

      onDeleteClose();
      setSelectedBrand(null);

      fetchOrganizations();
    } catch (error) {
      console.error('브랜드 삭제 실패:', error);
      toast({
        title: "브랜드 삭제 실패",
        description: error.message,
        status: "error",
        duration: 5000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeleteAgency = async (organizationId) => {
    try {
      setIsDeletingAgency(true);

      await deleteAgency(organizationId, selectedOrganizationForDelete.name);

      toast({
        title: "에이전시 삭제 완료",
        description: `${selectedOrganizationForDelete.name} 에이전시와 관련된 모든 데이터가 삭제되었습니다.`,
        status: "success",
        duration: 3000,
      });

      onDeleteAgencyClose();
      setSelectedOrganizationForDelete(null);

      fetchOrganizations();
    } catch (error) {
      console.error('에이전시 삭제 실패:', error);
      toast({
        title: "에이전시 삭제 실패",
        description: error.message,
        status: "error",
        duration: 5000,
      });
    } finally {
      setIsDeletingAgency(false);
    }
  };

  if (isLoading) {
    return (
      <Center h="400px">
        <Spinner size="xl" />
      </Center>
    );
  }

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      {isMaster() && (
        <Flex justify="flex-end" mb="20px">
          <Button
            leftIcon={<Icon as={MdAdd} />}
            colorScheme="brand"
            size="md"
            onClick={onInviteAgencyOpen}
          >
            조직 초대
          </Button>
        </Flex>
      )}

      <Card
        direction="column"
        w="100%"
        py="25px"
        overflowX={{ sm: "scroll", lg: "hidden" }}
      >
        <AdvertisersTree
          organizations={organizations}
          onAddBrand={handleAddBrand}
          onEditBrand={handleEditBrand}
          onDeleteBrand={handleDeleteBrand}
          onDeleteAgency={handleDeleteAgency}
          currentUserRole={role}
          currentUserOrgId={organizationId}
        />
      </Card>

      <AddBrandModal
        isOpen={isOpen}
        onClose={() => {
          onClose();
          setSelectedOrganization(null);
          fetchOrganizations();
        }}
        organizationId={selectedOrganization}
      />

      {selectedBrand && (
        <>
          <EditBrandModal
            isOpen={isEditOpen}
            onClose={() => {
              onEditClose();
              setSelectedBrand(null);
              fetchOrganizations();
            }}
            brand={selectedBrand}
          />

          <DeleteBrandModal
            isOpen={isDeleteOpen}
            onClose={onDeleteClose}
            brand={selectedBrand}
            onConfirm={confirmDelete}
            isLoading={isDeleting}
          />
        </>
      )}

      <InviteAgencyModal
        isOpen={isInviteAgencyOpen}
        onClose={() => {
          onInviteAgencyClose();
          fetchOrganizations();
        }}
      />

      {selectedOrganizationForDelete && (
        <DeleteAgencyModal
          isOpen={isDeleteAgencyOpen}
          onClose={onDeleteAgencyClose}
          organization={selectedOrganizationForDelete}
          onConfirm={confirmDeleteAgency}
          isLoading={isDeletingAgency}
        />
      )}
    </Box>
  );
}
