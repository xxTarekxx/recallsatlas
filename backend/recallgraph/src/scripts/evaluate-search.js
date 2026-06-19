const { runSearchEvaluation } = require("../evaluation/runSearchEvaluation");

function main() {
  const report = runSearchEvaluation();
  console.log(
    `RecallGraph evaluation complete. queries=${report.queryCount}, withResults=${report.queriesWithResults}, zeroResults=${report.zeroResultQueries}.`
  );
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

module.exports = { main };
