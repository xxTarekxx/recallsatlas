#Requires -Version 5.1
<#
  Local: remove .next, npm run build.
  Remote: remove .next, node_modules, next.config.mjs, package.json, package-lock.json;
         upload package.json, package-lock.json, next.config.mjs; npm install; upload .next.

  Preferred: create deploy.env.ps1 (see deploy.env.ps1.example) with:
    $VPS_HOST = "user@host"
    $VPS_ROOT = "/var/www/html/recallsatlas"
    optional: $VPS_SSH_KEY = "C:\path\to\private_key"
    optional: $VPS_PM2_APP = "recallsatlas"   # pm2 process name to restart after upload

  Overrides: -Server / -User, or DEPLOY_SSH_* env vars (see script header in repo history).
#>
[CmdletBinding()]
param(
  [string] $Server = $null,
  [string] $User = $null,
  [string] $RemotePath = $null
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$VPS_HOST = $null
$VPS_ROOT = $null
$VPS_SSH_KEY = $null
$VPS_PM2_APP = $null
$envFile = Join-Path $PSScriptRoot "deploy.env.ps1"
if (Test-Path -LiteralPath $envFile) {
  . $envFile
}
$Pm2App = $(if ($VPS_PM2_APP -and $VPS_PM2_APP.Trim()) { $VPS_PM2_APP.Trim() } else { "recallsatlas" })

# No Set-StrictMode: it breaks `npm` / .cmd on Windows PowerShell 5.1 (PropertyNotFoundStrict on .Statement).

if (-not $RemotePath) {
  if ($VPS_ROOT) { $RemotePath = $VPS_ROOT.Trim() }
  elseif ($env:DEPLOY_REMOTE_PATH) { $RemotePath = $env:DEPLOY_REMOTE_PATH }
  else { $RemotePath = "/var/www/html/recallsatlas" }
}

$SshTarget = $null
if ($VPS_HOST) {
  $SshTarget = $VPS_HOST.Trim()
}
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

function Invoke-RemoteClean {
  $bash = "rm -rf '$RemotePath/.next' '$RemotePath/node_modules' && rm -f '$RemotePath/next.config.mjs' '$RemotePath/package.json' '$RemotePath/package-lock.json'"
  & ssh @SshBase $SshTarget $bash
  if ($LASTEXITCODE -ne 0) { throw "ssh remote clean failed (exit $LASTEXITCODE)" }
}

Write-Host "Removing local .next..."
if (Test-Path -LiteralPath ".next") {
  Remove-Item -LiteralPath ".next" -Recurse -Force
}

Write-Host "npm run build..."
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not (Test-Path -LiteralPath ".next")) {
  throw "Build finished but .next folder is missing."
}
if (-not (Test-Path -LiteralPath "next.config.mjs")) {
  throw "next.config.mjs not found in frontend folder."
}
if (-not (Test-Path -LiteralPath "package.json")) {
  throw "package.json not found in frontend folder."
}
if (-not (Test-Path -LiteralPath "package-lock.json")) {
  throw "package-lock.json not found in frontend folder. Run npm install locally first."
}

Write-Host "Remote clean (.next, node_modules, next.config.mjs, package.json, package-lock.json): $RemotePath on $SshTarget"
Invoke-RemoteClean

Write-Host "Uploading package.json and package-lock.json..."
& scp @SshBase package.json package-lock.json "${SshTarget}:${RemotePath}/"
if ($LASTEXITCODE -ne 0) { throw "scp package files failed (exit $LASTEXITCODE)" }

Write-Host "Uploading next.config.mjs..."
& scp @SshBase next.config.mjs "${SshTarget}:${RemotePath}/"
if ($LASTEXITCODE -ne 0) { throw "scp next.config.mjs failed (exit $LASTEXITCODE)" }

Write-Host "npm install on server (omit devDependencies)..."
& ssh @SshBase $SshTarget "cd '$RemotePath' && npm install --omit=dev"
if ($LASTEXITCODE -ne 0) { throw "ssh npm install failed (exit $LASTEXITCODE)" }

Write-Host "Uploading .next (this may take a while)..."
& scp @SshBase -r .next "${SshTarget}:${RemotePath}/"
if ($LASTEXITCODE -ne 0) { throw "scp .next failed (exit $LASTEXITCODE)" }

Write-Host "PM2 restart $Pm2App on $SshTarget..."
& ssh @SshBase $SshTarget "pm2 restart $Pm2App"
if ($LASTEXITCODE -ne 0) { throw "ssh pm2 restart failed (exit $LASTEXITCODE)" }

Write-Host "Done."
