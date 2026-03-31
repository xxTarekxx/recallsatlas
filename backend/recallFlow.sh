#!/usr/bin/env bash
# =============================================================================
#  RecallsAtlas - same 5 steps as recallFlow.ps1 (Linux / cron).
#
#  Optional email (Resend) — backend/.env and/or scripts/.env (same as PS1):
#    RESEND_API_KEY=re_...
#    ALERT_EMAIL=you@domain.com   (comma-separated for multiple)
#    RESEND_FROM=Name <on@yourdomain.com>   (optional)
#
#  After all 5 steps succeed, runs: pm2 restart ${PM2_APP:-recallsatlas}
#  (ensure pm2 is on PATH in cron, e.g. nvm: source ~/.nvm/nvm.sh)
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

# ANSI colors only when stdout is a TTY (plain text in cron → log files / email bodies).
if [[ -t 1 ]]; then
  C_RESET=$'\033[0m'
  C_BOLD=$'\033[1m'
  C_DIM=$'\033[2m'
  C_CYAN=$'\033[36m'
  C_GREEN=$'\033[32m'
  C_YELLOW=$'\033[33m'
  C_RED=$'\033[31m'
  C_WHITE=$'\033[97m'
else
  C_RESET="" C_BOLD="" C_DIM="" C_CYAN="" C_GREEN="" C_YELLOW="" C_RED="" C_WHITE=""
fi

# Human-readable clock: no seconds, 12h + AM/PM, weekday + short date + timezone.
# Uses GNU date %- modifiers (Ubuntu/VPS). On macOS, swap to %d / %I if needed.
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
  "$NODE_BIN" "$ROOT/scripts/pipelineSendResend.js" --subject "$subject" --body-file "$body_file" || true
}

run_step() {
  local label="$1" script="$2" step_num="$3"
  shift 3
  local extra_args=("$@")
  local tmp start end elapsed elapsed_fmt host timestr fail_body ok_body
  local cmd_display="node scripts/$script"
  if [[ ${#extra_args[@]} -gt 0 ]]; then
    cmd_display+=" ${extra_args[*]}"
  fi

  tmp="$(mktemp)"
  start="$(date +%s)"

  echo ""
  echo "${C_CYAN}──────────────────────────────────────────────────────────────────────${C_RESET}"
  echo "  ${C_BOLD}${C_WHITE}${label}${C_RESET}"
  echo "  ${C_DIM}${cmd_display}${C_RESET}"
  echo "${C_CYAN}──────────────────────────────────────────────────────────────────────${C_RESET}"

  # Stream output live (tee); stdbuf avoids block-buffering when stdout is a pipe
  set +e
  if command -v stdbuf >/dev/null 2>&1; then
    stdbuf -oL -eL "$NODE_BIN" "scripts/$script" "${extra_args[@]}" 2>&1 | tee "$tmp"
  else
    "$NODE_BIN" "scripts/$script" "${extra_args[@]}" 2>&1 | tee "$tmp"
  fi
  local ec=${PIPESTATUS[0]}
  set -e

  end="$(date +%s)"
  elapsed=$((end - start))
  elapsed_fmt="$(format_elapsed "$elapsed")"
  host="$(hostname 2>/dev/null || echo unknown)"
  timestr="$(fmt_now_plain)"

  if [[ "$ec" -ne 0 ]]; then
    echo "" >&2
    echo "${C_RED}  [FAIL]${C_RESET}  ${C_BOLD}${label}${C_RESET}  ${C_DIM}(exit ${ec} • ${elapsed_fmt})${C_RESET}" >&2
    echo "" >&2
    fail_body="$(mktemp)"
    cat >"$fail_body" <<FAILBODY
RecallsAtlas pipeline stopped on a failed step.

Step:    $step_num / $TOTAL_STEPS
Script:  $cmd_display
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

  echo "${C_GREEN}  [OK]${C_RESET}  ${C_BOLD}${label}${C_RESET}  ${C_DIM}•  ${elapsed_fmt}${C_RESET}"

  ok_body="$(mktemp)"
  cat >"$ok_body" <<OKBODY
Step $step_num of $TOTAL_STEPS completed successfully.

Script:  $cmd_display
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
    echo "────────────────────────────────────────────────────────────"
    echo "Step $step_num/$TOTAL_STEPS — $label"
    echo "Script: $cmd_display  |  Duration: $elapsed_fmt  |  Finished: $(fmt_now_plain)"
    echo "────────────────────────────────────────────────────────────"
    cat "$tmp"
    echo ""
  } >>"$ACCUM"

  rm -f "$tmp"
}

echo ""
echo "${C_CYAN}══════════════════════════════════════════════════════════════════════${C_RESET}"
echo "  ${C_BOLD}${C_WHITE}RecallsAtlas — Pipeline${C_RESET}"
echo "${C_CYAN}══════════════════════════════════════════════════════════════════════${C_RESET}"
echo "     ${C_DIM}Steps${C_RESET}          $TOTAL_STEPS"
echo "     ${C_DIM}Node${C_RESET}           $($NODE_BIN --version)"
echo "     ${C_DIM}Started${C_RESET}        $(fmt_now_plain)"
echo ""

run_step "Scrape FDA recalls"                         scrapeRecalls.js  1
run_step "Sync to MongoDB (after scrape)"            recallsToMongo.js 2
run_step "Translate recalls (Mongo + recalls.json)"   recallTranslate.js 3
run_step "Check terminated recalls (fetch + JSON)"     checkTerminated.js  4 --fetch
run_step "Sync to MongoDB (after terminated check)"     recallsToMongo.js 5

PIPE_END="$(date +%s)"
PIPE_ELAPSED=$((PIPE_END - PIPE_START))
PIPE_ELAPSED_FMT="$(format_elapsed "$PIPE_ELAPSED")"

echo ""
echo "${C_GREEN}══════════════════════════════════════════════════════════════════════${C_RESET}"
echo "  ${C_BOLD}${C_WHITE}Pipeline complete${C_RESET}"
echo "${C_GREEN}══════════════════════════════════════════════════════════════════════${C_RESET}"
echo "     ${C_DIM}Steps run${C_RESET}      $TOTAL_STEPS"
echo "     ${C_DIM}Total time${C_RESET}     $PIPE_ELAPSED_FMT"
echo "     ${C_DIM}Finished${C_RESET}       $(fmt_now_plain)"
echo ""

echo "${C_DIM}recallFlow.sh: all steps OK | $(fmt_now_plain)${C_RESET}"

summary_body="$(mktemp)"
{
  echo "RecallsAtlas pipeline finished successfully."
  echo ""
  echo "Result: $TOTAL_STEPS / $TOTAL_STEPS steps OK"
  echo "Total time: $PIPE_ELAPSED_FMT"
  echo "Host: $(hostname 2>/dev/null || echo unknown)"
  echo "Finished: $(fmt_now_plain)"
  echo ""
  cat "$ACCUM"
} >"$summary_body"
send_resend "[RecallsAtlas] Pipeline complete — $TOTAL_STEPS/$TOTAL_STEPS OK ($PIPE_ELAPSED_FMT)" "$summary_body"
rm -f "$summary_body"

PM2_APP="${PM2_APP:-recallsatlas}"
echo ""
echo "${C_DIM}Restarting Next.js (pm2):${C_RESET} ${C_BOLD}$PM2_APP${C_RESET}"
if command -v pm2 >/dev/null 2>&1; then
  if pm2 restart "$PM2_APP" 2>&1; then
    echo "${C_GREEN}  [OK]${C_RESET}  pm2 restart ${C_BOLD}$PM2_APP${C_RESET}"
  else
    echo "${C_YELLOW}  [WARN]${C_RESET}  pm2 restart failed (exit $?)" >&2
  fi
else
  echo "${C_YELLOW}  [SKIP]${C_RESET}  pm2 not in PATH — set PATH or PM2_APP" >&2
fi
