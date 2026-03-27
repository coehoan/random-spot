const { loadLocalEnv } = require("./_env");

loadLocalEnv();

function withCors(statusCode, payload) {
    return {
        statusCode,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        },
        body: JSON.stringify(payload)
    };
}

exports.handler = async function handler(event) {
    if (event.httpMethod === "OPTIONS") {
        return withCors(204, {});
    }

    const mapClientId = process.env.NAVER_MAP_CLIENT_ID;

    if (!mapClientId) {
        return withCors(500, {
            error: "NAVER_MAP_CLIENT_ID is not configured."
        });
    }

    return withCors(200, {
        mapClientId
    });
};
