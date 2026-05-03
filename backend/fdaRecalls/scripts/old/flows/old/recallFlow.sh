#!/usr/bin/env bash
set -euo pipefail

FLOW_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$FLOW_DIR/../.." && pwd)"
cd "$ROOT"

NODE_BIN="${NODE_BIN:-$(command -v node || true)}"
if [[ -z "$NODE_BIN" || ! -x "$NODE_BIN" ]]; then
  echo "recallFlow.sh: node not found in PATH" >&2
  exit 1
fi

if [[ ! -d scripts ]]; then
  echo "recallFlow.sh: scripts/ not found (run from backend/)" >&2
  exit 1
fi

TOTAL_STEPS=5
PIPE_START="$(date +%s)"
ACCUM="$(mktemp)"
trap 'rm -f "$ACCUM"' EXIT

fmt_now_plain() {
  date "+%-m-%-d-%Y  |  %-I:%M %p %Z"
}

format_elapsed() {
  local s=$1
  if ((s < 60)); then echo "${s} sec"; return; fi
  local m=$((s / 60)) r=$((s % 60))
  if ((r == 0)); then echo "${m} min"; else echo "${m} min ${r} sec"; fi
}

send_resend() {
  local subject="$1" body_file="$2"
  "$NODE_BIN" "$ROOT/scripts/notify/pipelineSendResend.js" --subject "$subject" --body-file "$body_file" || true
}

summarize_output() {
  local f="$1"
  [[ -f "$f" ]] || { echo "(no output)"; return; }
  local summary
  summary="$(
    sed -E 's/\x1B\[[0-9;]*[A-Za-z]//g' "$f" | awk '
      /Target :/ ||
      /MongoDB:/ ||
      /Local  \(recalls\.json\):/ ||
      /MongoDB \(collection\) :/ ||
      /^Inserted :/ ||
      /^Updated  :/ ||
      /^Verify:/ ||
      /^Done\.  Inserted:/ ||
      /saved/i ||
      /downloaded/i ||
      /matched/i ||
      /processed/i ||
      /translated/i ||
      /new recall/i ||
      /total/i ||
      /unchanged/i ||
      /No changes/i ||
      /No matching/i
    '
  )"
  if [[ -n "${summary//[[:space:]]/}" ]]; then
    echo "$summary" | tail -n 40
  else
    grep -v '^[[:space:]]*$' "$f" | tail -n 20
  fi
}

run_step() {
  local label="$1" script="$2" step_num="$3"
  shift 3
  local extra_args=("$@")
  local tmp start end elapsed elapsed_fmt ec summary fail_body ok_body
  local cmd_display="node scripts/$script"
  if [[ ${#extra_args[@]} -gt 0 ]]; then
    cmd_display+=" ${extra_args[*]}"
  fi

  tmp="$(mktemp)"
  start="$(date +%s)"

  echo ""
  echo "[$step_num/$TOTAL_STEPS] $label"
  echo "$cmd_display"

  set +e
  if command -v stdbuf >/dev/null 2>&1; then
    stdbuf -oL -eL "$NODE_BIN" "scripts/$script" "${extra_args[@]}" 2>&1 | tee "$tmp"
  else
    "$NODE_BIN" "scripts/$script" "${extra_args[@]}" 2>&1 | tee "$tmp"
  fi
  ec=${PIPESTATUS[0]}
  set -e

  end="$(date +%s)"
  elapsed=$((end - start))
  elapsed_fmt="$(format_elapsed "$elapsed")"
  summary="$(summarize_output "$tmp")"

  if [[ "$ec" -ne 0 ]]; then
    echo "[FAIL] $label (${elapsed_fmt})" >&2
    fail_body="$(mktemp)"
    cat >"$fail_body" <<FAILBODY
RecallsAtlas pipeline stopped on a failed step.

Step:    $step_num / $TOTAL_STEPS
Script:  $cmd_display
Label:   $label
Exit:    $ec
Elapsed: $elapsed_fmt
Time:    $(fmt_now_plain)

----- summary -----

$summary
FAILBODY
    send_resend "[RecallsAtlas] FAILED step $step_num/$TOTAL_STEPS - $label (exit $ec)" "$fail_body"
    rm -f "$fail_body" "$tmp"
    exit "$ec"
  fi

  echo "[OK] $label • $elapsed_fmt"

  ok_body="$(mktemp)"
  cat >"$ok_body" <<OKBODY
Step $step_num of $TOTAL_STEPS completed successfully.

Script:  $cmd_display
Label:   $label
Elapsed: $elapsed_fmt
Time:    $(fmt_now_plain)

----- summary -----

$summary
OKBODY
  send_resend "[RecallsAtlas] Step $step_num/$TOTAL_STEPS OK - $label" "$ok_body"
  rm -f "$ok_body"

  {
    echo "============================================================"
    echo "Step $step_num/$TOTAL_STEPS - $label"
    echo "Script: $cmd_display | Duration: $elapsed_fmt | Finished: $(fmt_now_plain)"
    echo "============================================================"
    echo "$summary"
    echo ""
  } >>"$ACCUM"

  rm -f "$tmp"
}

echo ""
echo "RecallsAtlas Pipeline"
echo "Steps:   $TOTAL_STEPS"
echo "Node:    $($NODE_BIN --version)"
echo "Started: $(fmt_now_plain)"

run_step "Scrape FDA recalls"                        "scrape/scrapeRecalls.js" 1
run_step "Build cleaned English recall structure"    "cleanup/backfillEnglishRecallStructure.js" 2 --resume
run_step "Translate cleaned recalls"                 "translate/recallTranslate.js" 3
run_step "Check terminated recalls (translated JSON)" "scrape/checkTerminated.js" 4 --fetch --input=./fdaRecalls/data/recalls-cleaned-translated.json --output=./fdaRecalls/data/recalls-cleaned-translated.json
run_step "Sync translated recalls to MongoDB"        "sync/recallsToMongo.js" 5 --input=./fdaRecalls/data/recalls-cleaned-translated.json

PIPE_END="$(date +%s)"
PIPE_ELAPSED_FMT="$(format_elapsed "$((PIPE_END - PIPE_START))")"

echo ""
echo "Pipeline complete"
echo "Total time: $PIPE_ELAPSED_FMT"
echo "Finished:   $(fmt_now_plain)"

summary_body="$(mktemp)"
{
  echo "RecallsAtlas pipeline finished successfully."
  echo ""
  echo "Result: $TOTAL_STEPS / $TOTAL_STEPS steps OK"
  echo "Total time: $PIPE_ELAPSED_FMT"
  echo "Finished: $(fmt_now_plain)"
  echo ""
  cat "$ACCUM"
} >"$summary_body"
send_resend "[RecallsAtlas] Pipeline complete - $TOTAL_STEPS/$TOTAL_STEPS OK ($PIPE_ELAPSED_FMT)" "$summary_body"
rm -f "$summary_body"

PM2_APP="${PM2_APP:-recallsatlas}"
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart "$PM2_APP" >/dev/null 2>&1 && echo "[OK] pm2 restart $PM2_APP" || echo "[WARN] pm2 restart failed" >&2
fi
