/**
 * gsc-connect — Google Search Console OAuth 연동
 *
 * POST body 패턴:
 *   1. { code, advertiser_id, redirect_uri }           → OAuth 코드 교환, tokens 저장, sites 목록 반환
 *   2. { advertiser_id, site_url }                     → site_url 업데이트
 *   3. { advertiser_id, action: 'disconnect' }         → 연동 해제 (row 삭제)
 *
 * Supabase Secrets 필요:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_SITES_URL = 'https://www.googleapis.com/webmasters/v3/sites'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const body = await req.json()
    const { code, advertiser_id, redirect_uri, site_url, action } = body

    if (!advertiser_id) {
      return new Response(JSON.stringify({ error: 'advertiser_id가 필요합니다.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Case 3: 연동 해제 ──────────────────────────────────────────────────
    if (action === 'disconnect') {
      const { error } = await supabase
        .from('gsc_connections')
        .delete()
        .eq('advertiser_id', advertiser_id)

      if (error) throw error
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Case 2: site_url 업데이트 ──────────────────────────────────────────
    if (site_url !== undefined && !code) {
      const normalizedUrl = site_url ? site_url.toLowerCase() : null
      const { error } = await supabase
        .from('gsc_connections')
        .update({ site_url: normalizedUrl, updated_at: new Date().toISOString() })
        .eq('advertiser_id', advertiser_id)

      if (error) throw error
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Case 1: OAuth 코드 교환 ────────────────────────────────────────────
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      throw new Error('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET Supabase Secret이 설정되지 않았습니다.')
    }

    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()
    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error)
    }

    const { access_token, refresh_token, expires_in } = tokenData

    if (!refresh_token) {
      throw new Error(
        'refresh_token이 반환되지 않았습니다. Google OAuth URL에 prompt=consent&access_type=offline 파라미터가 포함되어 있는지 확인하세요.',
      )
    }

    const token_expiry = new Date(Date.now() + expires_in * 1000).toISOString()

    const { error: upsertError } = await supabase
      .from('gsc_connections')
      .upsert(
        {
          advertiser_id,
          access_token,
          refresh_token,
          token_expiry,
          site_url: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'advertiser_id' },
      )

    if (upsertError) throw upsertError

    // GSC 사이트 목록 조회
    const sitesRes = await fetch(GOOGLE_SITES_URL, {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    const sitesData = await sitesRes.json()
    // deno-lint-ignore no-explicit-any
    const sites = (sitesData.siteEntry || []).map((s: any) => ({
      siteUrl: s.siteUrl,
      permissionLevel: s.permissionLevel,
    }))

    return new Response(JSON.stringify({ success: true, sites }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
