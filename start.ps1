# Video Learning Platform - Docker Startup Script (PowerShell)
# This script starts ALL services using Docker Compose

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Video Learning Platform - Docker Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get the script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Check if Docker is running
Write-Host "[1/2] Checking Docker..." -ForegroundColor Yellow
try {
    docker info | Out-Null
    Write-Host "OK Docker is running" -ForegroundColor Green
} catch {
    Write-Host "X Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    exit 1
}

# Start all services with Docker Compose
Write-Host ""
Write-Host "[2/2] Starting all services with Docker Compose..." -ForegroundColor Yellow
Write-Host "  This may take a few minutes on first run (building images)..." -ForegroundColor Gray
Write-Host ""

docker-compose up --build -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "X Failed to start services" -ForegroundColor Red
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "OK All services started successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services:" -ForegroundColor White
Write-Host "  Frontend:   http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Backend:    http://localhost:3000" -ForegroundColor Cyan
Write-Host "  PostgreSQL: localhost:5433" -ForegroundColor Cyan
Write-Host "  Redis:      localhost:6379" -ForegroundColor Cyan
Write-Host ""
Write-Host "Demo Login:" -ForegroundColor White
Write-Host "  Email:    demo@example.com" -ForegroundColor Cyan
Write-Host "  Password: demo123" -ForegroundColor Cyan
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor White
Write-Host "  View logs:    docker-compose logs -f" -ForegroundColor Gray
Write-Host "  Stop all:     docker-compose down" -ForegroundColor Gray
Write-Host "  Restart:      docker-compose restart" -ForegroundColor Gray
Write-Host ""
