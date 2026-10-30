# FYJ Channel Remote 🌐🖥️

> **Sistem Pengendali dan Pemantauan Jaringan Laboratorium Komputer Berbasis Web (Clientless Web-based Remote Gateway)**  
> Mendukung protokol **Microsoft RDP (Console & Shadowing)**, **VNC (RFB)**, dan **Wake-on-LAN (UDP Magic Packet)** dalam satu jaringan lokal (LAN / Wi-Fi).

[![License: MIT](https://img.shields.io/badge/License-MIT-teal.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-cyan.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-indigo.svg)](https://www.prisma.io/)

---

## 📋 Daftar Isi

1. [Gambaran Arsitektur Sistem](#1-gambaran-arsitektur-sistem)
2. [Fitur Utama](#2-fitur-utama)
3. [Tumpukan Teknologi (Tech Stack)](#3-tumpukan-teknologi-tech-stack)
4. [Struktur Direktori Repositori](#4-struktur-direktori-repositori)
5. [Panduan Menjalankan Sistem](#5-panduan-menjalankan-sistem)
   - [Opsi 1: Menjalankan dengan 1-Klik (.BAT)](#opsi-1-menjalankan-dengan-1-klik-bat--rekomendasi-di-windows)
   - [Opsi 2: Mode Manual (Zero-Config SQLite)](#opsi-2-mode-manual-zero-config-sqlite)
   - [Opsi 3: Mode Kontainer Docker Penuh (guacd + PostgreSQL)](#opsi-3-mode-kontainer-docker-penuh-guacd--postgresql)
6. [Akun Bawaan (Default Credentials)](#6-akun-bawaan-default-credentials)
7. [Spesifikasi API Endpoint & Protokol](#7-spesifikasi-api-endpoint--protokol)
8. [Simulasi Mock Lab (Testing Tanpa Fisik PC)](#8-simulasi-mock-lab-testing-tanpa-fisik-pc)

---

## 1. Gambaran Arsitektur Sistem

Sistem **FYJ Channel Remote** dirancang untuk mengatasi friksi pemeliharaan software konvensional dengan menghadirkan gerbang kendali jarak jauh berbasis web tanpa instalasi klien (*clientless web-based remote gateway*).

```text
+-------------------------------------------------------------+
|        Peramban Web Instruktur / Dosen (HTML5 Canvas)       |
|    - Dasbor Matriks Multi-Layar (Spatial Grid View 1-2 FPS) |
|    - Viewport Kendali Interaktif (Mouse, Keyboard, HUD)     |
+------------------------------+------------------------------+
                               | HTTPS / WSS (Port 443 / 4000)
                               v
+-------------------------------------------------------------+
|         Lapisan Perantara (Node.js Application Gateway)     |
|    - Express REST API & Otentikasi JWT (RBAC)               |
|    - Modul Enkripsi Token Sesi AES-256-CBC (Ephemeral 60s)  |
|    - Orkestrator Daya Wake-on-LAN (UDP Directed Broadcast)  |
|    - WebSocket Tunnel Gateway (guacamole-lite bridge)       |
+--------------+-------------------------------+--------------+
               | TCP (Port 4822)               | UDP 7 / 9
               v                               v
+-------------------------------+  +--------------------------+
|  Daemon Apache Guacamole      |  | Subnet Broadcast Lab     |
|          (guacd)              |  | (192.168.1.255)          |
+--------------+----------------+  +------------+-------------+
               | RDP 3389 / VNC 5900            | Magic Packet
               v                                v
+-------------------------------------------------------------+
|          Lapisan Titik Akhir (Workstation Laboratorium)     |
|   - Windows 10/11 (RDP Shadowing / NamedPipe SessEnvRpc)    |
|   - Linux Workstation (RFB / VNC Desktop)                   |
|   - Mock Simulator Agent (mock_agent.py / mock_agent.js)    |
+-------------------------------------------------------------+
```

---

## 2. Fitur Utama

- 🖥️ **Remote Desktop & Interaktivitas Penuh (HTML5 Canvas)**:
  - Streaming layar desktop target latensi rendah melalui WebSockets.
  - Penanganan periferal mouse: pergerakan kursor, klik kiri, kanan, tengah, klik ganda, dan *scroll wheel*.
  - Injeksi penekanan keyboard dan tombol kombinasi sistem khusus yang biasanya dicegat browser: **`Ctrl + Alt + Del`**, **`Alt + Tab`**, **`Win Key`**, **`Esc`**.
  - Sinkronisasi papan klip teks dua arah (*bidirectional shared clipboard*).
- ⚡ **Orkestrasi Daya & Wake-on-LAN (WoL)**:
  - Formulasi standar paket ajaib 102 byte (`0xFF * 6` + `MAC * 16`).
  - Pemancaran paket datagram UDP broadcast terarah (*directed subnet broadcast*) ke port 7 dan 9.
  - Bangunkan komputer individu maupun massal per ruangan lab dalam satu klik.
- 🛑 **Remote Shutdown & Reboot**:
  - Pematian dan mulai ulang sistem operasi secara tertib (*graceful shutdown*) dengan pencatatan jejak audit.
- 🏫 **Dasbor Matriks Pemantauan Kelas (Classroom Spatial Grid View)**:
  - Tata letak meja baris dan kolom yang mencerminkan denah fisik ruang lab.
  - Kartu workstation dengan kanvas miniatur mini-screen yang memperbarui visual layar tiap 1–2 detik secara adaptif.
  - Indikator LED pendar: **Hijau = Online**, **Kuning = Dalam Sesi**, **Merah = Offline**.
  - Pilihan ukuran tampilan visual: **Kecil (Compact Grid)**, **Sedang (Default)**, dan **Besar (HD Visual)**.
  - Menu konteks terintegrasi (*Context Menu*) untuk eksekusi langsung.
- 🏢 **Manajemen Ruang Laboratorium Dinamis**:
  - Tambah, sunting, dan hapus ruang laboratorium secara mandiri.
- 🔒 **Kontrol Kelas (Classroom Lock & Banner)**:
  - Mengunci periferal mouse dan keyboard komputer siswa dari jarak jauh dan menampilkan banner informasi instruktur saat sesi materi berlangsung.
- 🛡️ **Keamanan & Tata Kelola Akses (RBAC & Audit Trail)**:
  - Tiga tingkat peran: `SUPERADMIN`, `INSTRUCTOR` (Dosen/Guru), dan `LAB_ASSISTANT`.
  - Perekaman riwayat audit jejak digital lengkap: waktu, operator, ID komputer, jenis tindakan, status eksekusi, dan metadata JSON.

---

## 3. Tumpukan Teknologi (Tech Stack)

| Lapisan | Komponen / Pustaka | Keterangan |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript | Antarmuka pengguna interaktif (Strict Mode) |
| **Styling** | Tailwind CSS, Lucide React | Desain Glassmorphism gelap modern & Ikonografi |
| **State** | Zustand | Sinkronisasi status workstation & lab terpusat |
| **Canvas** | HTML5 Canvas 2D | Akselerasi render grafis low-latency |
| **Backend** | Node.js (v20+ / v24), Express, TypeScript | Gateway server, WebSocket tunnel, dan REST API |
| **Kriptografi** | Node.js `crypto` (AES-256-CBC) | Enkripsi token ephemeral 60 detik aman URL |
| **Jaringan & WoL** | Native UDP Datagram (`dgram`), `net` | Transmisi paket WoL & TCP heartbeat probe |
| **Basis Data** | SQLite (Bawaan) / PostgreSQL 15 | Didukung melalui Prisma ORM |
| **Gateway Daemon** | Apache Guacamole (`guacd:latest`) | Penerjemah protokol grafis RDP/VNC ke WebSockets |

---

## 4. Struktur Direktori Repositori

```text
App-RemotePC/
├── docker/
│   └── docker-compose.yml        # Konfigurasi orkestrasi guacd, PostgreSQL, dan noVNC mock
├── mock-lab/
│   ├── mock_agent.py             # Simulator WoL listener & heartbeat (Python)
│   ├── mock_agent.js             # Simulator WoL listener & heartbeat (Node.js)
│   └── README.md                 # Panduan pengujian lab mandiri
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         # Skema basis data relasional Prisma
│   │   └── seed.ts               # Data awal laboratorium dan 12 unit workstation
│   ├── src/
│   │   ├── config/               # Konfigurasi env, cipher key, dan port
│   │   ├── controllers/          # Auth, Lab, Workstation, Power, Remote, Audit, Classroom
│   │   ├── middlewares/          # JWT Verification & RBAC Authorization
│   │   ├── routes/               # REST API Endpoints
│   │   ├── services/             # wolService, heartbeatService, cryptoService, auditService
│   │   ├── websocket/
│   │   │   └── guacTunnel.ts     # Gerbang terowongan WebSocket ke guacd / simulator
│   │   └── server.ts             # Titik masuk backend
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/           # Navbar, Modal, StatusIndicator
│   │   │   ├── dashboard/        # LabGrid, WorkstationCard, AddWorkstationModal, ManageLabsModal
│   │   │   ├── remote/           # RemoteViewport (HTML5 Canvas), FloatingToolbar, ClipboardModal
│   │   │   └── auth/             # LoginModal
│   │   ├── services/             # API client RESTful
│   │   ├── stores/               # Zustand stores (authStore, labStore)
│   │   ├── types/                # TypeScript interface definitions
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── JALANKAN_FYJ_REMOTE.bat       # 1-Click launcher Windows
├── HENTIKAN_APP.bat              # 1-Click stopper Windows
├── JALANKAN_MOCK_AGENT.bat       # 1-Click WoL & ping simulator
├── .env.example
├── .gitignore
├── package.json                  # Root runner script
└── README.md
```

---

## 5. Panduan Menjalankan Sistem

### Opsi 1: Menjalankan dengan 1-Klik (.BAT) — Rekomendasi di Windows

Cukup klik ganda file:

```cmd
JALANKAN_FYJ_REMOTE.bat
```

Skrip ini akan secara otomatis:

1. Memeriksa ketersediaan Node.js.
2. Memasang seluruh dependensi backend dan frontend jika belum ada.
3. Menginisialisasi basis data SQLite dan menanamkan data awal (seed).
4. Menjalankan server backend (port 4000) dan frontend (port 3000).
5. Membuka peramban (*browser*) Anda secara otomatis ke `http://localhost:3000`.

Untuk menghentikan aplikasi, klik ganda:

```cmd
HENTIKAN_APP.bat
```

---

### Opsi 2: Mode Manual (Zero-Config SQLite)

1. **Instalasi Dependensi**:

   ```bash
   # Di folder backend
   cd backend
   npm install --legacy-peer-deps

   # Di folder frontend
   cd ../frontend
   npm install --legacy-peer-deps
   ```

2. **Inisialisasi Basis Data & Data Awal (Seed)**:

   ```bash
   cd ../backend
   npm run prisma:push
   npm run prisma:seed
   ```

3. **Jalankan Backend & Frontend**:

   - Jalankan backend (Terminal 1):

     ```bash
     cd backend
     npm run dev
     ```

     *Server REST API aktif di `http://localhost:4000`, WebSocket di `ws://localhost:4000/api/v1/tunnel/remote`*

   - Jalankan frontend (Terminal 2):

     ```bash
     cd frontend
     npm run dev
     ```

     *Akses dasbor web di `http://localhost:3000`*

---

### Opsi 3: Mode Kontainer Docker Penuh (guacd + PostgreSQL)

Untuk produksi dengan daemon penerjemah protokol Apache Guacamole asli:

```bash
# Putar kontainer guacd, PostgreSQL, dan mock VNC
docker compose -f docker/docker-compose.yml up -d

# Ubah konfigurasi DATABASE_URL di .env ke PostgreSQL
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/remote_lab_db?schema=public"

# Jalankan migrasi dan seed
cd backend
npm run prisma:push
npm run prisma:seed
npm run dev
```

---

## 6. Akun Bawaan (Default Credentials)

Saat pertama kali dijalankan, sistem telah dilengkapi akun bawaan untuk pengujian:

| Peran | Username | Password | Wewenang |
| :--- | :--- | :--- | :--- |
| **SUPERADMIN** | `admin` | `admin123` | Akses penuh: Tambah/edit/hapus PC, manajemen lab, kendali daya, remote control, log audit |
| **INSTRUCTOR** | `instructor` | `instructor123` | Kendali daya (WoL/Shutdown), Remote Control, Classroom Lock |
| **LAB_ASSISTANT** | `assistant` | `assistant123` | Pemantauan pasif dasbor matriks (View-only) |

*Tersedia tombol login instan 1-klik pada layar masuk untuk kemudahan pengujian.*

---

## 7. Spesifikasi API Endpoint & Protokol

| Metode | Rute Endpoint | Otorisasi | Deskripsi |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Publik | Otentikasi pengguna & penerbitan token JWT |
| `GET` | `/api/v1/labs` | Semua Peran | Mengambil daftar ruangan laboratorium |
| `POST` | `/api/v1/labs` | Superadmin | Mendaftarkan ruangan lab baru |
| `PUT` | `/api/v1/labs/:id` | Superadmin | Memperbarui nama lab / subnet broadcast |
| `DELETE` | `/api/v1/labs/:id` | Superadmin | Menghapus ruangan lab |
| `GET` | `/api/v1/labs/:id/workstations` | Semua Peran | Mengambil workstation dalam lab dan status terkininya |
| `POST` | `/api/v1/workstations` | Superadmin | Mendaftarkan PC baru (validasi unik IP dan MAC) |
| `PUT` | `/api/v1/workstations/:id` | Superadmin | Memperbarui metadata komputer |
| `DELETE` | `/api/v1/workstations/:id` | Superadmin | Menghapus unit dari inventaris |
| `POST` | `/api/v1/power/wol` | Dosen, Admin | Mengirim paket WoL ke daftar target PC |
| `POST` | `/api/v1/power/shutdown` | Dosen, Admin | Eksekusi pematian jarak jauh tertib |
| `POST` | `/api/v1/power/reboot` | Dosen, Admin | Memulai ulang komputer target |
| `POST` | `/api/v1/classroom/lock` | Dosen, Admin | Mengunci masukan siswa & pasang pesan layar |
| `POST` | `/api/v1/remote/token` | Dosen, Admin | Menghasilkan token terenkripsi AES-256 (60 detik) |
| `GET` | `/api/v1/audit/logs` | Dosen, Admin | Riwayat jejak audit aktivitas sistem |
| `WS` | `/api/v1/tunnel/remote?token=...` | Dosen, Admin | Terowongan WebSocket interaktif ke komputer target |

---

## 8. Simulasi Mock Lab (Testing Tanpa Fisik PC)

Anda dapat menguji paket Wake-on-LAN menggunakan skrip mock agent yang disediakan di `mock-lab/`:

**Jalankan Mock Agent (Node.js):**

```bash
node mock-lab/mock_agent.js
```

**Jalankan Mock Agent (Python):**

```bash
python mock-lab/mock_agent.py
```

Saat Anda mengklik tombol **"Nyalakan Semua (WoL)"** atau ikon petir pada kartu PC di dasbor web, terminal mock agent akan segera mendeteksi paket Magic Packet yang dikirimkan:

```text
[Mock Agent] Magic Packet diterima dari 127.0.0.1:xxxxx untuk MAC: 00:1A:2B:3C:4D:01! Status -> BERHASIL BANGUN.
```

---

## 💻 Pengembang & Repositori Git

- **Nama Proyek**: FYJ Channel Remote
- **GitHub Repository**: [https://github.com/01dell18-gif/app-remote-pc.git](https://github.com/01dell18-gif/app-remote-pc.git)
- **Lisensi**: MIT License
