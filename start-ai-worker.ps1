$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $repoRoot ".env.worker"
$exampleFile = Join-Path $repoRoot ".env.worker.example"

function Get-WorkerEnvValue {
  param([string]$Name, [string]$DefaultValue)

  if (-not (Test-Path -LiteralPath $envFile)) {
    return $DefaultValue
  }

  $line = Get-Content -LiteralPath $envFile | Where-Object {
    $_ -match "^\s*$Name\s*="
  } | Select-Object -First 1

  if (-not $line) {
    return $DefaultValue
  }

  $value = ($line -split "=", 2)[1].Trim().Trim('"').Trim("'")
  if ($value) {
    return $value
  }

  return $DefaultValue
}

if (-not (Test-Path -LiteralPath $envFile)) {
  Copy-Item -LiteralPath $exampleFile -Destination $envFile
  Write-Host ""
  Write-Host "Created .env.worker from .env.worker.example."
  Write-Host "Open .env.worker, paste DATABASE_URL, then run this script again."
  Write-Host ""
  Read-Host "Press Enter to close"
  exit 1
}

$env:AI_PROVIDER = "ollama"
$env:AI_MODEL = Get-WorkerEnvValue -Name "AI_MODEL" -DefaultValue "dolphin3"
$env:OLLAMA_BASE_URL = Get-WorkerEnvValue -Name "OLLAMA_BASE_URL" -DefaultValue "http://localhost:11434"
$env:DATABASE_URL = Get-WorkerEnvValue -Name "DATABASE_URL" -DefaultValue ""

# If ollama is not in the system PATH, check the default local installation path and add it on the fly
if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
  $localOllamaPath = Join-Path $env:LOCALAPPDATA "Programs\Ollama"
  if (Test-Path (Join-Path $localOllamaPath "ollama.exe")) {
    $env:PATH += ";$localOllamaPath"
  }
}

# If still not found, automatically install Ollama via winget
if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
  Write-Host "Ollama is not installed. Installing it automatically via winget..."
  winget install --id Ollama.Ollama --accept-source-agreements --accept-package-agreements
  
  # Try to detect and load it again after installation completes
  $localOllamaPath = Join-Path $env:LOCALAPPDATA "Programs\Ollama"
  if (Test-Path (Join-Path $localOllamaPath "ollama.exe")) {
    $env:PATH += ";$localOllamaPath"
  }
}

if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
  Write-Host "Ollama installation failed or command not found. Please install it manually from: https://ollama.com"
  Read-Host "Press Enter to close"
  exit 1
}

try {
  Invoke-RestMethod -Uri "$env:OLLAMA_BASE_URL/api/tags" -Method Get -TimeoutSec 3 | Out-Null
} catch {
  Write-Host "Starting Ollama..."
  Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
  Start-Sleep -Seconds 5
}

Write-Host "Pulling/checking model $env:AI_MODEL..."
ollama pull $env:AI_MODEL

Write-Host ""
Write-Host "Starting KinkTube AI worker. Press Ctrl+C to stop safely."
Write-Host ""

$backendDir = Join-Path $repoRoot "backend"
Push-Location $backendDir
try {
  go run ./cmd/ai-worker
} finally {
  Pop-Location
}
