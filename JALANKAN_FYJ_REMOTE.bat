@echo off
title FYJ Channel Remote - Launcher
color 0B
chcp 65001 >nul
cd /d "%~dp0"

echo =====================================================================
echo          🌐 FYJ CHANNEL REMOTE - SISTEM KENDALI JARAK JAUH 🖥️
echo =====================================================================
echo.

:: 1. Verifikasi ketersediaan Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [GALAT] Node.js belum terpasang di komputer ini!
    echo Silakan unduh dan pasang Node.js (versi 20 atau lebih baru) dari:
    echo 👉 https://nodejs.org/
    echo.
    echo Setelah instalasi Node.js selesai, silakan jalankan kembali file ini.
    echo =====================================================================
    pause
    exit /b 1
)

echo [OK] Node.js terdeteksi:
node -v
echo.

:: 2. Persiapan file konfigurasi backend .env jika belum ada
if not exist "backend\.env" (
    echo [INFO] Menyiapkan file backend\.env dari template...
    copy ".env.example" "backend\.env" >nul
)

:: 3. Pemeriksaan dan instalasi otomatis dependensi backend
if not exist "backend\node_modules\" (
    echo [INFO] Dependensi backend belum terpasang. Menjalankan instalasi...
    cd backend
    call npm install --legacy-peer-deps --no-audit --no-fund
    cd ..
    echo [OK] Dependensi backend berhasil dipasang.
    echo.
)

:: 4. Pemeriksaan dan inisialisasi basis data jika belum ada
if not exist "backend\dev.db" (
    echo [INFO] Menyiapkan basis data SQLite awal dan akun default...
    cd backend
    call npx prisma generate
    call npx prisma db push
    call npm run prisma:seed
    cd ..
    echo [OK] Basis data berhasil diinisialisasi.
    echo.
)

:: 5. Pemeriksaan dan instalasi otomatis dependensi frontend
if not exist "frontend\node_modules\" (
    echo [INFO] Dependensi frontend belum terpasang. Menjalankan instalasi...
    cd frontend
    call npm install --legacy-peer-deps --no-audit --no-fund
    cd ..
    echo [OK] Dependensi frontend berhasil dipasang.
    echo.
)

echo =====================================================================
echo  Memulai layanan server aplikasi dan dasbor web...
echo =====================================================================

:: Jalankan Backend Server pada jendela terpisah
start "FYJ Remote - Backend Server (Port 4000)" cmd /k "cd /d "%~dp0backend" && npm run dev"

:: Tunggu 3 detik agar backend aktif terlebih dahulu
echo Menunggu inisialisasi Backend Gateway...
timeout /t 3 /nobreak >nul

:: Jalankan Frontend Dev Server pada jendela terpisah
start "FYJ Remote - Frontend UI (Port 3000)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

:: Tunggu 2 detik lalu buka browser otomatis
echo Membuka peramban web (browser)...
timeout /t 2 /nobreak >nul
start http://localhost:3000/

echo.
echo =====================================================================
echo  ✅ APLIKASI TELAH BERJALAN DENGAN SUKSES!
echo =====================================================================
echo  - Akses Lokal    : http://localhost:3000
echo  - Backend API    : http://localhost:4000/api/v1
echo  - WebSocket Tunnel: ws://localhost:4000/api/v1/tunnel/remote
echo.
echo  Kredensial Akun Bawaan (Login):
echo   * Super Admin  : admin / admin123
echo   * Dosen/Guru   : instructor / instructor123
echo   * Asisten Lab  : assistant / assistant123
echo.
echo  (Biarkan jendela backend dan frontend tetap terbuka selama aplikasi digunakan)
echo  Untuk menghentikan aplikasi, Anda dapat menutup kedua jendela tersebut
echo  atau menjalankan skrip 'HENTIKAN_APP.bat'.
echo =====================================================================
echo.
pause
