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

    const kakaoMapJavascriptKey = process.env.KAKAO_MAP_JAVASCRIPT_KEY;

    if (!kakaoMapJavascriptKey) {
        return withCors(500, {
            error: "KAKAO_MAP_JAVASCRIPT_KEY is not configured."
        });
    }

    return withCors(200, {
        kakaoMapJavascriptKey
    });
};
