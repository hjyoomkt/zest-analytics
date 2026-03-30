/**
 * ============================================================================
 * Zest Analytics JavaScript SDK
 * ============================================================================
 *
 * 광고주 웹사이트에 설치되는 전환 추적 SDK
 *
 * 기능:
 * - 광고 클릭 추적 (UTM/ZA 파라미터)
 * - 어트리뷰션 윈도우 (클릭 후 1일/7일/28일)
 * - 라스트 클릭 기준
 * - 전환 이벤트 추적 (구매, 회원가입, 리드 등)
 */

(function (window) {
  'use strict';

  const SDK_VERSION = '1.0.0';

  // API 엔드포인트 (실제 배포 시 변경 필요)
  const API_ENDPOINT =
    window.ZA_API_ENDPOINT ||
    'https://qdzdyoqtzkfpcogecyar.supabase.co/functions/v1/za-collect-event';

  /**
   * Zest Analytics 클래스
   */
  class ZestAnalytics {
    constructor() {
      this.trackingId = null;
      this.config = {
        debug: false,
        autoCapture: true, // 자동 UTM 파라미터 캡처
        attributionWindow: 28, // 기본 어트리뷰션 윈도우 (일)
      };
      this.queue = []; // 오프라인 대기열
      this.isInitialized = false;
    }

    /**
     * SDK 초기화
     * @param {string} trackingId - ZA-XXXXXXXX 형식의 추적 ID
     * @param {object} options - 옵션 설정
     */
    init(trackingId, options = {}) {
      if (!trackingId || !trackingId.match(/^ZA-\d{8}$/)) {
        console.error('[ZA] Invalid tracking ID format. Expected: ZA-XXXXXXXX');
        return;
      }

      this.trackingId = trackingId;
      this.config = { ...this.config, ...options };
      this.isInitialized = true;

      if (this.config.debug) {
        console.log('[ZA] SDK initialized', {
          trackingId,
          version: SDK_VERSION,
          config: this.config,
        });
      }

      // UTM/ZA 파라미터 자동 캡처 및 저장
      if (this.config.autoCapture) {
        this._captureParams();
      }

      // 대기열 처리
      this._flushQueue();
    }

    /**
     * 이벤트 추적
     * @param {string} eventType - 이벤트 타입 (purchase, signup, lead, add_to_cart, custom)
     * @param {object} data - 이벤트 데이터
     */
    track(eventType, data = {}) {
      if (!this.isInitialized || !this.trackingId) {
        console.error('[ZA] SDK not initialized. Call init() first.');
        return;
      }

      // 이벤트 타입 검증
      const validTypes = ['purchase', 'signup', 'lead', 'add_to_cart', 'custom'];
      if (!validTypes.includes(eventType)) {
        console.error('[ZA] Invalid event type:', eventType);
        return;
      }

      // custom 이벤트는 event_name 필수
      if (eventType === 'custom' && !data.eventName) {
        console.error('[ZA] Custom events require eventName property');
        return;
      }

      const payload = this._buildPayload(eventType, data);

      if (this.config.debug) {
        console.log('[ZA] Tracking event:', payload);
      }

      this._sendEvent(payload);
    }

    /**
     * 페이지뷰 추적 (선택적, 테스트용)
     */
    trackPageView() {
      if (!this.isInitialized || !this.trackingId) {
        console.error('[ZA] SDK not initialized');
        return;
      }

      const payload = {
        tracking_id: this.trackingId,
        event_type: 'pageview',
        page_url: window.location.href,
        page_referrer: document.referrer || null,
      };

      if (this.config.debug) {
        console.log('[ZA] Tracking pageview:', payload);
      }

      this._sendEvent(payload);
    }

    /**
     * 이벤트 페이로드 생성
     * @private
     */
    _buildPayload(eventType, data) {
      const payload = {
        tracking_id: this.trackingId,
        event_type: eventType,
        event_name: data.eventName || null,
        value: data.value || null,
        currency: data.currency || 'KRW',
        order_id: data.orderId || null,
        custom_data: data.customData || {},
      };

      // 전환 이벤트인 경우에만 추가 정보 수집
      if (eventType !== 'pageview') {
        // 어트리뷰션 계산
        const attribution = this._calculateAttribution();

        if (attribution) {
          Object.assign(payload, {
            clicked_at: attribution.clicked_at,
            days_since_click: attribution.days_since_click,
            attribution_window: attribution.attribution_window,
            is_attributed: attribution.is_attributed,
            utm_source: attribution.utm_source,
            utm_medium: attribution.utm_medium,
            utm_campaign: attribution.utm_campaign,
            utm_term: attribution.utm_term,
            utm_content: attribution.utm_content,
          });
        }

        // 페이지 정보
        payload.page_url = window.location.href;
        payload.page_referrer = document.referrer || null;

        // 디바이스 정보
        const deviceInfo = this._getDeviceInfo();
        Object.assign(payload, deviceInfo);
      }

      return payload;
    }

    /**
     * UTM/ZA 파라미터 캡처 및 저장
     * @private
     */
    _captureParams() {
      const urlParams = new URLSearchParams(window.location.search);
      const params = {};

      // za_* 파라미터 우선, 없으면 utm_* 사용
      const paramNames = ['source', 'medium', 'campaign', 'term', 'content'];
      paramNames.forEach((param) => {
        const zaValue = urlParams.get(`za_${param}`);
        const utmValue = urlParams.get(`utm_${param}`);

        if (zaValue) {
          params[`utm_${param}`] = zaValue;
        } else if (utmValue) {
          params[`utm_${param}`] = utmValue;
        }
      });

      // 파라미터가 있으면 localStorage에 저장 (라스트 클릭 기준 - 덮어쓰기)
      if (Object.keys(params).length > 0) {
        const stored = {
          ...params,
          clicked_at: new Date().toISOString(), // 클릭 시점 저장
        };

        try {
          localStorage.setItem('za_params', JSON.stringify(stored));

          if (this.config.debug) {
            console.log('[ZA] Captured params (last click):', stored);
          }
        } catch (e) {
          console.warn('[ZA] Failed to store params:', e);
        }
      }
    }

    /**
     * 어트리뷰션 계산
     * @private
     * @returns {object|null} 어트리뷰션 정보 또는 null (28일 초과 시)
     */
    _calculateAttribution() {
      try {
        const stored = localStorage.getItem('za_params');
        if (!stored) {
          if (this.config.debug) {
            console.log('[ZA] No stored params found');
          }
          return null;
        }

        const data = JSON.parse(stored);
        const clickedAt = new Date(data.clicked_at);
        const now = new Date();

        // 클릭 후 경과 일수 계산
        const daysSinceClick = Math.floor((now - clickedAt) / (1000 * 60 * 60 * 24));

        if (this.config.debug) {
          console.log('[ZA] Attribution calculation:', {
            clickedAt: data.clicked_at,
            daysSinceClick,
            maxWindow: this.config.attributionWindow,
          });
        }

        // 어트리뷰션 윈도우 초과 체크
        if (daysSinceClick > this.config.attributionWindow) {
          if (this.config.debug) {
            console.log('[ZA] Attribution window exceeded. Removing stored params.');
          }
          localStorage.removeItem('za_params');
          return null; // 28일 초과 - 어트리뷰션 실패
        }

        // 어트리뷰션 윈도우 결정 (1일, 7일, 28일)
        let attributionWindow = 28;
        if (daysSinceClick <= 1) {
          attributionWindow = 1;
        } else if (daysSinceClick <= 7) {
          attributionWindow = 7;
        }

        return {
          clicked_at: data.clicked_at,
          days_since_click: daysSinceClick,
          attribution_window: attributionWindow,
          is_attributed: true,
          utm_source: data.utm_source || null,
          utm_medium: data.utm_medium || null,
          utm_campaign: data.utm_campaign || null,
          utm_term: data.utm_term || null,
          utm_content: data.utm_content || null,
        };
      } catch (e) {
        console.warn('[ZA] Failed to calculate attribution:', e);
        return null;
      }
    }

    /**
     * 디바이스 정보 수집
     * @private
     */
    _getDeviceInfo() {
      const ua = navigator.userAgent;

      // 디바이스 타입
      const isMobile = /Mobile|Android|iPhone|iPod/i.test(ua);
      const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);
      const deviceType = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';

      // 브라우저
      let browser = 'Unknown';
      if (ua.includes('Chrome') && !ua.includes('Edge')) browser = 'Chrome';
      else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
      else if (ua.includes('Firefox')) browser = 'Firefox';
      else if (ua.includes('Edge')) browser = 'Edge';
      else if (ua.includes('MSIE') || ua.includes('Trident')) browser = 'IE';

      // OS
      let os = 'Unknown';
      if (ua.includes('Windows')) os = 'Windows';
      else if (ua.includes('Mac OS') || ua.includes('Macintosh')) os = 'macOS';
      else if (ua.includes('Linux')) os = 'Linux';
      else if (ua.includes('Android')) os = 'Android';
      else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

      return { device_type: deviceType, browser, os };
    }

    /**
     * 이벤트 전송
     * @private
     */
    async _sendEvent(payload) {
      try {
        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`HTTP ${response.status}: ${errorData.error || 'Unknown error'}`);
        }

        if (this.config.debug) {
          console.log('[ZA] Event sent successfully');
        }

        return true;
      } catch (error) {
        console.error('[ZA] Failed to send event:', error);

        // 오프라인 대기열에 추가
        this.queue.push(payload);

        // 재시도 (5초 후)
        setTimeout(() => this._flushQueue(), 5000);

        return false;
      }
    }

    /**
     * 대기열 처리
     * @private
     */
    async _flushQueue() {
      if (this.queue.length === 0) return;

      if (this.config.debug) {
        console.log('[ZA] Flushing queue:', this.queue.length, 'events');
      }

      const event = this.queue.shift();
      const success = await this._sendEvent(event);

      // 성공하면 다음 이벤트 처리
      if (success && this.queue.length > 0) {
        setTimeout(() => this._flushQueue(), 1000);
      }
    }
  }

  // 전역 객체 생성
  window.zestAnalytics = new ZestAnalytics();

  if (typeof window.zestAnalytics.config.debug !== 'undefined' && window.zestAnalytics.config.debug) {
    console.log('[ZA] SDK loaded', { version: SDK_VERSION });
  }
})(window);
