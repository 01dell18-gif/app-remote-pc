@echo off
title FYJ Channel Remote - Auto Installer & Launcher
color 0B
chcp 65001 >nul
cd /d "%~dp0"

echo =====================================================================
echo          🌐 FYJ CHANNEL REMOTE - AUTO SETUP & LAUNCHER 🖥️
echo =====================================================================
echo.

:: -----------------------------------------------------------------------
:: 1. Pemeriksaan dan Instalasi Otomatis Node.js (jika belum terpasang)
:: -----------------------------------------------------------------------
echo [1/6] Memeriksa ketersediaan runtime Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [PERINGATAN] Node.js belum terdeteksi di sistem ini.
    echo [INFO] Memulai proses instalasi otomatis Node.js LTS...
    echo.
    
    :: Cek apakah winget tersedia
    where winget >nul 2>nul
    if %errorlevel% equ 0 (
        echo [INFO] Menginstal Node.js melalui Windows Package Manager (winget)...
        winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    ) else (
        echo [INFO] Mengunduh installer resmi Node.js LTS (MSI)...
        where curl.exe >nul 2>nul
        if %errorlevel% equ 0 (
            curl.exe -L -o "%TEMP%\nodejs_installer.msi" "https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi"
        ) else (
            powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi', '$env:TEMP\nodejs_installer.msi')"
        )
        
        if exist "%TEMP%\nodejs_installer.msi" (
            echo [INFO] Memasang Node.js ke sistem secara senyap (silent installation)...
            msiexec /i "%TEMP%\nodejs_installer.msi" /qn /norestart
            timeout /t 8 /nobreak >nul
            del "%TEMP%\nodejs_installer.msi" >nul 2>nul
        ) else (
            color 0C
            echo [GALAT] Gagal mengunduh installer Node.js otomatis.
            echo Silakan unduh manual dari: https://nodejs.org/
            pause
            exit /b 1
        )
    )

    :: Refresh PATH environment variable untuk sesi CMD ini
    set "PATH=%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%APPDATA%\npm;%LOCALAPPDATA%\Programs\node;%PATH%"
)

:: Verifikasi ulang Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    :: Coba periksa lokasi default instalasi Node.js jika PATH belum ter-update
    if exist "%ProgramFiles%\nodejs\node.exe" (
        set "PATH=%ProgramFiles%\nodejs;%APPDATA%\npm;%PATH%"
    ) else (
        color 0C
        echo [GALAT] Node.js belum terdeteksi setelah instalasi.
        echo Mohon tutup jendela ini dan jalankan kembali skrip ini agar PATH diperbarui oleh Windows.
        pause
        exit /b 1
    )
)

echo [OK] Node.js aktif:
node -v
echo.

:: -----------------------------------------------------------------------
:: 2. Persiapan File Konfigurasi Lingkungan (Environment Config)
:: -----------------------------------------------------------------------
echo [2/6] Memeriksa konfigurasi backend (.env)...
if not exist "backend\.env" (
    echo [INFO] Membuat file backend\.env dari template .env.example...
    copy ".env.example" "backend\.env" >nul
)
echo [OK] File backend\.env siap.
echo.

:: -----------------------------------------------------------------------
:: 3. Pemeriksaan & Instalasi Dependensi Backend
:: -----------------------------------------------------------------------
echo [3/6] Memeriksa dependensi backend...
if not exist "backend\node_modules\" (
    echo [INFO] Menginstal paket pustaka backend (npm install)...
    cd backend
    call npm.cmd install --legacy-peer-deps --no-audit --no-fund
    cd ..
    echo [OK] Dependensi backend berhasil dipasang.
) else (
    echo [OK] Dependensi backend sudah terpasang.
)
echo.

:: -----------------------------------------------------------------------
:: 4. Inisialisasi Basis Data Prisma & Data Awal (Seed)
:: -----------------------------------------------------------------------
echo [4/6] Memeriksa basis data SQLite & skema Prisma...
if not exist "backend\dev.db" (
    echo [INFO] Menyiapkan basis data awal SQLite dan akun bawaan...
    cd backend
    call npx.cmd prisma generate
    call npx.cmd prisma db push
    call npm.cmd run prisma:seed
    cd ..
    echo [OK] Basis data berhasil diinisialisasi dan data awal telah ditanam.
) else (
    echo [OK] Basis data backend\dev.db sudah siap.
)
echo.

:: -----------------------------------------------------------------------
:: 5. Pemeriksaan & Instalasi Dependensi Frontend
:: -----------------------------------------------------------------------
echo [5/6] Memeriksa dependensi frontend...
if not exist "frontend\node_modules\" (
    echo [INFO] Menginstal paket pustaka frontend (npm install)...
    cd frontend
    call npm.cmd install --legacy-peer-deps --no-audit --no-fund
    cd ..
    echo [OK] Dependensi frontend berhasil dipasang.
) else (
    echo [OK] Dependensi frontend sudah terpasang.
)
echo.

:: -----------------------------------------------------------------------
:: 6. Pembersihan Port & Menjalankan Aplikasi
:: -----------------------------------------------------------------------
echo [6/6] Memeriksa ketersediaan port jaringan (4000 dan 3000)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr LISTENING ^| findstr :4000') do (
    echo [INFO] Membebaskan port 4000 (PID: %%a)...
    taskkill /F /PID %%a >nul 2>nul
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr LISTENING ^| findstr :3000') do (
    echo [INFO] Membebaskan port 3000 (PID: %%a)...
    taskkill /F /PID %%a >nul 2>nul
)

echo.
echo =====================================================================
echo  Memulai layanan Server Backend dan Dasbor Frontend...
echo =====================================================================

:: Jalankan Backend Server pada jendela CMD terpisah
start "FYJ Remote - Backend Server (Port 4000)" cmd /k "cd /d "%~dp0backend" && npm.cmd run dev"

:: Tunggu 3 detik agar backend REST API & WebSocket siap
echo Menunggu inisialisasi Backend Gateway...
timeout /t 3 /nobreak >nul

:: Jalankan Frontend Dev Server pada jendela CMD terpisah
start "FYJ Remote - Frontend UI (Port 3000)" cmd /k "cd /d "%~dp0frontend" && npm.cmd run dev"

:: Tunggu 2 detik lalu buka browser secara otomatis
echo Membuka peramban web (browser)...
timeout /t 2 /nobreak >nul
start http://localhost:3000/

echo.
echo =====================================================================
echo  ✅ APLIKASI TELAH BERJALAN DENGAN SUKSES!
echo =====================================================================
echo  - Dasbor Web (Lokal)  : http://localhost:3000
echo  - Backend REST API    : http://localhost:4000/api/v1
echo  - Health Check API    : http://localhost:4000/api/v1/health
echo  - WebSocket Gateway   : ws://localhost:4000/api/v1/tunnel/remote
echo.
echo  Kredensial Akun Bawaan (Login):
echo   * Super Admin  : admin / admin123
echo   * Dosen/Guru   : instructor / instructor123
echo   * Asisten Lab  : assistant / assistant123
echo.
echo  (Biarkan jendela backend dan frontend tetap terbuka selama aplikasi digunakan)
echo  Untuk menghentikan aplikasi, Anda dapat menjalankan skrip 'HENTIKAN_APP.bat'.
echo =====================================================================
echo.
pause
