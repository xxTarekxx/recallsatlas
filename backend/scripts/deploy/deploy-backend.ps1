#Requires -Version 5.1
<#
  Deploy backend from THIS machine to the VPS (no server-side repo copy).
  Uses tar over ssh (OpenSSH).   Config (later files override earlier):
    1) backend/deploy.env.ps1 — optional shared defaults
    2) deploy-backend.env.ps1 next to this script — wins over (1); see deploy-backend.env.ps1.example
  Variables: VPS_HOST, VPS_ROOT (remote backend path), optional VPS_SSH_KEY, VPS_PM2_APP.
#>
[CmdletBinding()]
param(
  [string] $Server = $null,
  [string] $User = $null,
  [string] $RemotePath = $null
)

$ErrorActionPreference = "Stop"
$ScriptDir = $PSScriptRoot
$BackendRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path

$VPS_HOST = $null
$VPS_ROOT = $null
$VPS_SSH_KEY = $null
$VPS_PM2_APP = $null
foreach ($envPath in @(
    (Join-Path $BackendRoot "deploy.env.ps1"),
    (Join-Path $ScriptDir "deploy-backend.env.ps1")
  )) {
  if (Test-Path -LiteralPath $envPath) {
    . $envPath
  }
}
$Pm2App = $(if ($VPS_PM2_APP -and $VPS_PM2_APP.Trim()) { $VPS_PM2_APP.Trim() } else { "recallsatlas" })

if (-not $RemotePath) {
  if ($VPS_ROOT) { $RemotePath = $VPS_ROOT.Trim() }
  elseif ($env:DEPLOY_REMOTE_BACKEND) { $RemotePath = $env:DEPLOY_REMOTE_BACKEND.Trim() }
  else { $RemotePath = "/var/www/html/recallsatlas/backend" }
}

$SshTarget = $null
if ($VPS_HOST) { $SshTarget = $VPS_HOST.Trim() }
if (-not $SshTarget -and $Server -and $User) { $SshTarget = "${User}@${Server}" }
if (-not $SshTarget -and $env:DEPLOY_SSH_HOST -and $env:DEPLOY_SSH_USER) {
  $SshTarget = "$($env:DEPLOY_SSH_USER.Trim())@$($env:DEPLOY_SSH_HOST.Trim())"
}

if (-not $SshTarget) {
  Write-Error "Set VPS_HOST in deploy-backend.env.ps1 (next to this script) or backend/deploy.env.ps1, or use -Server and -User, or DEPLOY_SSH_HOST and DEPLOY_SSH_USER. Copy deploy-backend.env.ps1.example -> deploy-backend.env.ps1."
  exit 1
}

$hostPart = ($SshTarget -split "@", 2)[-1]
if ($SshTarget -eq "user@your-vps.example" -or $hostPart -eq "your-vps.example" -or $hostPart -eq "example.com") {
  Write-Error "VPS_HOST is still an example placeholder ($SshTarget). Edit deploy-backend.env.ps1 and set your real user@hostname-or-IP."
  exit 1
}

if (-not (Test-Path -LiteralPath (Join-Path $BackendRoot "package.json"))) {
  throw "package.json not found under $BackendRoot"
}

$SshBase = @()
if ($VPS_SSH_KEY) { $SshBase += @("-i", $VPS_SSH_KEY.Trim()) }
elseif ($env:DEPLOY_SSH_IDENTITY) { $SshBase += @("-i", $env:DEPLOY_SSH_IDENTITY) }

Write-Host "Local backend:  $BackendRoot"
Write-Host "Remote target:  ${SshTarget}:$RemotePath"
Write-Host "PM2 app:        $Pm2App"

Write-Host "Removing remote backend directory (full reset), then recreating..."
& ssh @SshBase $SshTarget "rm -rf '$RemotePath' && mkdir -p '$RemotePath'"
if ($LASTEXITCODE -ne 0) { throw "ssh remote wipe failed (exit $LASTEXITCODE)" }

Write-Host "Uploading backend (excluding node_modules, .git)..."
$tmpTar = Join-Path $env:TEMP ("backend-deploy-" + [guid]::NewGuid().ToString("N") + ".tar")
Push-Location $BackendRoot
try {
  & tar -cf $tmpTar --exclude=node_modules --exclude=.git .
  if ($LASTEXITCODE -ne 0) { throw "tar create failed (exit $LASTEXITCODE)" }
} finally {
  Pop-Location
}
try {
  & scp @SshBase $tmpTar "${SshTarget}:${RemotePath}/.deploy-backend.tar"
  if ($LASTEXITCODE -ne 0) { throw "scp tar upload failed (exit $LASTEXITCODE)" }
  & ssh @SshBase $SshTarget "cd '$RemotePath' && tar -xf .deploy-backend.tar && rm -f .deploy-backend.tar"
  if ($LASTEXITCODE -ne 0) { throw "remote tar extract failed (exit $LASTEXITCODE)" }
} finally {
  if (Test-Path -LiteralPath $tmpTar) { Remove-Item -LiteralPath $tmpTar -Force }
}

Write-Host "chmod deploy scripts..."
& ssh @SshBase $SshTarget "cd '$RemotePath' && chmod +x scripts/flows/*.sh scripts/deploy/*.sh 2>/dev/null || true"
if ($LASTEXITCODE -ne 0) { throw "ssh chmod failed (exit $LASTEXITCODE)" }

Write-Host "npm install --omit=dev on server..."
& ssh @SshBase $SshTarget "cd '$RemotePath' && rm -rf node_modules && npm install --omit=dev"
if ($LASTEXITCODE -ne 0) { throw "ssh npm install failed (exit $LASTEXITCODE)" }

Write-Host "PM2 restart $Pm2App..."
& ssh @SshBase $SshTarget "pm2 restart $Pm2App"
if ($LASTEXITCODE -ne 0) { throw "ssh pm2 restart failed (exit $LASTEXITCODE)" }

Write-Host "Done."
