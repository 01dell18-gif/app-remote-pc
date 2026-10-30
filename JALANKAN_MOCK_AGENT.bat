@echo off
title FYJ Channel Remote - Mock Agent Simulator
color 0A
chcp 65001 >nul
cd /d "%~dp0"

echo =====================================================================
echo       SIMULATOR WORKSTATION KLIEN (MOCK AGENT LISTENER)
echo =====================================================================
echo  Skrip ini mendengarkan sinyal Wake-on-LAN (UDP Port 7 & 9)
echo  dan merespons probe heartbeat jaringan.
echo =====================================================================
echo.

where node >nul 2>nul
if %errorlevel% equ 0 (
    node mock-lab\mock_agent.js
    pause
    exit /b
)

where python >nul 2>nul
if %errorlevel% equ 0 (
    python mock-lab\mock_agent.py
    pause
    exit /b
)

echo [GALAT] Node.js atau Python tidak ditemukan di komputer ini!
pause
