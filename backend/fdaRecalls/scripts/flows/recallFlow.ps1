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
  param(
    [string]$Label,
    [string]$Script,
    [string[]]$Args = @(),
    [int]$StepNum,
    [int]$TotalSteps
  )
  $cmdDisplay = @("node", "scripts\$Script") + $Args
  Write-Host ""
  Write-Host "[$StepNum/$TotalSteps] $Label" -ForegroundColor Cyan
  Write-Host ($cmdDisplay -join " ") -ForegroundColor DarkGray
  $start = Get-Date
  $stepOutput = New-Object System.Collections.Generic.List[string]
  $streamState = [hashtable]::Synchronized(@{
    StdoutDone = $false
    StderrDone = $false
  })

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = "node"
  $psi.WorkingDirectory = $backendRoot
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  [void]$psi.ArgumentList.Add((Join-Path "scripts" $Script))
  foreach ($arg in $Args) { [void]$psi.ArgumentList.Add($arg) }

  $proc = New-Object System.Diagnostics.Process
  $proc.StartInfo = $psi
  $proc.EnableRaisingEvents = $true

  $outHandler = [System.Diagnostics.DataReceivedEventHandler]{
    param($sender, $eventArgs)
    if ($null -eq $eventArgs.Data) {
      $streamState.StdoutDone = $true
    } else {
      $stepOutput.Add($eventArgs.Data)
      Write-Host $eventArgs.Data
    }
  }
  $errHandler = [System.Diagnostics.DataReceivedEventHandler]{
    param($sender, $eventArgs)
    if ($null -eq $eventArgs.Data) {
      $streamState.StderrDone = $true
    } else {
      $stepOutput.Add($eventArgs.Data)
      Write-Host $eventArgs.Data
    }
  }

  $proc.add_OutputDataReceived($outHandler)
  $proc.add_ErrorDataReceived($errHandler)
  [void]$proc.Start()
  $proc.BeginOutputReadLine()
  $proc.BeginErrorReadLine()
  $proc.WaitForExit()
  while (-not ($streamState.StdoutDone -and $streamState.StderrDone)) {
    Start-Sleep -Milliseconds 50
  }
  $exit = $proc.ExitCode
  $elapsedSec = [math]::Round(((Get-Date) - $start).TotalSeconds)
  $elapsedFmt = Format-Elapsed $elapsedSec
  $summary = Get-OutputSummary -Text (($stepOutput | Out-String).Trim())

  if ($exit -ne 0) {
    Write-Host "[FAIL] $Label ($elapsedFmt)" -ForegroundColor Red
    $failBody = @"
RecallsAtlas pipeline stopped on a failed step.

Step:    $StepNum / $TotalSteps
Script:  $($cmdDisplay -join " ")
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

Script:  $($cmdDisplay -join " ")
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
    Args = $Args
    StepNum = $StepNum
    ElapsedFmt = $elapsedFmt
    OutputText = $summary
  }
}

$steps = @(
  @{ label = "Scrape FDA recalls"; script = "scrape\scrapeRecalls.js" },
  @{ label = "Build cleaned English recall structure"; script = "cleanup\backfillEnglishRecallStructure.js"; args = @("--resume") },
  @{ label = "Translate cleaned recalls"; script = "translate\recallTranslate.js" },
  @{ label = "Check terminated recalls (translated JSON)"; script = "scrape\checkTerminated.js"; args = @("--fetch", "--input=./fdaRecalls/data/recalls-cleaned-translated.json", "--output=./fdaRecalls/data/recalls-cleaned-translated.json") },
  @{ label = "Sync translated recalls to MongoDB"; script = "sync\recallsToMongo.js"; args = @("--input=./fdaRecalls/data/recalls-cleaned-translated.json") }
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
  $stepArgs = if ($step.ContainsKey("args")) { $step.args } else { @() }
  $completed += Run-Step -Label $step.label -Script $step.script -Args $stepArgs -StepNum $stepNum -TotalSteps $totalSteps
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
  $summaryParts += "Script: scripts\$($r.Script) $($r.Args -join ' ') | Elapsed: $($r.ElapsedFmt)"
  $summaryParts += "=========================================================="
  $summaryParts += $r.OutputText
  $summaryParts += ""
}
Send-ResendEmail -Subject "[RecallsAtlas] Pipeline complete - $totalSteps/$totalSteps OK ($totalElapsed)" -Body ($summaryParts -join [Environment]::NewLine)
