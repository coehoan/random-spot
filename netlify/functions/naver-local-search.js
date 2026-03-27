const { loadLocalEnv } = require("./_env");

loadLocalEnv();

const SEARCH_ENDPOINT = "https://openapi.naver.com/v1/search/local.json";
const SEARCH_KEYWORDS = ["맛집", "식당", "한식", "중식", "일식", "양식", "분식"];

function json(statusCode, payload) {
    return {
        statusCode,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        },
        body: JSON.stringify(payload)
    };
}

function normalizeText(value) {
    return String(value || "")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, "\"")
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeCoord(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
        return null;
    }

    if (Math.abs(number) > 1000) {
        return number / 10000000;
    }

    return number;
}

function toRadians(value) {
    return (value * Math.PI) / 180;
}

function calculateDistanceMeters(lat1, lng1, lat2, lng2) {
    const earthRadius = 6371000;
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;

    return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildBasePhrases(context) {
    const sido = normalizeText(context?.sido);
    const sigugun = normalizeText(context?.sigugun);
    const dongmyun = normalizeText(context?.dongmyun);
    const phrases = [];

    function add(value) {
        if (value && !phrases.includes(value)) {
            phrases.push(value);
        }
    }

    if (sigugun && dongmyun) {
        add(`${sigugun} ${dongmyun}`);
    }

    add(dongmyun);
    add(sigugun);

    if (sido && sigugun) {
        add(`${sido} ${sigugun}`);
    }

    add(sido);

    return phrases.filter(Boolean).slice(0, 4);
}

function buildQueries(context) {
    const queries = [];
    const basePhrases = buildBasePhrases(context);

    function add(value) {
        if (value && !queries.includes(value)) {
            queries.push(value);
        }
    }

    basePhrases.forEach(base => {
        SEARCH_KEYWORDS.forEach(keyword => add(`${base} ${keyword}`));
    });

    return queries.slice(0, 10);
}

async function searchLocalApi(query, clientId, clientSecret) {
    const url = new URL(SEARCH_ENDPOINT);
    url.searchParams.set("query", query);
    url.searchParams.set("display", "5");
    url.searchParams.set("sort", "random");

    const response = await fetch(url, {
        headers: {
            "X-Naver-Client-Id": clientId,
            "X-Naver-Client-Secret": clientSecret
        }
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(payload?.errorMessage || `NAVER_LOCAL_SEARCH_FAILED_${response.status}`);
    }

    return Array.isArray(payload.items) ? payload.items : [];
}

exports.handler = async function handler(event) {
    if (event.httpMethod === "OPTIONS") {
        return json(204, {});
    }

    if (event.httpMethod !== "POST") {
        return json(405, {
            error: "Method Not Allowed"
        });
    }

    const clientId = process.env.NAVER_SEARCH_CLIENT_ID;
    const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return json(500, {
            error: "NAVER search credentials are not configured."
        });
    }

    let body;
    try {
        body = JSON.parse(event.body || "{}");
    } catch (error) {
        return json(400, {
            error: "Invalid JSON body."
        });
    }

    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    const radiusMeters = Number(body.radiusMeters);
    const context = body.addressContext || {};

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return json(400, {
            error: "latitude and longitude are required."
        });
    }

    if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
        return json(400, {
            error: "radiusMeters must be a positive number."
        });
    }

    const queries = buildQueries(context);
    if (queries.length === 0) {
        return json(400, {
            error: "Address context is too weak to search nearby restaurants."
        });
    }

    try {
        const resultsByQuery = await Promise.all(
            queries.map(query =>
                searchLocalApi(query, clientId, clientSecret)
                    .then(items => ({ query, items }))
                    .catch(() => ({ query, items: [] }))
            )
        );

        const deduped = new Map();

        resultsByQuery.forEach(({ query, items }) => {
            items.forEach(item => {
                const itemLatitude = normalizeCoord(item.mapy);
                const itemLongitude = normalizeCoord(item.mapx);

                if (!Number.isFinite(itemLatitude) || !Number.isFinite(itemLongitude)) {
                    return;
                }

                const distanceMeters = Math.round(
                    calculateDistanceMeters(latitude, longitude, itemLatitude, itemLongitude)
                );

                if (distanceMeters > radiusMeters) {
                    return;
                }

                const title = normalizeText(item.title);
                const roadAddress = normalizeText(item.roadAddress);
                const address = normalizeText(item.address);
                const category = normalizeText(item.category);
                const dedupeKey = `${title}::${roadAddress || address}`;

                if (!deduped.has(dedupeKey)) {
                    deduped.set(dedupeKey, {
                        title,
                        category,
                        roadAddress,
                        address,
                        telephone: normalizeText(item.telephone),
                        link: item.link || "",
                        latitude: itemLatitude,
                        longitude: itemLongitude,
                        distanceMeters,
                        sourceQuery: query
                    });
                }
            });
        });

        const candidates = Array.from(deduped.values());

        if (candidates.length === 0) {
            return json(404, {
                error: "선택한 범위 안에서 식당을 찾지 못했습니다. 범위를 넓혀 다시 시도해 주세요."
            });
        }

        const restaurant = candidates[Math.floor(Math.random() * candidates.length)];

        return json(200, {
            restaurant,
            meta: {
                radiusMeters,
                candidateCount: candidates.length
            }
        });
    } catch (error) {
        return json(500, {
            error: "네이버 지역 검색 중 오류가 발생했습니다."
        });
    }
};
