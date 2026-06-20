"use strict";

const { scrapeFdaRaw } = require("../../../recallgraph/src/ingest/fda/scrapeFdaRaw");

scrapeFdaRaw().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
