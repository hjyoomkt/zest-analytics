/**
 * ============================================================================
 * Zest Analytics Service
 * ============================================================================
 *
 * Supabase API 호출 함수들
 *
 * 기능:
 * - 추적 코드 관리 (생성, 조회, 재생성)
 * - 이벤트 통계 조회
 * - 어트리뷰션 분석
 * - 캠페인별 성과 조회
 */

import { supabase } from 'config/supabase';

// ============================================================================
// URL 정규화
// ============================================================================

const TRACKING_PARAMS = new Set([
  'gclid', 'gclsrc', 'gbraid', 'wbraid', 'dclid',
  'gtm_latency', 'gtm_debug',
  'fbclid',
  'msclkid',
  'ttclid', 'twclid', 'li_fat_id', 'igshid',
  'za_source', 'za_medium', 'za_campaign', 'za_term', 'za_content',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
]);

/**
 * 트래킹 파라미터를 제거한 정규화 URL 반환
 * localhost / 127.0.0.1 URL이면 null 반환 (집계에서 제외)
 */
const normalizeUrl = (raw) => {
  if (!raw) return '/';
  try {
    const u = new URL(raw.includes('://') ? raw : `https://x.com${raw}`);
    const h = u.hostname;
    if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return null;
    TRACKING_PARAMS.forEach((p) => u.searchParams.delete(p));
    const qs = u.searchParams.toString();
    return u.pathname + (qs ? `?${qs}` : '');
  } catch {
    return raw.length > 300 ? raw.substring(0, 300) : raw;
  }
};

// ============================================================================
// 추적 코드 관리
// ============================================================================

/**
 * 추적 코드 조회
 * @param {string|null} advertiserId - 광고주 ID (null이면 전체 조회)
 * @returns {Promise<Array>} 추적 코드 목록
 */
export const getTrackingCodes = async (advertiserId) => {
  try {
    let query = supabase
      .from('za_tracking_codes')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (advertiserId) {
      query = query.eq('advertiser_id', advertiserId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[ZA Service] getTrackingCodes error:', error);
    throw error;
  }
};

/**
 * 추적 코드 생성
 * @param {string} advertiserId - 광고주 ID
 * @param {string|null} notes - 메모 (선택)
 * @returns {Promise<object>} 생성된 추적 코드
 */
export const createTrackingCode = async (advertiserId, notes = null) => {
  try {
    if (!advertiserId) {
      throw new Error('advertiser_id is required');
    }

    // 1. 추적 ID 생성
    const { data: trackingId, error: genError } = await supabase.rpc('generate_za_tracking_id');

    if (genError) throw genError;
    if (!trackingId) throw new Error('Failed to generate tracking ID');

    // 2. 추적 코드 삽입
    const { data, error } = await supabase
      .from('za_tracking_codes')
      .insert({
        tracking_id: trackingId,
        advertiser_id: advertiserId,
        status: 'active',
        notes: notes,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[ZA Service] createTrackingCode error:', error);
    throw error;
  }
};

/**
 * 추적 코드 재생성
 * @param {string} codeId - 기존 추적 코드 ID
 * @returns {Promise<object>} 새로 생성된 추적 코드
 */
export const regenerateTrackingCode = async (codeId) => {
  try {
    // 1. 기존 코드 정보 조회
    const { data: oldCode, error: fetchError } = await supabase
      .from('za_tracking_codes')
      .select('advertiser_id, notes')
      .eq('id', codeId)
      .single();

    if (fetchError) throw fetchError;

    // 2. 기존 코드 비활성화
    const { error: updateError } = await supabase
      .from('za_tracking_codes')
      .update({ status: 'inactive' })
      .eq('id', codeId);

    if (updateError) throw updateError;

    // 3. 새 코드 생성
    return await createTrackingCode(oldCode.advertiser_id, oldCode.notes);
  } catch (error) {
    console.error('[ZA Service] regenerateTrackingCode error:', error);
    throw error;
  }
};

/**
 * 추적 코드 상태 변경
 * @param {string} codeId - 추적 코드 ID
 * @param {string} status - 상태 (active, inactive)
 * @returns {Promise<object>} 업데이트된 추적 코드
 */
export const updateTrackingCodeStatus = async (codeId, status) => {
  try {
    if (!['active', 'inactive'].includes(status)) {
      throw new Error('Invalid status. Must be active or inactive');
    }

    const { data, error } = await supabase
      .from('za_tracking_codes')
      .update({ status })
      .eq('id', codeId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[ZA Service] updateTrackingCodeStatus error:', error);
    throw error;
  }
};

/**
 * 추적 코드 삭제 (소프트 삭제)
 * @param {string} codeId - 추적 코드 ID
 * @returns {Promise<object>} 삭제된 추적 코드
 */
export const deleteTrackingCode = async (codeId) => {
  try {
    const { data, error } = await supabase
      .from('za_tracking_codes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', codeId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[ZA Service] deleteTrackingCode error:', error);
    throw error;
  }
};

// ============================================================================
// IP 차단 목록 캐시 (내부 관리자 데이터 필터링용)
// ============================================================================

let _ipBlocklistCache = null;
let _ipBlocklistCacheAt = 0;
const IP_CACHE_TTL = 60_000; // 1분

const _getBlockedIpsCached = async () => {
  if (_ipBlocklistCache !== null && Date.now() - _ipBlocklistCacheAt < IP_CACHE_TTL) {
    return _ipBlocklistCache;
  }
  try {
    const { data, error } = await supabase.from('za_ip_blocklist').select('ip_address');
    console.log('[IP Filter] blocklist fetch:', { data, error });
    _ipBlocklistCache = (data || []).map((r) => r.ip_address);
    _ipBlocklistCacheAt = Date.now();
  } catch (e) {
    console.log('[IP Filter] blocklist fetch exception:', e);
    if (_ipBlocklistCache === null) _ipBlocklistCache = [];
  }
  return _ipBlocklistCache;
};

export const invalidateIpBlocklistCache = () => {
  _ipBlocklistCache = null;
  _ipBlocklistCacheAt = 0;
};

const _applyIpFilter = (query, blockedIps) => {
  if (blockedIps && blockedIps.length > 0) {
    // inet 타입은 /32 형태로 저장되므로 CIDR 형식으로 정규화
    const normalized = blockedIps.map((ip) => (ip.includes('/') ? ip : `${ip}/32`));
    return query.not('ip_address', 'in', `(${normalized.join(',')})`);
  }
  return query;
};

// ============================================================================
// IP 차단 목록 관리 (masteradmin 전용)
// ============================================================================

export const getBlockedIps = async () => {
  try {
    const { data, error } = await supabase
      .from('za_ip_blocklist')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[ZA Service] getBlockedIps error:', error);
    throw error;
  }
};

export const addBlockedIp = async (ipAddress, description = null, createdBy = null) => {
  try {
    const { data, error } = await supabase
      .from('za_ip_blocklist')
      .insert({ ip_address: ipAddress.trim(), description, created_by: createdBy })
      .select()
      .single();
    if (error) throw error;
    invalidateIpBlocklistCache();
    return data;
  } catch (error) {
    console.error('[ZA Service] addBlockedIp error:', error);
    throw error;
  }
};

export const removeBlockedIp = async (id) => {
  try {
    const { error } = await supabase.from('za_ip_blocklist').delete().eq('id', id);
    if (error) throw error;
    invalidateIpBlocklistCache();
  } catch (error) {
    console.error('[ZA Service] removeBlockedIp error:', error);
    throw error;
  }
};

// ============================================================================
// 이벤트 통계 조회
// ============================================================================

/**
 * 이벤트 통계 조회
 * @param {object} params - 조회 파라미터
 * @param {string|null} params.advertiserId - 광고주 ID
 * @param {Array<string>} params.availableAdvertiserIds - 접근 가능한 광고주 ID 목록
 * @param {string} params.startDate - 시작 날짜 (YYYY-MM-DD)
 * @param {string} params.endDate - 종료 날짜 (YYYY-MM-DD)
 * @returns {Promise<object>} 통계 데이터
 */
export const getEventStatistics = async ({
  advertiserId,
  availableAdvertiserIds,
  startDate,
  endDate,
}) => {
  try {
    const blockedIps = await _getBlockedIpsCached();
    let query = supabase.from('za_events').select('event_type, value, currency, is_attributed').neq('event_type', 'session_end');
    query = _applyIpFilter(query, blockedIps);

    // 날짜 필터
    if (startDate && endDate) {
      query = query.gte('created_at', startDate).lte('created_at', `${endDate}T23:59:59.999Z`);
    }

    // 광고주 필터
    if (advertiserId) {
      query = query.eq('advertiser_id', advertiserId);
    } else if (availableAdvertiserIds && availableAdvertiserIds.length > 0) {
      query = query.in('advertiser_id', availableAdvertiserIds);
    }

    const { data, error } = await query;

    if (error) throw error;

    // 집계
    const stats = {
      totalEvents: data.length,
      purchases: data.filter((e) => e.event_type === 'purchase').length,
      signups: data.filter((e) => e.event_type === 'signup').length,
      leads: data.filter((e) => e.event_type === 'lead').length,
      addToCarts: data.filter((e) => e.event_type === 'add_to_cart').length,
      customEvents: data.filter((e) => e.event_type === 'custom').length,
      revenue: data
        .filter((e) => e.event_type === 'purchase' && e.value)
        .reduce((sum, e) => sum + parseFloat(e.value), 0),
      attributedEvents: data.filter((e) => e.is_attributed === true).length,
    };

    return stats;
  } catch (error) {
    console.error('[ZA Service] getEventStatistics error:', error);
    throw error;
  }
};

/**
 * 어트리뷰션 윈도우별 전환 통계
 * @param {object} params - 조회 파라미터
 * @returns {Promise<object>} 어트리뷰션 윈도우별 통계
 */
export const getAttributionStats = async ({
  advertiserId,
  availableAdvertiserIds,
  startDate,
  endDate,
}) => {
  try {
    const blockedIps = await _getBlockedIpsCached();
    let query = supabase
      .from('za_events')
      .select('attribution_window, event_type, days_since_click')
      .eq('is_attributed', true)
      .in('event_type', ['purchase', 'signup', 'lead', 'add_to_cart']);
    query = _applyIpFilter(query, blockedIps);

    // 날짜 필터
    if (startDate && endDate) {
      query = query.gte('created_at', startDate).lte('created_at', `${endDate}T23:59:59.999Z`);
    }

    // 광고주 필터
    if (advertiserId) {
      query = query.eq('advertiser_id', advertiserId);
    } else if (availableAdvertiserIds && availableAdvertiserIds.length > 0) {
      query = query.in('advertiser_id', availableAdvertiserIds);
    }

    const { data, error } = await query;

    if (error) throw error;

    // 어트리뷰션 윈도우별 집계
    const stats = {
      window1Day: data.filter((e) => e.attribution_window === 1).length,
      window7Day: data.filter((e) => e.attribution_window === 7).length,
      window28Day: data.filter((e) => e.attribution_window === 28).length,
      avgDaysSinceClick:
        data.length > 0
          ? data.reduce((sum, e) => sum + (e.days_since_click || 0), 0) / data.length
          : 0,
    };

    return stats;
  } catch (error) {
    console.error('[ZA Service] getAttributionStats error:', error);
    throw error;
  }
};

/**
 * 캠페인별 성과 조회
 * @param {object} params - 조회 파라미터
 * @returns {Promise<Array>} 캠페인별 성과 데이터
 */
export const getCampaignPerformance = async ({
  advertiserId,
  availableAdvertiserIds,
  startDate,
  endDate,
}) => {
  try {
    const blockedIps = await _getBlockedIpsCached();
    let query = supabase
      .from('za_events')
      .select('utm_source, utm_medium, utm_campaign, event_type, value, days_since_click, is_attributed');
    query = _applyIpFilter(query, blockedIps);

    // 날짜 필터
    if (startDate && endDate) {
      query = query.gte('created_at', startDate).lte('created_at', `${endDate}T23:59:59.999Z`);
    }

    // 광고주 필터
    if (advertiserId) {
      query = query.eq('advertiser_id', advertiserId);
    } else if (availableAdvertiserIds && availableAdvertiserIds.length > 0) {
      query = query.in('advertiser_id', availableAdvertiserIds);
    }

    // UTM 캠페인이 있는 것만
    query = query.not('utm_campaign', 'is', null);

    const { data, error } = await query;

    if (error) throw error;

    // 캠페인별 그룹화
    const grouped = {};
    data.forEach((event) => {
      const key = `${event.utm_source || 'direct'}_${event.utm_medium || ''}_${event.utm_campaign}`;
      if (!grouped[key]) {
        grouped[key] = {
          source: event.utm_source || 'direct',
          medium: event.utm_medium || '-',
          campaign: event.utm_campaign,
          totalEvents: 0,
          conversions: 0,
          revenue: 0,
          attributedConversions: 0,
          totalDaysSinceClick: 0,
          conversionCount: 0,
        };
      }
      grouped[key].totalEvents++;

      if (['purchase', 'signup', 'lead', 'add_to_cart'].includes(event.event_type)) {
        grouped[key].conversions++;
        if (event.is_attributed) {
          grouped[key].attributedConversions++;
        }
        if (event.days_since_click !== null) {
          grouped[key].totalDaysSinceClick += event.days_since_click;
          grouped[key].conversionCount++;
        }
      }

      if (event.event_type === 'purchase' && event.value) {
        grouped[key].revenue += parseFloat(event.value);
      }
    });

    // 결과 배열로 변환 및 계산
    const result = Object.values(grouped).map((item) => ({
      ...item,
      conversionRate: item.totalEvents > 0 ? (item.conversions / item.totalEvents) * 100 : 0,
      avgDaysSinceClick:
        item.conversionCount > 0 ? item.totalDaysSinceClick / item.conversionCount : 0,
    }));

    // 매출 기준 내림차순 정렬
    result.sort((a, b) => b.revenue - a.revenue);

    return result;
  } catch (error) {
    console.error('[ZA Service] getCampaignPerformance error:', error);
    throw error;
  }
};

/**
 * 실시간 이벤트 조회 (최근 100개)
 * @param {string|null} advertiserId - 광고주 ID
 * @param {Array<string>} availableAdvertiserIds - 접근 가능한 광고주 ID 목록
 * @param {number} limit - 조회 개수 (기본 100)
 * @returns {Promise<Array>} 이벤트 목록
 */
export const getRecentEvents = async (advertiserId, availableAdvertiserIds, limit = 100) => {
  try {
    const blockedIps = await _getBlockedIpsCached();
    let query = supabase
      .from('za_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    query = _applyIpFilter(query, blockedIps);

    // 광고주 필터
    if (advertiserId) {
      query = query.eq('advertiser_id', advertiserId);
    } else if (availableAdvertiserIds && availableAdvertiserIds.length > 0) {
      query = query.in('advertiser_id', availableAdvertiserIds);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[ZA Service] getRecentEvents error:', error);
    throw error;
  }
};

// ============================================================================
// 트래픽 분석 (시간대별 / 페이지별 / 채널별)
// ============================================================================

/**
 * 공통: advertiser_ids 배열 생성 헬퍼
 * @private
 */
const _resolveAdvertiserIds = (advertiserId, availableAdvertiserIds) => {
  if (advertiserId) return [advertiserId];
  return availableAdvertiserIds && availableAdvertiserIds.length > 0
    ? availableAdvertiserIds
    : [];
};

/**
 * 시간대별 방문자 수 (고유 세션 기준, KST 0~23시)
 * @param {object} params
 * @param {string|null} params.advertiserId
 * @param {Array<string>} params.availableAdvertiserIds
 * @param {string} params.startDate - YYYY-MM-DD
 * @param {string} params.endDate   - YYYY-MM-DD
 * @returns {Promise<Array<{hour: number, visitor_count: number}>>} 24개 항목
 */
export const getHourlyVisitors = async ({
  advertiserId,
  availableAdvertiserIds,
  startDate,
  endDate,
}) => {
  try {
    const ids = _resolveAdvertiserIds(advertiserId, availableAdvertiserIds);
    if (ids.length === 0) return Array.from({ length: 24 }, (_, i) => ({ hour: i, visitor_count: 0 }));

    const blockedIps = await _getBlockedIpsCached();
    const { data, error } = await supabase.rpc('get_hourly_visitors', {
      p_advertiser_ids: ids,
      p_start: `${startDate}T00:00:00+09:00`,
      p_end: `${endDate}T23:59:59+09:00`,
      p_blocked_ips: blockedIps,
    });

    if (error) throw error;

    const result = Array.from({ length: 24 }, (_, i) => ({ hour: i, visitor_count: 0 }));
    (data || []).forEach(({ hour_of_day, visitor_count }) => {
      result[hour_of_day].visitor_count = Number(visitor_count);
    });
    return result;
  } catch (error) {
    console.error('[ZA Service] getHourlyVisitors error:', error);
    throw error;
  }
};

/**
 * 시간대별 페이지뷰 수 (KST 0~23시)
 * @param {object} params
 * @returns {Promise<Array<{hour: number, pageview_count: number}>>} 24개 항목
 */
export const getHourlyPageViews = async ({
  advertiserId,
  availableAdvertiserIds,
  startDate,
  endDate,
}) => {
  try {
    const ids = _resolveAdvertiserIds(advertiserId, availableAdvertiserIds);
    if (ids.length === 0) return Array.from({ length: 24 }, (_, i) => ({ hour: i, pageview_count: 0 }));

    const blockedIps = await _getBlockedIpsCached();
    const { data, error } = await supabase.rpc('get_hourly_pageviews', {
      p_advertiser_ids: ids,
      p_start: `${startDate}T00:00:00+09:00`,
      p_end: `${endDate}T23:59:59+09:00`,
      p_blocked_ips: blockedIps,
    });

    if (error) throw error;

    const result = Array.from({ length: 24 }, (_, i) => ({ hour: i, pageview_count: 0 }));
    (data || []).forEach(({ hour_of_day, pageview_count }) => {
      result[hour_of_day].pageview_count = Number(pageview_count);
    });
    return result;
  } catch (error) {
    console.error('[ZA Service] getHourlyPageViews error:', error);
    throw error;
  }
};

/**
 * 페이지별 스크롤 도달률 통계
 * @param {object} params
 * @returns {Promise<Array>} 페이지별 {page_url, total_sessions, avg_scroll_depth, reach_25, reach_50, reach_75, reach_100}
 */
export const getPageScrollStats = async ({
  advertiserId,
  availableAdvertiserIds,
  startDate,
  endDate,
}) => {
  try {
    const ids = _resolveAdvertiserIds(advertiserId, availableAdvertiserIds);
    if (ids.length === 0) return [];

    const blockedIps = await _getBlockedIpsCached();
    const { data, error } = await supabase.rpc('get_page_scroll_stats', {
      p_advertiser_ids: ids,
      p_start: `${startDate}T00:00:00+09:00`,
      p_end: `${endDate}T23:59:59+09:00`,
      p_blocked_ips: blockedIps,
    });

    if (error) throw error;

    return (data || []).map((row) => ({
      ...row,
      avg_scroll_depth: Number(row.avg_scroll_depth),
      total_sessions: Number(row.total_sessions),
      reach_25: Number(row.reach_25),
      reach_50: Number(row.reach_50),
      reach_75: Number(row.reach_75),
      reach_100: Number(row.reach_100),
      // 도달률 비율 (%)
      reach_25_pct: row.total_sessions > 0 ? Math.round((row.reach_25 / row.total_sessions) * 100) : 0,
      reach_50_pct: row.total_sessions > 0 ? Math.round((row.reach_50 / row.total_sessions) * 100) : 0,
      reach_75_pct: row.total_sessions > 0 ? Math.round((row.reach_75 / row.total_sessions) * 100) : 0,
      reach_100_pct: row.total_sessions > 0 ? Math.round((row.reach_100 / row.total_sessions) * 100) : 0,
    }));
  } catch (error) {
    console.error('[ZA Service] getPageScrollStats error:', error);
    throw error;
  }
};

/**
 * 유입 경로별 성과 (페이지뷰, 체류시간, 스크롤 도달률)
 * @param {object} params
 * @returns {Promise<Array>} 채널별 {channel, pageview_count, unique_sessions,
 *   avg_time_on_page, avg_scroll_depth, reach_25_pct, reach_50_pct, reach_75_pct, reach_100_pct}
 */
export const getChannelPerformance = async ({
  advertiserId,
  availableAdvertiserIds,
  startDate,
  endDate,
}) => {
  try {
    const ids = _resolveAdvertiserIds(advertiserId, availableAdvertiserIds);
    if (ids.length === 0) return [];

    const blockedIps = await _getBlockedIpsCached();
    const { data, error } = await supabase.rpc('get_channel_performance', {
      p_advertiser_ids: ids,
      p_start: `${startDate}T00:00:00+09:00`,
      p_end: `${endDate}T23:59:59+09:00`,
      p_blocked_ips: blockedIps,
    });

    if (error) throw error;

    return (data || []).map((row) => ({
      ...row,
      pageview_count: Number(row.pageview_count),
      unique_sessions: Number(row.unique_sessions),
      avg_time_on_page: Number(row.avg_time_on_page),
      avg_scroll_depth: Number(row.avg_scroll_depth),
      reach_25_pct: Number(row.reach_25_pct),
      reach_50_pct: Number(row.reach_50_pct),
      reach_75_pct: Number(row.reach_75_pct),
      reach_100_pct: Number(row.reach_100_pct),
    }));
  } catch (error) {
    console.error('[ZA Service] getChannelPerformance error:', error);
    throw error;
  }
};

// ============================================================================
// UX 스크롤 히트맵
// ============================================================================

/**
 * 히트맵용 페이지 URL 목록 (session_end 데이터 있는 페이지)
 * 트래킹 파라미터를 제거한 정규화 URL로 그룹핑하여 반환
 * @param {object} params
 * @param {string|null} params.advertiserId
 * @param {Array<string>} params.availableAdvertiserIds
 * @param {string} params.startDate - YYYY-MM-DD
 * @param {string} params.endDate   - YYYY-MM-DD
 * @param {string|null} params.deviceType - 'desktop'|'mobile'|'tablet'|null(전체)
 * @returns {Promise<Array<{page_url, session_count, avg_depth, raw_urls}>>}
 *   page_url : 정규화된 URL (드롭다운 표시용)
 *   raw_urls : 해당 정규화 URL에 속하는 원본 URL 배열 (데이터 조회용)
 */
export const getHeatmapPageList = async ({
  advertiserId,
  availableAdvertiserIds,
  startDate,
  endDate,
  deviceType = null,
}) => {
  try {
    const ids = _resolveAdvertiserIds(advertiserId, availableAdvertiserIds);
    if (ids.length === 0) return [];

    const blockedIps = await _getBlockedIpsCached();
    const { data, error } = await supabase.rpc('get_heatmap_page_list', {
      p_advertiser_ids: ids,
      p_start: `${startDate}T00:00:00+09:00`,
      p_end: `${endDate}T23:59:59+09:00`,
      p_device_type: deviceType,
      p_blocked_ips: blockedIps,
    });

    if (error) throw error;

    // 트래킹 파라미터 제거 후 정규화 URL 기준으로 그룹핑
    const groups = new Map();
    (data || []).forEach((row) => {
      const normalized = normalizeUrl(row.page_url) || row.page_url;
      const count = Number(row.session_count);
      const depth = Number(row.avg_depth);
      if (!groups.has(normalized)) {
        groups.set(normalized, { page_url: normalized, session_count: 0, depth_sum: 0, raw_urls: [] });
      }
      const g = groups.get(normalized);
      g.session_count += count;
      g.depth_sum += depth * count;
      g.raw_urls.push(row.page_url);
    });

    return Array.from(groups.values())
      .map((g) => ({
        page_url: g.page_url,
        session_count: g.session_count,
        avg_depth: g.session_count > 0 ? Math.round(g.depth_sum / g.session_count) : 0,
        raw_urls: g.raw_urls,
      }))
      .sort((a, b) => b.session_count - a.session_count);
  } catch (error) {
    console.error('[ZA Service] getHeatmapPageList error:', error);
    throw error;
  }
};

/**
 * 특정 페이지의 히트맵 데이터 (10개 구간별 도달 세션 수)
 * @param {object} params
 * @param {string|null} params.advertiserId
 * @param {Array<string>} params.availableAdvertiserIds
 * @param {string} params.pageUrl - 조회할 페이지 URL
 * @param {string} params.startDate - YYYY-MM-DD
 * @param {string} params.endDate   - YYYY-MM-DD
 * @param {string|null} params.deviceType - 'desktop'|'mobile'|'tablet'|null(전체)
 * @returns {Promise<Array<{bucket_index, reached_count, total_count, reach_pct}>>} 10개 항목
 */
export const getScrollHeatmap = async ({
  advertiserId,
  availableAdvertiserIds,
  pageUrls,   // 정규화 URL에 속하는 원본 URL 배열
  startDate,
  endDate,
  deviceType = null,
}) => {
  try {
    const ids = _resolveAdvertiserIds(advertiserId, availableAdvertiserIds);
    const urls = Array.isArray(pageUrls) ? pageUrls.filter(Boolean) : [];
    if (ids.length === 0 || urls.length === 0) {
      return Array.from({ length: 10 }, (_, i) => ({
        bucket_index: i,
        reached_count: 0,
        total_count: 0,
        reach_pct: 0,
      }));
    }

    const blockedIps = await _getBlockedIpsCached();
    // 각 원본 URL에 대해 RPC 호출 후 버킷별로 합산
    const allResults = await Promise.all(
      urls.map((pageUrl) =>
        supabase.rpc('get_scroll_heatmap', {
          p_advertiser_ids: ids,
          p_page_url: pageUrl,
          p_start: `${startDate}T00:00:00+09:00`,
          p_end: `${endDate}T23:59:59+09:00`,
          p_device_type: deviceType,
          p_blocked_ips: blockedIps,
        })
      )
    );

    const merged = Array.from({ length: 10 }, (_, i) => ({
      bucket_index: i,
      reached_count: 0,
      total_count: 0,
      reach_pct: 0,
    }));

    allResults.forEach(({ data, error }) => {
      if (error) return;
      (data || []).forEach(({ bucket_index, reached_count, total_count }) => {
        const idx = Number(bucket_index);
        if (idx >= 0 && idx < 10) {
          merged[idx].reached_count += Number(reached_count);
          merged[idx].total_count   += Number(total_count);
        }
      });
    });

    merged.forEach((b) => {
      b.reach_pct = b.total_count > 0 ? Math.round((b.reached_count / b.total_count) * 100) : 0;
    });

    return merged;
  } catch (error) {
    console.error('[ZA Service] getScrollHeatmap error:', error);
    throw error;
  }
};

/**
 * 특정 페이지의 히트맵 통계 요약 (방문자, 페이지뷰, 평균 도달률, 구간별 도달률)
 * @param {object} params
 * @param {string|null} params.advertiserId
 * @param {Array<string>} params.availableAdvertiserIds
 * @param {string} params.pageUrl
 * @param {string} params.startDate
 * @param {string} params.endDate
 * @param {string|null} params.deviceType
 * @returns {Promise<{visitors, pageviews, avgScrollDepth, reach25, reach50, reach75, reach100}>}
 */
export const getHeatmapPageStats = async ({
  advertiserId,
  availableAdvertiserIds,
  pageUrls,   // 정규화 URL에 속하는 원본 URL 배열
  startDate,
  endDate,
  deviceType = null,
}) => {
  try {
    const ids = _resolveAdvertiserIds(advertiserId, availableAdvertiserIds);
    const urls = Array.isArray(pageUrls) ? pageUrls.filter(Boolean) : [];
    if (ids.length === 0 || urls.length === 0) {
      return { visitors: 0, pageviews: 0, avgScrollDepth: 0, reach10: 0, reach20: 0, reach30: 0, reach40: 0, reach50: 0, reach60: 0, reach70: 0, reach80: 0, reach90: 0, reach100: 0, totalSessions: 0 };
    }

    const startTs = `${startDate}T00:00:00+09:00`;
    const endTs   = `${endDate}T23:59:59+09:00`;
    const blockedIps = await _getBlockedIpsCached();

    // 페이지뷰 + 방문자 (정규화 URL의 모든 원본 URL 포함)
    let pvQuery = supabase
      .from('za_events')
      .select('visitor_id')
      .in('advertiser_id', ids)
      .eq('event_type', 'pageview')
      .in('page_url', urls)
      .gte('created_at', startTs)
      .lte('created_at', endTs);
    if (deviceType) pvQuery = pvQuery.eq('device_type', deviceType);
    pvQuery = _applyIpFilter(pvQuery, blockedIps);

    // 스크롤 통계 (session_end)
    let seQuery = supabase
      .from('za_events')
      .select('scroll_depth')
      .in('advertiser_id', ids)
      .eq('event_type', 'session_end')
      .in('page_url', urls)
      .not('scroll_depth', 'is', null)
      .gte('created_at', startTs)
      .lte('created_at', endTs);
    if (deviceType) seQuery = seQuery.eq('device_type', deviceType);
    seQuery = _applyIpFilter(seQuery, blockedIps);

    const [pvResult, seResult] = await Promise.all([pvQuery, seQuery]);

    if (pvResult.error) throw pvResult.error;
    if (seResult.error) throw seResult.error;

    const pvData = pvResult.data || [];
    const seData = seResult.data || [];

    const uniqueVisitors = new Set(pvData.map((r) => r.visitor_id).filter(Boolean)).size;
    const avgDepth =
      seData.length > 0
        ? Math.round(seData.reduce((s, r) => s + r.scroll_depth, 0) / seData.length)
        : 0;
    const total = seData.length;

    const reachAt = (threshold) =>
      total > 0 ? Math.round((seData.filter((r) => r.scroll_depth >= threshold).length / total) * 100) : 0;

    return {
      visitors: uniqueVisitors,
      pageviews: pvData.length,
      avgScrollDepth: avgDepth,
      reach10:  reachAt(10),
      reach20:  reachAt(20),
      reach30:  reachAt(30),
      reach40:  reachAt(40),
      reach50:  reachAt(50),
      reach60:  reachAt(60),
      reach70:  reachAt(70),
      reach80:  reachAt(80),
      reach90:  reachAt(90),
      reach100: reachAt(100),
      totalSessions: total,
    };
  } catch (error) {
    console.error('[ZA Service] getHeatmapPageStats error:', error);
    throw error;
  }
};

// ============================================================================
// 클릭 히트맵
// ============================================================================

/**
 * 특정 페이지의 클릭 좌표 목록 조회
 * @param {object} params
 * @param {string|null} params.advertiserId
 * @param {Array<string>} params.availableAdvertiserIds
 * @param {string} params.pageUrl
 * @param {string} params.startDate - YYYY-MM-DD
 * @param {string} params.endDate   - YYYY-MM-DD
 * @param {string|null} params.deviceType - 'desktop'|'mobile'|'tablet'|null
 * @returns {Promise<Array<{click_x, click_y, click_count}>>}
 *   click_x / click_y 는 0~1 비율 (페이지 너비/높이 기준)
 *   데이터가 없으면 빈 배열 반환
 */
export const getClickHeatmap = async ({
  advertiserId,
  availableAdvertiserIds,
  pageUrls,   // 정규화 URL에 속하는 원본 URL 배열
  startDate,
  endDate,
  deviceType = null,
}) => {
  try {
    const ids = _resolveAdvertiserIds(advertiserId, availableAdvertiserIds);
    const urls = Array.isArray(pageUrls) ? pageUrls.filter(Boolean) : [];
    if (ids.length === 0 || urls.length === 0) return [];

    let query = supabase
      .from('za_click_events')
      .select('click_x, click_y')
      .in('advertiser_id', ids)
      .in('page_url', urls)
      .gte('created_at', `${startDate}T00:00:00+09:00`)
      .lte('created_at', `${endDate}T23:59:59+09:00`);

    if (deviceType) query = query.eq('device_type', deviceType);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((r) => ({
      click_x: Number(r.click_x),
      click_y: Number(r.click_y),
    }));
  } catch (error) {
    console.error('[ZA Service] getClickHeatmap error:', error);
    throw error;
  }
};

/**
 * 가장 많이 클릭된 요소 TOP N 조회
 * @param {object} params
 * @param {string|null} params.advertiserId
 * @param {Array<string>} params.availableAdvertiserIds
 * @param {string} params.pageUrl
 * @param {string} params.startDate
 * @param {string} params.endDate
 * @param {string|null} params.deviceType
 * @param {number} params.limit - 상위 N개 (기본 10)
 * @returns {Promise<Array<{element_tag, element_text, element_selector, click_count}>>}
 */
export const getClickTopElements = async ({
  advertiserId,
  availableAdvertiserIds,
  pageUrls,   // 정규화 URL에 속하는 원본 URL 배열
  startDate,
  endDate,
  deviceType = null,
  limit = 10,
}) => {
  try {
    const ids = _resolveAdvertiserIds(advertiserId, availableAdvertiserIds);
    const urls = Array.isArray(pageUrls) ? pageUrls.filter(Boolean) : [];
    if (ids.length === 0 || urls.length === 0) return [];

    let query = supabase
      .from('za_click_events')
      .select('element_tag, element_text, element_selector')
      .in('advertiser_id', ids)
      .in('page_url', urls)
      .gte('created_at', `${startDate}T00:00:00+09:00`)
      .lte('created_at', `${endDate}T23:59:59+09:00`);

    if (deviceType) query = query.eq('device_type', deviceType);

    const { data, error } = await query;
    if (error) throw error;

    // 클라이언트 측 집계 (selector 기준 그룹핑)
    const countMap = {};
    (data || []).forEach((r) => {
      const key = r.element_selector || `${r.element_tag}:${r.element_text}`;
      if (!countMap[key]) {
        countMap[key] = { element_tag: r.element_tag, element_text: r.element_text, element_selector: r.element_selector, click_count: 0 };
      }
      countMap[key].click_count += 1;
    });

    return Object.values(countMap)
      .sort((a, b) => b.click_count - a.click_count)
      .slice(0, limit);
  } catch (error) {
    console.error('[ZA Service] getClickTopElements error:', error);
    throw error;
  }
};

// ============================================================================
// 대시보드 KPI 및 트렌드
// ============================================================================

/**
 * 대시보드 KPI 요약 (방문자수, 페이지뷰, 체류시간, 스크롤깊이, 신규/재방문)
 */
export const getDashboardKPIs = async ({
  advertiserId,
  availableAdvertiserIds,
  startDate,
  endDate,
}) => {
  try {
    const ids = _resolveAdvertiserIds(advertiserId, availableAdvertiserIds);
    if (ids.length === 0) {
      return {
        visitors: 0, pageviews: 0, pagesPerVisit: 0,
        avgTimeOnSite: 0, avgScrollDepth: 0, newVisitors: 0, returningVisitors: 0,
      };
    }

    const startTs = `${startDate}T00:00:00+09:00`;
    const endTs = `${endDate}T23:59:59+09:00`;
    const blockedIps = await _getBlockedIpsCached();

    // 페이지뷰 이벤트 조회 (방문자수, 페이지뷰, 신규/재방문)
    let pvQuery = supabase
      .from('za_events')
      .select('visitor_id, session_id, page_url, is_new_visitor')
      .in('advertiser_id', ids)
      .eq('event_type', 'pageview')
      .gte('created_at', startTs)
      .lte('created_at', endTs);
    pvQuery = _applyIpFilter(pvQuery, blockedIps);
    const { data: pvData, error: pvError } = await pvQuery;

    if (pvError) throw pvError;

    // session_end 이벤트 조회 (체류시간, 스크롤, 신규/재방문)
    let seQuery = supabase
      .from('za_events')
      .select('visitor_id, session_id, time_on_page, scroll_depth, is_new_visitor')
      .in('advertiser_id', ids)
      .eq('event_type', 'session_end')
      .gte('created_at', startTs)
      .lte('created_at', endTs);
    seQuery = _applyIpFilter(seQuery, blockedIps);
    const { data: seData, error: seError } = await seQuery;

    if (seError) throw seError;

    const pvRows = pvData || [];
    const seRows = seData || [];

    // 고유 방문자 수
    const visitorSet = new Set(pvRows.map(r => r.visitor_id).filter(Boolean));
    const uniqueVisitors = visitorSet.size;
    const pageviews = pvRows.length;

    // 방문자당 페이지뷰 = 전체 페이지뷰 / 고유 방문자
    const pagesPerVisit = uniqueVisitors > 0 ? parseFloat((pageviews / uniqueVisitors).toFixed(2)) : 0;

    const sessionsWithTime = seRows.filter(r => r.time_on_page != null);
    const avgTimeOnSite = sessionsWithTime.length > 0
      ? Math.round(sessionsWithTime.reduce((s, r) => s + r.time_on_page, 0) / sessionsWithTime.length)
      : 0;

    const sessionsWithScroll = seRows.filter(r => r.scroll_depth != null);
    const avgScrollDepth = sessionsWithScroll.length > 0
      ? Math.round(sessionsWithScroll.reduce((s, r) => s + r.scroll_depth, 0) / sessionsWithScroll.length)
      : 0;

    // 신규/재방문: session_end 우선, 없으면 pageview에서 visitor 기준으로 집계
    const isNewFn = (v) => v === true || v === 1 || v === '1' || v === 'true';
    let newVisitors = 0;
    let returningVisitors = 0;

    if (seRows.length > 0 && seRows.some(r => r.is_new_visitor != null)) {
      // session_end 기준 - visitor_id 고유값으로 집계
      const visitorNewMap = {};
      seRows.forEach(r => {
        if (r.visitor_id && r.is_new_visitor != null && !(r.visitor_id in visitorNewMap)) {
          visitorNewMap[r.visitor_id] = isNewFn(r.is_new_visitor);
        }
      });
      newVisitors = Object.values(visitorNewMap).filter(v => v === true).length;
      returningVisitors = Object.values(visitorNewMap).filter(v => v === false).length;
    } else if (pvRows.some(r => r.is_new_visitor != null)) {
      // pageview 기준: visitor당 첫 번째 is_new_visitor 값 사용
      const visitorNewMap = {};
      pvRows.forEach(r => {
        if (r.visitor_id && r.is_new_visitor != null && !(r.visitor_id in visitorNewMap)) {
          visitorNewMap[r.visitor_id] = isNewFn(r.is_new_visitor);
        }
      });
      newVisitors = Object.values(visitorNewMap).filter(v => v === true).length;
      returningVisitors = Object.values(visitorNewMap).filter(v => v === false).length;
    }

    return {
      visitors: uniqueVisitors,
      pageviews,
      pagesPerVisit,
      avgTimeOnSite,
      avgScrollDepth,
      newVisitors,
      returningVisitors,
    };
  } catch (error) {
    console.error('[ZA Service] getDashboardKPIs error:', error);
    throw error;
  }
};

/**
 * 일별 방문자 & 페이지뷰 트렌드
 * @returns {Promise<Array<{date, visitors, pageviews}>>}
 */
export const getDailyVisitorTrend = async ({
  advertiserId,
  availableAdvertiserIds,
  startDate,
  endDate,
}) => {
  try {
    const ids = _resolveAdvertiserIds(advertiserId, availableAdvertiserIds);
    if (ids.length === 0) return [];

    const startTs = `${startDate}T00:00:00+09:00`;
    const endTs = `${endDate}T23:59:59+09:00`;
    const blockedIps = await _getBlockedIpsCached();

    let trendQuery = supabase
      .from('za_events')
      .select('visitor_id, session_id, event_type, created_at')
      .in('advertiser_id', ids)
      .in('event_type', ['pageview'])
      .gte('created_at', startTs)
      .lte('created_at', endTs)
      .order('created_at', { ascending: true });
    trendQuery = _applyIpFilter(trendQuery, blockedIps);
    const { data, error } = await trendQuery;

    if (error) throw error;

    // 날짜별 집계
    const byDate = {};
    (data || []).forEach(row => {
      // KST 날짜 추출 (UTC+9)
      const d = new Date(row.created_at);
      d.setHours(d.getHours() + 9);
      const dateStr = d.toISOString().split('T')[0];

      if (!byDate[dateStr]) byDate[dateStr] = { date: dateStr, visitors: new Set(), pageviews: 0 };
      if (row.visitor_id) byDate[dateStr].visitors.add(row.visitor_id);
      byDate[dateStr].pageviews += 1;
    });

    return Object.values(byDate)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(r => ({ date: r.date, visitors: r.visitors.size, pageviews: r.pageviews }));
  } catch (error) {
    console.error('[ZA Service] getDailyVisitorTrend error:', error);
    throw error;
  }
};

/**
 * 기기 유형별 통계
 * @returns {Promise<Array<{device_type, count}>>}
 */
export const getDeviceStats = async ({
  advertiserId,
  availableAdvertiserIds,
  startDate,
  endDate,
}) => {
  try {
    const ids = _resolveAdvertiserIds(advertiserId, availableAdvertiserIds);
    if (ids.length === 0) return [];

    const startTs = `${startDate}T00:00:00+09:00`;
    const endTs = `${endDate}T23:59:59+09:00`;
    const blockedIps = await _getBlockedIpsCached();

    let query = supabase
      .from('za_events')
      .select('device_type, visitor_id')
      .in('advertiser_id', ids)
      .eq('event_type', 'pageview')
      .gte('created_at', startTs)
      .lte('created_at', endTs);
    query = _applyIpFilter(query, blockedIps);
    const { data, error } = await query;

    if (error) throw error;

    const byDevice = {};
    (data || []).forEach(row => {
      const dtype = row.device_type || 'unknown';
      if (!byDevice[dtype]) byDevice[dtype] = new Set();
      if (row.visitor_id) byDevice[dtype].add(row.visitor_id);
    });

    return Object.entries(byDevice).map(([device_type, visitors]) => ({
      device_type,
      count: visitors.size,
    }));
  } catch (error) {
    console.error('[ZA Service] getDeviceStats error:', error);
    throw error;
  }
};

/**
 * 방문 유형 통계 (신규 vs 재방문)
 * @returns {Promise<{newVisitors, returningVisitors}>}
 */
export const getVisitorTypeStats = async ({
  advertiserId,
  availableAdvertiserIds,
  startDate,
  endDate,
}) => {
  try {
    const ids = _resolveAdvertiserIds(advertiserId, availableAdvertiserIds);
    if (ids.length === 0) return { newVisitors: 0, returningVisitors: 0 };

    const startTs = `${startDate}T00:00:00+09:00`;
    const endTs = `${endDate}T23:59:59+09:00`;
    const blockedIps = await _getBlockedIpsCached();

    let seQuery = supabase
      .from('za_events')
      .select('is_new_visitor')
      .in('advertiser_id', ids)
      .eq('event_type', 'session_end')
      .gte('created_at', startTs)
      .lte('created_at', endTs);
    seQuery = _applyIpFilter(seQuery, blockedIps);
    const { data, error } = await seQuery;

    if (error) throw error;

    const rows = data || [];
    const isNewFn = (v) => v === true || v === 1 || v === '1' || v === 'true';

    // session_end에 is_new_visitor 없으면 pageview에서 fallback
    if (rows.length > 0 && rows.some(r => r.is_new_visitor != null)) {
      return {
        newVisitors: rows.filter(r => isNewFn(r.is_new_visitor)).length,
        returningVisitors: rows.filter(r => r.is_new_visitor != null && !isNewFn(r.is_new_visitor)).length,
      };
    }

    // fallback: pageview 기준
    let pvQuery = supabase
      .from('za_events')
      .select('visitor_id, is_new_visitor')
      .in('advertiser_id', ids)
      .eq('event_type', 'pageview')
      .gte('created_at', startTs)
      .lte('created_at', endTs)
      .not('is_new_visitor', 'is', null);
    pvQuery = _applyIpFilter(pvQuery, blockedIps);
    const { data: pvData, error: pvError } = await pvQuery;

    if (pvError) throw pvError;

    const visitorNewMap = {};
    (pvData || []).forEach(r => {
      if (r.visitor_id && !(r.visitor_id in visitorNewMap)) {
        visitorNewMap[r.visitor_id] = isNewFn(r.is_new_visitor);
      }
    });
    return {
      newVisitors: Object.values(visitorNewMap).filter(v => v === true).length,
      returningVisitors: Object.values(visitorNewMap).filter(v => v === false).length,
    };
  } catch (error) {
    console.error('[ZA Service] getVisitorTypeStats error:', error);
    throw error;
  }
};

/**
 * 많이 방문한 페이지 Top N
 * @returns {Promise<Array<{page_url, pageviews, unique_visitors}>>}
 */
export const getTopPages = async ({
  advertiserId,
  availableAdvertiserIds,
  startDate,
  endDate,
  limit = 10,
}) => {
  try {
    const ids = _resolveAdvertiserIds(advertiserId, availableAdvertiserIds);
    if (ids.length === 0) return [];

    const startTs = `${startDate}T00:00:00+09:00`;
    const endTs = `${endDate}T23:59:59+09:00`;
    const blockedIps = await _getBlockedIpsCached();

    let query = supabase
      .from('za_events')
      .select('page_url, visitor_id')
      .in('advertiser_id', ids)
      .eq('event_type', 'pageview')
      .gte('created_at', startTs)
      .lte('created_at', endTs);
    query = _applyIpFilter(query, blockedIps);
    const { data, error } = await query;

    if (error) throw error;

    const byPage = {};
    (data || []).forEach(row => {
      const url = normalizeUrl(row.page_url);
      if (!url) return;
      if (!byPage[url]) byPage[url] = { page_url: url, pageviews: 0, visitors: new Set() };
      byPage[url].pageviews += 1;
      if (row.visitor_id) byPage[url].visitors.add(row.visitor_id);
    });

    return Object.values(byPage)
      .map(p => ({ page_url: p.page_url, pageviews: p.pageviews, unique_visitors: p.visitors.size }))
      .sort((a, b) => b.pageviews - a.pageviews)
      .slice(0, limit);
  } catch (error) {
    console.error('[ZA Service] getTopPages error:', error);
    throw error;
  }
};

/**
 * 이탈률 / 새로고침률 / 뒤로가기율
 * @returns {Promise<{bounceRate, refreshRate, backRate}>}
 */
export const getBehaviorRates = async ({
  advertiserId,
  availableAdvertiserIds,
  startDate,
  endDate,
}) => {
  try {
    const ids = _resolveAdvertiserIds(advertiserId, availableAdvertiserIds);
    if (ids.length === 0) return { bounceRate: 0, refreshRate: 0, backRate: 0 };

    const startTs = `${startDate}T00:00:00+09:00`;
    const endTs = `${endDate}T23:59:59+09:00`;
    const blockedIps = await _getBlockedIpsCached();

    let query = supabase
      .from('za_events')
      .select('event_type, is_bounce, session_id')
      .in('advertiser_id', ids)
      .in('event_type', ['session_end', 'page_refresh', 'page_back'])
      .gte('created_at', startTs)
      .lte('created_at', endTs);
    query = _applyIpFilter(query, blockedIps);
    const { data, error } = await query;

    if (error) throw error;

    const rows = data || [];
    const sessions = rows.filter(r => r.event_type === 'session_end');
    const total = sessions.length;
    const bounced = sessions.filter(r => r.is_bounce === true).length;
    const refreshed = rows.filter(r => r.event_type === 'page_refresh').length;
    const backed = rows.filter(r => r.event_type === 'page_back').length;

    return {
      bounceRate: total > 0 ? parseFloat(((bounced / total) * 100).toFixed(1)) : 0,
      refreshRate: total > 0 ? parseFloat(((refreshed / total) * 100).toFixed(1)) : 0,
      backRate: total > 0 ? parseFloat(((backed / total) * 100).toFixed(1)) : 0,
    };
  } catch (error) {
    console.error('[ZA Service] getBehaviorRates error:', error);
    throw error;
  }
};

/**
 * 자주 하는 행동 Top N (페이지뷰, 스크롤, 클릭 등 이벤트 집계)
 * @returns {Promise<Array<{label, page_url, event_type, count}>>}
 */
export const getTopActions = async ({
  advertiserId,
  availableAdvertiserIds,
  startDate,
  endDate,
  limit = 10,
}) => {
  try {
    const ids = _resolveAdvertiserIds(advertiserId, availableAdvertiserIds);
    if (ids.length === 0) return [];

    const startTs = `${startDate}T00:00:00+09:00`;
    const endTs = `${endDate}T23:59:59+09:00`;
    const blockedIps = await _getBlockedIpsCached();

    let query = supabase
      .from('za_events')
      .select('event_type, page_url, scroll_depth, event_name')
      .in('advertiser_id', ids)
      .neq('event_type', 'session_end')
      .gte('created_at', startTs)
      .lte('created_at', endTs);
    query = _applyIpFilter(query, blockedIps);
    const { data, error } = await query;

    if (error) {
      console.error('[ZA Service] getTopActions query error:', error);
      throw error;
    }

    const decodeUrl = (url) => { try { return decodeURIComponent(url); } catch { return url; } };
    const byKey = {};
    (data || []).forEach(row => {
      const etype = row.event_type || 'pageview';
      const url = normalizeUrl(row.page_url);
      if (!url) return;
      const displayUrl = decodeUrl(url);
      let label = '';
      if (etype === 'pageview') label = `${displayUrl} 방문`;
      else if (etype === 'scroll') label = `스크롤 ${row.scroll_depth ?? ''}% 도달 | ${displayUrl}`;
      else if (row.event_name) label = `${row.event_name} | ${displayUrl}`;
      else label = `${etype} | ${displayUrl}`;

      const key = `${etype}::${url}::${row.scroll_depth ?? ''}::${row.event_name ?? ''}`;
      if (!byKey[key]) byKey[key] = { label, page_url: url, event_type: etype, count: 0 };
      byKey[key].count += 1;
    });

    return Object.values(byKey)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch (error) {
    console.error('[ZA Service] getTopActions error:', error);
    throw error;
  }
};

/**
 * 유입경로 Top N (referrer 기준)
 * @returns {Promise<Array<{referrer, count, pct}>>}
 */
export const getTopReferrers = async ({
  advertiserId,
  availableAdvertiserIds,
  startDate,
  endDate,
  limit = 5,
  attributionModel = 'first_touch', // 'first_touch' | 'visitor' | 'session'
}) => {
  try {
    const ids = _resolveAdvertiserIds(advertiserId, availableAdvertiserIds);
    if (ids.length === 0) return [];

    const startTs = `${startDate}T00:00:00+09:00`;
    const endTs = `${endDate}T23:59:59+09:00`;
    const blockedIps = await _getBlockedIpsCached();

    let query = supabase
      .from('za_events')
      .select('page_referrer, channel, visitor_id, session_id, created_at')
      .in('advertiser_id', ids)
      .eq('event_type', 'pageview')
      .gte('created_at', startTs)
      .lte('created_at', endTs)
      .order('created_at', { ascending: true });
    query = _applyIpFilter(query, blockedIps);
    const { data, error } = await query;

    if (error) {
      console.error('[ZA Service] getTopReferrers query error:', error);
      throw error;
    }

    const resolveRef = (row) => {
      if (row.channel && row.channel.trim() !== '') return row.channel.trim();
      const raw = row.page_referrer;
      if (!raw || raw.trim() === '') return '직접 유입';
      try {
        const urlStr = raw.startsWith('http') ? raw : `https://${raw}`;
        return new URL(urlStr).hostname.replace(/^www\./, '');
      } catch {
        return raw;
      }
    };

    const byRef = {};
    const visitorFirstRef = {}; // first_touch: visitor_id → 최초 ref

    (data || []).forEach(row => {
      const ref = resolveRef(row);
      if (!byRef[ref]) byRef[ref] = { referrer: ref, visitors: new Set(), sessions: new Set() };

      if (attributionModel === 'first_touch') {
        if (row.visitor_id && !(row.visitor_id in visitorFirstRef)) {
          visitorFirstRef[row.visitor_id] = ref;
          byRef[ref].visitors.add(row.visitor_id);
        }
      } else if (attributionModel === 'visitor') {
        if (row.visitor_id) byRef[ref].visitors.add(row.visitor_id);
      }

      if (row.session_id) byRef[ref].sessions.add(row.session_id);
    });

    const getCount = (r) => attributionModel === 'session' ? r.sessions.size : r.visitors.size;

    const total = Object.values(byRef).reduce((s, r) => s + getCount(r), 0);
    return Object.values(byRef)
      .map(r => {
        const count = getCount(r);
        return {
          referrer: r.referrer,
          count,
          pct: total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch (error) {
    console.error('[ZA Service] getTopReferrers error:', error);
    throw error;
  }
};

/**
 * OS별 방문자 통계
 * @param {object} params
 * @returns {Promise<Array>} [{os, count}]
 */
export const getOsStats = async ({
  advertiserId,
  availableAdvertiserIds,
  startDate,
  endDate,
}) => {
  try {
    const ids = _resolveAdvertiserIds(advertiserId, availableAdvertiserIds);
    if (ids.length === 0) return [];

    const startTs = `${startDate}T00:00:00+09:00`;
    const endTs = `${endDate}T23:59:59+09:00`;
    const blockedIps = await _getBlockedIpsCached();

    let query = supabase
      .from('za_events')
      .select('os, visitor_id')
      .in('advertiser_id', ids)
      .eq('event_type', 'pageview')
      .gte('created_at', startTs)
      .lte('created_at', endTs);
    query = _applyIpFilter(query, blockedIps);
    const { data, error } = await query;

    if (error) throw error;

    const grouped = {};
    (data || []).forEach(row => {
      const key = row.os || 'Unknown';
      if (!grouped[key]) grouped[key] = { events: 0, visitors: new Set() };
      grouped[key].events += 1;
      if (row.visitor_id) grouped[key].visitors.add(row.visitor_id);
    });

    return Object.entries(grouped)
      .map(([os, g]) => ({ os, events: g.events, users: g.visitors.size }))
      .sort((a, b) => b.events - a.events);
  } catch (error) {
    console.error('[ZA Service] getOsStats error:', error);
    throw error;
  }
};

/**
 * 브라우저별 방문자 통계
 * @param {object} params
 * @returns {Promise<Array>} [{browser, events, users}]
 */
export const getBrowserStats = async ({
  advertiserId,
  availableAdvertiserIds,
  startDate,
  endDate,
}) => {
  try {
    const ids = _resolveAdvertiserIds(advertiserId, availableAdvertiserIds);
    if (ids.length === 0) return [];

    const startTs = `${startDate}T00:00:00+09:00`;
    const endTs = `${endDate}T23:59:59+09:00`;
    const blockedIps = await _getBlockedIpsCached();

    let query = supabase
      .from('za_events')
      .select('browser, visitor_id')
      .in('advertiser_id', ids)
      .eq('event_type', 'pageview')
      .gte('created_at', startTs)
      .lte('created_at', endTs);
    query = _applyIpFilter(query, blockedIps);
    const { data, error } = await query;

    if (error) throw error;

    const grouped = {};
    (data || []).forEach(row => {
      const key = row.browser || 'Unknown';
      if (!grouped[key]) grouped[key] = { events: 0, visitors: new Set() };
      grouped[key].events += 1;
      if (row.visitor_id) grouped[key].visitors.add(row.visitor_id);
    });

    return Object.entries(grouped)
      .map(([browser, g]) => ({ browser, events: g.events, users: g.visitors.size }))
      .sort((a, b) => b.events - a.events);
  } catch (error) {
    console.error('[ZA Service] getBrowserStats error:', error);
    throw error;
  }
};

/**
 * 일별 이벤트 통계 (테이블용)
 * @param {object} params - 조회 파라미터
 * @returns {Promise<Array>} 일별 통계 데이터
 */
export const getDailyEventStats = async ({
  advertiserId,
  availableAdvertiserIds,
  startDate,
  endDate,
}) => {
  try {
    const blockedIps = await _getBlockedIpsCached();
    let query = supabase
      .from('za_events')
      .select('created_at, event_type, value, is_attributed');

    // 날짜 필터
    if (startDate && endDate) {
      query = query.gte('created_at', startDate).lte('created_at', `${endDate}T23:59:59.999Z`);
    }

    // 광고주 필터
    if (advertiserId) {
      query = query.eq('advertiser_id', advertiserId);
    } else if (availableAdvertiserIds && availableAdvertiserIds.length > 0) {
      query = query.in('advertiser_id', availableAdvertiserIds);
    }

    query = _applyIpFilter(query, blockedIps);
    const { data, error } = await query;

    if (error) throw error;

    // 일별 그룹화
    const grouped = {};
    data.forEach((event) => {
      const date = event.created_at.split('T')[0];
      if (!grouped[date]) {
        grouped[date] = {
          date,
          totalEvents: 0,
          conversions: 0,
          revenue: 0,
          attributedConversions: 0,
        };
      }
      grouped[date].totalEvents++;
      if (['purchase', 'signup', 'lead', 'add_to_cart'].includes(event.event_type)) {
        grouped[date].conversions++;
        if (event.is_attributed) {
          grouped[date].attributedConversions++;
        }
      }
      if (event.event_type === 'purchase' && event.value) {
        grouped[date].revenue += parseFloat(event.value);
      }
    });

    // 결과 배열로 변환 및 정렬 (날짜 내림차순)
    const result = Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));

    return result;
  } catch (error) {
    console.error('[ZA Service] getDailyEventStats error:', error);
    throw error;
  }
};

// ============================================================================
// 채널/소스/미디엄/캠페인 UTM 조합별 통합 분석
// ============================================================================

/**
 * 채널·소스·미디엄·캠페인을 한 행에 모두 보여주는 UTM 조합 분석
 * @param {object} params
 * @param {string|null} params.advertiserId
 * @param {Array<string>} params.availableAdvertiserIds
 * @param {string} params.startDate - YYYY-MM-DD
 * @param {string} params.endDate   - YYYY-MM-DD
 * @returns {Promise<Array>} UTM 조합별 통계 배열
 */
export const getUTMBreakdown = async ({
  advertiserId,
  availableAdvertiserIds,
  startDate,
  endDate,
  attributionModel = 'first_touch', // 'first_touch' | 'visitor' | 'session'
}) => {
  try {
    const ids = _resolveAdvertiserIds(advertiserId, availableAdvertiserIds);
    if (ids.length === 0) return [];

    const blockedIps = await _getBlockedIpsCached();
    let query = supabase
      .from('za_events')
      .select(
        'visitor_id, session_id, event_type, channel, utm_source, utm_medium, utm_campaign, value, time_on_page, scroll_depth, created_at'
      )
      .in('advertiser_id', ids)
      .order('created_at', { ascending: true });

    if (startDate && endDate) {
      query = query
        .gte('created_at', `${startDate}T00:00:00+09:00`)
        .lte('created_at', `${endDate}T23:59:59+09:00`);
    }

    query = _applyIpFilter(query, blockedIps);
    const { data, error } = await query;
    if (error) throw error;

    const groups = {};
    const sessionGroupMap = {}; // session_id → group key
    const sessionEndEvents = [];
    const visitorFirstGroup = {}; // first_touch 모드: visitor_id → 최초 그룹 키

    const makeKey = (event) =>
      [
        event.channel      || 'direct',
        event.utm_source   || '-',
        event.utm_medium   || '-',
        event.utm_campaign || '-',
      ].join('|');

    const getOrCreate = (key, event) => {
      if (!groups[key]) {
        groups[key] = {
          channel:  event.channel      || 'direct',
          source:   event.utm_source   || '-',
          medium:   event.utm_medium   || '-',
          campaign: event.utm_campaign || '-',
          visitors: new Set(),
          sessions: new Set(),
          pageviews: 0,
          purchases: 0,
          revenue: 0,
          addToCarts: 0,
          signups: 0,
          leads: 0,
          totalTimeOnPage: 0,
          sessionEndCount: 0,
          totalScrollDepth: 0,
        };
      }
      return groups[key];
    };

    // Pass 1: pageview / 전환 이벤트 집계 (created_at 오름차순 정렬된 상태)
    (data || []).forEach((event) => {
      if (event.event_type === 'session_end') {
        sessionEndEvents.push(event);
        return;
      }

      const key = makeKey(event);
      const g = getOrCreate(key, event);

      // 어트리뷰션 모델별 사용자 카운트
      if (attributionModel === 'first_touch') {
        if (event.visitor_id && !(event.visitor_id in visitorFirstGroup)) {
          visitorFirstGroup[event.visitor_id] = key;
          g.visitors.add(event.visitor_id);
        }
      } else if (attributionModel === 'visitor') {
        if (event.visitor_id) g.visitors.add(event.visitor_id);
      }
      // session 모드는 visitors 미사용, sessions.size로 집계

      g.sessions.add(event.session_id);

      // 세션 → 그룹 키 매핑 (session_end 매칭용)
      if (!sessionGroupMap[event.session_id]) {
        sessionGroupMap[event.session_id] = key;
      }

      if (event.event_type === 'pageview')    g.pageviews++;
      if (event.event_type === 'purchase')    { g.purchases++; g.revenue += parseFloat(event.value || 0); }
      if (event.event_type === 'add_to_cart') g.addToCarts++;
      if (event.event_type === 'signup')      g.signups++;
      if (event.event_type === 'lead')        g.leads++;
    });

    // Pass 2: session_end 이벤트로 체류시간/스크롤 집계
    sessionEndEvents.forEach((event) => {
      if (!event.time_on_page || event.time_on_page <= 0) return;

      const key =
        sessionGroupMap[event.session_id] ||
        [event.channel || 'direct', '-', '-', '-'].join('|');

      const g = groups[key];
      if (!g) return;

      g.totalTimeOnPage += event.time_on_page;
      g.sessionEndCount++;
      g.totalScrollDepth += event.scroll_depth || 0;
    });

    // 최종 결과 배열 변환 및 정렬
    return Object.values(groups)
      .map((g) => {
        const userCount = attributionModel === 'session' ? g.sessions.size : g.visitors.size;
        return {
          channel:  g.channel,
          source:   g.source,
          medium:   g.medium,
          campaign: g.campaign,
          users: userCount,
          pageviews: g.pageviews,
          avgPageviewsPerUser: userCount > 0 ? +(g.pageviews / userCount).toFixed(2) : 0,
          avgTimeOnPage: g.sessionEndCount > 0 ? +(g.totalTimeOnPage / g.sessionEndCount).toFixed(1) : 0,
          avgScrollDepth: g.sessionEndCount > 0 ? +(g.totalScrollDepth / g.sessionEndCount).toFixed(1) : 0,
          purchases: g.purchases,
          revenue: g.revenue,
          addToCarts: g.addToCarts,
          signups: g.signups,
          leads: g.leads,
          memberConversionRate: userCount > 0 ? +((g.signups / userCount) * 100).toFixed(2) : 0,
          purchaseConversionRate: userCount > 0 ? +((g.purchases / userCount) * 100).toFixed(2) : 0,
        };
      })
      .sort((a, b) => b.users - a.users);
  } catch (error) {
    console.error('[ZA Service] getUTMBreakdown error:', error);
    throw error;
  }
};

// ============================================================================
// 유입 경로 분석 (referrer 도메인 기준 전환 지표)
// ============================================================================

/**
 * referrer 도메인 기준 유입 경로 분석 (테이블용)
 * @param {object} params
 * @returns {Promise<Array>} 소스별 {source, lastUtmChannel, totalVisits, visitors, ...}
 */
export const getReferrerBreakdown = async ({
  advertiserId,
  availableAdvertiserIds,
  startDate,
  endDate,
  attributionModel = 'first_touch', // 'first_touch' | 'visitor' | 'session'
}) => {
  try {
    const ids = _resolveAdvertiserIds(advertiserId, availableAdvertiserIds);
    if (ids.length === 0) return [];

    const startTs = `${startDate}T00:00:00+09:00`;
    const endTs   = `${endDate}T23:59:59+09:00`;
    const blockedIps = await _getBlockedIpsCached();

    let query = supabase
      .from('za_events')
      .select(
        'visitor_id, session_id, event_type, page_referrer, channel, value, time_on_page, scroll_depth, created_at'
      )
      .in('advertiser_id', ids)
      .in('event_type', ['pageview', 'purchase', 'signup', 'lead', 'add_to_cart', 'session_end'])
      .gte('created_at', startTs)
      .lte('created_at', endTs)
      .order('created_at', { ascending: true });
    query = _applyIpFilter(query, blockedIps);
    const { data, error } = await query;

    if (error) throw error;

    const extractDomain = (referrer) => {
      if (!referrer || referrer.trim() === '') return '직접 유입';
      try {
        const urlStr = referrer.startsWith('http') ? referrer : `https://${referrer}`;
        return new URL(urlStr).hostname.replace(/^www\./, '');
      } catch {
        return referrer;
      }
    };

    const groups = {};
    const sessionRefMap = {};
    const refChannelMap = {};
    const visitorFirstRef = {}; // first_touch: visitor_id → 최초 ref

    const getOrCreate = (ref) => {
      if (!groups[ref]) {
        groups[ref] = {
          source: ref,
          lastUtmChannel: null,
          totalVisits: 0,
          visitors: new Set(),
          sessions: new Set(),
          pageviews: 0,
          signups: 0,
          purchasers: new Set(),
          purchaseCount: 0,
          revenue: 0,
          addToCarts: 0,
          leads: 0,
          totalTimeOnPage: 0,
          sessionEndCount: 0,
          totalScrollDepth: 0,
        };
      }
      return groups[ref];
    };

    const rows = data || [];

    // Pass 1: pageview → referrer 집계
    rows
      .filter((e) => e.event_type === 'pageview')
      .forEach((event) => {
        const ref = extractDomain(event.page_referrer);
        const g   = getOrCreate(ref);
        g.totalVisits++;
        g.pageviews++;

        if (attributionModel === 'first_touch') {
          if (event.visitor_id && !(event.visitor_id in visitorFirstRef)) {
            visitorFirstRef[event.visitor_id] = ref;
            g.visitors.add(event.visitor_id);
          }
        } else if (attributionModel === 'visitor') {
          if (event.visitor_id) g.visitors.add(event.visitor_id);
        }

        if (event.session_id) g.sessions.add(event.session_id);
        if (!sessionRefMap[event.session_id]) sessionRefMap[event.session_id] = ref;
        if (event.channel) {
          const ts = new Date(event.created_at).getTime();
          if (!refChannelMap[ref] || ts > refChannelMap[ref].ts) {
            refChannelMap[ref] = { channel: event.channel, ts };
          }
        }
      });

    // Pass 2: session_end → 체류시간/스크롤
    rows
      .filter((e) => e.event_type === 'session_end')
      .forEach((event) => {
        const ref = sessionRefMap[event.session_id];
        if (!ref || !groups[ref]) return;
        const g = groups[ref];
        if (event.time_on_page && event.time_on_page > 0) {
          g.totalTimeOnPage += event.time_on_page;
          g.sessionEndCount++;
          g.totalScrollDepth += event.scroll_depth || 0;
        }
      });

    // Pass 3: 전환 이벤트 → 세션 referrer 귀속
    rows
      .filter((e) => ['purchase', 'signup', 'lead', 'add_to_cart'].includes(e.event_type))
      .forEach((event) => {
        const ref = sessionRefMap[event.session_id] || '직접 유입';
        const g   = groups[ref] || getOrCreate(ref);
        if (event.event_type === 'signup')      g.signups++;
        if (event.event_type === 'lead')        g.leads++;
        if (event.event_type === 'add_to_cart') g.addToCarts++;
        if (event.event_type === 'purchase') {
          g.purchaseCount++;
          if (event.visitor_id) g.purchasers.add(event.visitor_id);
          g.revenue += parseFloat(event.value || 0);
        }
      });

    Object.keys(groups).forEach((ref) => {
      groups[ref].lastUtmChannel = refChannelMap[ref]?.channel ?? null;
    });

    return Object.values(groups)
      .map((g) => {
        const vc = attributionModel === 'session' ? g.sessions.size : g.visitors.size;
        return {
          source:                 g.source,
          lastUtmChannel:         g.lastUtmChannel,
          totalVisits:            g.totalVisits,
          visitors:               vc,
          pageviews:              g.pageviews,
          avgTimeOnPage:          g.sessionEndCount > 0 ? +(g.totalTimeOnPage / g.sessionEndCount).toFixed(1) : 0,
          avgScrollDepth:         g.sessionEndCount > 0 ? +(g.totalScrollDepth / g.sessionEndCount).toFixed(1) : 0,
          signups:                g.signups,
          memberConversionRate:   vc > 0 ? +((g.signups / vc) * 100).toFixed(2) : 0,
          purchasers:             g.purchasers.size,
          purchaseCount:          g.purchaseCount,
          revenue:                g.revenue,
          purchaseConversionRate: vc > 0 ? +((g.purchaseCount / vc) * 100).toFixed(2) : 0,
          avgOrderValue:          g.purchaseCount > 0 ? Math.round(g.revenue / g.purchaseCount) : 0,
          addToCarts:             g.addToCarts,
          leads:                  g.leads,
        };
      })
      .sort((a, b) => b.totalVisits - a.totalVisits);
  } catch (error) {
    console.error('[ZA Service] getReferrerBreakdown error:', error);
    throw error;
  }
};

/**
 * 경로 탐색 분석 - 세션별 페이지 이동 경로 반환
 * @param {object} params
 * @param {string|null} params.advertiserId
 * @param {string[]} params.availableAdvertiserIds
 * @param {string} params.startDate - 'YYYY-MM-DD'
 * @param {string} params.endDate   - 'YYYY-MM-DD'
 * @returns {Promise<string[][]>} 세션별 페이지 경로 배열 (path+query만, 호스트 제거)
 */
export const getNavigationPaths = async ({
  advertiserId,
  availableAdvertiserIds,
  startDate,
  endDate,
}) => {
  try {
    const ids = _resolveAdvertiserIds(advertiserId, availableAdvertiserIds);
    if (ids.length === 0) return [];

    const startTs = `${startDate}T00:00:00+09:00`;
    const endTs   = `${endDate}T23:59:59+09:00`;
    const blockedIps = await _getBlockedIpsCached();

    let query = supabase
      .from('za_events')
      .select('session_id, page_url, page_title, created_at')
      .in('advertiser_id', ids)
      .eq('event_type', 'pageview')
      .gte('created_at', startTs)
      .lte('created_at', endTs)
      .order('session_id', { ascending: true })
      .order('created_at',  { ascending: true })
      .limit(100000);
    query = _applyIpFilter(query, blockedIps);
    const { data, error } = await query;

    if (error) throw error;

    const extractPath = (raw) => normalizeUrl(raw);

    // session_id 별로 페이지 순서 누적 (created_at 오름차순 이미 정렬됨)
    // 각 항목: { path: '/shop/?idx=79', title: '상품명' | null }
    const sessionMap = {};
    (data || []).forEach((row) => {
      if (!row.session_id || !row.page_url) return;
      const path  = extractPath(row.page_url);
      if (!path) return;
      const title = row.page_title || null;
      if (!sessionMap[row.session_id]) sessionMap[row.session_id] = [];
      const arr  = sessionMap[row.session_id];
      const last = arr[arr.length - 1];
      // 연속 중복 제거 (같은 path를 여러 번 새로고침한 경우)
      if (last && last.path === path) return;
      arr.push({ path, title });
    });

    return Object.values(sessionMap).filter((p) => p.length > 0);
  } catch (error) {
    console.error('[ZA Service] getNavigationPaths error:', error);
    throw error;
  }
};

/**
 * referrer별 시간대별 모든 지표 (차트용, 한 번 조회로 전 지표 반환)
 * @param {object} params
 * @param {string[]} [params.referrers] - 필터할 referrer 배열 (null이면 전체)
 * @returns {Promise<{[referrer]: {totalVisits,visitors,signups,purchasers,purchaseCount,revenue,purchaseConversionRate,avgOrderValue}: number[24]}>}
 */
export const getReferrerHourlyData = async ({
  advertiserId,
  availableAdvertiserIds,
  startDate,
  endDate,
  referrers = null,
}) => {
  const EMPTY_METRICS = () => ({
    totalVisits:            Array(24).fill(0),
    visitors:               Array(24).fill(0),
    signups:                Array(24).fill(0),
    purchasers:             Array(24).fill(0),
    purchaseCount:          Array(24).fill(0),
    revenue:                Array(24).fill(0),
    purchaseConversionRate: Array(24).fill(0),
    avgOrderValue:          Array(24).fill(0),
  });

  try {
    const ids = _resolveAdvertiserIds(advertiserId, availableAdvertiserIds);
    if (ids.length === 0) return { '합계': EMPTY_METRICS() };

    const startTs = `${startDate}T00:00:00+09:00`;
    const endTs   = `${endDate}T23:59:59+09:00`;
    const blockedIps = await _getBlockedIpsCached();

    let query = supabase
      .from('za_events')
      .select('visitor_id, session_id, event_type, page_referrer, value, created_at')
      .in('advertiser_id', ids)
      .in('event_type', ['pageview', 'signup', 'purchase'])
      .gte('created_at', startTs)
      .lte('created_at', endTs);
    query = _applyIpFilter(query, blockedIps);
    const { data, error } = await query;

    if (error) throw error;

    const extractDomain = (referrer) => {
      if (!referrer || referrer.trim() === '') return '직접 유입';
      try {
        const urlStr = referrer.startsWith('http') ? referrer : `https://${referrer}`;
        return new URL(urlStr).hostname.replace(/^www\./, '');
      } catch {
        return referrer;
      }
    };

    const kstHour = (created_at) => {
      const d = new Date(created_at);
      return (d.getUTCHours() + 9) % 24;
    };

    // referrer별 raw 집계 버킷
    const byRef = {};
    const totalBucket = {
      totalVisits:   Array(24).fill(0),
      visitorSets:   Array.from({ length: 24 }, () => new Set()),
      signups:       Array(24).fill(0),
      purchaserSets: Array.from({ length: 24 }, () => new Set()),
      purchaseCount: Array(24).fill(0),
      revenue:       Array(24).fill(0),
    };
    const sessionRefMap = {}; // session_id → referrer

    const getOrCreateBucket = (ref) => {
      if (!byRef[ref]) {
        byRef[ref] = {
          totalVisits:   Array(24).fill(0),
          visitorSets:   Array.from({ length: 24 }, () => new Set()),
          signups:       Array(24).fill(0),
          purchaserSets: Array.from({ length: 24 }, () => new Set()),
          purchaseCount: Array(24).fill(0),
          revenue:       Array(24).fill(0),
        };
      }
      return byRef[ref];
    };

    const rows = data || [];

    // Pass 1: pageview
    rows
      .filter((e) => e.event_type === 'pageview')
      .forEach((e) => {
        const ref  = extractDomain(e.page_referrer);
        if (referrers && !referrers.includes(ref)) return;
        const hour = kstHour(e.created_at);
        const bkt  = getOrCreateBucket(ref);

        bkt.totalVisits[hour]++;
        totalBucket.totalVisits[hour]++;
        if (e.visitor_id) {
          bkt.visitorSets[hour].add(e.visitor_id);
          totalBucket.visitorSets[hour].add(e.visitor_id);
        }
        if (!sessionRefMap[e.session_id]) sessionRefMap[e.session_id] = ref;
      });

    // Pass 2: signup / purchase (세션 referrer 귀속)
    rows
      .filter((e) => e.event_type === 'signup' || e.event_type === 'purchase')
      .forEach((e) => {
        const ref  = sessionRefMap[e.session_id] || '직접 유입';
        if (referrers && !referrers.includes(ref)) return;
        const hour = kstHour(e.created_at);
        const bkt  = getOrCreateBucket(ref);

        if (e.event_type === 'signup') {
          bkt.signups[hour]++;
          totalBucket.signups[hour]++;
        }
        if (e.event_type === 'purchase') {
          const val = parseFloat(e.value || 0);
          bkt.purchaseCount[hour]++;
          bkt.revenue[hour] += val;
          totalBucket.purchaseCount[hour]++;
          totalBucket.revenue[hour] += val;
          if (e.visitor_id) {
            bkt.purchaserSets[hour].add(e.visitor_id);
            totalBucket.purchaserSets[hour].add(e.visitor_id);
          }
        }
      });

    // 버킷 → 최종 지표 배열 변환
    const toMetrics = (bkt) => {
      const visitors      = bkt.visitorSets.map((s) => s.size);
      const purchasers    = bkt.purchaserSets.map((s) => s.size);
      const purchaseCount = bkt.purchaseCount;
      const revenue       = bkt.revenue.map((v) => Math.round(v));
      return {
        totalVisits:            bkt.totalVisits,
        visitors,
        signups:                bkt.signups,
        purchasers,
        purchaseCount,
        revenue,
        purchaseConversionRate: visitors.map((v, i) =>
          v > 0 ? +((purchaseCount[i] / v) * 100).toFixed(2) : 0
        ),
        avgOrderValue: purchaseCount.map((c, i) =>
          c > 0 ? Math.round(revenue[i] / c) : 0
        ),
      };
    };

    const result = { '합계': toMetrics(totalBucket) };
    Object.entries(byRef).forEach(([ref, bkt]) => {
      result[ref] = toMetrics(bkt);
    });
    return result;
  } catch (error) {
    console.error('[ZA Service] getReferrerHourlyData error:', error);
    throw error;
  }
};

// ============================================================================
// 유입 키워드 분석
// ============================================================================

/**
 * 검색엔진별 referrer URL에서 키워드를 추출합니다.
 * - 네이버: search.naver.com?query=
 * - 다음/카카오: search.daum.net?q=
 * - 구글: 암호화로 인해 (not provided) 반환
 * - 빙: bing.com?q=
 * - 네이트: search.nate.com?q=
 *
 * @returns {{ keyword: string, engine: string, engineDomain: string } | null}
 *   검색 유입이 아니면 null
 */
const _extractSearchKeyword = (referrer) => {
  if (!referrer) return null;
  try {
    const url = new URL(referrer.startsWith('http') ? referrer : `https://${referrer}`);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();

    // 네이버
    if (host.includes('naver.com') && host.includes('search')) {
      const q = url.searchParams.get('query') || url.searchParams.get('q');
      return { keyword: q || '(not provided)', engine: '네이버', engineDomain: 'naver.com' };
    }
    // 다음/카카오
    if (host.includes('daum.net') || host.includes('search.kakao.com')) {
      const q = url.searchParams.get('q') || url.searchParams.get('query');
      return { keyword: q || '(not provided)', engine: '다음', engineDomain: 'daum.net' };
    }
    // 구글 — HTTPS 암호화로 키워드 전달 안 됨
    if (host.includes('google.')) {
      return { keyword: '(not provided)', engine: 'Google', engineDomain: 'google.com' };
    }
    // 빙
    if (host.includes('bing.com')) {
      const q = url.searchParams.get('q');
      return { keyword: q || '(not provided)', engine: 'Bing', engineDomain: 'bing.com' };
    }
    // 네이트
    if (host.includes('nate.com')) {
      const q = url.searchParams.get('q') || url.searchParams.get('query');
      return { keyword: q || '(not provided)', engine: '네이트', engineDomain: 'nate.com' };
    }
    // 야후
    if (host.includes('yahoo.')) {
      const q = url.searchParams.get('p') || url.searchParams.get('q');
      return { keyword: q || '(not provided)', engine: 'Yahoo', engineDomain: 'yahoo.com' };
    }
  } catch {
    // invalid URL
  }
  return null;
};

/**
 * 유입 키워드 분석
 *
 * za_events의 pageview.page_referrer에서 검색 키워드를 추출하여
 * 키워드별 방문/전환 지표를 반환합니다.
 *
 * @returns {Array<{
 *   keyword: string,
 *   engine: string,
 *   engineDomain: string,
 *   visitors: number,
 *   sessions: number,
 *   signups: number,
 *   memberConversionRate: number,
 *   purchasers: number,
 *   purchaseCount: number,
 *   revenue: number,
 *   purchaseConversionRate: number,
 *   avgOrderValue: number,
 *   leads: number,
 *   addToCarts: number,
 * }>}
 */
export const getKeywordBreakdown = async ({
  advertiserId,
  availableAdvertiserIds,
  startDate,
  endDate,
}) => {
  try {
    const ids = _resolveAdvertiserIds(advertiserId, availableAdvertiserIds);
    if (ids.length === 0) return [];

    const startTs = `${startDate}T00:00:00+09:00`;
    const endTs   = `${endDate}T23:59:59+09:00`;
    const blockedIps = await _getBlockedIpsCached();

    let query = supabase
      .from('za_events')
      .select(
        'visitor_id, session_id, event_type, page_referrer, value, created_at'
      )
      .in('advertiser_id', ids)
      .in('event_type', ['pageview', 'purchase', 'signup', 'lead', 'add_to_cart'])
      .gte('created_at', startTs)
      .lte('created_at', endTs)
      .order('created_at', { ascending: true });
    query = _applyIpFilter(query, blockedIps);
    const { data, error } = await query;

    if (error) throw error;

    const rows = data || [];

    // session_id → 키워드 정보 (첫 번째 pageview 기준)
    const sessionKeywordMap = {};
    // 키워드 집계 그룹: key = `${engine}||${keyword}`
    const groups = {};

    const groupKey = (engine, keyword) => `${engine}||${keyword}`;
    const getOrCreate = (engine, engineDomain, keyword) => {
      const k = groupKey(engine, keyword);
      if (!groups[k]) {
        groups[k] = {
          keyword,
          engine,
          engineDomain,
          visitors:    new Set(),
          sessions:    new Set(),
          signups:     0,
          purchasers:  new Set(),
          purchaseCount: 0,
          revenue:     0,
          leads:       0,
          addToCarts:  0,
        };
      }
      return groups[k];
    };

    // Pass 1: pageview → 키워드 감지 및 session 맵 구성
    rows
      .filter((e) => e.event_type === 'pageview')
      .forEach((event) => {
        const info = _extractSearchKeyword(event.page_referrer);
        if (!info) return;

        const g = getOrCreate(info.engine, info.engineDomain, info.keyword);
        if (event.visitor_id) g.visitors.add(event.visitor_id);
        if (event.session_id) {
          g.sessions.add(event.session_id);
          // 세션의 첫 번째 검색 유입 기록 (이후 전환 귀속용)
          if (!sessionKeywordMap[event.session_id]) {
            sessionKeywordMap[event.session_id] = { engine: info.engine, engineDomain: info.engineDomain, keyword: info.keyword };
          }
        }
      });

    // Pass 2: 전환 이벤트 → 세션의 검색 키워드에 귀속
    rows
      .filter((e) => ['purchase', 'signup', 'lead', 'add_to_cart'].includes(e.event_type))
      .forEach((event) => {
        const info = sessionKeywordMap[event.session_id];
        if (!info) return;
        const g = groups[groupKey(info.engine, info.keyword)];
        if (!g) return;

        if (event.event_type === 'signup')      g.signups++;
        if (event.event_type === 'lead')        g.leads++;
        if (event.event_type === 'add_to_cart') g.addToCarts++;
        if (event.event_type === 'purchase') {
          g.purchaseCount++;
          if (event.visitor_id) g.purchasers.add(event.visitor_id);
          g.revenue += parseFloat(event.value || 0);
        }
      });

    return Object.values(groups)
      .map((g) => {
        const vc = g.visitors.size;
        return {
          keyword:                g.keyword,
          engine:                 g.engine,
          engineDomain:           g.engineDomain,
          visitors:               vc,
          sessions:               g.sessions.size,
          signups:                g.signups,
          memberConversionRate:   vc > 0 ? +((g.signups / vc) * 100).toFixed(2) : 0,
          purchasers:             g.purchasers.size,
          purchaseCount:          g.purchaseCount,
          revenue:                g.revenue,
          purchaseConversionRate: vc > 0 ? +((g.purchaseCount / vc) * 100).toFixed(2) : 0,
          avgOrderValue:          g.purchaseCount > 0 ? Math.round(g.revenue / g.purchaseCount) : 0,
          leads:                  g.leads,
          addToCarts:             g.addToCarts,
        };
      })
      .sort((a, b) => b.visitors - a.visitors);
  } catch (error) {
    console.error('[ZA Service] getKeywordBreakdown error:', error);
    throw error;
  }
};
