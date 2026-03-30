import React, { createContext, useContext, useState } from 'react';
import { getKSTNow, getKSTYesterday, getKSTDaysAgo, formatDateToYYYYMMDD } from 'utils/dateUtils';

const DateRangeContext = createContext();

export const useDateRange = () => {
  const context = useContext(DateRangeContext);
  if (!context) {
    throw new Error('useDateRange must be used within DateRangeProvider');
  }
  return context;
};

export const DateRangeProvider = ({ children }) => {
  // 기본값: 최근 7일 (종료일 = 어제, KST 기준)
  const getDefaultRange = () => {
    return {
      start: getKSTDaysAgo(7),
      end: getKSTYesterday(),
    };
  };

  const defaultRange = getDefaultRange();

  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [selectedPreset, setSelectedPreset] = useState('최근 7일');

  // 비교 모드 상태
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonStartDate, setComparisonStartDate] = useState(null);
  const [comparisonEndDate, setComparisonEndDate] = useState(null);
  const [comparisonPreset, setComparisonPreset] = useState('직접설정');

  // 날짜 범위 계산 유틸리티 함수 (KST 기준)
  const getDateRange = (preset) => {
    const kstNow = getKSTNow();
    const year = kstNow.getFullYear();
    const month = kstNow.getMonth();
    const day = kstNow.getDate();
    const dayOfWeek = kstNow.getDay();

    let start, end;

    switch (preset) {
      case '어제':
        return {
          start: getKSTYesterday(),
          end: getKSTYesterday(),
        };

      case '최근 7일':
        return {
          start: getKSTDaysAgo(7),
          end: getKSTYesterday(),
        };

      case '최근 14일':
        return {
          start: getKSTDaysAgo(14),
          end: getKSTYesterday(),
        };

      case '최근 30일':
        return {
          start: getKSTDaysAgo(30),
          end: getKSTYesterday(),
        };

      case '이번 주':
        // 월요일 기준
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        start = new Date(year, month, day + mondayOffset);
        return {
          start: formatDateToYYYYMMDD(start),
          end: getKSTYesterday(),
        };

      case '지난주':
        // 지난 주 월요일~일요일
        const lastMondayOffset = dayOfWeek === 0 ? -13 : -6 - dayOfWeek;
        const lastSundayOffset = dayOfWeek === 0 ? -7 : -dayOfWeek;
        start = new Date(year, month, day + lastMondayOffset);
        end = new Date(year, month, day + lastSundayOffset);
        return {
          start: formatDateToYYYYMMDD(start),
          end: formatDateToYYYYMMDD(end),
        };

      case '이번 달':
        start = new Date(year, month, 1);
        return {
          start: formatDateToYYYYMMDD(start),
          end: getKSTYesterday(),
        };

      case '지난달':
        start = new Date(year, month - 1, 1);
        end = new Date(year, month, 0);
        return {
          start: formatDateToYYYYMMDD(start),
          end: formatDateToYYYYMMDD(end),
        };

      default:
        return null;
    }
  };

  const updateDateRange = (preset) => {
    setSelectedPreset(preset);

    if (preset === '직접설정') {
      return;
    }

    const range = getDateRange(preset);
    if (range) {
      setStartDate(range.start);
      setEndDate(range.end);
    }
  };

  // 비교 기간 자동 제안 (현재 기간과 동일한 길이의 이전 기간)
  const suggestComparisonPeriod = () => {
    if (!startDate || !endDate) return;

    const currentStart = new Date(startDate);
    const currentEnd = new Date(endDate);

    // 현재 기간 길이 계산
    const diffTime = Math.abs(currentEnd - currentStart);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // 이전 기간 계산 (현재 시작일 - 1일이 비교 종료일)
    const compEnd = new Date(currentStart);
    compEnd.setDate(compEnd.getDate() - 1);

    const compStart = new Date(compEnd);
    compStart.setDate(compStart.getDate() - diffDays);

    setComparisonStartDate(formatDateToYYYYMMDD(compStart));
    setComparisonEndDate(formatDateToYYYYMMDD(compEnd));
    setComparisonPreset('이전 기간');
  };

  // 비교 모드 토글
  const toggleComparisonMode = () => {
    const newMode = !comparisonMode;
    setComparisonMode(newMode);

    // 비교 모드 활성화 시 자동으로 이전 기간 설정
    if (newMode && (!comparisonStartDate || !comparisonEndDate)) {
      suggestComparisonPeriod();
    }
  };

  // 비교 기간 프리셋 업데이트
  const updateComparisonRange = (preset) => {
    setComparisonPreset(preset);

    if (preset === '직접설정') {
      return;
    }

    const range = getDateRange(preset);
    if (range) {
      setComparisonStartDate(range.start);
      setComparisonEndDate(range.end);
    }
  };

  const value = {
    startDate,
    endDate,
    selectedPreset,
    setStartDate,
    setEndDate,
    setSelectedPreset,
    updateDateRange,
    // 비교 모드
    comparisonMode,
    setComparisonMode,
    comparisonStartDate,
    setComparisonStartDate,
    comparisonEndDate,
    setComparisonEndDate,
    comparisonPreset,
    setComparisonPreset,
    toggleComparisonMode,
    updateComparisonRange,
  };

  return (
    <DateRangeContext.Provider value={value}>
      {children}
    </DateRangeContext.Provider>
  );
};
