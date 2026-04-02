# =============================================================================
#  RecallsAtlas - Pipeline Runner
# =============================================================================
#
#  Runs the full recall pipeline (order 1 -> 3 -> 2 -> 4 -> 3):
#    1. scrapeRecalls.js     - FDA scrape -> recalls.json (+ images)
#    2. recallsToMongo.js    - new recalls into Mongo (translate reads Mongo)
#    3. recallTranslate.js   - translate in Mongo, mirror recalls.json
#    4. checkTerminated.js   - match FDA terminated export -> recalls.json
#    5. recallsToMongo.js    - push termination + JSON changes -> Mongo
#
#  Optional email (Resend) — set in scripts/.env or backend/.env:
#    RESEND_API_KEY=re_...     (required for any email)
#    ALERT_EMAIL=you@domain.com   (comma-separated for multiple)
#    RESEND_FROM=Name <on@yourdomain.com>   (optional; must be verified in Resend)
#        If unset, uses Resend trial: "RecallsAtlas <onboarding@resend.dev>"
#        (trial only delivers to your Resend-account email)
#
#  When RESEND_API_KEY is set:
#    - After each step: email with that script's console output (progress / stats).
#    - On failure: email with step name, exit code, and full captured output.
#    - At the end: one summary email (5/5 OK) with each step's output attached in sections.
#
#  Usage (from backend/ directory):
#    .\recallFlow.ps1
#
# =============================================================================

$ErrorActionPreference = "Stop"

# -- Load .env (scripts first, then backend) ----------------------------------

function Import-DotEnvFile {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return }
  Get-Content -LiteralPath $Path -Encoding UTF8 | ForEach-Object {
    $line = $_.Trim()
    if ($line.Length -eq 0 -or $line.StartsWith("#")) { return }
    $eq = $line.IndexOf("=")
    if ($eq -lt 1) { return }
    $key = $line.Substring(0, $eq).Trim()
    $val = $line.Substring($eq + 1).Trim()
    if ($val.Length -ge 2) {
      $q = $val[0]
      if (($q -eq '"' -or $q -eq "'") -and $val.EndsWith($q)) {
        $val = $val.Substring(1, $val.Length - 2)
      }
    }
    [Environment]::SetEnvironmentVariable($key, $val, "Process")
  }
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Import-DotEnvFile (Join-Path $scriptDir "scripts\.env")
Import-DotEnvFile (Join-Path $scriptDir ".env")

# -- Resend -------------------------------------------------------------------

function Get-ResendEnabled {
  return [bool]$env:RESEND_API_KEY
}

function Send-ResendEmail {
  param(
    [Parameter(Mandatory = $true)][string]$Subject,
    [Parameter(Mandatory = $true)][string]$Body
  )
  if (-not (Get-ResendEnabled)) { return $false }

  $from = $env:RESEND_FROM
  if ([string]::IsNullOrWhiteSpace($from)) {
    $from = "RecallsAtlas <onboarding@resend.dev>"
  }
  $toRaw = $env:ALERT_EMAIL
  if ([string]::IsNullOrWhiteSpace($toRaw)) {
    Write-Warning "RESEND_API_KEY is set but ALERT_EMAIL is missing — skipping email send."
    return $false
  }

  $toList = @(
    $toRaw.Split(",") |
      ForEach-Object { $_.Trim().Trim('"').Trim("'") } |
      Where-Object { $_ }
  )
  if ($toList.Count -eq 0) {
    Write-Warning "ALERT_EMAIL has no valid addresses — skipping email."
    return $false
  }

  # Resend body size — keep reasonable for mail clients
  $max = 95000
  if ($Body.Length -gt $max) {
    $tail = "`n`n[... truncated, showing last $max characters ...]`n`n"
    $Body = $tail + $Body.Substring($Body.Length - $max)
  }

  # Resend expects each `to` as a JSON string. Hashtable + ConvertTo-Json in PS 5.1
  # can emit `to` in a shape the API rejects (422). PSCustomObject per recipient is reliable.
  try {
    foreach ($toAddr in $toList) {
      $payload = [PSCustomObject]@{
        from    = $from
        to      = [string]$toAddr
        subject = $Subject
        text    = $Body
      } | ConvertTo-Json -Depth 6 -Compress

      Invoke-RestMethod `
        -Uri "https://api.resend.com/emails" `
        -Method Post `
        -Headers @{
          Authorization = "Bearer $($env:RESEND_API_KEY)"
          "Content-Type"  = "application/json"
        } `
        -Body $payload `
        -ErrorAction Stop | Out-Null
    }
    return $true
  }
  catch {
    Write-Warning "Resend API error: $($_.Exception.Message)"
    if ($_.ErrorDetails.Message) { Write-Warning $_.ErrorDetails.Message }
    return $false
  }
}

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

function Run-Step {
  param(
    [string]$Label,
    [string]$Script,
    [int]$StepNum,
    [int]$TotalSteps
  )

  Write-Step $StepNum $TotalSteps $Label
  $start = Get-Date

  $rawOutput = & node "scripts\$Script" 2>&1
  foreach ($line in $rawOutput) {
    Write-Host $line
  }
  $exit = $LASTEXITCODE

  $elapsedSec = [math]::Round(((Get-Date) - $start).TotalSeconds)
  $elapsedFmt = Format-Elapsed $elapsedSec
  $outputText = ($rawOutput | Out-String).Trim()

  $result = @{
    Label        = $Label
    Script       = $Script
    StepNum      = $StepNum
    ExitCode     = $exit
    ElapsedSec   = $elapsedSec
    ElapsedFmt   = $elapsedFmt
    OutputText   = $outputText
    Success      = ($exit -eq 0)
  }

  if ($exit -ne 0) {
    Write-Fail "$Label failed (exit code $exit) after $elapsedFmt"
    $failBody = @"
RecallsAtlas pipeline stopped on a failed step.

Step:    $StepNum / $TotalSteps
Script:  scripts\$Script
Label:   $Label
Exit:    $exit
Elapsed: $elapsedFmt
Host:    $env:COMPUTERNAME
Time:    $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')

--- script output (stdout/stderr) ---

$outputText
"@
    Send-ResendEmail -Subject "[RecallsAtlas] FAILED step $StepNum/$TotalSteps - $Label (exit $exit)" -Body $failBody | Out-Null
    exit $exit
  }

  Write-Ok "$Label completed in $elapsedFmt"

  if (Get-ResendEnabled) {
    $okBody = @"
Step $StepNum of $TotalSteps completed successfully.

Script:  scripts\$Script
Label:   $Label
Elapsed: $elapsedFmt
Host:    $env:COMPUTERNAME
Time:    $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')

--- script output ---

$outputText
"@
    Send-ResendEmail -Subject "[RecallsAtlas] Step $StepNum/$TotalSteps OK - $Label" -Body $okBody | Out-Null
  }

  return $result
}

# -- Verify layout ------------------------------------------------------------

if (-not (Test-Path "scripts")) {
  Write-Fail "scripts/ folder not found. Make sure recallFlow.ps1 lives in backend/."
  exit 1
}

# -- Steps --------------------------------------------------------------------

$steps = @(
  @{ label = "Scrape FDA recalls";                         script = "scrapeRecalls.js"   },
  @{ label = "Sync to MongoDB (after scrape)";             script = "recallsToMongo.js"  },
  @{ label = "Translate recalls (Mongo + recalls.json)";   script = "recallTranslate.js" },
  @{ label = "Check terminated recalls (JSON)";            script = "checkTerminated.js" },
  @{ label = "Sync to MongoDB (after terminated check)";   script = "recallsToMongo.js"  }
)

$totalSteps = $steps.Count

# -- Header -------------------------------------------------------------------

Write-Header "RecallsAtlas - Pipeline Runner"
Write-Info "Steps"    "$totalSteps"
Write-Info "Node"     (& node --version)
Write-Info "Started"  (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
if (Get-ResendEnabled) {
  if ([string]::IsNullOrWhiteSpace($env:ALERT_EMAIL)) {
    Write-Info "Resend" "API key set - set ALERT_EMAIL to enable emails"
  }
  else {
    Write-Info "Resend" "enabled -> $($env:ALERT_EMAIL)"
  }
}
else {
  Write-Info "Resend" "off (set RESEND_API_KEY + ALERT_EMAIL to enable)"
}

# -- Run ----------------------------------------------------------------------

$globalStart = Get-Date
$stepNum     = 0
$completed   = @()

foreach ($step in $steps) {
  $stepNum++
  $r = Run-Step -Label $step.label -Script $step.script -StepNum $stepNum -TotalSteps $totalSteps
  $completed += @($r)
}

# -- Done ---------------------------------------------------------------------

$totalElapsed = [math]::Round(((Get-Date) - $globalStart).TotalSeconds)
$totalElapsed = Format-Elapsed $totalElapsed

Write-Header "Pipeline Complete"
Write-Info "Steps run"   "$totalSteps"
Write-Info "Total time"  $totalElapsed
Write-Info "Finished"    (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Write-Host ""

if (Get-ResendEnabled -and -not [string]::IsNullOrWhiteSpace($env:ALERT_EMAIL)) {
  $summaryParts = @()
  $summaryParts += "RecallsAtlas pipeline finished successfully."
  $summaryParts += ""
  $summaryParts += "Result: $totalSteps / $totalSteps steps OK"
  $summaryParts += "Total time: $totalElapsed"
  $summaryParts += "Host: $env:COMPUTERNAME"
  $summaryParts += "Finished: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')"
  $summaryParts += ""
  foreach ($r in $completed) {
    $summaryParts += "=========================================================="
    $summaryParts += "Step $($r.StepNum)/$totalSteps - $($r.Label)"
    $summaryParts += "Script: scripts\$($r.Script)  |  Elapsed: $($r.ElapsedFmt)"
    $summaryParts += "=========================================================="
    $summaryParts += $r.OutputText
    $summaryParts += ""
  }
  $summaryBody = $summaryParts -join [Environment]::NewLine
  $summarySubj = '[RecallsAtlas] Pipeline complete - {0}/{1} OK ({2})' -f $totalSteps, $totalSteps, $totalElapsed
  Send-ResendEmail -Subject $summarySubj -Body $summaryBody | Out-Null
}
