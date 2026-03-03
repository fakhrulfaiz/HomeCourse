# Stop and Remove All Containers and Volumes (PowerShell)
# This ensures a fresh database on restart

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Stopping and Removing All Services" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "WARNING: This will DELETE all database data!" -ForegroundColor Red
Write-Host ""

$confirmation = Read-Host "Are you sure? (yes/no)"
if ($confirmation -ne 'yes') {
    Write-Host "Cancelled." -ForegroundColor Gray
    exit 0
}

Write-Host ""
Write-Host "Stopping containers..." -ForegroundColor Yellow
docker-compose down -v

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "OK All containers and volumes removed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "To start fresh, run: .\start.ps1" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "X Failed to remove containers" -ForegroundColor Red
}
