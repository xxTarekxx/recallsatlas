"use strict";

const { fetchCpscRaw } = require("../../../recallgraph/src/ingest/cpsc/fetchCpscRaw");

fetchCpscRaw().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
