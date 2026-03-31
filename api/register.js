export default async function handler(req, res) {
    // CORS 헤더
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = req.body;

    // 봇 방지 (허니팟)
    if (body.hp_check && body.hp_check !== "") {
        return res.status(400).json({ error: "봇 감지" });
    }

    // 필수 데이터 검증
    if (!body.name || body.name.length < 2) {
        return res.status(400).json({ error: "이름을 2자 이상 입력해주세요." });
    }
    if (!body.phone || body.phone.replace(/[^0-9]/g, '').length < 10) {
        return res.status(400).json({ error: "연락처를 정확히 입력해주세요." });
    }

    // 현재 시간 포맷팅 (한국시간)
    const now = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
    const formattedDate = now.getUTCFullYear() + '-' +
        String(now.getUTCMonth() + 1).padStart(2, '0') + '-' +
        String(now.getUTCDate()).padStart(2, '0') + ' ' +
        String(now.getUTCHours()).padStart(2, '0') + ':' +
        String(now.getUTCMinutes()).padStart(2, '0');

    // 서버측 IP 수집
    const clientIP = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();

    try {
        // GAS 웹앱으로 전송
        const gasPayload = {
            site_domain: "cheongju-theway.com",
            name: body.name.trim(),
            phone: body.phone,
            date: body.visitDate || "",
            time: body.visitTime || "",
            consent: body.agree || "",
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

        const gasPromise = fetch(process.env.GAS_FORM_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(gasPayload),
            redirect: 'follow'
        }).catch(() => {});

        res.status(200).json({ success: true, id: "saved" });
        await gasPromise;

    } catch (error) {
        console.error("Fetch Error:", error);
        return res.status(500).json({ error: "서버 오류" });
    }
}
