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

    // Wix Data API로 전송
    const WIX_API_KEY = (process.env.WIX_API_KEY || '').trim();
    const WIX_SITE_ID = (process.env.WIX_SITE_ID || '').trim();
    const WIX_COLLECTION_ID = (process.env.WIX_COLLECTION_ID || '').trim();

    const dataItem = {
        dataCollectionId: WIX_COLLECTION_ID,
        dataItem: {
            data: {
                "title": body.name,
                "newField": body.phone,
                "arraystring": body.interest || [],
                "agree": body.agree || "",
                "date": body.visitDate || "",
                "time": body.visitTime || "",
                "reg_datetime": formattedDate,
                "utm_source": body.utm_source || "",
                "utm_medium": body.utm_medium || "",
                "utm_campaign": body.utm_campaign || "",
                "utm_term": body.utm_term || "",
                "utm_content": body.utm_content || "",
                "ip": body.ip_address || "",
                "device": body.device || ""
            }
        }
    };

    try {
        const response = await fetch("https://www.wixapis.com/wix-data/v2/items", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": WIX_API_KEY,
                "wix-site-id": WIX_SITE_ID
            },
            body: JSON.stringify(dataItem)
        });

        const result = await response.json();

        // 임시 디버그: 모든 응답 반환
        return res.status(response.ok ? 200 : 500).json({
            success: response.ok,
            status: response.status,
            wix_result: result,
            sent_data: dataItem
        });
    } catch (error) {
        console.error("Fetch Error:", error);
        return res.status(500).json({ error: "서버 오류" });
    }
}
