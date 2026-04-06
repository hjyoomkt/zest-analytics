import React, { useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Icon,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useColorModeValue,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
} from '@chakra-ui/react';
import {
  MdCalendarToday,
  MdKeyboardArrowDown,
  MdChevronLeft,
  MdChevronRight,
  MdCompareArrows,
  MdClose,
} from 'react-icons/md';
import { useDateRange } from 'contexts/DateRangeContext';
import Card from 'components/card/Card';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import 'assets/css/MiniCalendar.css';

const DateRangePicker = () => {
  const {
    startDate,
    endDate,
    selectedPreset,
    setStartDate,
    setEndDate,
    setSelectedPreset,
    updateDateRange,
    comparisonMode,
    comparisonStartDate,
    setComparisonStartDate,
    comparisonEndDate,
    setComparisonEndDate,
    comparisonPreset,
    toggleComparisonMode,
    updateComparisonRange,
  } = useDateRange();

  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);
  const [isCompStartOpen, setIsCompStartOpen] = useState(false);
  const [isCompEndOpen, setIsCompEndOpen] = useState(false);

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const brandColor = useColorModeValue('brand.500', 'white');
  const borderColor = useColorModeValue('secondaryGray.100', 'whiteAlpha.100');
  const bgHover = useColorModeValue('secondaryGray.100', 'whiteAlpha.100');
  const inputBg = useColorModeValue('white', 'navy.700');
  const inputTextColor = useColorModeValue('secondaryGray.900', 'white');

  const presets = [
    '직접설정',
    '오늘',
    '어제',
    '최근 7일',
    '최근 14일',
    '최근 30일',
    '이번 주',
    '지난주',
    '이번 달',
    '지난달',
  ];

  const handlePresetClick = (preset) => {
    updateDateRange(preset);
  };

  const handleStartDateChange = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setStartDate(`${year}-${month}-${day}`);
    setSelectedPreset('직접설정');
    setIsStartOpen(false);
  };

  const handleEndDateChange = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setEndDate(`${year}-${month}-${day}`);
    setSelectedPreset('직접설정');
    setIsEndOpen(false);
  };

  const handleComparisonStartDateChange = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setComparisonStartDate(`${year}-${month}-${day}`);
    updateComparisonRange('직접설정');
    setIsCompStartOpen(false);
  };

  const handleComparisonEndDateChange = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setComparisonEndDate(`${year}-${month}-${day}`);
    updateComparisonRange('직접설정');
    setIsCompEndOpen(false);
  };

  return (
    <Card p='20px' mb='20px'>
      <Flex direction='column' gap='12px'>
        <Flex align='center' gap='12px' flexWrap='wrap'>
          <Icon as={MdCalendarToday} w='18px' h='18px' color={brandColor} />

          <Flex align='center' gap='8px'>
            <Popover isOpen={isStartOpen} onClose={() => setIsStartOpen(false)}>
              <PopoverTrigger>
                <Input
                  value={startDate}
                  onClick={() => setIsStartOpen(true)}
                  readOnly
                  cursor='pointer'
                  size='sm'
                  w='130px'
                  h='36px'
                  bg={inputBg}
                  color={inputTextColor}
                  borderColor={borderColor}
                  borderRadius='12px'
                  textAlign='center'
                  fontSize='sm'
                  fontFamily='DM Sans'
                  fontWeight='500'
                  px='4px'
                  _focus={{ borderColor: brandColor }}
                />
              </PopoverTrigger>
              <PopoverContent w='290px'>
                <PopoverBody p='15px'>
                  <Box transform='scale(0.85)' transformOrigin='top left' w='300px'>
                    <Calendar
                      onChange={handleStartDateChange}
                      value={startDate ? new Date(startDate) : new Date()}
                      view='month'
                      prevLabel={<Icon as={MdChevronLeft} w='24px' h='24px' mt='4px' />}
                      nextLabel={<Icon as={MdChevronRight} w='24px' h='24px' mt='4px' />}
                    />
                  </Box>
                </PopoverBody>
              </PopoverContent>
            </Popover>

            <Text fontSize='sm' color={textColor}>~</Text>

            <Popover isOpen={isEndOpen} onClose={() => setIsEndOpen(false)}>
              <PopoverTrigger>
                <Input
                  value={endDate}
                  onClick={() => setIsEndOpen(true)}
                  readOnly
                  cursor='pointer'
                  size='sm'
                  w='130px'
                  h='36px'
                  bg={inputBg}
                  color={inputTextColor}
                  borderColor={borderColor}
                  borderRadius='12px'
                  textAlign='center'
                  fontSize='sm'
                  fontFamily='DM Sans'
                  fontWeight='500'
                  px='4px'
                  _focus={{ borderColor: brandColor }}
                />
              </PopoverTrigger>
              <PopoverContent w='290px'>
                <PopoverBody p='15px'>
                  <Box transform='scale(0.85)' transformOrigin='top left' w='300px'>
                    <Calendar
                      onChange={handleEndDateChange}
                      value={endDate ? new Date(endDate) : new Date()}
                      view='month'
                      prevLabel={<Icon as={MdChevronLeft} w='24px' h='24px' mt='4px' />}
                      nextLabel={<Icon as={MdChevronRight} w='24px' h='24px' mt='4px' />}
                    />
                  </Box>
                </PopoverBody>
              </PopoverContent>
            </Popover>
          </Flex>

          <Menu>
            <MenuButton
              as={Button}
              rightIcon={<MdKeyboardArrowDown />}
              bg={inputBg}
              border='1px solid'
              borderColor={borderColor}
              color={textColor}
              fontWeight='500'
              fontSize='sm'
              _hover={{ bg: bgHover }}
              _active={{ bg: bgHover }}
              px='16px'
              h='36px'
              borderRadius='12px'>
              {selectedPreset}
            </MenuButton>
            <MenuList minW='auto' w='fit-content' px='8px' py='8px' zIndex={2000}>
              {presets.map((preset) => (
                <MenuItem
                  key={preset}
                  onClick={() => handlePresetClick(preset)}
                  bg={selectedPreset === preset ? brandColor : 'transparent'}
                  color={selectedPreset === preset ? 'white' : textColor}
                  _hover={{ bg: selectedPreset === preset ? brandColor : bgHover }}
                  fontWeight={selectedPreset === preset ? '600' : '500'}
                  fontSize='sm'
                  px='12px'
                  py='8px'
                  borderRadius='8px'
                  justifyContent='center'
                  textAlign='center'
                  minH='auto'>
                  {preset}
                </MenuItem>
              ))}

              <Box borderTop='1px solid' borderColor={borderColor} my='8px' />

              <MenuItem
                onClick={toggleComparisonMode}
                bg={comparisonMode ? brandColor : 'transparent'}
                color={comparisonMode ? 'white' : textColor}
                _hover={{ bg: comparisonMode ? brandColor : bgHover }}
                fontWeight={comparisonMode ? '600' : '500'}
                fontSize='sm'
                px='12px'
                py='8px'
                borderRadius='8px'
                justifyContent='center'
                textAlign='center'
                minH='auto'>
                <Flex align='center' gap='6px'>
                  <Icon as={MdCompareArrows} w='14px' h='14px' />
                  <Text>비교</Text>
                </Flex>
              </MenuItem>
            </MenuList>
          </Menu>
        </Flex>

        {comparisonMode && (
          <Flex
            align='center'
            gap='12px'
            pt='12px'
            borderTop='1px solid'
            borderColor={borderColor}
            flexWrap='wrap'>
            <Icon as={MdCompareArrows} w='18px' h='18px' color={brandColor} />
            <Text fontSize='sm' fontWeight='500' color={textColor} minW='60px'>
              비교 기간
            </Text>

            <Flex align='center' gap='8px'>
              <Popover isOpen={isCompStartOpen} onClose={() => setIsCompStartOpen(false)}>
                <PopoverTrigger>
                  <Input
                    value={comparisonStartDate || '시작일'}
                    onClick={() => setIsCompStartOpen(true)}
                    readOnly
                    cursor='pointer'
                    size='sm'
                    w='130px'
                    h='36px'
                    bg={inputBg}
                    color={comparisonStartDate ? inputTextColor : 'gray.400'}
                    borderColor={borderColor}
                    borderRadius='12px'
                    textAlign='center'
                    fontSize='sm'
                    fontFamily='DM Sans'
                    fontWeight='500'
                    px='4px'
                    _focus={{ borderColor: brandColor }}
                  />
                </PopoverTrigger>
                <PopoverContent w='290px'>
                  <PopoverBody p='15px'>
                    <Box transform='scale(0.85)' transformOrigin='top left' w='300px'>
                      <Calendar
                        onChange={handleComparisonStartDateChange}
                        value={comparisonStartDate ? new Date(comparisonStartDate) : new Date()}
                        view='month'
                        prevLabel={<Icon as={MdChevronLeft} w='24px' h='24px' mt='4px' />}
                        nextLabel={<Icon as={MdChevronRight} w='24px' h='24px' mt='4px' />}
                      />
                    </Box>
                  </PopoverBody>
                </PopoverContent>
              </Popover>

              <Text fontSize='sm' color={textColor}>~</Text>

              <Popover isOpen={isCompEndOpen} onClose={() => setIsCompEndOpen(false)}>
                <PopoverTrigger>
                  <Input
                    value={comparisonEndDate || '종료일'}
                    onClick={() => setIsCompEndOpen(true)}
                    readOnly
                    cursor='pointer'
                    size='sm'
                    w='130px'
                    h='36px'
                    bg={inputBg}
                    color={comparisonEndDate ? inputTextColor : 'gray.400'}
                    borderColor={borderColor}
                    borderRadius='12px'
                    textAlign='center'
                    fontSize='sm'
                    fontFamily='DM Sans'
                    fontWeight='500'
                    px='4px'
                    _focus={{ borderColor: brandColor }}
                  />
                </PopoverTrigger>
                <PopoverContent w='290px'>
                  <PopoverBody p='15px'>
                    <Box transform='scale(0.85)' transformOrigin='top left' w='300px'>
                      <Calendar
                        onChange={handleComparisonEndDateChange}
                        value={comparisonEndDate ? new Date(comparisonEndDate) : new Date()}
                        view='month'
                        prevLabel={<Icon as={MdChevronLeft} w='24px' h='24px' mt='4px' />}
                        nextLabel={<Icon as={MdChevronRight} w='24px' h='24px' mt='4px' />}
                      />
                    </Box>
                  </PopoverBody>
                </PopoverContent>
              </Popover>
            </Flex>

            <Menu>
              <MenuButton
                as={Button}
                rightIcon={<MdKeyboardArrowDown />}
                bg={inputBg}
                border='1px solid'
                borderColor={borderColor}
                color={textColor}
                fontWeight='500'
                fontSize='sm'
                _hover={{ bg: bgHover }}
                _active={{ bg: bgHover }}
                px='16px'
                h='36px'
                borderRadius='12px'>
                {comparisonPreset}
              </MenuButton>
              <MenuList minW='auto' w='fit-content' px='8px' py='8px' zIndex={2000}>
                {presets.map((preset) => (
                  <MenuItem
                    key={preset}
                    onClick={() => updateComparisonRange(preset)}
                    bg={comparisonPreset === preset ? brandColor : 'transparent'}
                    color={comparisonPreset === preset ? 'white' : textColor}
                    _hover={{ bg: comparisonPreset === preset ? brandColor : bgHover }}
                    fontWeight={comparisonPreset === preset ? '600' : '500'}
                    fontSize='sm'
                    px='12px'
                    py='8px'
                    borderRadius='8px'
                    justifyContent='center'
                    textAlign='center'
                    minH='auto'>
                    {preset}
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>

            <Button
              size='sm'
              variant='ghost'
              color='gray.500'
              onClick={toggleComparisonMode}
              leftIcon={<Icon as={MdClose} w='16px' h='16px' />}
              h='36px'
              px='12px'
              fontSize='sm'>
              닫기
            </Button>
          </Flex>
        )}
      </Flex>
    </Card>
  );
};

export default DateRangePicker;
