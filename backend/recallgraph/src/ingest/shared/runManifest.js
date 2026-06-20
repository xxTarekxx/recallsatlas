"use strict";

function buildRunManifest({ source, startedAt, finishedAt, records, errors, dryRun, outputFiles }) {
  return {
    source,
    startedAt,
    finishedAt,
    dryRun: Boolean(dryRun),
    recordCount: Array.isArray(records) ? records.length : 0,
    errorCount: Array.isArray(errors) ? errors.length : 0,
    errors: Array.isArray(errors) ? errors : [],
    outputFiles: Array.isArray(outputFiles) ? outputFiles : [],
  };
}

module.exports = { buildRunManifest };
