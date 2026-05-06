// 공용 블랙리스트 매칭 모듈
// 각 사이트 api/register.js 에서 import해서 씀
//
// 사용:
//   import { checkBlacklist } from './blacklist.js';
//   const hit = await checkBlacklist({ name, phone, ip, device_fp, kakao_id });
//   if (hit && hit.severity === 'block') { ... GAS/Meta 호출 스킵 ... }

const normalizePhone = (p) => String(p || '').replace(/[^0-9]/g, '');
const normalizeName = (n) => String(n || '').trim();

/**
 * Supabase에서 블랙리스트 조회 후 매칭 평가
 * @returns {Promise<null | {id, match_type, value, reason, severity}>}
 */
export async function checkBlacklist({ name, phone, ip, device_fp, kakao_id }) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  try {
    const res = await fetch(
      `${url}/rest/v1/fraud_blacklist?select=id,match_type,value,reason,severity,expires_at`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    if (!res.ok) return null;
    const rows = await res.json();

    const now = Date.now();
    const active = rows.filter(r => !r.expires_at || new Date(r.expires_at).getTime() > now);

    const normName = normalizeName(name);
    const normPhone = normalizePhone(phone);
    const ipStr = String(ip || '');

    for (const r of active) {
      let matched = false;
      switch (r.match_type) {
        case 'name':      matched = normName && normName === r.value; break;
        case 'phone':     matched = normPhone && normPhone === normalizePhone(r.value); break;
        case 'ip':        matched = ipStr && ipStr === r.value; break;
        case 'ip_prefix': matched = ipStr && ipStr.startsWith(r.value); break;
        case 'kakao_id':  matched = kakao_id && kakao_id === r.value; break;
        case 'device_fp': matched = device_fp && device_fp === r.value; break;
      }
      if (matched) {
        // fire-and-forget: hit 카운트 증가
        fetch(`${url}/rest/v1/rpc/fraud_blacklist_record_hit`, {
          method: 'POST',
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ bl_id: r.id })
        }).catch(() => {});
        return r;
      }
    }
    return null;
  } catch (e) {
    console.error('blacklist check failed:', e.message);
    return null; // fail-open: 블랙리스트 장애가 정상등록 막으면 안 됨
  }
}
