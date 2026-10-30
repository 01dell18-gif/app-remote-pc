#!/usr/bin/env python3
"""
FYJ Channel Remote - Mock Agent Simulator
Mendengarkan paket Wake-on-LAN (UDP 7/9) dan merespons ping / heartbeat.
"""

import socket
import sys
import threading
import time

def listen_wol(port=9):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    # Enable SO_REUSEADDR and broadcast reception
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        sock.bind(('0.0.0.0', port))
    except Exception as e:
        print(f"[Mock Agent] Gagal mengikat port {port}: {e}")
        return

    print(f"[Mock Agent] Mendengarkan paket Wake-on-LAN pada port UDP {port}...")
    while True:
        try:
            data, addr = sock.recvfrom(1024)
            # Wake-on-LAN Magic packet: 6 bytes of 0xFF followed by 16 repetitions of 6-byte MAC (102 bytes total)
            if len(data) >= 102 and data.startswith(b'\xff' * 6):
                mac = ':'.join(f'{b:02x}' for b in data[6:12])
                print(f"[Mock Agent] Magic Packet diterima dari {addr} untuk MAC: {mac.upper()}! Status -> BERHASIL BANGUN.")
        except Exception as err:
            print(f"[Mock Agent] Kesalahan socket WoL: {err}")
            break

def tcp_heartbeat_responder(port=5900):
    """Merespons probe TCP untuk mensimulasikan status PC online (misal port VNC/RDP)"""
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        server.bind(('0.0.0.0', port))
        server.listen(5)
        print(f"[Mock Agent] TCP Heartbeat listener aktif pada port {port} (Simulasi Online).")
    except Exception as e:
        print(f"[Mock Agent] Tidak dapat memulai TCP listener pada port {port}: {e}")
        return

    while True:
        try:
            client, addr = server.accept()
            # Segera tutup koneksi setelah menerima ping/probe
            client.close()
        except:
            break

if __name__ == "__main__":
    wol_port = int(sys.argv[1]) if len(sys.argv) > 1 else 9
    print("=" * 60)
    print("  FYJ Channel Remote - Mock Agent Simulator (Python)")
    print("=" * 60)

    # Jalankan listener WoL pada thread terpisah jika ingin menjalankan port 7 dan 9
    t7 = threading.Thread(target=listen_wol, args=(7,), daemon=True)
    t7.start()

    listen_wol(wol_port)
