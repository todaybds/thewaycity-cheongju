import { waitUntil } from '@vercel/functions';
import { GoogleAuth } from 'google-auth-library';
import nodemailer from 'nodemailer';
import { checkBlacklist } from './blacklist.js';

const SPREADSHEET_ID = "1Ku6ayZ5G5ChC7_gayS5N2IaKjZ7RkWSTT2cm4M9Gpio";
const NOTIFY_EMAIL = "skrl1347@gmail.com";
const DISPLAY_NAME = "청주 신분평 더웨이시티 제일풍경채";

let cachedAuth = null;

async function getAuthToken() {
  if (!cachedAuth) {
    cachedAuth = new GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
  }
  const client = await cachedAuth.getClient();
  const { token } = await client.getAccessToken();
  return token;
}

async function appendToSheet(row) {
  const token = await getAuthToken();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent("A:S")}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [row] })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Sheets API ${res.status}: ${errText}`);
  }
}

async function sendEmail(p) {
  if (!process.env.GMAIL_APP_PASSWORD) return;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: NOTIFY_EMAIL, pass: process.env.GMAIL_APP_PASSWORD }
  });

  const dateDisplay = formatDateWithDay(p.date);
  const timeDisplay = formatTimeKorean(p.time);
  const interestDisplay = p.interest || "";

  await transporter.sendMail({
    from: NOTIFY_EMAIL,
    to: NOTIFY_EMAIL,
    subject: `[ ${DISPLAY_NAME} ] ${p.name || ""}님이 양식을 제출하였습니다`,
    text: `이름: ${p.name || ""}\n연락처: ${p.phone || ""}\n관심평형: ${interestDisplay}\n날짜: ${dateDisplay}\n시간: ${timeDisplay}${p.suspect_flag ? '\n\n🚨 ' + p.suspect_flag : ''}${p.recaptcha_score != null ? '\nreCAPTCHA 점수: ' + p.recaptcha_score : ''}\n\n──────────────────\n\nutm_source: ${p.utm_source || ""}\nutm_medium: ${p.utm_medium || ""}\nutm_campaign: ${p.utm_campaign || ""}\nutm_term: ${p.utm_term || ""}\ndevice: ${p.device || ""}\nip: ${p.ip_address || ""}`
  });
}

function formatDateWithDay(dt) {
  if (!dt) return "";
  const m = String(dt).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(dt);
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  const days = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
  return `${m[1]}-${m[2]}-${m[3]} ${days[d.getDay()]}`;
}

function formatTimeKorean(t) {
  if (!t) return "";
  const m = String(t).match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return String(t);
  let h = +m[1], min = m[2];
  const period = h < 12 ? "오전" : "오후";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return min === "00" ? `${period} ${h}시` : `${period} ${h}시 ${min}분`;
}

async function insertToSupabase(data) {
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/registrations`, {
    method: 'POST',
    headers: {
      'apikey': process.env.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  const [row] = await res.json();
  return row.id;
}

async function updateSyncStatus(id, updates) {
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/registrations?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': process.env.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.xn--9m1b56qknena672c9xaj2f8zko8o45b.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body;

  if (body.hp_check && body.hp_check !== "") {
    return res.status(400).json({ error: "봇 감지" });
  }
  if (!body.name || body.name.length < 2) {
    return res.status(400).json({ error: "이름을 2자 이상 입력해주세요." });
  }
  if (!body.phone || body.phone.replace(/[^0-9]/g, '').length < 10) {
    return res.status(400).json({ error: "연락처를 정확히 입력해주세요." });
  }

  // reCAPTCHA v3 검증 (실패해도 등록은 진행 — 진성고객 차단 방지)
  let recaptchaScore = null;
  let suspectFlag = null;
  if (body.recaptcha_token && process.env.RECAPTCHA_SECRET_KEY) {
    try {
      const rcRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${body.recaptcha_token}`
      });
      const rcData = await rcRes.json();
      recaptchaScore = rcData.score ?? null;
      if (rcData.success && rcData.score < 0.3) {
        suspectFlag = '⚠️ reCAPTCHA 저점수: ' + rcData.score;
      }
      if (!rcData.success) {
        suspectFlag = '⚠️ reCAPTCHA 검증실패';
      }
    } catch (e) {
      // reCAPTCHA 서버 오류 시 무시
    }
  } else if (!body.recaptcha_token) {
    suspectFlag = '⚠️ reCAPTCHA 토큰없음';
  }

  const now = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
  const formattedDate = now.getUTCFullYear() + '-' +
    String(now.getUTCMonth() + 1).padStart(2, '0') + '-' +
    String(now.getUTCDate()).padStart(2, '0') + ' ' +
    String(now.getUTCHours()).padStart(2, '0') + ':' +
    String(now.getUTCMinutes()).padStart(2, '0');

  const clientIP = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();

  // ===== [블랙리스트 체크] =====================================================
  const blHit = await checkBlacklist({
    name: body.name, phone: body.phone, ip: clientIP,
    device_fp: body.device_fp, kakao_id: body.kakao_id
  });
  if (blHit) {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/registrations`, {
        method: 'POST',
        headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_domain: 'xn--9m1b56qknena672c9xaj2f8zko8o45b.com', reg_datetime: formattedDate,
          name: body.name.trim(), phone: body.phone,
          visit_date: body.date || '', visit_time: body.time || '',
          utm_source: body.utm_source || '', utm_medium: body.utm_medium || '',
          utm_campaign: body.utm_campaign || '', utm_term: body.utm_term || '',
          utm_content: body.utm_content || '', ip_address: clientIP, device: body.device || '',
          suspect_flag: `🚫 BLACKLIST: ${blHit.reason}`,
          status: blHit.severity === 'block' ? 'blocked_fraud' : 'flagged',
          blocked_reason: `${blHit.match_type}=${blHit.value}`,
          blacklist_hit_id: blHit.id
        })
      }).catch(() => {});
    }
    if (blHit.severity === 'block') {
      return res.status(200).json({ success: true, id: 'ok' });
    }
    suspectFlag = (suspectFlag ? suspectFlag + ' / ' : '') + '🚩 BL-FLAG: ' + blHit.reason;
  }
  // ===========================================================================

  try {
    const payload = {
      name: body.name.trim(),
      phone: body.phone,
      date: body.visitDate || "",
      time: body.visitTime || "",
      interest: Array.isArray(body.interest) ? body.interest.join(", ") : "",
      reg_datetime: formattedDate,
      utm_source: body.utm_source || "",
      utm_medium: body.utm_medium || "",
      utm_campaign: body.utm_campaign || "",
      utm_term: body.utm_term || "",
      utm_content: body.utm_content || "",
      ip_address: clientIP,
      device: body.device || "",
      recaptcha_score: recaptchaScore,
      suspect_flag: suspectFlag
    };

    // 0. 서버측 중복 방지: 같은 이름+전화번호 5분 이내 재등록 차단
    try {
      const fiveMinAgo = new Date(now.getTime() - 300000);
      const sinceStr = fiveMinAgo.getUTCFullYear() + '-' +
        String(fiveMinAgo.getUTCMonth() + 1).padStart(2, '0') + '-' +
        String(fiveMinAgo.getUTCDate()).padStart(2, '0') + ' ' +
        String(fiveMinAgo.getUTCHours()).padStart(2, '0') + ':' +
        String(fiveMinAgo.getUTCMinutes()).padStart(2, '0');
      const dupCheck = await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/registrations?name=eq.${encodeURIComponent(body.name.trim())}&phone=eq.${encodeURIComponent(body.phone)}&reg_datetime=gte.${encodeURIComponent(sinceStr)}&select=id&limit=1`,
        { headers: { 'apikey': process.env.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}` } }
      );
      if (dupCheck.ok) {
        const existing = await dupCheck.json();
        if (existing.length > 0) return res.status(200).json({ success: true, id: existing[0].id, deduplicated: true });
      }
    } catch (e) {}

    // 1. Supabase에 즉시 저장 (빠름 ~100-200ms)
    const regId = await insertToSupabase({
      site_domain: 'xn--9m1b56qknena672c9xaj2f8zko8o45b.com',
      reg_datetime: formattedDate,
      name: payload.name,
      phone: payload.phone,
      visit_date: payload.date,
      visit_time: payload.time,
      interest: payload.interest,
      utm_source: payload.utm_source,
      utm_medium: payload.utm_medium,
      utm_campaign: payload.utm_campaign,
      utm_term: payload.utm_term,
      utm_content: payload.utm_content,
      ip_address: payload.ip_address,
      device: payload.device
    });

    // 2. 즉시 응답
    res.status(200).json({ success: true, id: regId });

    // 3. 백그라운드에서 Sheets + 이메일 처리
    const row = [
      formattedDate, "관심고객", payload.name, payload.phone,
      payload.date, payload.time,
      "", "", "", payload.interest, "", "",
      payload.utm_source, payload.utm_medium, payload.utm_campaign,
      payload.utm_term, payload.utm_content,
      payload.ip_address, payload.device
    ];

    waitUntil(
      (async () => {
        let sheetOk = false, emailOk = false;
        const errors = [];

        try { await appendToSheet(row); sheetOk = true; }
        catch (e) { errors.push('sheets: ' + e.message); }

        try { await sendEmail(payload); emailOk = true; }
        catch (e) { errors.push('email: ' + e.message); }

        // 오류 발생 시 관리자 이메일 알림
        if (errors.length > 0) {
          try {
            const errTransporter = nodemailer.createTransport({
              service: 'gmail',
              auth: { user: NOTIFY_EMAIL, pass: process.env.GMAIL_APP_PASSWORD }
            });
            await errTransporter.sendMail({
              from: NOTIFY_EMAIL, to: NOTIFY_EMAIL,
              subject: `[오류] ${DISPLAY_NAME} 등록 백엔드 실패`,
              text: `고객: ${payload.name} (${payload.phone})\n오류: ${errors.join(' | ')}\n시각: ${formattedDate}`
            });
          } catch (mailErr) {}
        }

        await updateSyncStatus(regId, {
          sheets_synced: sheetOk,
          email_sent: emailOk,
          sync_error: errors.length ? errors.join(' | ') : null
        }).catch(() => {});
      })()
    );
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "서버 오류" });
  }
}
