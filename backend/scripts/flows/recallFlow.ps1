$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendRoot = [System.IO.Path]::GetFullPath((Join-Path $scriptDir "..\.."))
Set-Location $backendRoot

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

Import-DotEnvFile (Join-Path $backendRoot "scripts\.env")
Import-DotEnvFile (Join-Path $backendRoot ".env")

function Send-ResendEmail {
  param([string]$Subject, [string]$Body)
  if (-not $env:RESEND_API_KEY) { return }
  $from = if ($env:RESEND_FROM) { $env:RESEND_FROM } else { "RecallsAtlas <onboarding@resend.dev>" }
  $toRaw = $env:ALERT_EMAIL
  if ([string]::IsNullOrWhiteSpace($toRaw)) { return }
  $toList = @($toRaw.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  foreach ($toAddr in $toList) {
    $payload = [PSCustomObject]@{
      from    = $from
      to      = [string]$toAddr
      subject = $Subject
      text    = $Body
    } | ConvertTo-Json -Depth 6 -Compress
    try {
      Invoke-RestMethod -Uri "https://api.resend.com/emails" -Method Post -Headers @{
        Authorization = "Bearer $($env:RESEND_API_KEY)"
        "Content-Type" = "application/json"
      } -Body $payload -ErrorAction Stop | Out-Null
    } catch {}
  }
}

function Format-Elapsed($seconds) {
  if ($seconds -lt 60) { return "${seconds}s" }
  $m = [math]::Floor($seconds / 60)
  $s = $seconds % 60
  if ($s -gt 0) { return "${m}m ${s}s" } else { return "${m}m" }
}

function Get-OutputSummary {
  param([string]$Text, [int]$MaxLines = 40)
  if ([string]::IsNullOrWhiteSpace($Text)) { return "(no output)" }
  $lines = [regex]::Split($Text, '\r\n|\r|\n')
  $patterns = @(
    'Target :','MongoDB:','Local  \(recalls\.json\):','MongoDB \(collection\) :',
    '^Inserted :','^Updated  :','^Verify:','^Done\.  Inserted:',
    'saved','downloaded','matched','processed','translated','new recall',
    'total','unchanged','No changes','No matching'
  )
  $picked = foreach ($line in $lines) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    foreach ($pattern in $patterns) {
      if ($line -match $pattern) { $line; break }
    }
  }
  if ($picked.Count -gt 0) {
    return (($picked | Select-Object -Last $MaxLines) -join [Environment]::NewLine)
  }
  return (($lines | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Last 20) -join [Environment]::NewLine)
}

function Run-Step {
  param([string]$Label, [string]$Script, [int]$StepNum, [int]$TotalSteps)
  Write-Host ""
  Write-Host "[$StepNum/$TotalSteps] $Label" -ForegroundColor Cyan
  Write-Host "node scripts\$Script" -ForegroundColor DarkGray
  $start = Get-Date
  $rawOutput = & node (Join-Path "scripts" $Script) 2>&1
  foreach ($line in $rawOutput) { Write-Host $line }
  $exit = $LASTEXITCODE
  $elapsedSec = [math]::Round(((Get-Date) - $start).TotalSeconds)
  $elapsedFmt = Format-Elapsed $elapsedSec
  $summary = Get-OutputSummary -Text (($rawOutput | Out-String).Trim())

  if ($exit -ne 0) {
    Write-Host "[FAIL] $Label ($elapsedFmt)" -ForegroundColor Red
    $failBody = @"
RecallsAtlas pipeline stopped on a failed step.

Step:    $StepNum / $TotalSteps
Script:  scripts\$Script
Label:   $Label
Exit:    $exit
Elapsed: $elapsedFmt
Time:    $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')

----- summary -----

$summary
"@
    Send-ResendEmail -Subject "[RecallsAtlas] FAILED step $StepNum/$TotalSteps - $Label (exit $exit)" -Body $failBody
    exit $exit
  }

  Write-Host "[OK] $Label • $elapsedFmt" -ForegroundColor Green
  $okBody = @"
Step $StepNum of $TotalSteps completed successfully.

Script:  scripts\$Script
Label:   $Label
Elapsed: $elapsedFmt
Time:    $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')

----- summary -----

$summary
"@
  Send-ResendEmail -Subject "[RecallsAtlas] Step $StepNum/$TotalSteps OK - $Label" -Body $okBody

  return @{
    Label = $Label
    Script = $Script
    StepNum = $StepNum
    ElapsedFmt = $elapsedFmt
    OutputText = $summary
  }
}

$steps = @(
  @{ label = "Scrape FDA recalls"; script = "scrape\scrapeRecalls.js" },
  @{ label = "Sync to MongoDB (after scrape)"; script = "sync\recallsToMongo.js" },
  @{ label = "Translate recalls (Mongo + recalls.json)"; script = "translate\recallTranslate.js" },
  @{ label = "Check terminated recalls (JSON)"; script = "scrape\checkTerminated.js" },
  @{ label = "Sync to MongoDB (after terminated check)"; script = "sync\recallsToMongo.js" }
)

$totalSteps = $steps.Count
$globalStart = Get-Date
$completed = @()

Write-Host ""
Write-Host "RecallsAtlas Pipeline" -ForegroundColor Cyan
Write-Host "Steps:   $totalSteps" -ForegroundColor DarkGray
Write-Host "Node:    $(& node --version)" -ForegroundColor DarkGray
Write-Host "Started: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor DarkGray

$stepNum = 0
foreach ($step in $steps) {
  $stepNum++
  $completed += Run-Step -Label $step.label -Script $step.script -StepNum $stepNum -TotalSteps $totalSteps
}

$totalElapsed = Format-Elapsed ([math]::Round(((Get-Date) - $globalStart).TotalSeconds))
Write-Host ""
Write-Host "Pipeline complete" -ForegroundColor Green
Write-Host "Total time: $totalElapsed" -ForegroundColor DarkGray

$summaryParts = @(
  "RecallsAtlas pipeline finished successfully.",
  "",
  "Result: $totalSteps / $totalSteps steps OK",
  "Total time: $totalElapsed",
  "Finished: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')",
  ""
)
foreach ($r in $completed) {
  $summaryParts += "=========================================================="
  $summaryParts += "Step $($r.StepNum)/$totalSteps - $($r.Label)"
  $summaryParts += "Script: scripts\$($r.Script) | Elapsed: $($r.ElapsedFmt)"
  $summaryParts += "=========================================================="
  $summaryParts += $r.OutputText
  $summaryParts += ""
}
Send-ResendEmail -Subject "[RecallsAtlas] Pipeline complete - $totalSteps/$totalSteps OK ($totalElapsed)" -Body ($summaryParts -join [Environment]::NewLine)
