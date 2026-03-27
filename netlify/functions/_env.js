const fs = require("node:fs");
const path = require("node:path");

let loaded = false;

function applyEnvLine(line) {
    const trimmed = String(line || "").trim();
    if (!trimmed || trimmed.startsWith("#")) {
        return;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
        return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
    ) {
        value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
        process.env[key] = value;
    }
}

function loadLocalEnv() {
    if (loaded) {
        return process.env;
    }

    loaded = true;

    const envPath = path.resolve(__dirname, "..", "..", ".env");
    if (!fs.existsSync(envPath)) {
        return process.env;
    }

    const content = fs.readFileSync(envPath, "utf8");
    content.split(/\r?\n/).forEach(applyEnvLine);
    return process.env;
}

module.exports = {
    loadLocalEnv
};
