const { loadLocalEnv } = require("./_env");

loadLocalEnv();

const SEARCH_ENDPOINT = "https://dapi.kakao.com/v2/local/search/category.json";
const RESTAURANT_CATEGORY_CODE = "FD6";
const PAGE_SIZE = 15;
const MAX_PAGES = 3;

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

function clampRadius(value) {
    if (!Number.isFinite(value)) {
        return null;
    }

    return Math.max(1, Math.min(20000, Math.round(value)));
}

function normalizeText(value) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim();
}

async function searchRestaurantsPage({ latitude, longitude, radiusMeters, page, restApiKey }) {
    const url = new URL(SEARCH_ENDPOINT);
    url.searchParams.set("category_group_code", RESTAURANT_CATEGORY_CODE);
    url.searchParams.set("x", String(longitude));
    url.searchParams.set("y", String(latitude));
    url.searchParams.set("radius", String(radiusMeters));
    url.searchParams.set("sort", "distance");
    url.searchParams.set("page", String(page));
    url.searchParams.set("size", String(PAGE_SIZE));

    const response = await fetch(url, {
        headers: {
            Authorization: `KakaoAK ${restApiKey}`
        }
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload?.msg || `KAKAO_LOCAL_SEARCH_FAILED_${response.status}`);
    }

    const documents = Array.isArray(payload.documents) ? payload.documents : [];
    const meta = payload.meta || {};

    return {
        documents,
        meta
    };
}

function buildRestaurant(document) {
    const latitude = Number(document.y);
    const longitude = Number(document.x);
    const distanceMeters = Number(document.distance || 0);

    return {
        id: String(document.id || ""),
        title: normalizeText(document.place_name),
        category: normalizeText(document.category_name),
        address: normalizeText(document.address_name),
        roadAddress: normalizeText(document.road_address_name),
        phone: normalizeText(document.phone),
        latitude,
        longitude,
        distanceMeters: Number.isFinite(distanceMeters) ? distanceMeters : 0,
        placeUrl: document.place_url || ""
    };
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

    const restApiKey = process.env.KAKAO_REST_API_KEY;
    if (!restApiKey) {
        return json(500, {
            error: "KAKAO_REST_API_KEY is not configured."
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
    const radiusMeters = clampRadius(Number(body.radiusMeters));

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return json(400, {
            error: "latitude and longitude are required."
        });
    }

    if (!radiusMeters) {
        return json(400, {
            error: "radiusMeters must be a positive number."
        });
    }

    try {
        const firstPage = await searchRestaurantsPage({
            latitude,
            longitude,
            radiusMeters,
            page: 1,
            restApiKey
        });

        const pageableCount = Math.max(0, Number(firstPage.meta?.pageable_count || 0));
        const totalPages = Math.min(MAX_PAGES, Math.max(1, Math.ceil(pageableCount / PAGE_SIZE)));
        const pagePromises = [];

        for (let page = 2; page <= totalPages; page += 1) {
            pagePromises.push(
                searchRestaurantsPage({
                    latitude,
                    longitude,
                    radiusMeters,
                    page,
                    restApiKey
                }).catch(() => ({ documents: [], meta: {} }))
            );
        }

        const nextPages = pagePromises.length > 0 ? await Promise.all(pagePromises) : [];
        const allDocuments = [
            ...firstPage.documents,
            ...nextPages.flatMap(page => page.documents)
        ];

        const deduped = new Map();
        allDocuments.forEach(document => {
            const restaurant = buildRestaurant(document);
            if (!restaurant.id || !Number.isFinite(restaurant.latitude) || !Number.isFinite(restaurant.longitude)) {
                return;
            }

            if (restaurant.distanceMeters > radiusMeters) {
                return;
            }

            if (!deduped.has(restaurant.id)) {
                deduped.set(restaurant.id, restaurant);
            }
        });

        const candidates = Array.from(deduped.values());
        if (candidates.length === 0) {
            return json(404, {
                error: "선택한 반경 안에서 식당을 찾지 못했습니다. 반경을 넓혀 다시 시도해 주세요."
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
            error: "카카오 식당 검색 중 오류가 발생했습니다."
        });
    }
};
