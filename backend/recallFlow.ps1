# =============================================================================
#  RecallsAtlas - Pipeline Runner
# =============================================================================
#
#  Runs the full recall pipeline in order:
#    1. scrapeRecalls.js    - scrape FDA recall pages -> recalls.json
#    2. recallsToMongo.js   - sync recalls.json -> MongoDB
#    3. recallTranslate.js  - translate all untranslated recalls (10 target languages)
#    4. checkTerminated.js  - mark terminated recalls in MongoDB
#
#  Usage (from backend/ directory):
#    .\recallFlow.ps1
#
# =============================================================================

$ErrorActionPreference = "Stop"

# -- Helpers ------------------------------------------------------------------

function Write-Header($msg) {
  $line = "=" * 60
  Write-Host ""
  Write-Host "  $line" -ForegroundColor Cyan
  Write-Host "  $msg"  -ForegroundColor Cyan
  Write-Host "  $line" -ForegroundColor Cyan
  Write-Host ""
}

function Write-Step($num, $total, $msg) {
  $divider = "-" * 58
  Write-Host ""
  Write-Host "  [$num/$total] $msg" -ForegroundColor Cyan
  Write-Host "  $divider"           -ForegroundColor DarkGray
}

function Write-Ok($msg) {
  Write-Host "  [OK]  $msg" -ForegroundColor Green
}

function Write-Fail($msg) {
  Write-Host ""
  Write-Host "  [FAIL]  $msg" -ForegroundColor Red
  Write-Host ""
}

function Write-Info($label, $value) {
  $pad = $label.PadRight(22)
  Write-Host "     $pad$value" -ForegroundColor DarkGray
}

function Format-Elapsed($seconds) {
  if ($seconds -lt 60) { return "${seconds}s" }
  $m = [math]::Floor($seconds / 60)
  $s = $seconds % 60
  if ($s -gt 0) { return "${m}m ${s}s" } else { return "${m}m" }
}

function Run-Step($label, $script, $stepNum, $totalSteps) {
  Write-Step $stepNum $totalSteps $label
  $start = Get-Date

  # Run node script - output streams directly to terminal
  & node "scripts\$script"
  $exit = $LASTEXITCODE

  $elapsed = [math]::Round(((Get-Date) - $start).TotalSeconds)
  $elapsed = Format-Elapsed $elapsed

  if ($exit -ne 0) {
    Write-Fail "$label failed (exit code $exit) after $elapsed"
    exit 1
  }

  Write-Ok "$label completed in $elapsed"
}

# -- Make sure we are in the backend/ directory -------------------------------

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

if (-not (Test-Path "scripts")) {
  Write-Fail "scripts/ folder not found. Make sure you are in the backend/ directory."
  exit 1
}

# -- Steps --------------------------------------------------------------------

$steps = @(
  @{ label = "Scrape FDA recalls";            script = "scrapeRecalls.js"   },
  @{ label = "Sync to MongoDB";               script = "recallsToMongo.js"  },
  @{ label = "Translate recalls (19 langs)";  script = "recallTranslate.js" },
  @{ label = "Check terminated recalls";      script = "checkTerminated.js" }
)

$totalSteps = $steps.Count

# -- Header -------------------------------------------------------------------

Write-Header "RecallsAtlas - Pipeline Runner"
Write-Info "Steps"    "$totalSteps"
Write-Info "Node"     (& node --version)
Write-Info "Started"  (Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# -- Run ----------------------------------------------------------------------

$globalStart = Get-Date
$stepNum     = 0

foreach ($step in $steps) {
  $stepNum++
  Run-Step $step.label $step.script $stepNum $totalSteps
}

# -- Done ---------------------------------------------------------------------

$totalElapsed = [math]::Round(((Get-Date) - $globalStart).TotalSeconds)
$totalElapsed = Format-Elapsed $totalElapsed

Write-Header "Pipeline Complete"
Write-Info "Steps run"   "$totalSteps"
Write-Info "Total time"  $totalElapsed
Write-Info "Finished"    (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Write-Host ""
