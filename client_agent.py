#!/usr/bin/env python3
"""
FYJ Channel Remote - Real Hardware Client Agent
Menangkap layar fisik asli (GDI BitBlt), menerima kendali mouse/keyboard,
serta mengaktifkan Windows Remote Desktop (RDP).
"""

import io
import json
import socket
import sys
import threading
import time
from http.server import HTTPServer, BaseHTTPRequestHandler

# Import Windows GDI / User32 jika di platform Windows
IS_WINDOWS = sys.platform == "win32"

if IS_WINDOWS:
    import ctypes
    from ctypes import windll, byref, c_int, Structure, sizeof
    from PIL import Image

    user32 = windll.user32
    gdi32 = windll.gdi32

    class BITMAPINFOHEADER(Structure):
        _fields_ = [
            ('biSize', c_int), ('biWidth', c_int), ('biHeight', c_int),
            ('biPlanes', ctypes.c_short), ('biBitCount', ctypes.c_short),
            ('biCompression', c_int), ('biSizeImage', c_int),
            ('biXPelsPerMeter', c_int), ('biYPelsPerMeter', c_int),
            ('biClrUsed', c_int), ('biClrImportant', c_int)
        ]


def get_screen_dimensions():
    if IS_WINDOWS:
        return user32.GetSystemMetrics(0), user32.GetSystemMetrics(1)
    return 1920, 1080


def capture_real_screen_jpeg(quality=65):
    """Menangkap layar desktop Windows asli secara real-time via GDI"""
    if not IS_WINDOWS:
        # Fallback non-windows
        return None, 1920, 1080

    w, h = get_screen_dimensions()
    if w <= 0 or h <= 0:
        return None, 1920, 1080

    bmi = BITMAPINFOHEADER()
    bmi.biSize = sizeof(BITMAPINFOHEADER)
    bmi.biWidth = w
    bmi.biHeight = -h  # top-down DIB
    bmi.biPlanes = 1
    bmi.biBitCount = 32
    bmi.biCompression = 0

    buf_mem = ctypes.create_string_buffer(w * h * 4)

    hdc_screen = user32.GetDC(None)
    hdc_mem = gdi32.CreateCompatibleDC(hdc_screen)
    hbitmap = gdi32.CreateCompatibleBitmap(hdc_screen, w, h)
    gdi32.SelectObject(hdc_mem, hbitmap)
    gdi32.BitBlt(hdc_mem, 0, 0, w, h, hdc_screen, 0, 0, 0x00CC0020)  # SRCCOPY
    gdi32.GetDIBits(hdc_mem, hbitmap, 0, h, buf_mem, byref(bmi), 0)

    gdi32.DeleteObject(hbitmap)
    gdi32.DeleteDC(hdc_mem)
    user32.ReleaseDC(None, hdc_screen)

    img = Image.frombuffer('RGBA', (w, h), buf_mem, 'raw', 'BGRA', 0, 1)
    buf = io.BytesIO()
    img.convert('RGB').save(buf, format='JPEG', quality=quality)
    return buf.getvalue(), w, h


def inject_mouse_event(event_type, x, y, button="left"):
    if not IS_WINDOWS:
        return
    screen_w, screen_h = get_screen_dimensions()
    # Pindahkan posisi kursor ke koordinat fisik
    user32.SetCursorPos(int(x), int(y))

    if event_type == "click" or event_type == "down":
        if button == "right":
            user32.mouse_event(8, 0, 0, 0, 0)  # RIGHTDOWN
            if event_type == "click":
                user32.mouse_event(16, 0, 0, 0, 0)  # RIGHTUP
        else:
            user32.mouse_event(2, 0, 0, 0, 0)  # LEFTDOWN
            if event_type == "click":
                user32.mouse_event(4, 0, 0, 0, 0)  # LEFTUP
    elif event_type == "up":
        if button == "right":
            user32.mouse_event(16, 0, 0, 0, 0)
        else:
            user32.mouse_event(4, 0, 0, 0, 0)


def configure_windows_rdp_and_firewall():
    """Mengaktifkan Remote Desktop bawaan Windows dan Firewall jika belum aktif"""
    if not IS_WINDOWS:
        return
    import subprocess
    cmds = [
        'reg add "HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server" /v fDenyTSConnections /t REG_DWORD /d 0 /f',
        'netsh advfirewall firewall set rule group="remote desktop" new enable=Yes',
        'netsh advfirewall firewall add rule name="Allow FYJ Remote RDP" dir=in action=allow protocol=TCP localport=3389',
        'netsh advfirewall firewall add rule name="Allow FYJ Agent" dir=in action=allow protocol=TCP localport=5901',
        'netsh advfirewall firewall add rule name="Allow ICMP Ping" protocol=icmpv4:8,any dir=in action=allow',
    ]
    for c in cmds:
        try:
            subprocess.run(c, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            pass


class AgentHTTPHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Sunyikan logging berulang di konsol

    def do_GET(self):
        if self.path == "/screen":
            jpeg_bytes, w, h = capture_real_screen_jpeg()
            if jpeg_bytes:
                self.send_response(200)
                self.send_header("Content-Type", "image/jpeg")
                self.send_header("X-Screen-Width", str(w))
                self.send_header("X-Screen-Height", str(h))
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(jpeg_bytes)
            else:
                self.send_response(500)
                self.end_headers()
        elif self.path == "/status" or self.path == "/ping":
            w, h = get_screen_dimensions()
            res = {
                "status": "ONLINE",
                "hostname": socket.gethostname(),
                "resolution": {"width": w, "height": h},
                "platform": sys.platform,
            }
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(res).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        content_len = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_len)
        try:
            data = json.loads(body.decode("utf-8"))
        except Exception:
            data = {}

        if self.path == "/input":
            event_type = data.get("type", "move")
            x = data.get("x", 0)
            y = data.get("y", 0)
            button = data.get("button", "left")
            inject_mouse_event(event_type, x, y, button)

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(b'{"success":true}')
        elif self.path == "/api/launch":
            import subprocess
            cmd = data.get("command") or data.get("appPath") or ""
            try:
                subprocess.Popen(cmd, shell=True)
                res = {"success": True, "message": f"Diluncurkan: {cmd}"}
            except Exception as e:
                res = {"success": False, "message": str(e)}
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(res).encode("utf-8"))
        elif self.path == "/api/terminate":
            import subprocess
            proc = data.get("processName", "")
            subprocess.run(f"taskkill /F /IM {proc}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(b'{"success":true}')
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()


def start_agent_server(port=5901):
    print("=" * 65)
    print("  FYJ CHANNEL REMOTE - REAL HARDWARE CLIENT AGENT")
    print("=" * 65)
    print(f"  Nama Host Komputer  : {socket.gethostname()}")
    w, h = get_screen_dimensions()
    print(f"  Resolusi Layar Asli : {w} x {h}")
    print(f"  Port Layanan Layar  : {port} (HTTP Live Stream & Input)")
    print("=" * 65)

    # Pastikan RDP & Firewall diaktifkan
    print("[*] Mengonfigurasi Windows RDP & Firewall...")
    configure_windows_rdp_and_firewall()

    server = HTTPServer(("0.0.0.0", port), AgentHTTPHandler)
    print(f"[OK] Agen Aktif! Komputer ini siap dipantau dan diremote.")
    print(f"[INFO] Tekan Ctrl+C untuk menghentikan agen.\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[*] Agen Klien dihentikan.")
        server.server_close()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5901
    start_agent_server(port)

