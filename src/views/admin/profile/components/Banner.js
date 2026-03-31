import { Avatar, Box, Flex, Text, useColorModeValue, IconButton, useDisclosure } from "@chakra-ui/react";
import Card from "components/card/Card.js";
import React from "react";
import { MdEdit } from "react-icons/md";
import ProfileEditModal from "./ProfileEditModal";

export default function Banner(props) {
  const { banner, avatar, name, job, roleLevel, brandCount, ...rest } = props;
  const { isOpen, onOpen, onClose } = useDisclosure();

  const textColorPrimary = useColorModeValue("secondaryGray.900", "white");
  const textColorSecondary = "gray.400";
  const borderColor = useColorModeValue("white !important", "#111C44 !important");
  const editButtonBg = useColorModeValue("white", "navy.800");
  const editButtonHover = useColorModeValue("gray.100", "navy.700");

  return (
    <>
      <Card mb={{ base: "0px", lg: "20px" }} align='center' position="relative" display='flex' flexDirection='column' {...rest}>
        <IconButton
          icon={<MdEdit />}
          aria-label="프로필 편집"
          position="absolute"
          top="20px"
          right="20px"
          size="md"
          borderRadius="12px"
          bg={editButtonBg}
          _hover={{ bg: editButtonHover }}
          onClick={onOpen}
          zIndex={2}
        />
        <Box bg={`url(${banner})`} bgSize='cover' borderRadius='16px' h='131px' w='100%' />
        <Avatar mx='auto' src={avatar} h='87px' w='87px' mt='-43px' border='4px solid' borderColor={borderColor} name={name} />
        <Text color={textColorPrimary} fontWeight='bold' fontSize='xl' mt='10px'>{name}</Text>
        <Text color={textColorSecondary} fontSize='sm'>{job}</Text>
        <Flex w='max-content' mx='auto' mt='auto' mb='20px'>
          <Flex mx='auto' me='60px' align='center' direction='column'>
            <Text color={textColorPrimary} fontSize='2xl' fontWeight='700'>{brandCount}</Text>
            <Text color={textColorSecondary} fontSize='sm' fontWeight='400'>담당 브랜드</Text>
          </Flex>
          <Flex mx='auto' align='center' direction='column'>
            <Text color={textColorPrimary} fontSize='lg' fontWeight='600'>{roleLevel}</Text>
            <Text color={textColorSecondary} fontSize='sm' fontWeight='400'>권한</Text>
          </Flex>
        </Flex>
      </Card>

      <ProfileEditModal isOpen={isOpen} onClose={onClose} currentData={{ name, job }} />
    </>
  );
}
