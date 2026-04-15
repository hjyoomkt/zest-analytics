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
 * - 스크롤 도달률 추적 (최대 도달 %, session_end에 기록)
 */

(function (window) {
  'use strict';

  const SDK_VERSION = '1.4.0';

  // API 엔드포인트 (실제 배포 시 변경 필요)
  const API_ENDPOINT =
    window.ZA_API_ENDPOINT ||
    'https://ptktgcqsdkjxaxjgdqvw.supabase.co/functions/v1/za-collect-event';

  /**
   * Zest Analytics 클래스
   */
  class ZestAnalytics {
    constructor() {
      this.trackingId = null;
      this.config = {
        debug: false,
        autoCapture: true,
        attributionWindow: 28,
      };
      this.queue = [];
      this.isInitialized = false;
      this.sessionId = this._getOrCreateSessionId();
      this.visitorId = this._getOrCreateVisitorId();
      this.isNewVisitor = false;
      this.maxScrollDepth = 0;
      // scroll_buckets: 10개 배열, index i = 사용자가 (i*10)% 이상 스크롤했으면 1
      // [0]=0%이상, [1]=10%이상, ..., [9]=90%이상
      this.scrollBuckets = new Array(10).fill(0);
      // GA 스타일 세션 추적
      this.activeStartTime = null;   // 현재 활성 구간 시작 시각
      this.accumulatedTime = 0;      // 누적 활성 시간 (초)
      this.lastInteractionTime = null;
      this.idleTimer = null;
      this.IDLE_TIMEOUT = 30 * 60 * 1000; // 30분
      this.MIN_SESSION_DURATION = 3;       // 3초 미만 노이즈 필터
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

      // 신규/재방문 체크
      this.isNewVisitor = this._checkVisitorStatus();

      // UTM/ZA 파라미터 자동 캡처 및 저장
      if (this.config.autoCapture) {
        this._captureParams();
      }

      // 페이지뷰 자동 추적
      this.trackPageView();

      // 스크롤 도달률 추적
      window.addEventListener('scroll', () => this._trackScrollDepth(), { passive: true });
      // 초기 로드 시 스크롤 위치 반영 (긴 페이지에서 앵커 링크 진입 등)
      this._trackScrollDepth();

      // ── [클릭 히트맵] 클릭 수집 — 좌표계 문제로 비활성화 ──────────────
      // 문제: iframe 뷰포트 vs 실제 사이트 뷰포트 불일치 + iframe 스크롤 desync
      // 해결 방식 결정 후 아래 주석 해제
      // window.addEventListener('click', (e) => this._trackClick(e), { passive: true });
      // ───────────────────────────────────────────────────────────────────

      // GA 스타일 세션 추적
      this.activeStartTime = Date.now();
      this.lastInteractionTime = Date.now();

      // 상호작용 감지 (idle 타이머 리셋용)
      ['mousemove', 'mousedown', 'keydown', 'click', 'scroll', 'wheel', 'touchstart', 'touchmove'].forEach((evt) =>
        window.addEventListener(evt, () => this._onInteraction(), { passive: true })
      );

      // idle 타이머 시작
      this._resetIdleTimer();

      // 탭 전환 처리
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this._pauseSession();
        } else {
          this._resumeSession();
        }
      });

      // 실제 이탈
      window.addEventListener('beforeunload', () => this._endSession());

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
        page_title: document.title || null,
        page_referrer: document.referrer || null,
        session_id: this.sessionId,
        visitor_id: this.visitorId,
        channel: this._detectChannel(),
        is_new_visitor: this.isNewVisitor,
        ...this._getDeviceInfo(),
      };

      this._sendEvent(payload);

      // 히트맵 뷰어(부모 프레임)에 페이지 전환 알림
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage(
            { type: 'za_pageview', page_url: window.location.href },
            '*'
          );
        }
      } catch (e) {}
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
     * 유입 채널 감지
     * @private
     */
    _detectChannel() {
      try {
        // UTM/ZA 파라미터 우선 적용
        const stored = localStorage.getItem('za_params');
        if (stored) {
          const params = JSON.parse(stored);
          // 어트리뷰션 윈도우(28일) 초과 시 무시
          if (params.clicked_at) {
            const daysSince = (Date.now() - new Date(params.clicked_at)) / (1000 * 60 * 60 * 24);
            if (daysSince > this.config.attributionWindow) {
              localStorage.removeItem('za_params');
              return !document.referrer ? 'direct' : 'referral';
            }
          }
          const source = (params.utm_source || '').toLowerCase();
          const medium = (params.utm_medium || '').toLowerCase();

          if (source) {
            if (source.includes('google')) return (medium === 'cpc' || medium === 'ppc' || medium === 'paid') ? 'google_ads' : 'google';
            if (source.includes('naver')) return (medium === 'cpc' || medium === 'ppc') ? 'naver_ads' : 'naver';
            if (source.includes('kakao')) return 'kakao';
            if (source.includes('instagram')) return 'instagram';
            if (source.includes('facebook') || source.includes('fb')) return 'facebook';
            if (source.includes('youtube')) return 'youtube';
            if (source.includes('tiktok')) return 'tiktok';
            if (source.includes('twitter') || source.includes('x')) return 'twitter';
            if (medium === 'email') return 'email';
            return source;
          }
          if (medium === 'email') return 'email';
        }

        // referrer 분석
        const referrer = document.referrer;
        if (!referrer) return 'direct';

        const r = referrer.toLowerCase();
        if (r.includes('google.com')) return 'google';
        if (r.includes('naver.com')) return 'naver';
        if (r.includes('daum.net') || r.includes('kakao.com')) return 'kakao';
        if (r.includes('instagram.com')) return 'instagram';
        if (r.includes('facebook.com') || r.includes('l.facebook.com')) return 'facebook';
        if (r.includes('youtube.com')) return 'youtube';
        if (r.includes('tiktok.com')) return 'tiktok';
        if (r.includes('twitter.com') || r.includes('x.com')) return 'twitter';
        if (r.includes('bing.com')) return 'bing';
        if (r.includes('yahoo.com')) return 'yahoo';

        return 'referral';
      } catch (e) {
        return 'unknown';
      }
    }

    /**
     * 세션 ID 조회 또는 생성 (sessionStorage 기반)
     * 30분 이내 페이지 이동은 같은 세션으로 유지 (MPA 지원)
     * @private
     */
    _getOrCreateSessionId() {
      try {
        const key = 'za_sid';
        const raw = sessionStorage.getItem(key);
        if (raw) {
          const { id, ts } = JSON.parse(raw);
          // 마지막 활동 후 30분 이내면 세션 유지, 타임스탬프 갱신
          if (id && Date.now() - ts < 30 * 60 * 1000) {
            sessionStorage.setItem(key, JSON.stringify({ id, ts: Date.now() }));
            return id;
          }
        }
      } catch (e) {}
      const id = 'ses_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      try { sessionStorage.setItem('za_sid', JSON.stringify({ id, ts: Date.now() })); } catch (e) {}
      return id;
    }

    /**
     * 영구 방문자 ID 조회 또는 생성 (localStorage 기반)
     * 같은 브라우저라면 페이지 이동/재방문해도 동일 ID 유지
     * @private
     */
    _getOrCreateVisitorId() {
      try {
        const key = 'za_vid';
        let vid = localStorage.getItem(key);
        if (!vid) {
          vid = 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          localStorage.setItem(key, vid);
        }
        return vid;
      } catch (e) {
        return null;
      }
    }

    /**
     * 신규/재방문 체크
     * @private
     */
    _checkVisitorStatus() {
      try {
        const key = 'za_visitor';
        const existing = localStorage.getItem(key);
        if (!existing) {
          localStorage.setItem(key, JSON.stringify({ first_visit: new Date().toISOString() }));
          return true; // 신규
        }
        return false; // 재방문
      } catch (e) {
        return false;
      }
    }

    /**
     * 클릭 이벤트 추적
     * @private
     */
    _trackClick(e) {
      if (!this.trackingId) return;

      // 뷰포트 기준 비율 (0~1) — 캔버스 오버레이와 1:1 대응
      const clickX = window.innerWidth  > 0 ? (e.clientX / window.innerWidth)  : 0;
      const clickY = window.innerHeight > 0 ? (e.clientY / window.innerHeight) : 0;

      const target = e.target;
      const elementTag      = target.tagName ? target.tagName.toLowerCase() : '';
      const elementText     = (target.innerText || target.value || target.alt || '').slice(0, 100).trim();
      const elementSelector = this._getCssSelector(target);

      const payload = {
        tracking_id:       this.trackingId,
        event_type:        'click',
        session_id:        this.sessionId,
        visitor_id:        this.visitorId,
        page_url:          window.location.href,
        click_x:           Math.round(clickX * 10000) / 10000,
        click_y:           Math.round(clickY * 10000) / 10000,
        element_tag:       elementTag,
        element_text:      elementText,
        element_selector:  elementSelector,
        viewport_w:        window.innerWidth,
        viewport_h:        window.innerHeight,
        ...this._getDeviceInfo(),
      };

      this._sendEvent(payload);
    }

    _getCssSelector(el) {
      try {
        if (el.id) return `#${el.id}`;
        const parts = [];
        let node = el;
        for (let i = 0; i < 3 && node && node !== document.body; i++) {
          let selector = node.tagName.toLowerCase();
          if (node.className) {
            const cls = [...node.classList].slice(0, 2).join('.');
            if (cls) selector += `.${cls}`;
          }
          parts.unshift(selector);
          node = node.parentElement;
        }
        return parts.join(' > ');
      } catch (e) {
        return '';
      }
    }

    /**
     * 스크롤 도달률 갱신 (이벤트 리스너에서 호출)
     * @private
     */
    _trackScrollDepth() {
      if (!document.body) return;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = Math.max(
        document.body.scrollHeight, document.documentElement.scrollHeight,
        document.body.offsetHeight, document.documentElement.offsetHeight,
        document.body.clientHeight, document.documentElement.clientHeight
      ) - window.innerHeight;

      if (docHeight <= 0) {
        // 스크롤이 필요 없는 짧은 페이지 → 100% 도달로 간주
        this.maxScrollDepth = 100;
        return;
      }

      const depth = Math.min(100, Math.round((scrollTop / docHeight) * 100));
      if (depth > this.maxScrollDepth) {
        this.maxScrollDepth = depth;
      }
      // scroll_buckets 갱신: bucket[i] = 1 if scroll_depth >= i * 10
      for (let i = 0; i < 10; i++) {
        if (depth >= i * 10) {
          this.scrollBuckets[i] = 1;
        }
      }
    }

    /**
     * 상호작용 감지 → idle 타이머 리셋
     * @private
     */
    _onInteraction() {
      this.lastInteractionTime = Date.now();
      if (this.activeStartTime === null) {
        // idle 상태에서 복귀 → 활성 구간 재시작
        this.activeStartTime = Date.now();
      }
      this._resetIdleTimer();
    }

    /**
     * idle 타이머 리셋 (30분 무활동 시 세션 종료)
     * @private
     */
    _resetIdleTimer() {
      if (this.idleTimer) clearTimeout(this.idleTimer);
      this.idleTimer = setTimeout(() => this._onIdle(), this.IDLE_TIMEOUT);
    }

    /**
     * 30분 무활동 → 세션 종료 후 새 세션 준비
     * @private
     */
    _onIdle() {
      if (this.activeStartTime !== null) {
        this.accumulatedTime += Math.round((Date.now() - this.activeStartTime) / 1000);
        this.activeStartTime = null;
      }
      this._sendSessionEnd();
      this._resetSession();
    }

    /**
     * 탭 숨김 → 활성 시간 누적 일시정지
     * @private
     */
    _pauseSession() {
      if (this.activeStartTime !== null) {
        this.accumulatedTime += Math.round((Date.now() - this.activeStartTime) / 1000);
        this.activeStartTime = null;
      }
      if (this.idleTimer) clearTimeout(this.idleTimer);
    }

    /**
     * 탭 복귀 → 활성 구간 재시작
     * @private
     */
    _resumeSession() {
      this.activeStartTime = Date.now();
      this._resetIdleTimer();
    }

    /**
     * 실제 페이지 이탈 → 세션 종료
     * @private
     */
    _endSession() {
      if (this.activeStartTime !== null) {
        this.accumulatedTime += Math.round((Date.now() - this.activeStartTime) / 1000);
        this.activeStartTime = null;
      }
      this._sendSessionEnd();
    }

    /**
     * session_end 이벤트 전송
     * @private
     */
    _sendSessionEnd() {
      if (!this.trackingId || this.accumulatedTime < this.MIN_SESSION_DURATION) return;

      const deviceInfo = this._getDeviceInfo();
      fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracking_id: this.trackingId,
          event_type: 'session_end',
          session_id: this.sessionId,
          time_on_page: this.accumulatedTime,
          page_url: window.location.href,
          scroll_depth: this.maxScrollDepth,
          scroll_buckets: this.scrollBuckets,
          channel: this._detectChannel(),
          device_type: deviceInfo.device_type,
        }),
        keepalive: true,
      }).catch(() => {});
    }

    /**
     * 새 세션 초기화 (idle timeout 후 재방문 대비)
     * @private
     */
    _resetSession() {
      try { sessionStorage.removeItem('za_sid'); } catch (e) {}
      this.sessionId = this._getOrCreateSessionId();
      this.accumulatedTime = 0;
      this.activeStartTime = null;
      this.maxScrollDepth = 0;
      this.scrollBuckets = new Array(10).fill(0);
      this.idleTimer = null;
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
