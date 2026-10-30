import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RemoteSessionInfo } from '../../types';
import { FloatingToolbar } from './FloatingToolbar';
import { ClipboardModal } from './ClipboardModal';
import { useLabStore } from '../../stores/labStore';
import { WifiOff } from 'lucide-react';

interface RemoteViewportProps {
  session: RemoteSessionInfo;
  onClose: () => void;
}

export const RemoteViewport: React.FC<RemoteViewportProps> = ({ session, onClose }) => {
  const { fetchWorkstations } = useLabStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [connected, setConnected] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rttMs, setRttMs] = useState(12);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [clipboardOpen, setClipboardOpen] = useState(false);
  const [remoteClipboard, setRemoteClipboard] = useState('Remote text ready.');
  const [shortcutToast, setShortcutToast] = useState<string | null>(null);

  // Dekstop state dari server
  const serverStateRef = useRef<any>({
    isStartMenuOpen: false,
    isTerminalOpen: true,
    terminalLogs: [
      `Connecting to ${session.workstation.hostname}...`,
    ],
    mouseX: 640,
    mouseY: 360,
    currentTime: '',
  });

  // Ukuran kanvas virtual target desktop
  const V_WIDTH = 1280;
  const V_HEIGHT = 720;

  // Render kanvas lokal
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = serverStateRef.current;

    // 1. Wallpaper Desktop
    const grad = ctx.createLinearGradient(0, 0, V_WIDTH, V_HEIGHT);
    if (session.workstation.osFamily === 'LINUX') {
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(0.5, '#0f172a');
      grad.addColorStop(1, '#020617');
    } else {
      grad.addColorStop(0, '#034a7d');
      grad.addColorStop(0.6, '#0284c7');
      grad.addColorStop(1, '#082f49');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

    // Grid garis halus wallpaper
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < V_WIDTH; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, V_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < V_HEIGHT; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(V_WIDTH, y);
      ctx.stroke();
    }

    // 2. Desktop Icons
    const icons = [
      { name: 'This PC', x: 30, y: 30, color: '#38bdf8' },
      { name: 'VS Code', x: 30, y: 110, color: '#0284c7' },
      { name: 'Google Chrome', x: 30, y: 190, color: '#eab308' },
      { name: 'Lab Terminal', x: 30, y: 270, color: '#22c55e' },
      { name: 'Network Share', x: 30, y: 350, color: '#a855f7' },
    ];

    icons.forEach((ic) => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.roundRect(ic.x, ic.y, 48, 48, 10);
      ctx.fill();

      ctx.fillStyle = ic.color;
      ctx.fillRect(ic.x + 14, ic.y + 14, 20, 20);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ic.name, ic.x + 24, ic.y + 64);
    });

    // 3. Jendela Terminal Aktif
    if (state.isTerminalOpen) {
      const winX = 140;
      const winY = 60;
      const winW = 860;
      const winH = 500;

      // Bayangan jendela
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 15;

      // Background jendela terminal
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.beginPath();
      ctx.roundRect(winX, winY, winW, winH, 12);
      ctx.fill();

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Border jendela
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Title bar
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(winX, winY, winW, 36, [12, 12, 0, 0]);
      ctx.fill();

      // Tombol jendela Mac/Windows dots
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(winX + 20, winY + 18, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(winX + 36, winY + 18, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(winX + 52, winY + 18, 5, 0, Math.PI * 2);
      ctx.fill();

      // Title text
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        `bash - ${session.workstation.hostname} [${session.workstation.ipAddress}] - NamedPipe: SessEnvPublicRpc`,
        winX + winW / 2,
        winY + 22
      );

      // Terminal content
      ctx.textAlign = 'left';
      ctx.font = '13px JetBrains Mono, monospace';
      let textY = winY + 65;

      const logs = state.terminalLogs || [];
      const visibleLogs = logs.slice(-18);

      visibleLogs.forEach((line: string) => {
        if (line.startsWith('Session connected') || line.startsWith('FYJ Channel')) {
          ctx.fillStyle = '#38bdf8';
        } else if (line.startsWith('[System Event]')) {
          ctx.fillStyle = '#f59e0b';
        } else if (line.startsWith('[Clipboard Sync]')) {
          ctx.fillStyle = '#2dd4bf';
        } else if (line.includes('@')) {
          ctx.fillStyle = '#4ade80';
        } else {
          ctx.fillStyle = '#cbd5e1';
        }
        ctx.fillText(line, winX + 24, textY);
        textY += 22;
      });

      // Cursor kerdip
      if (Math.floor(Date.now() / 500) % 2 === 0) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(winX + 24 + ctx.measureText(visibleLogs[visibleLogs.length - 1] || '').width + 2, textY - 36, 8, 16);
      }
    }

    // 4. Start Menu jika terbuka
    if (state.isStartMenuOpen) {
      const menuX = 20;
      const menuY = 280;
      const menuW = 340;
      const menuH = 390;

      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 25;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.98)';
      ctx.beginPath();
      ctx.roundRect(menuX, menuY, menuW, menuH, 16);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Aplikasi Laboratorium', menuX + 20, menuY + 35);

      const menuItems = [
        'Visual Studio Code',
        'Wireshark Packet Analyzer',
        'Cisco Packet Tracer',
        'PostgreSQL pgAdmin 4',
        'Command Prompt (Admin)',
        'Pengaturan Jaringan & Adapter',
      ];

      menuItems.forEach((item, idx) => {
        const itemY = menuY + 65 + idx * 45;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.beginPath();
        ctx.roundRect(menuX + 15, itemY - 18, menuW - 30, 36, 8);
        ctx.fill();

        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(menuX + 25, itemY - 8, 16, 16);

        ctx.fillStyle = '#e2e8f0';
        ctx.font = '12px Inter, sans-serif';
        ctx.fillText(item, menuX + 52, itemY + 4);
      });
    }

    // 5. Taskbar Bawah
    const tbH = 48;
    const tbY = V_HEIGHT - tbH;
    ctx.fillStyle = 'rgba(3, 7, 18, 0.94)';
    ctx.fillRect(0, tbY, V_WIDTH, tbH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(0, tbY);
    ctx.lineTo(V_WIDTH, tbY);
    ctx.stroke();

    // Start Button (Windows logo / Apps)
    ctx.fillStyle = state.isStartMenuOpen ? '#0284c7' : '#0369a1';
    ctx.beginPath();
    ctx.roundRect(14, tbY + 6, 36, 36, 8);
    ctx.fill();

    // Windows / App icon
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(22, tbY + 14, 9, 9);
    ctx.fillRect(33, tbY + 14, 9, 9);
    ctx.fillRect(22, tbY + 25, 9, 9);
    ctx.fillRect(33, tbY + 25, 9, 9);

    // Taskbar pinned icons
    const tbIcons = ['Terminal', 'Code', 'Chrome', 'Files'];
    tbIcons.forEach((_, i) => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.roundRect(60 + i * 44, tbY + 6, 36, 36, 8);
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(78 + i * 44, tbY + 24, 7, 0, Math.PI * 2);
      ctx.fill();
    });

    // Clock and System Tray di kanan taskbar
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'right';
    const timeDisplay = state.currentTime || new Date().toLocaleTimeString();
    ctx.fillText(timeDisplay, V_WIDTH - 20, tbY + 22);

    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(new Date().toLocaleDateString(), V_WIDTH - 20, tbY + 36);

    // 6. Toast Notification jika shortcut disuntikkan
    const toast = shortcutToast || state.shortcutToast;
    if (toast) {
      ctx.fillStyle = 'rgba(20, 184, 166, 0.95)';
      ctx.beginPath();
      ctx.roundRect(V_WIDTH / 2 - 160, 40, 320, 38, 12);
      ctx.fill();

      ctx.fillStyle = '#042f2e';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(toast, V_WIDTH / 2, 64);
    }

    // 7. Render Kursor Mouse Jarak Jauh
    if (state.mouseX && state.mouseY) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(state.mouseX, state.mouseY);
      ctx.lineTo(state.mouseX, state.mouseY + 16);
      ctx.lineTo(state.mouseX + 4, state.mouseY + 12);
      ctx.lineTo(state.mouseX + 9, state.mouseY + 21);
      ctx.lineTo(state.mouseX + 12, state.mouseY + 19);
      ctx.lineTo(state.mouseX + 7, state.mouseY + 11);
      ctx.lineTo(state.mouseX + 12, state.mouseY + 11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }, [session.workstation, shortcutToast]);

  // Loop requestAnimationFrame untuk render kanvas super mulus
  useEffect(() => {
    let animId: number;
    const loop = () => {
      renderCanvas();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [renderCanvas]);

  // Inisialisasi WebSocket Tunnel
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/v1/tunnel/remote?token=${encodeURIComponent(session.token)}`;

    console.log('[RemoteViewport] Membuka WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setErrorMsg(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'FRAME_UPDATE') {
          serverStateRef.current = {
            ...serverStateRef.current,
            ...data.state,
          };
          if (data.state.clipboard) {
            setRemoteClipboard(data.state.clipboard);
          }
        } else if (data.type === 'PONG') {
          const latency = Date.now() - data.clientTime;
          setRttMs(latency);
        }
      } catch (err) {
        // Data guacd mentah jika ada
      }
    };

    ws.onerror = (err) => {
      console.error('[RemoteViewport] WebSocket error:', err);
      setErrorMsg('Gagal terhubung ke WebSocket Gateway');
    };

    ws.onclose = (event) => {
      setConnected(false);
      if (event.code === 4401 || event.code === 4001) {
        setErrorMsg('Token sesi kedaluwarsa atau tidak valid');
      }
    };

    // PING interval untuk ukur latensi RTT
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
      }
    }, 2000);

    return () => {
      clearInterval(pingInterval);
      ws.close();
    };
  }, [session.token]);

  // Konversi koordinat mouse event peramban ke koordinat kanvas virtual (1280x720)
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = V_WIDTH / rect.width;
    const scaleY = V_HEIGHT / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);
    serverStateRef.current.mouseX = x;
    serverStateRef.current.mouseY = y;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'MOUSE_MOVE', x, y }));
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'MOUSE_CLICK',
          button: e.button, // 0: left, 1: middle, 2: right
          x,
          y,
        })
      );
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault(); // Cegah klik kanan default browser
    const { x, y } = getCanvasCoords(e as any);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'MOUSE_CLICK',
          button: 2,
          x,
          y,
        })
      );
    }
  };

  // Keyboard capture
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Abaikan jika fokus pada input modal clipboard
      if ((e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'INPUT') {
        return;
      }

      // Cegah beberapa tombol khusus browser
      if (['Tab', 'Alt', 'F5'].includes(e.key)) {
        e.preventDefault();
      }

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'KEY_DOWN',
            key: e.key,
            code: e.code,
            ctrl: e.ctrlKey,
            alt: e.altKey,
            shift: e.shiftKey,
          })
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleInjectShortcut = (shortcut: string) => {
    setShortcutToast(`Tombol Terkirim: [${shortcut}]`);
    setTimeout(() => setShortcutToast(null), 2500);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'SHORTCUT', shortcut }));
    }
  };

  const handleSendClipboard = (text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'CLIPBOARD_SET', text }));
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleDisconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    fetchWorkstations();
    onClose();
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center select-none overflow-hidden"
    >
      {/* Floating HUD Toolbar */}
      <FloatingToolbar
        hostname={session.workstation.hostname}
        ipAddress={session.workstation.ipAddress}
        rttMs={rttMs}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onInjectShortcut={handleInjectShortcut}
        onOpenClipboard={() => setClipboardOpen(true)}
        onDisconnect={handleDisconnect}
      />

      {/* Main Screen HTML5 Canvas */}
      <div className="relative w-full h-full flex items-center justify-center p-2 canvas-crt">
        <canvas
          ref={canvasRef}
          width={V_WIDTH}
          height={V_HEIGHT}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onContextMenu={handleContextMenu}
          className="max-w-full max-h-full object-contain aspect-video shadow-2xl rounded-lg cursor-crosshair border border-slate-800"
        />

        {/* Connection status overlay jika terputus */}
        {!connected && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center gap-3 text-center p-6 z-20">
            <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/30 text-rose-400">
              <WifiOff className="w-8 h-8 animate-bounce" />
            </div>
            <h3 className="text-base font-bold text-white">Sesi Remote Terputus</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              {errorMsg || 'Koneksi ke gateway guacd telah berakhir atau ditutup.'}
            </p>
            <button
              onClick={handleDisconnect}
              className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white"
            >
              Kembali ke Dasbor Lab
            </button>
          </div>
        )}
      </div>

      {/* Clipboard Modal */}
      <ClipboardModal
        isOpen={clipboardOpen}
        onClose={() => setClipboardOpen(false)}
        currentRemoteClipboard={remoteClipboard}
        onSendClipboard={handleSendClipboard}
      />
    </div>
  );
};
