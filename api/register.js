import { GoogleAuth } from 'google-auth-library';
import nodemailer from 'nodemailer';

const SPREADSHEET_ID = "1Ku6ayZ5G5ChC7_gayS5N2IaKjZ7RkWSTT2cm4M9Gpio";
const NOTIFY_EMAIL = "skrl1347@gmail.com";
const DISPLAY_NAME = "신분평 더웨이시티";

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
    text: `이름: ${p.name || ""}\n연락처: ${p.phone || ""}\n관심평형: ${interestDisplay}\n날짜: ${dateDisplay}\n시간: ${timeDisplay}\n\n──────────────────\n\nutm_source: ${p.utm_source || ""}\nutm_medium: ${p.utm_medium || ""}\nutm_campaign: ${p.utm_campaign || ""}\nutm_term: ${p.utm_term || ""}\ndevice: ${p.device || ""}\nip: ${p.ip_address || ""}`
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

  const now = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
  const formattedDate = now.getUTCFullYear() + '-' +
    String(now.getUTCMonth() + 1).padStart(2, '0') + '-' +
    String(now.getUTCDate()).padStart(2, '0') + ' ' +
    String(now.getUTCHours()).padStart(2, '0') + ':' +
    String(now.getUTCMinutes()).padStart(2, '0');

  const clientIP = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();

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
      device: body.device || ""
    };

    // 청주: A날짜 B경로 C고객명 D전화번호 E방문예약 F예약시간 G~L빈칸 M~Q:UTM R:IP S:기기
    const row = [
      formattedDate, "관심고객", payload.name, payload.phone,
      payload.date, payload.time,
      "", "", "", payload.interest, "", "",
      payload.utm_source, payload.utm_medium, payload.utm_campaign,
      payload.utm_term, payload.utm_content,
      payload.ip_address, payload.device
    ];

    await Promise.all([
      appendToSheet(row),
      sendEmail(payload).catch(err => console.error('Email failed:', err.message))
    ]);

    return res.status(200).json({ success: true, id: "saved" });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "서버 오류" });
  }
}
