(function () {
    const CONFIG_ENDPOINT = "/.netlify/functions/naver-public-config";
    const FALLBACK_FUNCTION_ORIGIN = "https://randomspot.netlify.app";

    let configPromise = null;
    let sdkPromise = null;
    let loadedSubmodules = [];

    function isLocalPreviewHost() {
        return ["localhost", "127.0.0.1"].includes(window.location.hostname);
    }

    function normalizeFunctionPath(path) {
        if (!path.startsWith("/")) {
            return `/${path}`;
        }

        return path;
    }

    function buildFunctionCandidates(path) {
        const normalizedPath = normalizeFunctionPath(path);
        const sameOriginUrl = `${window.location.origin}${normalizedPath}`;
        const candidates = [sameOriginUrl];

        if (isLocalPreviewHost() && window.location.origin !== FALLBACK_FUNCTION_ORIGIN) {
            candidates.push(`${FALLBACK_FUNCTION_ORIGIN}${normalizedPath}`);
        }

        return candidates;
    }

    async function fetchJsonFromCandidates(path, options) {
        const candidates = buildFunctionCandidates(path);
        let lastError = null;

        for (let index = 0; index < candidates.length; index += 1) {
            const candidate = candidates[index];
            try {
                const response = await fetch(candidate, options);
                const payload = await response.json().catch(() => ({}));

                if (!response.ok) {
                    const error = new Error(payload.error || `REQUEST_FAILED_${response.status}`);
                    error.status = response.status;
                    throw error;
                }

                return payload;
            } catch (error) {
                lastError = error;

                const isSameOriginAttempt = index === 0;
                const shouldStopImmediately =
                    isSameOriginAttempt &&
                    Number.isFinite(error?.status) &&
                    error.status !== 404;

                if (shouldStopImmediately) {
                    throw error;
                }
            }
        }

        throw lastError || new Error("REQUEST_FAILED");
    }

    async function fetchPublicConfig() {
        if (!configPromise) {
            configPromise = fetchJsonFromCandidates(CONFIG_ENDPOINT, {
                headers: {
                    Accept: "application/json"
                }
            }).then(payload => {
                if (!payload.mapClientId) {
                    throw new Error("NAVER_MAP_CLIENT_ID_MISSING");
                }

                return payload;
            });
        }

        return configPromise;
    }

    function hasRequiredSubmodules(submodules) {
        if (!window.naver?.maps?.Map) {
            return false;
        }

        const uniqueSubmodules = Array.from(new Set(submodules.filter(Boolean)));
        return uniqueSubmodules.every(submodule => {
            if (submodule === "geocoder") {
                return Boolean(window.naver?.maps?.Service?.geocode);
            }

            return true;
        });
    }

    function waitForNaverMapReady(submodules, timeoutMs = 5000) {
        if (hasRequiredSubmodules(submodules)) {
            return Promise.resolve(window.naver);
        }

        return new Promise((resolve, reject) => {
            const startedAt = Date.now();

            function check() {
                if (hasRequiredSubmodules(submodules)) {
                    resolve(window.naver);
                    return;
                }

                if (Date.now() - startedAt >= timeoutMs) {
                    reject(new Error("NAVER_MAP_SDK_UNAVAILABLE"));
                    return;
                }

                setTimeout(check, 50);
            }

            check();
        });
    }

    function buildSdkUrl(mapClientId, submodules) {
        const params = new URLSearchParams({
            ncpKeyId: mapClientId
        });

        const uniqueSubmodules = Array.from(new Set(submodules.filter(Boolean)));
        if (uniqueSubmodules.length > 0) {
            params.set("submodules", uniqueSubmodules.join(","));
        }

        return `https://oapi.map.naver.com/openapi/v3/maps.js?${params.toString()}`;
    }

    async function injectSdkScript(mapClientId, submodules) {
        const nextSubmodules = Array.from(new Set(submodules.filter(Boolean)));
        if (window.naver?.maps && nextSubmodules.every(name => loadedSubmodules.includes(name))) {
            return waitForNaverMapReady(nextSubmodules);
        }

        const sdkUrl = buildSdkUrl(mapClientId, nextSubmodules);

        await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = sdkUrl;
            script.async = true;
            script.onload = resolve;
            script.onerror = () => reject(new Error("NAVER_MAP_SDK_LOAD_FAILED"));
            document.head.appendChild(script);
        });

        loadedSubmodules = Array.from(new Set([...loadedSubmodules, ...nextSubmodules]));

        return waitForNaverMapReady(nextSubmodules);
    }

    async function loadNaverMapSdk(options = {}) {
        const submodules = Array.isArray(options.submodules) ? options.submodules : [];

        if (window.naver?.maps && submodules.every(name => loadedSubmodules.includes(name))) {
            return waitForNaverMapReady(submodules);
        }

        if (!sdkPromise || !submodules.every(name => loadedSubmodules.includes(name))) {
            sdkPromise = (async () => {
                const payload = await fetchPublicConfig();
                return injectSdkScript(payload.mapClientId, submodules);
            })().catch(error => {
                sdkPromise = null;
                throw error;
            });
        }

        return sdkPromise;
    }

    function resolveNetlifyFunctionUrl(path) {
        return buildFunctionCandidates(path)[0];
    }

    window.fetchNaverMapPublicConfig = fetchPublicConfig;
    window.loadNaverMapSdk = loadNaverMapSdk;
    window.resolveNetlifyFunctionCandidates = buildFunctionCandidates;
    window.fetchJsonFromNetlifyFunctionCandidates = fetchJsonFromCandidates;
    window.resolveNetlifyFunctionUrl = resolveNetlifyFunctionUrl;
})();
