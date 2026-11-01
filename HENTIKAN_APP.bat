@echo off
title FYJ Channel Remote - Penghenti Layanan
color 0C
chcp 65001 >nul
cd /d "%~dp0"

echo =====================================================================
echo          🛑 MENGHENTIKAN LAYANAN FYJ CHANNEL REMOTE 🛑
echo =====================================================================
echo.

echo Menghentikan proses yang berjalan pada Port 4000 (Backend)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr LISTENING ^| findstr :4000') do (
    taskkill /F /PID %%a >nul 2>nul
)

echo Menghentikan proses yang berjalan pada Port 3000 (Frontend)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr LISTENING ^| findstr :3000') do (
    taskkill /F /PID %%a >nul 2>nul
)

echo.
echo =====================================================================
echo  ✅ Seluruh server backend dan frontend berhasil dihentikan.
echo =====================================================================
pause
