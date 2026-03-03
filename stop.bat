@echo off
REM Video Learning Platform - Stop Script (Batch)
REM This script stops all Docker containers

color 0B
echo ========================================
echo Video Learning Platform - Shutdown
echo ========================================
echo.

REM Get the script directory
cd /d "%~dp0"

echo Stopping Docker containers...
docker-compose down

if errorlevel 1 (
    color 0C
    echo X Failed to stop Docker containers
) else (
    color 0A
    echo √ Docker containers stopped successfully
)

echo.
color 07
echo Note: Backend and Frontend servers must be stopped manually
echo       (Close their terminal windows or press Ctrl+C)
echo.
pause
