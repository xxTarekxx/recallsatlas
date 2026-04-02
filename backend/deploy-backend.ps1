#Requires -Version 5.1
<#
  Remote: under /var/www/html/recallsatlas/backend, delete everything except:
    node_modules/, package-lock.json, package.json, .env
  Then upload this folder from local (no node_modules — server keeps its install).

  Config: same as frontend — prefer backend/deploy.env.ps1, else ../frontend/deploy.env.ps1
    $VPS_HOST = "user@host"
    $VPS_ROOT = "/var/www/html/recallsatlas"
    optional: $VPS_SSH_KEY = "C:\path\to\private_key"  (omit if default ssh key works — passwordless)

  Does not upload local .env or deploy.env.ps1 (server .env is preserved by the clean step).

  Skips these subfolders (VPS keeps its own copies / local-only tooling):
    - scripts/cars  (downloads, category scripts run locally)
    - database/cars (e.g. cars.json updated on VPS from VIN lookups — do not overwrite on deploy)
#>
[CmdletBinding()]
param(
  [string] $Server = $null,
  [string] $User = $null,
  [string] $RemoteBackend = $null
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$VPS_HOST = $null
$VPS_ROOT = $null
$VPS_SSH_KEY = $null

$envFile = Join-Path $PSScriptRoot "deploy.env.ps1"
if (-not (Test-Path -LiteralPath $envFile)) {
  $envFile = Join-Path (Join-Path (Split-Path $PSScriptRoot -Parent) "frontend") "deploy.env.ps1"
}
if (Test-Path -LiteralPath $envFile) {
  . $envFile
}

if (-not $RemoteBackend) {
  if ($VPS_ROOT -and $VPS_ROOT.Trim()) {
    $root = $VPS_ROOT.Trim().TrimEnd('/').TrimEnd('\')
    $RemoteBackend = "$root/backend"
  }
  elseif ($env:DEPLOY_REMOTE_BACKEND) {
    $RemoteBackend = $env:DEPLOY_REMOTE_BACKEND.Trim()
  }
  else {
    $RemoteBackend = "/var/www/html/recallsatlas/backend"
  }
}

$SshTarget = $null
if ($VPS_HOST) { $SshTarget = $VPS_HOST.Trim() }
if (-not $SshTarget -and $Server -and $User) {
  $SshTarget = "${User}@${Server}"
}
if (-not $SshTarget -and $env:DEPLOY_SSH_HOST -and $env:DEPLOY_SSH_USER) {
  $SshTarget = "$($env:DEPLOY_SSH_USER.Trim())@$($env:DEPLOY_SSH_HOST.Trim())"
}

if (-not $SshTarget) {
  Write-Error "Set VPS_HOST in deploy.env.ps1 (user@host), or pass -Server and -User, or set DEPLOY_SSH_HOST and DEPLOY_SSH_USER."
  exit 1
}

$SshBase = @()
if ($VPS_SSH_KEY) { $SshBase += @("-i", $VPS_SSH_KEY.Trim()) }
elseif ($env:DEPLOY_SSH_IDENTITY) { $SshBase += @("-i", $env:DEPLOY_SSH_IDENTITY) }
if ($env:DEPLOY_SSH_EXTRA) { $SshBase += ($env:DEPLOY_SSH_EXTRA -split '\s+') }

$rb = $RemoteBackend.Replace('\', '/')

function Invoke-RemoteBackendClean {
  # Same pattern as frontend/deploy-next.ps1: one remote shell string (no stdin / no multiline CRLF).
  $bash = 'cd ''' + $rb + "'" + ' && for item in $(ls -A); do case "$item" in node_modules|package-lock.json|package.json|.env) ;; *) rm -rf "$item" ;; esac; done'
  & ssh @SshBase $SshTarget $bash
  if ($LASTEXITCODE -ne 0) { throw "ssh remote clean failed (exit $LASTEXITCODE)" }
}

$skipUpload = @{
  'node_modules'       = $true
  '.git'               = $true
  '.env'               = $true
  'deploy.env.ps1'     = $true
  'deploy-backend.ps1' = $true
}

# Subfolder names to omit when uploading scripts/ or database/ (scp -r would include them otherwise).
$skipScriptsChildren = @{
  'cars' = $true
}
$skipDatabaseChildren = @{
  'cars' = $true
}

Write-Host "Remote clean: $rb on $SshTarget (keeping node_modules, package.json, package-lock.json, .env)"
Invoke-RemoteBackendClean

$items = Get-ChildItem -LiteralPath $PSScriptRoot -Force | Where-Object {
  -not $skipUpload.ContainsKey($_.Name)
}

if (-not $items -or $items.Count -eq 0) {
  throw "Nothing to upload from $($PSScriptRoot)"
}

foreach ($it in $items) {
  $name = $it.Name
  if ($name -eq 'scripts' -and (Test-Path -LiteralPath $it.FullName -PathType Container)) {
    Write-Host "Uploading scripts/ (skipping: $($skipScriptsChildren.Keys -join ', '))..."
    $remoteScripts = "$rb/scripts"
    & ssh @SshBase $SshTarget "mkdir -p '$remoteScripts'"
    if ($LASTEXITCODE -ne 0) { throw "ssh mkdir scripts failed (exit $LASTEXITCODE)" }
    $scriptKids = Get-ChildItem -LiteralPath $it.FullName -Force | Where-Object {
      -not $skipScriptsChildren.ContainsKey($_.Name)
    }
    foreach ($ch in $scriptKids) {
      Write-Host "  -> $($ch.Name)"
      & scp @SshBase -r $ch.FullName "${SshTarget}:${remoteScripts}/"
      if ($LASTEXITCODE -ne 0) { throw "scp scripts/$($ch.Name) failed (exit $LASTEXITCODE)" }
    }
    continue
  }

  if ($name -eq 'database' -and (Test-Path -LiteralPath $it.FullName -PathType Container)) {
    Write-Host "Uploading database/ (skipping: $($skipDatabaseChildren.Keys -join ', '))..."
    $remoteDb = "$rb/database"
    & ssh @SshBase $SshTarget "mkdir -p '$remoteDb'"
    if ($LASTEXITCODE -ne 0) { throw "ssh mkdir database failed (exit $LASTEXITCODE)" }
    $dbKids = Get-ChildItem -LiteralPath $it.FullName -Force | Where-Object {
      -not $skipDatabaseChildren.ContainsKey($_.Name)
    }
    foreach ($ch in $dbKids) {
      Write-Host "  -> $($ch.Name)"
      & scp @SshBase -r $ch.FullName "${SshTarget}:${remoteDb}/"
      if ($LASTEXITCODE -ne 0) { throw "scp database/$($ch.Name) failed (exit $LASTEXITCODE)" }
    }
    continue
  }

  Write-Host "Uploading $name..."
  $src = $it.FullName
  & scp @SshBase -r $src "${SshTarget}:${rb}/"
  if ($LASTEXITCODE -ne 0) { throw "scp $name failed (exit $LASTEXITCODE)" }
}

if (Test-Path -LiteralPath (Join-Path $PSScriptRoot "recallFlow.sh")) {
  Write-Host "Setting execute permission for recallFlow.sh..."
  & ssh @SshBase $SshTarget "chmod +x '$rb/recallFlow.sh'"
  if ($LASTEXITCODE -ne 0) { throw "chmod recallFlow.sh failed (exit $LASTEXITCODE)" }
}

Write-Host "Done."
