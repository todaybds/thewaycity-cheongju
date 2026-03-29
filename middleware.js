// V25: Vercel Edge Middleware — 서버측 IP 차단 (antifraud.js 로딩 전 차단)
// 환경변수: SUPABASE_URL, SUPABASE_ANON_KEY (Vercel 프로젝트 설정에서 추가)
export default async function middleware(request) {
  // 정적 리소스는 스킵 (CSS, JS, 이미지, 폰트)
  const url = new URL(request.url);
  if (/\.(css|js|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot)$/i.test(url.pathname)) {
    return;
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.ip || '';
  if (!ip) return;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return;

  try {
    // 차단목록에서 IP 확인 (Supabase REST API 직접 호출)
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
        // 차단된 IP → 403 반환 (페이지 로딩 자체를 차단)
        return new Response(
          '<html><body style="background:#0d0d0d;color:#d0d0d0;font:12px monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="border:1px solid #2a2a2a;padding:24px;background:#111;max-width:680px"><h1 style="font-size:20px;color:#f0f0f0;margin:0 0 12px">접근이 제한되었습니다</h1><p style="color:#3a3a3a">비정상 접속이 감지되었습니다.<br>고객센터로 문의하십시오.</p></div></body></html>',
          {
            status: 403,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          }
        );
      }
    }
  } catch (e) {
    // Supabase 조회 실패 시 통과 (fail-open — 정상 고객 차단 방지)
  }
}

export const config = {
  matcher: ['/((?!_next|api|favicon).*)'],
};
