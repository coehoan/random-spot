(function initKakaoMapLoader(global) {
    const CONFIG_ENDPOINT = "/.netlify/functions/kakao-public-config";
    let configPromise = null;
    let sdkPromise = null;

    function getProductionOrigin() {
        if (/netlify\.app$/i.test(global.location.hostname)) {
            return global.location.origin;
        }
        return "https://randomspot.netlify.app";
    }

    function isSameOrigin(url) {
        try {
            const parsed = new URL(url, global.location.href);
            return parsed.origin === global.location.origin;
        } catch (error) {
            return false;
        }
    }

    function resolveNetlifyFunctionCandidates(pathname) {
        const candidates = [pathname];
        const isLocalHost = /^(localhost|127\.0\.0\.1)$/i.test(global.location.hostname);

        if (isLocalHost) {
            const productionUrl = `${getProductionOrigin()}${pathname}`;
            if (!candidates.includes(productionUrl)) {
                candidates.push(productionUrl);
            }
        }

        return candidates;
    }

    async function fetchJsonFromCandidates(candidates) {
        let lastError = null;

        for (const candidate of candidates) {
            try {
                const response = await fetch(candidate, {
                    headers: {
                        Accept: "application/json"
                    }
                });

                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    const error = new Error(payload?.error || `HTTP_${response.status}`);
                    error.status = response.status;
                    error.url = candidate;
                    throw error;
                }

                return payload;
            } catch (error) {
                lastError = error;
                if (isSameOrigin(candidate) && error?.status && error.status !== 404) {
                    break;
                }
            }
        }

        throw lastError || new Error("KAKAO_MAP_CONFIG_FETCH_FAILED");
    }

    function fetchPublicConfig() {
        if (!configPromise) {
            configPromise = fetchJsonFromCandidates(resolveNetlifyFunctionCandidates(CONFIG_ENDPOINT)).then(payload => {
                const kakaoMapJavascriptKey = payload?.kakaoMapJavascriptKey;
                if (!kakaoMapJavascriptKey) {
                    throw new Error("KAKAO_MAP_JAVASCRIPT_KEY_MISSING");
                }

                return {
                    kakaoMapJavascriptKey
                };
            });
        }

        return configPromise;
    }

    function waitForKakaoMapReady() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 200;

            function check() {
                attempts += 1;
                if (
                    global.kakao?.maps?.Map &&
                    global.kakao?.maps?.LatLng &&
                    global.kakao?.maps?.services?.Geocoder
                ) {
                    resolve(global.kakao);
                    return;
                }

                if (attempts >= maxAttempts) {
                    reject(new Error("KAKAO_MAP_SDK_UNAVAILABLE"));
                    return;
                }

                global.setTimeout(check, 50);
            }

            check();
        });
    }

    function injectKakaoScript(kakaoMapJavascriptKey) {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector("script[data-kakao-map-loader='true']");
            if (existing) {
                waitForKakaoMapReady().then(resolve).catch(reject);
                return;
            }

            const script = document.createElement("script");
            script.async = true;
            script.defer = true;
            script.dataset.kakaoMapLoader = "true";
            script.src = `https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&libraries=services&appkey=${encodeURIComponent(kakaoMapJavascriptKey)}`;
            script.onerror = () => reject(new Error("KAKAO_MAP_SDK_LOAD_FAILED"));
            script.onload = () => {
                if (!global.kakao?.maps?.load) {
                    reject(new Error("KAKAO_MAP_SDK_UNAVAILABLE"));
                    return;
                }

                global.kakao.maps.load(() => {
                    waitForKakaoMapReady().then(resolve).catch(reject);
                });
            };

            document.head.appendChild(script);
        });
    }

    function loadKakaoMapSdk() {
        if (global.kakao?.maps?.Map && global.kakao?.maps?.LatLng) {
            return Promise.resolve(global.kakao);
        }

        if (!sdkPromise) {
            sdkPromise = fetchPublicConfig()
                .then(config => injectKakaoScript(config.kakaoMapJavascriptKey))
                .catch(error => {
                    sdkPromise = null;
                    throw error;
                });
        }

        return sdkPromise;
    }

    global.resolveNetlifyFunctionCandidates = global.resolveNetlifyFunctionCandidates || resolveNetlifyFunctionCandidates;
    global.loadKakaoMapSdk = loadKakaoMapSdk;
})(window);
