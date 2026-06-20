const { runSearchEvaluation } = require("../evaluation/runSearchEvaluation");
const { closePool } = require("../lib/postgres");

async function main() {
  const report = runSearchEvaluation();
  const resolvedReport = report instanceof Promise ? await report : report;
  console.log(
    `RecallGraph evaluation complete. method=${resolvedReport.searchMethod}, queries=${resolvedReport.queryCount}, ` +
      `withResults=${resolvedReport.queriesWithResults}, zeroResults=${resolvedReport.zeroResultQueries}.`
  );
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(closePool);
}

module.exports = { main };
