@echo off
setlocal enabledelayedexpansion
title FYJ Channel Remote - Gateway Kendali & Pemantauan Lab
color 0B

echo ===================================================================
echo     _____ __   __     _    _____ _   _    _    _   _ _   _ _____ _     
echo    ^|  ___^|\ \ / /    ^| ^|  / ____^| ^| ^| ^|  / \  ^| \ ^| ^| \ ^| ^| ____^| ^|    
echo    ^| ^|_    \ V /  _  ^| ^| ^| ^|    ^| ^|_^| ^| / _ \ ^|  \^| ^|  \^| ^|  _^| ^| ^|    
echo    ^|  _^|    ^| ^|  ^| ^|_^| ^| ^| ^|___ ^|  _  ^|/ ___ \^| ^|\  ^| ^|\  ^| ^|___^| ^|___ 
echo    ^|_^|      ^|_^|   \___/   \_____^|_^| ^|_/_/   \_\_^| \_^|_^| \_^|_____^|_____^|
echo                        REMOTE LAB CONTROLLER
echo ===================================================================
echo   Sistem Gateway Kendali & Pemantauan Lab Komputer (Real Hardware)
echo ===================================================================
echo.

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

:: 1. Jika Python terpasang, gunakan Python Launcher untuk keandalan maksimal
where python >nul 2>nul
if %errorlevel% equ 0 (
    if exist "%SCRIPT_DIR%launcher.py" (
        echo [*] Python terdeteksi. Memulai via Python Service Manager...
        python "%SCRIPT_DIR%launcher.py"
        exit /b %errorlevel%
    )
)

:: 2. Fallback Pemeriksaan Node.js & NPM
echo [*] Memeriksa instalasi Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Node.js tidak ditemukan di sistem.
    echo [*] Mencoba memasang Node.js LTS otomatis via Windows Package Manager...
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    if %errorlevel% neq 0 (
        echo [!] Gagal memasang otomatis. Silakan pasang Node.js manual dari: https://nodejs.org
        pause
        exit /b 1
    )
    echo [*] Node.js berhasil dipasang. Memperbarui environment...
    call refreshenv >nul 2>nul
)

:: 3. Pemeriksaan Dependensi Backend
if not exist "%SCRIPT_DIR%backend\.env" (
    if exist "%SCRIPT_DIR%.env.example" (
        copy /y "%SCRIPT_DIR%.env.example" "%SCRIPT_DIR%backend\.env" >nul
        echo [+] Berkas backend\.env dibuat dari .env.example
    ) else (
        (
            echo PORT=4000
            echo NODE_ENV=development
            echo JWT_SECRET=fyj_remote_secret_2026
            echo DATABASE_URL=file:./dev.db
        ) > "%SCRIPT_DIR%backend\.env"
        echo [+] Berkas backend\.env berhasil diinisialisasi
    )
)

if not exist "%SCRIPT_DIR%backend\node_modules\" (
    echo [*] Memasang dependensi backend (npm install)...
    cd /d "%SCRIPT_DIR%backend"
    call npm.cmd install
    cd /d "%SCRIPT_DIR%"
)

if not exist "%SCRIPT_DIR%backend\prisma\dev.db" (
    echo [*] Menginisialisasi basis data SQLite (prisma db push)...
    cd /d "%SCRIPT_DIR%backend"
    call npx.cmd prisma db push
    cd /d "%SCRIPT_DIR%"
)

:: 4. Pemeriksaan Dependensi Frontend
if not exist "%SCRIPT_DIR%frontend\node_modules\" (
    echo [*] Memasang dependensi frontend (npm install)...
    cd /d "%SCRIPT_DIR%frontend"
    call npm.cmd install
    cd /d "%SCRIPT_DIR%"
)

:: 5. Pembersihan Port Lama (3000 & 4000)
echo [*] Memeriksa port layanan 3000 dan 4000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r ":3000.*LISTENING"') do (
    if "%%a" neq "0" (
        taskkill /F /PID %%a >nul 2>&1
        echo [*] Menghentikan proses lama pada port 3000 (PID: %%a)
    )
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r ":4000.*LISTENING"') do (
    if "%%a" neq "0" (
        taskkill /F /PID %%a >nul 2>&1
        echo [*] Menghentikan proses lama pada port 4000 (PID: %%a)
    )
)

:: 6. Menjalankan Server Backend & Frontend
echo.
echo [*] Menjalankan Backend Server (Port 4000)...
cd /d "%SCRIPT_DIR%backend"
start "FYJ-Backend-Service" /min cmd /c "npm.cmd run dev"

echo [*] Menjalankan Frontend Dev Server (Port 3000)...
cd /d "%SCRIPT_DIR%frontend"
start "FYJ-Frontend-Service" /min cmd /c "npm.cmd run dev"

cd /d "%SCRIPT_DIR%"

echo.
echo [*] Menunggu server web siap merespons...
:WAIT_LOOP
timeout /t 2 /nobreak >nul
powershell -Command "$res = try { (Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 2).StatusCode } catch { 0 }; if ($res -eq 200 -or $res -eq 304) { exit 0 } else { exit 1 }" >nul 2>&1
if %errorlevel% neq 0 (
    set /a RETRY+=1
    if !RETRY! leq 15 goto WAIT_LOOP
)

echo.
echo ===================================================================
echo   APLIKASI WEB FYJ CHANNEL REMOTE SIAP DIGUNAKAN!
echo   Aplikasi Web   : http://localhost:3000
echo   REST API Server: http://localhost:4000/api/v1
echo -------------------------------------------------------------------
echo   Kredensial Default Masuk:
echo     Nama Pengguna : admin
echo     Kata Sandi    : admin123
echo ===================================================================
echo.
echo [*] Membuka http://localhost:3000 di browser Anda...
start http://localhost:3000

echo.
echo ===================================================================
echo   PETUNJUK KONTROL:
echo   - Tekan tombol [Q] lalu [ENTER] untuk menghentikan aplikasi.
echo ===================================================================
echo.

:INTERACT
set /p USER_INPUT="FYJ-Remote (Tekan Q untuk keluar) > "
if /i "%USER_INPUT%"=="q" goto STOP_ALL
if /i "%USER_INPUT%"=="quit" goto STOP_ALL
if /i "%USER_INPUT%"=="exit" goto STOP_ALL
if /i "%USER_INPUT%"=="b" (
    start http://localhost:3000
    goto INTERACT
)
goto INTERACT

:STOP_ALL
echo.
echo [*] Menghentikan seluruh proses backend dan frontend...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r ":3000.*LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r ":4000.*LISTENING"') do taskkill /F /PID %%a >nul 2>&1
echo [OK] Aplikasi telah dihentikan secara bersih.
timeout /t 2 /nobreak >nul
exit /b 0
