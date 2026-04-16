/**
 * gsc-data — Google Search Console 검색 분석 데이터 조회
 *
 * POST body: { advertiser_id, start_date, end_date }
 *
 * Response:
 *   { connected: false }                              → 연동 없음
 *   { connected: true, site_url: null, sites: [...] } → 토큰 있으나 사이트 미선택
 *   { connected: true, site_url, rows: [...] }        → 정상 데이터
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

// deno-lint-ignore no-explicit-any
async function refreshToken(refreshToken: string): Promise<any> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error_description || data.error)
  return data
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

    const { advertiser_id, start_date, end_date } = await req.json()

    if (!advertiser_id) {
      return new Response(JSON.stringify({ connected: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 연동 정보 조회
    const { data: conn, error: connError } = await supabase
      .from('gsc_connections')
      .select('*')
      .eq('advertiser_id', advertiser_id)
      .maybeSingle()

    if (connError) throw connError

    if (!conn) {
      return new Response(JSON.stringify({ connected: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // site_url 소문자 정규화
    const siteUrl = conn.site_url ? conn.site_url.toLowerCase() : null
    if (siteUrl && siteUrl !== conn.site_url) {
      await supabase
        .from('gsc_connections')
        .update({ site_url: siteUrl })
        .eq('advertiser_id', advertiser_id)
    }

    // access_token 갱신 (만료 1분 전 기준)
    let accessToken: string = conn.access_token
    const isExpired =
      !conn.token_expiry || new Date(conn.token_expiry) <= new Date(Date.now() + 60_000)

    if (isExpired) {
      const refreshed = await refreshToken(conn.refresh_token)
      accessToken = refreshed.access_token
      const token_expiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
      await supabase
        .from('gsc_connections')
        .update({ access_token: accessToken, token_expiry, updated_at: new Date().toISOString() })
        .eq('advertiser_id', advertiser_id)
    }

    // 날짜 없으면 연결 상태만 반환 (데이터 조회 스킵)
    if (!start_date || !end_date) {
      return new Response(
        JSON.stringify({ connected: true, site_url: siteUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // site_url 미설정 → 사이트 목록 반환
    if (!siteUrl) {
      const sitesRes = await fetch(GOOGLE_SITES_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const sitesData = await sitesRes.json()
      // deno-lint-ignore no-explicit-any
      const sites = (sitesData.siteEntry || []).map((s: any) => ({
        siteUrl: s.siteUrl,
        permissionLevel: s.permissionLevel,
      }))
      return new Response(JSON.stringify({ connected: true, site_url: null, sites }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // GSC 검색 분석 쿼리
    const gscRes = await fetch(
      `${GOOGLE_SITES_URL}/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: start_date,
          endDate: end_date,
          dimensions: ['query'],
          rowLimit: 1000,
          dataState: 'all',
        }),
      },
    )

    const gscData = await gscRes.json()
    if (gscData.error) throw new Error(gscData.error.message)

    // deno-lint-ignore no-explicit-any
    const rows = (gscData.rows || []).map((r: any) => ({
      keyword: r.keys[0],
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: +(r.ctr * 100).toFixed(2),
      position: +r.position.toFixed(1),
    }))

    return new Response(
      JSON.stringify({ connected: true, site_url: siteUrl, rows }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
