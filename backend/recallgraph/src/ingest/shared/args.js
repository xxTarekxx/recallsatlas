"use strict";

function cliValue(args, name) {
  const dashed = `--${name}`;
  const equals = `${dashed}=`;
  const match = args.find((arg) => arg.startsWith(equals));
  if (match) return match.slice(equals.length);

  const index = args.indexOf(dashed);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith("--")) {
    return args[index + 1];
  }

  return "";
}

function hasFlag(args, name) {
  return args.includes(`--${name}`);
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function parseRawArgs(defaults = {}) {
  const args = process.argv.slice(2);
  const limit =
    cliValue(args, "limit") ||
    cliValue(args, "max-records") ||
    cliValue(args, "max-total") ||
    process.env.RECALLGRAPH_RAW_LIMIT;

  return {
    dryRun: hasFlag(args, "dry-run"),
    input: cliValue(args, "input"),
    out: cliValue(args, "out") || cliValue(args, "output"),
    limit: positiveInt(limit, defaults.limit || 100),
    start: cliValue(args, "start") || cliValue(args, "recall-date-start") || defaults.start || "2023-12-07",
    end: cliValue(args, "end") || cliValue(args, "recall-date-end") || defaults.end || todayDate(),
    verbose: hasFlag(args, "verbose") || /^(1|true|yes)$/i.test(String(process.env.VERBOSE_LOGS || "")),
  };
}

module.exports = { parseRawArgs };
