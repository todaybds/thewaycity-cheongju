// V41: Vercel Edge Middleware — 서버측 IP 차단 + 네이버 광고 클릭 서버사이드 기록
// JS 미실행 클릭도 서버에서 잡음 (봇/자동화 도구 대응)
// 환경변수: SUPABASE_URL, SUPABASE_ANON_KEY (Vercel 프로젝트 설정에서 추가)
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwEENIblM0NCX7uQn-zVOY1IcwNj7aboQw98ZVWJ1dmrwDIs3S4QgF2Gv3smBhaIQxmqQ/exec';

export default async function middleware(request) {
  // 정적 리소스는 스킵 (CSS, JS, 이미지, 폰트)
  const url = new URL(request.url);
  if (/\.(css|js|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot|json|xml|txt)$/i.test(url.pathname)) {
    return;
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.ip || '';
  const ua = request.headers.get('user-agent') || '';

  // ── V41: 네이버 광고 클릭 서버사이드 기록 ──
  // n_rank, n_keyword, n_query, n_media, nkw 중 하나라도 있으면 네이버 광고 클릭
  const nRank = url.searchParams.get('n_rank') || '';
  const nKeyword = url.searchParams.get('n_keyword') || url.searchParams.get('nkw') || '';
  const nQuery = url.searchParams.get('n_query') || '';
  const nMedia = url.searchParams.get('n_media') || '';
  // UTM 기반 네이버 광고 감지 (V40)
  const utmSource = (url.searchParams.get('utm_source') || '').toLowerCase();
  const utmMedium = (url.searchParams.get('utm_medium') || '').toLowerCase();
  const isUtmNaver = utmSource === 'naver' && ['sa', 'cpc', 'search'].includes(utmMedium);

  const isNaverAd = !!(nRank || nKeyword || nQuery || nMedia || isUtmNaver);

  if (isNaverAd && ip) {
    // GAS 서버에 서버사이드 기록 (fire-and-forget)
    try {
      const keyword = nKeyword || url.searchParams.get('utm_term') || '';
      const query = nQuery || url.searchParams.get('utm_term') || '';
      fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'EDGE_VISIT',
          ip: ip,
          userAgent: ua.substring(0, 200),
          nKeyword: keyword,
          nQuery: query,
          adRank: nRank,
          siteDomain: url.hostname,
          timestamp: new Date().toISOString(),
          edgeOnly: true
        })
      }).catch(() => {});  // fire-and-forget
    } catch (e) {}
  }

  // ── 기존 V25: Supabase IP 차단 ──
  if (!ip) return;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return;

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/blocked_ips?ip_address=eq.${encodeURIComponent(ip)}&select=id&limit=1`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        return new Response(
          '<html><body style="background:#0d0d0d;color:#d0d0d0;font:12px monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="border:1px solid #2a2a2a;padding:24px;background:#111;max-width:680px"><h1 style="font-size:20px;color:#f0f0f0;margin:0 0 12px">접근이 제한되었습니다</h1><p style="color:#3a3a3a">비정상 접속이 감지되었습니다.<br>고객센터로 문의하십시오.</p></div></body></html>',
          {
            status: 403,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          }
        );
      }
    }
  } catch (e) {}
}

export const config = {
  matcher: ['/((?!_next|api|favicon).*)'],
};
