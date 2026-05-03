#Requires -Version 5.1
<#
  Local machine -> VPS only (no copy from one server path to another).
  Local: remove .next, npm run build.
  Remote: remove .next, node_modules, next.config.mjs, package.json, package-lock.json;
         upload package.json, package-lock.json, next.config.mjs; npm install;
         sync public/ with rsync --checksum (only missing/changed files; requires rsync on PATH);
         upload .next without build cache or traced node_modules.

  Set DEPLOY_SKIP_PUBLIC_RSYNC=1 to skip the public/ step.
  Set DEPLOY_PUBLIC_RSYNC_VERBOSE=1 to add rsync -v (more log output).
  If rsync is not installed, public/ sync is skipped (see warning); install rsync for incremental uploads.

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

Write-Host "Removing local .next..."
if (Test-Path -LiteralPath ".next") {
  Remove-Item -LiteralPath ".next" -Recurse -Force
}

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

function Format-RsyncSshCommandLine {
  param([string[]]$SshBaseArgs)
  if (-not $SshBaseArgs -or $SshBaseArgs.Count -eq 0) { return "ssh" }
  $parts = New-Object System.Collections.Generic.List[string]
  [void]$parts.Add("ssh")
  foreach ($a in $SshBaseArgs) {
    $t = [string]$a
    if ($t -match '\s') {
      $escaped = ($t -replace '"', '\"')
      [void]$parts.Add('"' + $escaped + '"')
    } else {
      [void]$parts.Add($t)
    }
  }
  return ($parts -join " ")
}

function Invoke-RemoteClean {
  $bash = "rm -rf '$RemotePath/.next' '$RemotePath/node_modules' && rm -f '$RemotePath/next.config.mjs' '$RemotePath/package.json' '$RemotePath/package-lock.json'"
  & ssh @SshBase $SshTarget $bash
  if ($LASTEXITCODE -ne 0) { throw "ssh remote clean failed (exit $LASTEXITCODE)" }
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

if ($env:DEPLOY_SKIP_PUBLIC_RSYNC -ne "1" -and (Test-Path -LiteralPath "public")) {
  $rsyncBin = Get-Command rsync -ErrorAction SilentlyContinue
  if (-not $rsyncBin) {
    Write-Warning 'rsync not found in PATH - skipping incremental public/ sync. Install rsync (cwRsync, Git Bash, etc.) for checksum-based uploads of public/.'
  }
  else {
    $publicSrc = (Resolve-Path (Join-Path $PSScriptRoot "public")).Path
    if (-not $publicSrc.EndsWith([IO.Path]::DirectorySeparatorChar) -and -not $publicSrc.EndsWith("/")) {
      $publicSrc += [IO.Path]::DirectorySeparatorChar
    }
    Write-Host "Ensuring remote public/ directory exists..."
    & ssh @SshBase $SshTarget "mkdir -p '$RemotePath/public'"
    if ($LASTEXITCODE -ne 0) { throw "ssh mkdir public failed (exit $LASTEXITCODE)" }

    $sshExeLine = (Format-RsyncSshCommandLine -SshBaseArgs $SshBase)
    $rsyncArgs = @(
      "--protect-args",
      "-rltzc",
      "--chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r",
      "--partial",
      "-O",
      "-e", $sshExeLine
    )
    if ($env:DEPLOY_PUBLIC_RSYNC_VERBOSE -eq "1") { $rsyncArgs = @("-v") + $rsyncArgs }
    Write-Host 'Syncing public/ to VPS - rsync checksum mode (uploads new or changed files only)...'
    & rsync @rsyncArgs $publicSrc "${SshTarget}:${RemotePath}/public/"
    if ($LASTEXITCODE -ne 0) { throw "rsync public/ failed (exit $LASTEXITCODE)" }
  }
}

Write-Host "Uploading .next production artifacts (excluding .next/cache and .next/node_modules)..."
$tmpNextTar = Join-Path $env:TEMP ("next-deploy-" + [guid]::NewGuid().ToString("N") + ".tar")
try {
  & tar -cf $tmpNextTar --exclude=.next/cache --exclude=.next/node_modules .next
  if ($LASTEXITCODE -ne 0) { throw "tar .next create failed (exit $LASTEXITCODE)" }

  & scp @SshBase $tmpNextTar "${SshTarget}:${RemotePath}/.deploy-next.tar"
  if ($LASTEXITCODE -ne 0) { throw "scp .next tar failed (exit $LASTEXITCODE)" }

  & ssh @SshBase $SshTarget "cd '$RemotePath' && rm -rf .next && tar -xf .deploy-next.tar && rm -f .deploy-next.tar"
  if ($LASTEXITCODE -ne 0) { throw "remote .next extract failed (exit $LASTEXITCODE)" }
} finally {
  if (Test-Path -LiteralPath $tmpNextTar) { Remove-Item -LiteralPath $tmpNextTar -Force }
}

Write-Host "PM2 restart $Pm2App on $SshTarget..."
& ssh @SshBase $SshTarget "pm2 restart $Pm2App"
if ($LASTEXITCODE -ne 0) { throw "ssh pm2 restart failed (exit $LASTEXITCODE)" }

Write-Host "Done."
