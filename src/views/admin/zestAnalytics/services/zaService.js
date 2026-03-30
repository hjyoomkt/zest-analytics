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
    let query = supabase.from('za_events').select('event_type, value, currency, is_attributed');

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
    let query = supabase
      .from('za_events')
      .select('attribution_window, event_type, days_since_click')
      .eq('is_attributed', true)
      .in('event_type', ['purchase', 'signup', 'lead', 'add_to_cart']);

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
    let query = supabase
      .from('za_events')
      .select('utm_source, utm_medium, utm_campaign, event_type, value, days_since_click, is_attributed');

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
    let query = supabase
      .from('za_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

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
