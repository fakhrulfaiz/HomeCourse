@echo off
REM Video Learning Platform - Docker Startup Script (Batch)
REM This script starts ALL services using Docker Compose

color 0B
echo ========================================
echo Video Learning Platform - Docker Startup
echo ========================================
echo.

REM Check if Docker is running
echo [1/2] Checking Docker...
docker info >nul 2>&1
if errorlevel 1 (
    color 0C
    echo X Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)
echo OK Docker is running
echo.

REM Start all services with Docker Compose
echo [2/2] Starting all services with Docker Compose...
echo   This may take a few minutes on first run (building images)...
echo.

docker-compose up --build -d

if errorlevel 1 (
    color 0C
    echo X Failed to start services
    pause
    exit /b 1
)

echo.
color 0A
echo ========================================
echo OK All services started successfully!
echo ========================================
echo.
color 0F
echo Services:
echo   Frontend:   http://localhost:5173
echo   Backend:    http://localhost:3000
echo   PostgreSQL: localhost:5433
echo   Redis:      localhost:6379
echo.
echo Demo Login:
echo   Email:    demo@example.com
echo   Password: demo123
echo.
echo Useful commands:
echo   View logs:    docker-compose logs -f
echo   Stop all:     docker-compose down
echo   Restart:      docker-compose restart
echo.
pause
