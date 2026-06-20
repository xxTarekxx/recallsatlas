"use strict";

const fs = require("fs");
const path = require("path");
const { buildRunManifest } = require("./runManifest");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function stamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "").replace("T", "-");
}

function timestampedPath(latestPath, value) {
  const parsed = path.parse(latestPath);
  const name = parsed.name.replace(/-latest$/, "");
  return path.join(parsed.dir, `${name}-${value}${parsed.ext || ".json"}`);
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function writeRunOutput({ source, latestPath, customPath, runRoot, records, errors, startedAt, dryRun }) {
  const finishedAt = new Date().toISOString();
  const runStamp = stamp(new Date(finishedAt));
  const outputFiles = [];

  if (!dryRun) {
    if (customPath) {
      const target = path.resolve(customPath);
      writeJson(target, records);
      outputFiles.push(target);
    } else {
      const latest = path.resolve(latestPath);
      const dated = timestampedPath(latest, runStamp);
      writeJson(latest, records);
      writeJson(dated, records);
      outputFiles.push(latest, dated);
    }
  }

  const manifest = buildRunManifest({
    source,
    startedAt,
    finishedAt,
    records,
    errors,
    dryRun,
    outputFiles,
  });

  if (!dryRun && runRoot) {
    const manifestPath = path.join(runRoot, `${source}-raw-run-${runStamp}.json`);
    outputFiles.push(manifestPath);
    manifest.outputFiles = outputFiles;
    writeJson(manifestPath, manifest);
  }

  return { records, manifest, outputFiles };
}

module.exports = { writeRunOutput };
