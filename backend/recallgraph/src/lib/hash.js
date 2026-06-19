const crypto = require("crypto");

function stableJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
    .join(",")}}`;
}

function sha256(input) {
  return crypto.createHash("sha256").update(String(input)).digest("hex");
}

function hashJson(value) {
  return sha256(stableJson(value));
}

module.exports = { hashJson, sha256, stableJson };
