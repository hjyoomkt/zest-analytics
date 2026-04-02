import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const payload = await req.json();

    if (!payload.tracking_id || !payload.tracking_id.match(/^ZA-\d{8}$/)) {
      return new Response(JSON.stringify({ error: 'Invalid tracking_id format' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validEventTypes = ['purchase', 'signup', 'lead', 'add_to_cart', 'custom', 'pageview', 'session_end'];
    if (!validEventTypes.includes(payload.event_type)) {
      return new Response(JSON.stringify({ error: 'Invalid event_type' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (payload.event_type === 'custom' && !payload.event_name) {
      return new Response(JSON.stringify({ error: 'event_name required for custom events' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: trackingCode, error: trackingError } = await supabaseAdmin
      .from('za_tracking_codes')
      .select('advertiser_id, status')
      .eq('tracking_id', payload.tracking_id)
      .is('deleted_at', null)
      .single();

    if (trackingError || !trackingCode) {
      return new Response(JSON.stringify({ error: 'Invalid or inactive tracking_id' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (trackingCode.status !== 'active') {
      return new Response(JSON.stringify({ error: 'Tracking code is inactive' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || null;
    const isPageview = payload.event_type === 'pageview';
    const isSessionEnd = payload.event_type === 'session_end';
    const isConversion = !isPageview && !isSessionEnd;

    const { error: insertError } = await supabaseAdmin.from('za_events').insert({
      tracking_id: payload.tracking_id,
      advertiser_id: trackingCode.advertiser_id,
      event_type: payload.event_type,
      event_name: payload.event_name || null,
      value: payload.value || null,
      currency: payload.currency || 'KRW',
      order_id: payload.order_id || null,
      session_id: payload.session_id || null,
      channel: (isPageview || isSessionEnd) ? payload.channel : null,
      visitor_id: isPageview ? payload.visitor_id : null,
      is_new_visitor: isPageview ? payload.is_new_visitor : null,
      time_on_page: isSessionEnd ? payload.time_on_page : null,
      scroll_depth: isSessionEnd ? (payload.scroll_depth ?? null) : null,
      clicked_at: isConversion ? payload.clicked_at : null,
      days_since_click: isConversion ? payload.days_since_click : null,
      attribution_window: isConversion ? payload.attribution_window : null,
      is_attributed: isConversion ? (payload.is_attributed ?? true) : null,
      utm_source: isConversion ? payload.utm_source : null,
      utm_medium: isConversion ? payload.utm_medium : null,
      utm_campaign: isConversion ? payload.utm_campaign : null,
      utm_term: isConversion ? payload.utm_term : null,
      utm_content: isConversion ? payload.utm_content : null,
      page_url: payload.page_url || null,
      page_referrer: payload.page_referrer || null,
      device_type: !isSessionEnd ? payload.device_type : null,
      browser: !isSessionEnd ? payload.browser : null,
      os: !isSessionEnd ? payload.os : null,
      ip_address: ip,
      custom_data: payload.custom_data || {},
    });

    if (insertError) {
      return new Response(JSON.stringify({ error: 'Failed to save event', details: insertError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
