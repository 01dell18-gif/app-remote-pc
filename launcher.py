#!/usr/bin/env python3
"""
FYJ Channel Remote - Single-Click Launcher & Service Manager
Mendukung Mode Server (Web Dashboard) dan Mode Klien (Agen Perangkat yang Dikontrol).
"""

import os
import sys
import time
import socket
import subprocess
import webbrowser
import signal

ROOT_DIR = os.path.abspath(os.path.dirname(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")

BACKEND_PORT = 4000
FRONTEND_PORT = 3000

NPM_CMD = "npm.cmd" if sys.platform == "win32" else "npm"
NPX_CMD = "npx.cmd" if sys.platform == "win32" else "npx"


def print_banner():
    banner = r"""
  ===================================================================
     _____ __   __     _    _____ _   _    _    _   _ _   _ _____ _     
    |  ___|\ \ / /    | |  / ____| | | |  / \  | \ | | \ | | ____| |    
    | |_    \ V /  _  | | | |    | |_| | / _ \ |  \| |  \| |  _| | |    
    |  _|    | |  | |_| | | |___ |  _  |/ ___ \| |\  | |\  | |___| |___ 
    |_|      |_|   \___/   \_____|_| |_/_/   \_\_| \_|_| \_|_____|_____|
                        REMOTE LAB CONTROLLER
  ===================================================================
    Sistem Gateway Kendali & Pemantauan Lab Komputer (Real Hardware)
  ===================================================================
    """
    print(banner)


def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", port)) == 0


def kill_process_on_port(port: int):
    """Menutup proses yang masih mengunci port tertentu di Windows"""
    if sys.platform != "win32":
        return
    try:
        cmd = f'powershell -Command "Get-NetTCPConnection -LocalPort {port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique"'
        out = subprocess.check_output(cmd, shell=True, text=True).strip()
        if out:
            pids = out.split()
            for pid in pids:
                if pid and pid != "0":
                    subprocess.run(f"taskkill /F /PID {pid} >nul 2>&1", shell=True)
                    print(f"[*] Menutup proses lama (PID: {pid}) pada port {port}")
    except Exception:
        pass


def check_node_installed() -> bool:
    try:
        res = subprocess.run([NPM_CMD, "-v"], capture_output=True, text=True, check=True)
        print(f"[OK] Node.js / NPM terdeteksi (v{res.stdout.strip()})")
        return True
    except Exception:
        return False


def setup_environment():
    print("\n[*] Memeriksa lingkungan aplikasi...")

    # 1. Pastikan file .env ada di backend
    env_file = os.path.join(BACKEND_DIR, ".env")
    env_example = os.path.join(ROOT_DIR, ".env.example")
    if not os.path.exists(env_file):
        if os.path.exists(env_example):
            import shutil
            shutil.copyfile(env_example, env_file)
            print("[+] Membuat file backend/.env dari .env.example")
        else:
            with open(env_file, "w", encoding="utf-8") as f:
                f.write("PORT=4000\nNODE_ENV=development\nJWT_SECRET=fyj_remote_secret_2026\nDATABASE_URL=file:./dev.db\n")
            print("[+] Membuat file backend/.env baru")

    # 2. Instalasi modul backend jika belum ada
    backend_modules = os.path.join(BACKEND_DIR, "node_modules")
    if not os.path.exists(backend_modules):
        print("[!] Modul backend belum terpasang. Menjalankan 'npm install' pada backend...")
        subprocess.run([NPM_CMD, "install"], cwd=BACKEND_DIR, check=True)

    # 3. Sinkronisasi basis data SQLite via Prisma
    dev_db = os.path.join(BACKEND_DIR, "prisma", "dev.db")
    if not os.path.exists(dev_db):
        print("[*] Menginisialisasi basis data SQLite (prisma db push)...")
        subprocess.run([NPX_CMD, "prisma", "db", "push"], cwd=BACKEND_DIR, check=True)

    # 4. Instalasi modul frontend jika belum ada
    frontend_modules = os.path.join(FRONTEND_DIR, "node_modules")
    if not os.path.exists(frontend_modules):
        print("[!] Modul frontend belum terpasang. Menjalankan 'npm install' pada frontend...")
        subprocess.run([NPM_CMD, "install"], cwd=FRONTEND_DIR, check=True)


def wait_for_http(url: str, timeout: int = 30) -> bool:
    import urllib.request
    start = time.time()
    while time.time() - start < timeout:
        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=1) as resp:
                if resp.status in (200, 304, 404):
                    return True
        except Exception:
            time.sleep(0.5)
    return False


def run_client_mode():
    """Menjalankan Agen Klien pada perangkat lain yang ingin dikontrol"""
    import client_agent
    client_agent.start_agent_server(5901)


def run_server_mode():
    """Menjalankan Server Web Dashboard Pengawas Lab"""
    # Periksa Node.js
    if not check_node_installed():
        print("\n[!] Node.js belum terpasang atau belum terbaca di PATH.")
        if sys.platform == "win32":
            print("[*] Mencoba menginstal Node.js LTS otomatis via Windows Package Manager (winget)...")
            try:
                subprocess.run("winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements", shell=True)
                print("[*] Silakan muat ulang terminal setelah instalasi selesai.")
            except Exception as e:
                print(f"[!] Gagal menginstal otomatis: {e}")
                print("[!] Silakan unduh dan pasang Node.js secara manual dari: https://nodejs.org")
        sys.exit(1)

    # Konfigurasi dependensi & DB
    setup_environment()

    # Bersihkan port dari proses lama jika ada
    if is_port_in_use(BACKEND_PORT):
        print(f"[*] Port {BACKEND_PORT} sedang digunakan. Membersihkan...")
        kill_process_on_port(BACKEND_PORT)
        time.sleep(1)

    if is_port_in_use(FRONTEND_PORT):
        print(f"[*] Port {FRONTEND_PORT} sedang digunakan. Membersihkan...")
        kill_process_on_port(FRONTEND_PORT)
        time.sleep(1)

    # Jalankan Real Hardware Screen Agent lokal (Port 5901)
    print("\n[*] Menjalankan Real Hardware Screen Agent lokal (Port 5901)...")
    agent_proc = subprocess.Popen(
        [sys.executable, os.path.join(ROOT_DIR, "client_agent.py")],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0,
    )

    print("[*] Menjalankan Backend Server (Port 4000)...")
    backend_proc = subprocess.Popen(
        [NPM_CMD, "run", "dev"],
        cwd=BACKEND_DIR,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0,
    )

    print("[*] Menjalankan Frontend Dev Server (Port 3000)...")
    frontend_proc = subprocess.Popen(
        [NPM_CMD, "run", "dev"],
        cwd=FRONTEND_DIR,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0,
    )

    print("\n[*] Menunggu antarmuka web siap merespons...")
    frontend_ready = wait_for_http("http://localhost:3000", timeout=20)

    if frontend_ready:
        print("\n" + "=" * 67)
        print("   APLIKASI WEB FYJ CHANNEL REMOTE TELAH AKTIF!")
        print("   URL Web Application : http://localhost:3000")
        print("   URL REST API Backend: http://localhost:4000/api/v1")
        print("   WebSocket Tunnel    : ws://localhost:4000/api/v1/tunnel/remote")
        print("-" * 67)
        print("   Kredensial Default:")
        print("     Username : admin")
        print("     Password : admin123")
        print("=" * 67)

        print("\n[*] Membuka http://localhost:3000 di browser default Anda...")
        webbrowser.open("http://localhost:3000")
    else:
        print("[!] Timeout menunggu server web. Silakan buka manual: http://localhost:3000")

    print("\n[INFO] Tekan [Q] lalu [Enter] (atau tekan Ctrl+C) untuk menghentikan seluruh layanan.\n")

    try:
        while True:
            cmd = input("FYJ-Remote > ").strip().lower()
            if cmd in ("q", "quit", "exit", "stop"):
                break
            elif cmd in ("b", "browser", "open"):
                webbrowser.open("http://localhost:3000")
            elif cmd in ("sync", "s"):
                print("[*] Memicu sinkronisasi manual...")
                try:
                    import urllib.request, json
                    login_req = urllib.request.Request("http://localhost:4000/api/v1/auth/login", data=b'{"username":"admin","password":"admin123"}', headers={"Content-Type": "application/json"})
                    with urllib.request.urlopen(login_req) as r:
                        token = json.loads(r.read().decode())["token"]
                    sync_req = urllib.request.Request("http://localhost:4000/api/v1/workstations/sync-all", data=b"{}", headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"})
                    with urllib.request.urlopen(sync_req) as r:
                        msg = json.loads(r.read().decode()).get("message", "Selesai")
                    print(f"[OK] {msg}")
                except Exception as e:
                    print(f"[!] Galat sinkronisasi: {e}")
            else:
                print("Perintah yang tersedia: [q] Keluar | [b] Buka Browser | [s] Sinkronisasi Lab")
    except (KeyboardInterrupt, EOFError):
        pass

    print("\n[*] Menghentikan seluruh proses backend & frontend...")
    kill_process_on_port(BACKEND_PORT)
    kill_process_on_port(FRONTEND_PORT)
    kill_process_on_port(5901)
    try:
        backend_proc.terminate()
        frontend_proc.terminate()
    except Exception:
        pass
    print("[OK] Aplikasi web FYJ Channel Remote telah dihentikan secara bersih. Sampai jumpa!")


def main():
    print_banner()

    # Cek argumen CLI
    if len(sys.argv) > 1:
        arg = sys.argv[1].lower().strip()
        if arg in ("client", "klien", "target", "2"):
            run_client_mode()
            return
        elif arg in ("server", "master", "web", "1"):
            run_server_mode()
            return

    # Menu Pilihan Interaktif
    print("  Silakan pilih mode operasi untuk komputer ini:")
    print("    [1] MODE SERVER (Jalankan Dashboard Aplikasi Web Lab)")
    print("        -> Untuk Komputer Guru / Admin / Pengawas Lab")
    print("        -> Otomatis cek dependensi, jalankan web, dan buka browser")
    print("")
    print("    [2] MODE KLIEN (Jalankan Agen di Perangkat Lain Ini)")
    print("        -> Untuk Komputer Siswa / PC yang Ingin Diremote & Dipantau")
    print("        -> Otomatis buka Firewall, aktifkan RDP & streaming layar fisik")
    print("=" * 67)

    choice = input("\nPilih Mode [1=Server, 2=Klien] (Default 1): ").strip()
    if choice == "2":
        run_client_mode()
    else:
        run_server_mode()


if __name__ == "__main__":
    main()
