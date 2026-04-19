$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$target = Join-Path (Split-Path -Parent $scriptDir) "..\fdaRecalls\scripts\flows\recallFlow.ps1"
& $target @args
