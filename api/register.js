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

    // 서버측 IP 수집 (클라이언트 값 대신 x-forwarded-for 사용)
    const clientIP = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();

    const phoneNum = body.phone ? Number(body.phone.replace(/[^0-9]/g, '')) : 0;

    const wixHeaders = {
        "Content-Type": "application/json",
        "Authorization": WIX_API_KEY,
        "wix-site-id": WIX_SITE_ID
    };

    try {
        // 멱등성: 같은 title_fld + newField + date 조합으로 5분 내 등록 여부 쿼리
        const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
        const fiveMinAgoStr = fiveMinAgo.getUTCFullYear() + '-' +
            String(fiveMinAgo.getUTCMonth() + 1).padStart(2, '0') + '-' +
            String(fiveMinAgo.getUTCDate()).padStart(2, '0') + ' ' +
            String(fiveMinAgo.getUTCHours()).padStart(2, '0') + ':' +
            String(fiveMinAgo.getUTCMinutes()).padStart(2, '0');

        const dupQuery = {
            dataCollectionId: WIX_COLLECTION_ID,
            query: {
                filter: {
                    "$and": [
                        { "newField": { "$eq": phoneNum } },
                        { "title_fld": { "$eq": body.name.trim() } },
                        { "reg_datetime": { "$gte": fiveMinAgoStr } }
                    ]
                },
                paging: { limit: 1 }
            }
        };

        const dupResponse = await fetch("https://www.wixapis.com/wix-data/v2/items/query", {
            method: "POST",
            headers: wixHeaders,
            body: JSON.stringify(dupQuery)
        });

        if (dupResponse.ok) {
            const dupResult = await dupResponse.json();
            if (dupResult.dataItems && dupResult.dataItems.length > 0) {
                return res.status(200).json({ success: true, duplicate: true });
            }
        }

        // IP 기반 속도 제한: 같은 IP로 1시간 내 5건 이상 차단
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const oneHourAgoStr = oneHourAgo.getUTCFullYear() + '-' +
            String(oneHourAgo.getUTCMonth() + 1).padStart(2, '0') + '-' +
            String(oneHourAgo.getUTCDate()).padStart(2, '0') + ' ' +
            String(oneHourAgo.getUTCHours()).padStart(2, '0') + ':' +
            String(oneHourAgo.getUTCMinutes()).padStart(2, '0');

        const rateQuery = {
            dataCollectionId: WIX_COLLECTION_ID,
            query: {
                filter: {
                    "$and": [
                        { "ip": { "$eq": clientIP } },
                        { "reg_datetime": { "$gte": oneHourAgoStr } }
                    ]
                },
                paging: { limit: 5 }
            }
        };

        const rateResponse = await fetch("https://www.wixapis.com/wix-data/v2/items/query", {
            method: "POST",
            headers: wixHeaders,
            body: JSON.stringify(rateQuery)
        });

        if (rateResponse.ok) {
            const rateResult = await rateResponse.json();
            if (rateResult.dataItems && rateResult.dataItems.length >= 5) {
                return res.status(429).json({ error: "등록 횟수 초과. 잠시 후 다시 시도해주세요." });
            }
        }

        // Wix Data API로 저장
        const data = {
            "title_fld": body.name,
            "newField": phoneNum,
            "arraystring": body.interest || [],
            "agree": body.agree || "",
            "time": body.visitTime || "",
            "reg_datetime": formattedDate,
            "utm_source": body.utm_source || "",
            "utm_medium": body.utm_medium || "",
            "utm_campaign": body.utm_campaign || "",
            "utm_term": body.utm_term || "",
            "utm_content": body.utm_content || "",
            "ip": clientIP,
            "device": body.device || ""
        };

        // 방문날짜는 날짜 타입이므로 ISO 형식으로 전송
        if (body.visitDate) {
            data["date"] = body.visitDate;
        }

        const dataItem = {
            dataCollectionId: WIX_COLLECTION_ID,
            dataItem: { data }
        };

        const response = await fetch("https://www.wixapis.com/wix-data/v2/items", {
            method: "POST",
            headers: wixHeaders,
            body: JSON.stringify(dataItem)
        });

        const result = await response.json();

        if (response.ok) {
            return res.status(200).json({ success: true, id: result.dataItem?._id || "saved" });
        } else {
            console.error("Wix API Error:", result);
            return res.status(500).json({ error: result.message || "Wix API 오류" });
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        return res.status(500).json({ error: "서버 오류" });
    }
}
