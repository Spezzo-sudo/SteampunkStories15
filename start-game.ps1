Param(
  [switch]$SkipInstall,
  [int]$Port = 5173,
  [switch]$HostAll
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

$npmExecutable = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source

if (-not $npmExecutable) {
  throw 'npm.cmd wurde nicht gefunden. Bitte stelle sicher, dass Node.js korrekt installiert ist und sich npm.cmd im PATH befindet.'
}

function Invoke-Npm {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  & $npmExecutable @Arguments
}

Push-Location $projectRoot
try {
  if ($SkipInstall) {
    Write-Host 'Skipping dependency installation as requested.' -ForegroundColor DarkGray
  } elseif (-not (Test-Path 'node_modules')) {
    Write-Host 'Installing project dependencies...' -ForegroundColor Cyan
    Invoke-Npm -Arguments @('install', '--no-fund', '--no-audit')
  } else {
    Write-Host 'Dependencies already installed; continuing.' -ForegroundColor DarkGray
  }

  $viteArgs = @('--open')
  if ($Port -ne 5173) {
    $viteArgs += @('--port', $Port)
  }
  if ($HostAll) {
    $viteArgs += '--host'
  }

  $npmArgs = @('run', 'dev', '--') + $viteArgs

  Write-Host "Starting Vite dev server on http://localhost:$Port ..." -ForegroundColor Cyan
  Invoke-Npm -Arguments $npmArgs
}
finally {
  Pop-Location
}
