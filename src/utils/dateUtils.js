/**
 * KST(한국 표준시, UTC+9) 기준 날짜 계산 유틸리티
 *
 * 모든 데이터 수집 시스템은 한국 시간 00시 기준으로 작동합니다.
 * 브라우저의 시간대 설정과 무관하게 일관된 날짜를 계산합니다.
 */

const KST_OFFSET = 9 * 60; // UTC+9 (분 단위)

/**
 * 현재 KST 시각의 Date 객체 반환
 * @returns {Date} KST 기준 현재 시각
 */
export const getKSTNow = () => {
  const now = new Date();
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  const kstTime = utcTime + (KST_OFFSET * 60 * 1000);
  return new Date(kstTime);
};

/**
 * KST 기준 어제 날짜를 YYYY-MM-DD 형식으로 반환
 * @returns {string} KST 기준 어제 날짜 (예: "2026-01-25")
 */
export const getKSTYesterday = () => {
  const kstNow = getKSTNow();
  kstNow.setDate(kstNow.getDate() - 1);
  return formatDateToYYYYMMDD(kstNow);
};

/**
 * KST 기준 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 * @returns {string} KST 기준 오늘 날짜 (예: "2026-01-26")
 */
export const getKSTToday = () => {
  const kstNow = getKSTNow();
  return formatDateToYYYYMMDD(kstNow);
};

/**
 * KST 기준 N일 전 날짜를 YYYY-MM-DD 형식으로 반환
 * @param {number} days - 며칠 전 (양수)
 * @returns {string} KST 기준 N일 전 날짜 (예: "2026-01-19")
 */
export const getKSTDaysAgo = (days) => {
  const kstNow = getKSTNow();
  kstNow.setDate(kstNow.getDate() - days);
  return formatDateToYYYYMMDD(kstNow);
};

/**
 * Date 객체를 YYYY-MM-DD 형식으로 변환
 * @param {Date} date - 변환할 Date 객체
 * @returns {string} YYYY-MM-DD 형식 문자열
 */
export const formatDateToYYYYMMDD = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * KST 기준 현재 시각이 오전 10시 이후인지 확인
 * @returns {boolean} 오전 10시 이후면 true
 */
export const isAfter10AMKST = () => {
  const kstNow = getKSTNow();
  return kstNow.getHours() >= 10;
};
