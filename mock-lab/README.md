# Mock Lab Simulation Environment

Direktori ini menyediakan simulasi lingkungan klien laboratorium komputer untuk pengujian fitur tanpa memerlukan perangkat keras fisik.

## 1. Komponen Simulasi

- **Wake-on-LAN Listener (`mock_agent.py` / `mock_agent.js`)**:
  Mendengarkan paket datagram UDP Wake-on-LAN (port 7 & 9) yang dipancarkan oleh backend, mendekode format magic packet 102 byte (`0xFF * 6` + `MAC * 16`), dan mencetak konfirmasi bangun.
- **Docker Compose (`docker/docker-compose.yml`)**:
  Menjalankan daemon resmi Apache Guacamole (`guacd:latest`), basis data PostgreSQL (`postgres:15-alpine`), dan target mock VNC desktop (`novnc:latest`).

## 2. Cara Menjalankan

### Opsi A: Menggunakan Docker (Rekomendasi untuk Guacamole Penuh)

```bash
# Jalankan seluruh kontainer simulasi
docker compose -f docker/docker-compose.yml up -d

# Verifikasi kontainer aktif
docker ps
```

- Guacd Daemon: `localhost:4822`
- PostgreSQL: `localhost:5432`
- Mock Client VNC: `localhost:5901`

### Opsi B: Menggunakan Mock Agent Ringan (Node.js / Python)

Jika tidak menggunakan Docker, Anda dapat menjalankan mock agent langsung:

**Dengan Node.js:**

```bash
node mock-lab/mock_agent.js
```

**Dengan Python:**

```bash
python mock-lab/mock_agent.py
```

Saat backend mengirimkan instruksi Wake-on-LAN ke IP broadcast/target, terminal ini akan menampilkan:

```text
[Mock Agent] Magic Packet diterima dari 127.0.0.1:xxxxx untuk MAC: 00:1A:2B:3C:4D:01! Status -> BERHASIL BANGUN.
```
