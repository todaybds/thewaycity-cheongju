import crypto from 'crypto';

const sha256 = (s) => crypto.createHash('sha256').update(String(s).trim().toLowerCase()).digest('hex');

export async function sendLeadToMeta({
  pixelId, accessToken,
  name, phone,
  eventId, clientIp, userAgent, fbp, fbc, eventSourceUrl,
  value = 0, currency = 'KRW', testEventCode
}) {
  if (!pixelId || !accessToken) return { skipped: 'no_pixel_or_token' };

  const phoneDigits = String(phone || '').replace(/[^0-9]/g, '');
  const userData = {
    country: [sha256('kr')],
  };
  if (phoneDigits) userData.ph = [sha256(phoneDigits)];
  if (name) userData.fn = [sha256(String(name).trim())];
  if (clientIp) userData.client_ip_address = clientIp;
  if (userAgent) userData.client_user_agent = userAgent;
  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;

  const event = {
    event_name: 'Lead',
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId || `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    action_source: 'website',
    event_source_url: eventSourceUrl || '',
    user_data: userData,
    custom_data: { currency, value }
  };

  const body = { data: [event], access_token: accessToken };
  if (testEventCode) body.test_event_code = testEventCode;

  const url = `https://graph.facebook.com/v19.0/${pixelId}/events`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const out = await res.json();
  if (!res.ok) throw new Error(`Meta CAPI ${res.status}: ${JSON.stringify(out).slice(0, 300)}`);
  return out;
}
