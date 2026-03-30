$ErrorActionPreference = "Stop"

function New-TokenArenaSecret {
  $secretBytes = New-Object byte[] 32
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()

  try {
    $rng.GetBytes($secretBytes)
  } finally {
    if ($null -ne $rng) {
      $rng.Dispose()
    }
  }

  return [Convert]::ToBase64String($secretBytes)
}

Write-Host "tokenarena Quick Start"
Write-Host ""

$envPath = Join-Path (Get-Location) ".env"
$envExamplePath = Join-Path (Get-Location) ".env.example"
$createdEnvFile = $false

if (-not (Test-Path $envPath)) {
  Write-Host "Creating .env file from .env.example..."
  Copy-Item $envExamplePath $envPath
  $createdEnvFile = $true
}

$content = Get-Content $envPath -Raw
if ($content.Contains("postgresql://postgres:postgres@localhost:5432/tokens_burned")) {
  $content = $content.Replace(
    "postgresql://postgres:postgres@localhost:5432/tokens_burned",
    "postgresql://postgres:postgres@db:5432/tokens_burned"
  )
  [System.IO.File]::WriteAllText($envPath, $content)

  Write-Host "Updated DATABASE_URL to use the docker-compose db service"
  Write-Host ""
}

if (Test-Path $envPath) {
  $content = Get-Content $envPath -Raw
}

if ($content.Contains("your-secret-key-here")) {
  $secret = New-TokenArenaSecret
  $content = $content.Replace("your-secret-key-here", $secret)
  [System.IO.File]::WriteAllText($envPath, $content)

  Write-Host "Generated BETTER_AUTH_SECRET"
  Write-Host ""
}

if ($createdEnvFile) {
  Write-Host "Please edit .env to configure:"
  Write-Host "  - BETTER_AUTH_URL: Your public URL (default: http://localhost:3000)"
  Write-Host "  - DATABASE_URL: Your database connection (default: docker-compose postgres)"
  Write-Host ""
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker is not installed. Please install Docker first."
}

docker compose version | Out-Null

Write-Host "Starting services with Docker Compose..."
docker compose up -d

Write-Host ""
Write-Host "Waiting for services to be ready..."
Start-Sleep -Seconds 5

$requestParams = @{
  Uri = "http://localhost:3000"
  TimeoutSec = 5
}

if ($PSVersionTable.PSVersion.Major -lt 6) {
  $requestParams.UseBasicParsing = $true
}

for ($i = 1; $i -le 30; $i++) {
  try {
    Invoke-WebRequest @requestParams | Out-Null
    Write-Host "Web service is ready!"
    break
  } catch {
    if ($i -eq 30) {
      Write-Host "Web service might still be starting. Check logs: docker compose logs web"
    }
    Start-Sleep -Seconds 2
  }
}

Write-Host ""
Write-Host "Setup complete!"
Write-Host ""
Write-Host "Open your browser: http://localhost:3000"
Write-Host ""
Write-Host "Useful commands:"
Write-Host "  View logs:    docker compose logs -f"
Write-Host "  Stop:         docker compose down"
Write-Host "  Update:       docker compose pull && docker compose up -d"
