"use strict";

const fs = require("fs");
const path = require("path");

const BACKEND_ROOT = path.join(__dirname, "..", "..");

const TARGETS = [
  {
    file: path.join(BACKEND_ROOT, "fdaRecalls", "data", "fda-recalls-en-eeat.json"),
    value: [],
  },
  {
    file: path.join(BACKEND_ROOT, "fdaRecalls", "data", "image-map.json"),
    value: {},
  },
  {
    file: path.join(BACKEND_ROOT, "fdaRecalls", "data", "logs", "fda-recalls-en-eeat.hashes.json"),
    value: [],
  },
  {
    file: path.join(BACKEND_ROOT, "generalRecalls", "data", "general-recalls-en-eeat.json"),
    value: [],
  },
  {
    file: path.join(BACKEND_ROOT, "generalRecalls", "data", "general-recalls-image-map.json"),
    value: {},
  },
  {
    file: path.join(BACKEND_ROOT, "generalRecalls", "data", "logs", "general-recalls-en-eeat.hashes.json"),
    value: [],
  },
];

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function main() {
  for (const target of TARGETS) {
    writeJson(target.file, target.value);
    console.log(`reset ${path.relative(BACKEND_ROOT, target.file)}`);
  }
}

main();
