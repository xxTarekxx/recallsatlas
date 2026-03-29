#!/usr/bin/env bash
# =============================================================================
#  RecallsAtlas - same 5 steps as recallFlow.ps1 (Linux / cron).
#
#  Optional email (Resend) — backend/.env and/or scripts/.env (same as PS1):
#    RESEND_API_KEY=re_...
#    ALERT_EMAIL=you@domain.com   (comma-separated for multiple)
#    RESEND_FROM=Name <on@yourdomain.com>   (optional)
#
#  chmod +x recallFlow.sh
#
#  Daily at 2:00 PM US Central (Chicago):
#    CRON_TZ=America/Chicago
#    0 14 * * * cd /var/www/html/recallsatlas/backend && ./recallFlow.sh >> /var/log/recallflow.log 2>&1
# =============================================================================

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

NODE_BIN="${NODE_BIN:-$(command -v node || true)}"
if [[ -z "$NODE_BIN" || ! -x "$NODE_BIN" ]]; then
  echo "recallFlow.sh: node not found in PATH (set NODE_BIN=/full/path/to/node if needed)" >&2
  exit 1
fi

if [[ ! -d scripts ]]; then
  echo "recallFlow.sh: scripts/ not found (run from backend/)" >&2
  exit 1
fi

TOTAL_STEPS=5
ACCUM="$(mktemp)"
trap 'rm -f "$ACCUM"' EXIT

PIPE_START="$(date +%s)"

format_elapsed() {
  local s=$1
  if ((s < 60)); then echo "${s}s"; return; fi
  local m=$((s / 60)) r=$((s % 60))
  if ((r > 0)); then echo "${m}m ${r}s"; else echo "${m}m"; fi
}

send_resend() {
  local subject="$1" body_file="$2"
  "$NODE_BIN" "$ROOT/scripts/pipelineSendResend.js" --subject "$subject" --body-file "$body_file" || true
}

run_step() {
  local label="$1" script="$2" step_num="$3"
  local tmp start end elapsed elapsed_fmt host timestr fail_body ok_body

  tmp="$(mktemp)"
  start="$(date +%s)"

  echo ""
  echo "======================================================================"
  echo "  $label"
  echo "  node scripts/$script"
  echo "======================================================================"

  set +e
  "$NODE_BIN" "scripts/$script" >"$tmp" 2>&1
  local ec=$?
  set -e

  cat "$tmp"

  end="$(date +%s)"
  elapsed=$((end - start))
  elapsed_fmt="$(format_elapsed "$elapsed")"
  host="$(hostname 2>/dev/null || echo unknown)"
  timestr="$(date "+%Y-%m-%d %H:%M:%S %z")"

  if [[ "$ec" -ne 0 ]]; then
    echo "" >&2
    echo "  [FAIL]  $label failed (exit code $ec) after $elapsed_fmt" >&2
    echo "" >&2
    fail_body="$(mktemp)"
    cat >"$fail_body" <<FAILBODY
RecallsAtlas pipeline stopped on a failed step.

Step:    $step_num / $TOTAL_STEPS
Script:  scripts/$script
Label:   $label
Exit:    $ec
Elapsed: $elapsed_fmt
Host:    $host
Time:    $timestr

----- script output (stdout/stderr) -----

$(cat "$tmp")
FAILBODY
    send_resend "[RecallsAtlas] FAILED step $step_num/$TOTAL_STEPS — $label (exit $ec)" "$fail_body"
    rm -f "$fail_body" "$tmp"
    exit "$ec"
  fi

  echo "  [OK]  $label completed in $elapsed_fmt"

  ok_body="$(mktemp)"
  cat >"$ok_body" <<OKBODY
Step $step_num of $TOTAL_STEPS completed successfully.

Script:  scripts/$script
Label:   $label
Elapsed: $elapsed_fmt
Host:    $host
Time:    $timestr

----- script output -----

$(cat "$tmp")
OKBODY
  send_resend "[RecallsAtlas] Step $step_num/$TOTAL_STEPS OK — $label" "$ok_body"
  rm -f "$ok_body"

  {
    echo "══════════════════════════════════════════════════════════"
    echo "Step $step_num/$TOTAL_STEPS — $label"
    echo "Script: scripts/$script  |  Elapsed: $elapsed_fmt"
    echo "══════════════════════════════════════════════════════════"
    cat "$tmp"
    echo ""
  } >>"$ACCUM"

  rm -f "$tmp"
}

echo ""
echo "============================================================"
echo "  RecallsAtlas - Pipeline Runner"
echo "============================================================"
echo "     Steps               $TOTAL_STEPS"
echo "     Node                $($NODE_BIN --version)"
echo "     Started             $(date "+%Y-%m-%d %H:%M:%S %z")"
echo ""

run_step "Scrape FDA recalls"                         scrapeRecalls.js  1
run_step "Sync to MongoDB (after scrape)"            recallsToMongo.js 2
run_step "Translate recalls (Mongo + recalls.json)"   recallTranslate.js 3
run_step "Check terminated recalls (JSON)"             checkTerminated.js 4
run_step "Sync to MongoDB (after terminated check)"     recallsToMongo.js 5

PIPE_END="$(date +%s)"
PIPE_ELAPSED=$((PIPE_END - PIPE_START))
PIPE_ELAPSED_FMT="$(format_elapsed "$PIPE_ELAPSED)"

echo ""
echo "============================================================"
echo "  Pipeline Complete"
echo "============================================================"
echo "     Steps run           $TOTAL_STEPS"
echo "     Total time          $PIPE_ELAPSED_FMT"
echo "     Finished            $(date "+%Y-%m-%d %H:%M:%S %z")"
echo ""

echo "recallFlow.sh: pipeline complete ($(date -Iseconds))"

summary_body="$(mktemp)"
{
  echo "RecallsAtlas pipeline finished successfully."
  echo ""
  echo "Result: $TOTAL_STEPS / $TOTAL_STEPS steps OK"
  echo "Total time: $PIPE_ELAPSED_FMT"
  echo "Host: $(hostname 2>/dev/null || echo unknown)"
  echo "Finished: $(date "+%Y-%m-%d %H:%M:%S %z")"
  echo ""
  cat "$ACCUM"
} >"$summary_body"
send_resend "[RecallsAtlas] Pipeline complete — $TOTAL_STEPS/$TOTAL_STEPS OK ($PIPE_ELAPSED_FMT)" "$summary_body"
rm -f "$summary_body"
