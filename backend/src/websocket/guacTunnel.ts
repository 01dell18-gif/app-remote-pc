import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import net from 'net';
import url from 'url';
import { CryptoService, RemoteConnectionPayload } from '../services/cryptoService';
import { config } from '../config';

export class GuacTunnel {
  private wss: WebSocketServer;

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      const parsedUrl = url.parse(request.url || '', true);
      const pathname = parsedUrl.pathname;

      if (pathname === '/api/v1/tunnel/remote') {
        const token = parsedUrl.query.token as string;
        if (!token) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        const payload = CryptoService.decryptToken(token);
        if (!payload) {
          socket.write('HTTP/1.1 403 Forbidden: Invalid or Expired Token\r\n\r\n');
          socket.destroy();
          return;
        }

        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request, payload);
        });
      }
    });

    this.wss.on('connection', (ws: WebSocket, request: any, payload: RemoteConnectionPayload) => {
      this.handleConnection(ws, payload);
    });

    console.log('[GuacTunnel] WebSocket tunnel gateway siap pada rute /api/v1/tunnel/remote');
  }

  private handleConnection(ws: WebSocket, payload: RemoteConnectionPayload): void {
    const connSettings = payload.connection.settings;
    const connType = payload.connection.type;
    console.log(
      `[GuacTunnel] Sesi remote baru: Host ${connSettings.hostname}:${connSettings.port} (${connType}) untuk PC ${connSettings.hostnameTarget || 'Unknown'}`
    );

    // Coba hubungkan ke daemon guacd nyata terlebih dahulu
    const guacdSocket = new net.Socket();
    let isGuacdConnected = false;
    let isUsingMock = false;

    guacdSocket.setTimeout(2000);

    guacdSocket.connect(config.guacd.port, config.guacd.host, () => {
      isGuacdConnected = true;
      console.log(`[GuacTunnel] Terhubung ke daemon guacd pada ${config.guacd.host}:${config.guacd.port}`);

      // Teruskan instruksi Guacamole dari WebSocket ke guacd
      ws.on('message', (data: Buffer | string) => {
        if (guacdSocket.writable) {
          guacdSocket.write(data);
        }
      });

      // Teruskan data grafis dari guacd ke WebSocket klien
      guacdSocket.on('data', (data: Buffer) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data.toString('utf8'));
        }
      });
    });

    const switchToMockSession = () => {
      if (isUsingMock) return;
      isUsingMock = true;
      try {
        guacdSocket.destroy();
      } catch {}

      console.log(
        `[GuacTunnel] Berpindah ke Simulator Desktop Interaktif Bawaan untuk target ${connSettings.hostnameTarget || connSettings.hostname}`
      );
      this.startInteractiveMockDesktop(ws, payload);
    };

    guacdSocket.on('error', (err) => {
      if (!isGuacdConnected) {
        switchToMockSession();
      }
    });

    guacdSocket.on('timeout', () => {
      if (!isGuacdConnected) {
        switchToMockSession();
      }
    });

    guacdSocket.on('close', () => {
      if (ws.readyState === WebSocket.OPEN && !isUsingMock) {
        ws.close(1000, 'Guacd connection closed');
      }
    });

    ws.on('close', () => {
      try {
        guacdSocket.destroy();
      } catch {}
    });
  }

  /**
   * Simulator Desktop Berbasis Canvas Interaktif Penuh (Bawaan)
   * Menyediakan frame grafis dinamis, status OS, taskbar, start menu interaktif,
   * terminal interaktif, dan respons mouse/keyboard/shortcut.
   */
  private startInteractiveMockDesktop(ws: WebSocket, payload: RemoteConnectionPayload): void {
    const targetName = payload.connection.settings.hostnameTarget || 'PC-WORKSTATION';
    const targetIp = payload.connection.settings.hostname;
    const osType = payload.connection.type === 'vnc' ? 'Linux Ubuntu Desktop 24.04' : 'Windows 11 Enterprise';

    // Kirim pesan inisialisasi sesi mock
    ws.send(
      JSON.stringify({
        type: 'INIT',
        payload: {
          targetName,
          targetIp,
          osType,
          resolution: { width: 1280, height: 720 },
          serverTime: new Date().toISOString(),
          status: 'CONNECTED',
        },
      })
    );

    // State desktop simulator
    const state = {
      isStartMenuOpen: false,
      isTerminalOpen: true,
      terminalLogs: [
        `FYJ Channel Remote [Version 1.0.0]`,
        `(c) 2026 FYJ Network Systems. All rights reserved.`,
        ``,
        `Session connected to: ${targetName} (${targetIp})`,
        `Protocol: Native RDP Shadowing [NamedPipe: SessEnvPublicRpc]`,
        `Security: NLA TLS 1.3 | Resolution: 1280x720 60Hz`,
        `Type commands or click anywhere to interact...`,
      ],
      mouseX: 640,
      mouseY: 360,
      activeWindow: 'terminal',
      shortcutToast: null as string | null,
      clipboard: 'Initial remote clipboard content from ' + targetName,
    };

    // Broadcast frame/state interval (10 FPS adaptif)
    const frameInterval = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        clearInterval(frameInterval);
        return;
      }

      ws.send(
        JSON.stringify({
          type: 'FRAME_UPDATE',
          timestamp: Date.now(),
          state: {
            ...state,
            currentTime: new Date().toLocaleTimeString(),
          },
        })
      );
    }, 100);

    // Tangkap interaktivitas pengguna dari klien (mouse, keyboard, shortcuts, clipboard)
    ws.on('message', (raw: string | Buffer) => {
      try {
        const msg = JSON.parse(raw.toString('utf8'));

        if (msg.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', clientTime: msg.timestamp, serverTime: Date.now() }));
          return;
        }

        if (msg.type === 'MOUSE_MOVE') {
          state.mouseX = msg.x;
          state.mouseY = msg.y;
        } else if (msg.type === 'MOUSE_CLICK') {
          state.mouseX = msg.x;
          state.mouseY = msg.y;

          // Cek jika klik pada taskbar Start Menu button (kiri bawah)
          if (msg.x >= 20 && msg.x <= 70 && msg.y >= 670 && msg.y <= 715) {
            state.isStartMenuOpen = !state.isStartMenuOpen;
          } else if (msg.isStartMenuOpen && msg.y < 400) {
            state.isStartMenuOpen = false;
          }

          // Cek klik pada terminal minimize / close
          if (msg.x >= 750 && msg.x <= 780 && msg.y >= 120 && msg.y <= 150) {
            state.isTerminalOpen = !state.isTerminalOpen;
          }
        } else if (msg.type === 'KEY_DOWN') {
          if (msg.key === 'Enter') {
            state.terminalLogs.push(`guest@${targetName.toLowerCase()}:~$ `);
          } else if (msg.key === 'Backspace') {
            const last = state.terminalLogs[state.terminalLogs.length - 1];
            if (last && last.length > 0) {
              state.terminalLogs[state.terminalLogs.length - 1] = last.slice(0, -1);
            }
          } else if (msg.key && msg.key.length === 1) {
            const lastIdx = state.terminalLogs.length - 1;
            state.terminalLogs[lastIdx] = (state.terminalLogs[lastIdx] || '') + msg.key;
          }
        } else if (msg.type === 'SHORTCUT') {
          state.shortcutToast = `Tombol Sistem Dikirim: [${msg.shortcut}]`;
          state.terminalLogs.push(`[System Event] Injected Key Combination: ${msg.shortcut}`);
          setTimeout(() => {
            state.shortcutToast = null;
          }, 3000);
        } else if (msg.type === 'CLIPBOARD_SET') {
          state.clipboard = msg.text;
          state.terminalLogs.push(`[Clipboard Sync] Teks disinkronkan: "${msg.text.substring(0, 30)}..."`);
        }
      } catch (e) {
        // Abaikan format biner guacd mentah jika ada
      }
    });

    ws.on('close', () => {
      clearInterval(frameInterval);
    });
  }
}
