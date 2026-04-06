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

    const { data, error } = await supabase.rpc('get_hourly_visitors', {
      p_advertiser_ids: ids,
      p_start: `${startDate}T00:00:00+09:00`,
      p_end: `${endDate}T23:59:59+09:00`,
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

    const { data, error } = await supabase.rpc('get_hourly_pageviews', {
      p_advertiser_ids: ids,
      p_start: `${startDate}T00:00:00+09:00`,
      p_end: `${endDate}T23:59:59+09:00`,
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

    const { data, error } = await supabase.rpc('get_page_scroll_stats', {
      p_advertiser_ids: ids,
      p_start: `${startDate}T00:00:00+09:00`,
      p_end: `${endDate}T23:59:59+09:00`,
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

    const { data, error } = await supabase.rpc('get_channel_performance', {
      p_advertiser_ids: ids,
      p_start: `${startDate}T00:00:00+09:00`,
      p_end: `${endDate}T23:59:59+09:00`,
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
 * @param {object} params
 * @param {string|null} params.advertiserId
 * @param {Array<string>} params.availableAdvertiserIds
 * @param {string} params.startDate - YYYY-MM-DD
 * @param {string} params.endDate   - YYYY-MM-DD
 * @param {string|null} params.deviceType - 'desktop'|'mobile'|'tablet'|null(전체)
 * @returns {Promise<Array<{page_url, session_count, avg_depth}>>}
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

    const { data, error } = await supabase.rpc('get_heatmap_page_list', {
      p_advertiser_ids: ids,
      p_start: `${startDate}T00:00:00+09:00`,
      p_end: `${endDate}T23:59:59+09:00`,
      p_device_type: deviceType,
    });

    if (error) throw error;
    return (data || []).map((row) => ({
      ...row,
      session_count: Number(row.session_count),
      avg_depth: Number(row.avg_depth),
    }));
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
  pageUrl,
  startDate,
  endDate,
  deviceType = null,
}) => {
  try {
    const ids = _resolveAdvertiserIds(advertiserId, availableAdvertiserIds);
    if (ids.length === 0 || !pageUrl) {
      return Array.from({ length: 10 }, (_, i) => ({
        bucket_index: i,
        reached_count: 0,
        total_count: 0,
        reach_pct: 0,
      }));
    }

    const { data, error } = await supabase.rpc('get_scroll_heatmap', {
      p_advertiser_ids: ids,
      p_page_url: pageUrl,
      p_start: `${startDate}T00:00:00+09:00`,
      p_end: `${endDate}T23:59:59+09:00`,
      p_device_type: deviceType,
    });

    if (error) throw error;

    // 결과를 10개 배열로 정규화
    const result = Array.from({ length: 10 }, (_, i) => ({
      bucket_index: i,
      reached_count: 0,
      total_count: 0,
      reach_pct: 0,
    }));

    (data || []).forEach(({ bucket_index, reached_count, total_count }) => {
      const idx = Number(bucket_index);
      if (idx >= 0 && idx < 10) {
        result[idx].reached_count = Number(reached_count);
        result[idx].total_count = Number(total_count);
        result[idx].reach_pct =
          total_count > 0 ? Math.round((reached_count / total_count) * 100) : 0;
      }
    });

    return result;
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
  pageUrl,
  startDate,
  endDate,
  deviceType = null,
}) => {
  try {
    const ids = _resolveAdvertiserIds(advertiserId, availableAdvertiserIds);
    if (ids.length === 0 || !pageUrl) {
      return { visitors: 0, pageviews: 0, avgScrollDepth: 0, reach25: 0, reach50: 0, reach75: 0, reach100: 0 };
    }

    const startTs = `${startDate}T00:00:00+09:00`;
    const endTs   = `${endDate}T23:59:59+09:00`;

    // 페이지뷰 + 방문자
    let pvQuery = supabase
      .from('za_events')
      .select('visitor_id')
      .in('advertiser_id', ids)
      .eq('event_type', 'pageview')
      .eq('page_url', pageUrl)
      .gte('created_at', startTs)
      .lte('created_at', endTs);
    if (deviceType) pvQuery = pvQuery.eq('device_type', deviceType);

    // 스크롤 통계 (session_end)
    let seQuery = supabase
      .from('za_events')
      .select('scroll_depth')
      .in('advertiser_id', ids)
      .eq('event_type', 'session_end')
      .eq('page_url', pageUrl)
      .not('scroll_depth', 'is', null)
      .gte('created_at', startTs)
      .lte('created_at', endTs);
    if (deviceType) seQuery = seQuery.eq('device_type', deviceType);

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

    return {
      visitors: uniqueVisitors,
      pageviews: pvData.length,
      avgScrollDepth: avgDepth,
      reach25: total > 0 ? Math.round((seData.filter((r) => r.scroll_depth >= 25).length / total) * 100) : 0,
      reach50: total > 0 ? Math.round((seData.filter((r) => r.scroll_depth >= 50).length / total) * 100) : 0,
      reach75: total > 0 ? Math.round((seData.filter((r) => r.scroll_depth >= 75).length / total) * 100) : 0,
      reach100: total > 0 ? Math.round((seData.filter((r) => r.scroll_depth >= 100).length / total) * 100) : 0,
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
  pageUrl,
  startDate,
  endDate,
  deviceType = null,
}) => {
  try {
    const ids = _resolveAdvertiserIds(advertiserId, availableAdvertiserIds);
    if (ids.length === 0 || !pageUrl) return [];

    let query = supabase
      .from('za_click_events')
      .select('click_x, click_y')
      .in('advertiser_id', ids)
      .eq('page_url', pageUrl)
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
  pageUrl,
  startDate,
  endDate,
  deviceType = null,
  limit = 10,
}) => {
  try {
    const ids = _resolveAdvertiserIds(advertiserId, availableAdvertiserIds);
    if (ids.length === 0 || !pageUrl) return [];

    let query = supabase
      .from('za_click_events')
      .select('element_tag, element_text, element_selector')
      .in('advertiser_id', ids)
      .eq('page_url', pageUrl)
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

    // 페이지뷰 이벤트 조회 (방문자수, 페이지뷰, 신규/재방문)
    const { data: pvData, error: pvError } = await supabase
      .from('za_events')
      .select('visitor_id, session_id, page_url, is_new_visitor')
      .in('advertiser_id', ids)
      .eq('event_type', 'pageview')
      .gte('created_at', startTs)
      .lte('created_at', endTs);

    if (pvError) throw pvError;

    // session_end 이벤트 조회 (체류시간, 스크롤, 신규/재방문)
    const { data: seData, error: seError } = await supabase
      .from('za_events')
      .select('visitor_id, session_id, time_on_page, scroll_depth, is_new_visitor')
      .in('advertiser_id', ids)
      .eq('event_type', 'session_end')
      .gte('created_at', startTs)
      .lte('created_at', endTs);

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
      // session_end 기준 (세션 수)
      newVisitors = seRows.filter(r => isNewFn(r.is_new_visitor)).length;
      returningVisitors = seRows.filter(r => r.is_new_visitor != null && !isNewFn(r.is_new_visitor)).length;
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

    const { data, error } = await supabase
      .from('za_events')
      .select('visitor_id, session_id, event_type, created_at')
      .in('advertiser_id', ids)
      .in('event_type', ['pageview'])
      .gte('created_at', startTs)
      .lte('created_at', endTs)
      .order('created_at', { ascending: true });

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

    const { data, error } = await supabase
      .from('za_events')
      .select('device_type, visitor_id')
      .in('advertiser_id', ids)
      .eq('event_type', 'pageview')
      .gte('created_at', startTs)
      .lte('created_at', endTs);

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

    const { data, error } = await supabase
      .from('za_events')
      .select('is_new_visitor')
      .in('advertiser_id', ids)
      .eq('event_type', 'session_end')
      .gte('created_at', startTs)
      .lte('created_at', endTs);

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
    const { data: pvData, error: pvError } = await supabase
      .from('za_events')
      .select('visitor_id, is_new_visitor')
      .in('advertiser_id', ids)
      .eq('event_type', 'pageview')
      .gte('created_at', startTs)
      .lte('created_at', endTs)
      .not('is_new_visitor', 'is', null);

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

    const { data, error } = await supabase
      .from('za_events')
      .select('page_url, visitor_id')
      .in('advertiser_id', ids)
      .eq('event_type', 'pageview')
      .gte('created_at', startTs)
      .lte('created_at', endTs);

    if (error) throw error;

    const byPage = {};
    (data || []).forEach(row => {
      const url = row.page_url || '/';
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

    const { data, error } = await supabase
      .from('za_events')
      .select('event_type, is_bounce, session_id')
      .in('advertiser_id', ids)
      .in('event_type', ['session_end', 'page_refresh', 'page_back'])
      .gte('created_at', startTs)
      .lte('created_at', endTs);

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

    const { data, error } = await supabase
      .from('za_events')
      .select('event_type, page_url, scroll_depth, event_name')
      .in('advertiser_id', ids)
      .neq('event_type', 'session_end')
      .gte('created_at', startTs)
      .lte('created_at', endTs);

    if (error) {
      console.error('[ZA Service] getTopActions query error:', error);
      throw error;
    }

    const decodeUrl = (url) => { try { return decodeURIComponent(url); } catch { return url; } };
    const byKey = {};
    (data || []).forEach(row => {
      const etype = row.event_type || 'pageview';
      const url = row.page_url || '/';
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
}) => {
  try {
    const ids = _resolveAdvertiserIds(advertiserId, availableAdvertiserIds);
    if (ids.length === 0) return [];

    const startTs = `${startDate}T00:00:00+09:00`;
    const endTs = `${endDate}T23:59:59+09:00`;

    const { data, error } = await supabase
      .from('za_events')
      .select('page_referrer, channel, visitor_id')
      .in('advertiser_id', ids)
      .eq('event_type', 'pageview')
      .gte('created_at', startTs)
      .lte('created_at', endTs);

    if (error) {
      console.error('[ZA Service] getTopReferrers query error:', error);
      throw error;
    }

    const byRef = {};
    (data || []).forEach(row => {
      // channel 컬럼이 있으면 우선 사용, 없으면 page_referrer 파싱
      let ref;
      if (row.channel && row.channel.trim() !== '') {
        ref = row.channel.trim();
      } else {
        const raw = row.page_referrer;
        if (!raw || raw.trim() === '') {
          ref = '직접 유입';
        } else {
          try {
            // 프로토콜이 없으면 붙여서 파싱
            const urlStr = raw.startsWith('http') ? raw : `https://${raw}`;
            ref = new URL(urlStr).hostname.replace(/^www\./, '');
          } catch {
            ref = raw;
          }
        }
      }

      if (!byRef[ref]) byRef[ref] = { referrer: ref, visitors: new Set(), count: 0 };
      if (row.visitor_id) byRef[ref].visitors.add(row.visitor_id);
      byRef[ref].count += 1;
    });

    const total = Object.values(byRef).reduce((s, r) => s + r.visitors.size, 0);
    return Object.values(byRef)
      .map(r => ({
        referrer: r.referrer,
        count: r.visitors.size,
        pct: total > 0 ? parseFloat(((r.visitors.size / total) * 100).toFixed(1)) : 0,
      }))
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

    const { data, error } = await supabase
      .from('za_events')
      .select('os, visitor_id')
      .in('advertiser_id', ids)
      .eq('event_type', 'pageview')
      .gte('created_at', startTs)
      .lte('created_at', endTs);

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

    const { data, error } = await supabase
      .from('za_events')
      .select('browser, visitor_id')
      .in('advertiser_id', ids)
      .eq('event_type', 'pageview')
      .gte('created_at', startTs)
      .lte('created_at', endTs);

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
}) => {
  try {
    const ids = _resolveAdvertiserIds(advertiserId, availableAdvertiserIds);
    if (ids.length === 0) return [];

    let query = supabase
      .from('za_events')
      .select(
        'visitor_id, session_id, event_type, channel, utm_source, utm_medium, utm_campaign, value, time_on_page, scroll_depth'
      )
      .in('advertiser_id', ids);

    if (startDate && endDate) {
      query = query
        .gte('created_at', `${startDate}T00:00:00+09:00`)
        .lte('created_at', `${endDate}T23:59:59+09:00`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const groups = {};
    const sessionGroupMap = {}; // session_id → group key
    const sessionEndEvents = [];

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

    // Pass 1: pageview / 전환 이벤트 집계
    (data || []).forEach((event) => {
      if (event.event_type === 'session_end') {
        sessionEndEvents.push(event);
        return;
      }

      const key = makeKey(event);
      const g = getOrCreate(key, event);
      if (event.visitor_id) g.visitors.add(event.visitor_id);
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

      // session_end는 channel만 있으므로 매핑 먼저 시도, 없으면 channel-only 키
      const key =
        sessionGroupMap[event.session_id] ||
        [event.channel || 'direct', '-', '-', '-'].join('|');

      const g = groups[key];
      if (!g) return;

      g.totalTimeOnPage += event.time_on_page;
      g.sessionEndCount++;
      g.totalScrollDepth += event.scroll_depth || 0;
    });

    // 최종 결과 배열 변환 및 정렬 (사용자수 내림차순)
    return Object.values(groups)
      .map((g) => ({
        channel:  g.channel,
        source:   g.source,
        medium:   g.medium,
        campaign: g.campaign,
        users: g.visitors.size,
        pageviews: g.pageviews,
        avgPageviewsPerUser: g.visitors.size > 0 ? +(g.pageviews / g.visitors.size).toFixed(2) : 0,
        avgTimeOnPage: g.sessionEndCount > 0 ? +(g.totalTimeOnPage / g.sessionEndCount).toFixed(1) : 0,
        avgScrollDepth: g.sessionEndCount > 0 ? +(g.totalScrollDepth / g.sessionEndCount).toFixed(1) : 0,
        purchases: g.purchases,
        revenue: g.revenue,
        addToCarts: g.addToCarts,
        signups: g.signups,
        leads: g.leads,
        memberConversionRate: g.visitors.size > 0 ? +((g.signups / g.visitors.size) * 100).toFixed(2) : 0,
        purchaseConversionRate: g.visitors.size > 0 ? +((g.purchases / g.visitors.size) * 100).toFixed(2) : 0,
      }))
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
}) => {
  try {
    const ids = _resolveAdvertiserIds(advertiserId, availableAdvertiserIds);
    if (ids.length === 0) return [];

    const startTs = `${startDate}T00:00:00+09:00`;
    const endTs   = `${endDate}T23:59:59+09:00`;

    const { data, error } = await supabase
      .from('za_events')
      .select(
        'visitor_id, session_id, event_type, page_referrer, channel, value, time_on_page, scroll_depth, created_at'
      )
      .in('advertiser_id', ids)
      .in('event_type', ['pageview', 'purchase', 'signup', 'lead', 'add_to_cart', 'session_end'])
      .gte('created_at', startTs)
      .lte('created_at', endTs);

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

    const getOrCreate = (ref) => {
      if (!groups[ref]) {
        groups[ref] = {
          source: ref,
          lastUtmChannel: null,
          totalVisits: 0,
          visitors: new Set(),
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
        if (event.visitor_id) g.visitors.add(event.visitor_id);
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
      .map((g) => ({
        source:                 g.source,
        lastUtmChannel:         g.lastUtmChannel,
        totalVisits:            g.totalVisits,
        visitors:               g.visitors.size,
        pageviews:              g.pageviews,
        avgTimeOnPage:          g.sessionEndCount > 0 ? +(g.totalTimeOnPage / g.sessionEndCount).toFixed(1) : 0,
        avgScrollDepth:         g.sessionEndCount > 0 ? +(g.totalScrollDepth / g.sessionEndCount).toFixed(1) : 0,
        signups:                g.signups,
        memberConversionRate:   g.visitors.size > 0 ? +((g.signups / g.visitors.size) * 100).toFixed(2) : 0,
        purchasers:             g.purchasers.size,
        purchaseCount:          g.purchaseCount,
        revenue:                g.revenue,
        purchaseConversionRate: g.visitors.size > 0 ? +((g.purchaseCount / g.visitors.size) * 100).toFixed(2) : 0,
        avgOrderValue:          g.purchaseCount > 0 ? Math.round(g.revenue / g.purchaseCount) : 0,
        addToCarts:             g.addToCarts,
        leads:                  g.leads,
      }))
      .sort((a, b) => b.totalVisits - a.totalVisits);
  } catch (error) {
    console.error('[ZA Service] getReferrerBreakdown error:', error);
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

    const { data, error } = await supabase
      .from('za_events')
      .select('visitor_id, session_id, event_type, page_referrer, value, created_at')
      .in('advertiser_id', ids)
      .in('event_type', ['pageview', 'signup', 'purchase'])
      .gte('created_at', startTs)
      .lte('created_at', endTs);

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
