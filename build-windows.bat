@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo ==========================================
echo       FUSION DESKTOP 0.13.1 - BUILD
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed.
  echo Install the current Node.js LTS from https://nodejs.org/
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found. Reinstall Node.js with npm enabled.
  pause
  exit /b 1
)

echo [1/3] Installing build dependencies...
call npm install --no-audit
if errorlevel 1 (
  echo [ERROR] Dependency installation failed.
  pause
  exit /b 1
)

echo.
echo [2/3] Building Windows x64 installer...
call npm run build:win
if errorlevel 1 (
  echo [ERROR] Installer build failed. See messages above.
  pause
  exit /b 1
)

echo.
echo [3/3] Build complete.
echo Installer location: dist\
explorer "%~dp0dist"
pause
