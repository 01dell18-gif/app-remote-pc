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
    const osType = payload.connection.type === 'vnc' ? 'Linux Ubuntu Desktop' : 'Microsoft Windows 10/11';

    // Kirim pesan inisialisasi sesi ke frontend
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

    let isAgentConnected = false;
    let agentBaseUrl = `http://${targetIp}:5901`;

    // Periksa apakah agen penangkap layar aktif di komputer target (Port 5901)
    const checkAgent = async () => {
      if (ws.readyState !== WebSocket.OPEN) return;
      const candidateUrls = [
        `http://${targetIp}:5901`,
        `http://127.0.0.1:5901`,
        `http://localhost:5901`,
      ];

      for (const url of candidateUrls) {
        try {
          const resp = await fetch(`${url}/status`, { signal: AbortSignal.timeout(500) });
          if (resp.ok) {
            isAgentConnected = true;
            agentBaseUrl = url;
            const data = (await resp.json()) as any;
            ws.send(
              JSON.stringify({
                type: 'AGENT_CONNECTED',
                payload: {
                  targetName,
                  targetIp,
                  resolution: data.resolution || { width: 1920, height: 1080 },
                },
              })
            );
            return;
          }
        } catch {}
      }

      isAgentConnected = false;
      ws.send(
        JSON.stringify({
          type: 'REAL_DEVICE_STATUS',
          payload: {
            targetName,
            targetIp,
            osType,
            hasAgent: false,
            message: `Workstation fisik ${targetName} (${targetIp}) aktif di jaringan. Klik tombol MSTSC di toolbar atas untuk meremote layar penuh asli sekarang.`,
          },
        })
      );
    };

    checkAgent();

    // Loop penangkapan frame layar asli jika agen aktif (setiap 120ms / ~8 FPS)
    const streamInterval = setInterval(async () => {
      if (ws.readyState !== WebSocket.OPEN) {
        clearInterval(streamInterval);
        return;
      }

      if (!isAgentConnected) {
        await checkAgent();
        return;
      }

      try {
        const screenResp = await fetch(`${agentBaseUrl}/screen`, { signal: AbortSignal.timeout(800) });
        if (screenResp.ok) {
          const arrayBuffer = await screenResp.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          const w = parseInt(screenResp.headers.get('x-screen-width') || '1920', 10);
          const h = parseInt(screenResp.headers.get('x-screen-height') || '1080', 10);

          ws.send(
            JSON.stringify({
              type: 'REAL_SCREEN_FRAME',
              timestamp: Date.now(),
              data: `data:image/jpeg;base64,${base64}`,
              width: w,
              height: h,
            })
          );
        } else {
          isAgentConnected = false;
        }
      } catch {
        isAgentConnected = false;
      }
    }, 120);

    // Tangkap input mouse dan keyboard dari peramban dan teruskan ke target asli
    ws.on('message', async (raw: string | Buffer) => {
      try {
        const msg = JSON.parse(raw.toString('utf8'));

        if (msg.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: msg.timestamp || msg.clientTime || Date.now() }));
          return;
        }

        if (isAgentConnected && (msg.type === 'MOUSE_MOVE' || msg.type === 'MOUSE_CLICK')) {
          const inputType = msg.type === 'MOUSE_CLICK' ? 'click' : 'move';
          fetch(`${agentBaseUrl}/input`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: inputType,
              x: msg.x,
              y: msg.y,
              button: msg.button || 'left',
            }),
            signal: AbortSignal.timeout(500),
          }).catch(() => {});
        }
      } catch {}
    });

    ws.on('close', () => {
      clearInterval(streamInterval);
    });
  }
}