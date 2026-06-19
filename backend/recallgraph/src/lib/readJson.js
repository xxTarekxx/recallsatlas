const fs = require("fs");

function readJson(filePath, fallback = undefined) {
  if (!fs.existsSync(filePath)) {
    if (fallback !== undefined) return fallback;
    throw new Error(`JSON file not found: ${filePath}`);
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Failed to read JSON ${filePath}: ${error.message}`);
  }
}

module.exports = { readJson };
