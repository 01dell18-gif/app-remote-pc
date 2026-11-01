import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RemoteSessionInfo } from '../../types';
import { FloatingToolbar } from './FloatingToolbar';
import { ClipboardModal } from './ClipboardModal';
import { useLabStore } from '../../stores/labStore';
import { api } from '../../services/api';
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
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ic.name, ic.x + 24, ic.y + 62);
    });

    // 3. Jendela Aplikasi Aktif (Terminal Lab)
    if (state.isTerminalOpen) {
      const termX = 220;
      const termY = 80;
      const termW = 840;
      const termH = 500;

      // Bayangan jendela
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 15;

      // Header Jendela Terminal
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(termX, termY, termW, 36, [12, 12, 0, 0]);
      ctx.fill();

      // Reset bayangan untuk konten dalam
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Tombol jendela Mac/Linux style
      const dots = ['#ef4444', '#f59e0b', '#22c55e'];
      dots.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(termX + 20 + i * 18, termY + 18, 6, 0, Math.PI * 2);
        ctx.fill();
      });

      // Judul Terminal
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `Administrator: Command Prompt - ${session.workstation.hostname} (${session.workstation.ipAddress})`,
        termX + termW / 2,
        termY + 22
      );

      // Body Jendela Terminal
      ctx.fillStyle = 'rgba(2, 6, 23, 0.95)';
      ctx.beginPath();
      ctx.roundRect(termX, termY + 36, termW, termH - 36, [0, 0, 12, 12]);
      ctx.fill();

      // Border halus jendela
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(termX, termY, termW, termH);

      // Isi Log Terminal
      ctx.font = '12px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#38bdf8';

      let lineY = termY + 65;
      const logs = state.terminalLogs || [];
      const visibleLogs = logs.slice(-20);

      visibleLogs.forEach((line: string) => {
        if (line.startsWith('>') || line.startsWith('C:\\')) {
          ctx.fillStyle = '#4ade80';
        } else if (line.includes('ERROR') || line.includes('FAILED')) {
          ctx.fillStyle = '#f87171';
        } else if (line.includes('WARNING') || line.includes('SHORTCUT')) {
          ctx.fillStyle = '#facc15';
        } else {
          ctx.fillStyle = '#cbd5e1';
        }

        ctx.fillText(line, termX + 24, lineY);
        lineY += 20;
      });

      // Kursor berkedip terminal
      if (Math.floor(Date.now() / 500) % 2 === 0) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(termX + 24 + ctx.measureText('> ').width, lineY - 14, 8, 15);
      }
    }

    // 4. Start Menu Windows jika terbuka
    if (state.isStartMenuOpen) {
      const smX = 10;
      const smY = V_HEIGHT - 480;
      const smW = 340;
      const smH = 430;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.beginPath();
      ctx.roundRect(smX, smY, smW, smH, 16);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.strokeRect(smX, smY, smW, smH);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('FYJ Lab Workstation', smX + 20, smY + 36);

      ctx.font = '11px Inter, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`${session.workstation.hostname} · ${session.workstation.ipAddress}`, smX + 20, smY + 54);

      // Garis pemisah
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.moveTo(smX + 20, smY + 68);
      ctx.lineTo(smX + smW - 20, smY + 68);
      ctx.stroke();

      // Daftar item start menu
      const startItems = [
        'Command Prompt (Admin)',
        'Windows PowerShell',
        'Visual Studio Code',
        'Google Chrome',
        'File Explorer',
        'Task Manager',
        'Network Settings',
      ];

      startItems.forEach((item, idx) => {
        const itemY = smY + 95 + idx * 36;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.beginPath();
        ctx.roundRect(smX + 16, itemY - 16, smW - 32, 30, 8);
        ctx.fill();

        ctx.fillStyle = '#e2e8f0';
        ctx.font = '11px Inter, sans-serif';
        ctx.fillText(item, smX + 32, itemY + 4);
      });
    }

    // 5. Windows Taskbar (Bawah)
    const taskbarH = 46;
    ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
    ctx.fillRect(0, V_HEIGHT - taskbarH, V_WIDTH, taskbarH);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, V_HEIGHT - taskbarH);
    ctx.lineTo(V_WIDTH, V_HEIGHT - taskbarH);
    ctx.stroke();

    // Tombol Start Menu
    ctx.fillStyle = state.isStartMenuOpen ? '#0284c7' : 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.roundRect(12, V_HEIGHT - 38, 32, 30, 8);
    ctx.fill();

    // Ikon Logo Windows 4 kotak
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(20, V_HEIGHT - 30, 6, 6);
    ctx.fillRect(28, V_HEIGHT - 30, 6, 6);
    ctx.fillRect(20, V_HEIGHT - 22, 6, 6);
    ctx.fillRect(28, V_HEIGHT - 22, 6, 6);

    // Ikon Aplikasi di Taskbar
    const tbApps = ['#22c55e', '#38bdf8', '#eab308'];
    tbApps.forEach((c, idx) => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.roundRect(52 + idx * 38, V_HEIGHT - 38, 32, 30, 8);
      ctx.fill();

      ctx.fillStyle = c;
      ctx.fillRect(62 + idx * 38, V_HEIGHT - 28, 12, 12);
    });

    // Indikator Jam dan Tanggal di Pojok Kanan Taskbar
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(timeStr, V_WIDTH - 16, V_HEIGHT - 24);

    ctx.font = '9px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(dateStr, V_WIDTH - 16, V_HEIGHT - 12);

    // Kursor Mouse Remote
    if (state.mouseX && state.mouseY) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(state.mouseX, state.mouseY);
      ctx.lineTo(state.mouseX + 12, state.mouseY + 12);
      ctx.lineTo(state.mouseX + 5, state.mouseY + 12);
      ctx.lineTo(state.mouseX, state.mouseY + 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }, [session.workstation.osFamily, session.workstation.hostname, session.workstation.ipAddress]);

  // Loop rendering canvas
  useEffect(() => {
    let animationFrameId: number;
    const loop = () => {
      renderCanvas();
      animationFrameId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [renderCanvas]);

  // Koneksi WebSocket ke Gateway Backend
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/v1/tunnel/remote?token=${encodeURIComponent(session.token)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setErrorMsg(null);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'PONG') {
          const latency = Date.now() - msg.timestamp;
          setRttMs(latency);
        } else if (msg.type === 'STATE_UPDATE') {
          serverStateRef.current = {
            ...serverStateRef.current,
            ...msg.payload,
          };
        } else if (msg.type === 'CLIPBOARD') {
          setRemoteClipboard(msg.payload.text || '');
        }
      } catch {
        // Abaikan data biner / raw stream guacd
      }
    };

    ws.onerror = () => {
      setErrorMsg('Gagal menghubungkan WebSocket gateway. Memeriksa ketersediaan host...');
    };

    ws.onclose = () => {
      setConnected(false);
    };

    // Ping periodik untuk mengukur latensi RTT
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

  // Konversi koordinat event mouse peramban ke koordinat kanvas virtual 1280x720
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
    const coords = getCanvasCoords(e);
    serverStateRef.current.mouseX = coords.x;
    serverStateRef.current.mouseY = coords.y;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'MOUSE_MOVE',
          payload: { x: coords.x, y: coords.y },
        })
      );
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'MOUSE_CLICK',
          payload: { x: coords.x, y: coords.y, button: e.button },
        })
      );
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleInjectShortcut = (shortcut: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'SHORTCUT',
          payload: { key: shortcut },
        })
      );
    }
    setShortcutToast(`Tombol kombinasi '${shortcut}' berhasil dikirim.`);
    setTimeout(() => setShortcutToast(null), 2500);
  };

  const handleSendClipboard = (text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'CLIPBOARD',
          payload: { text },
        })
      );
    }
    setRemoteClipboard(text);
  };

  const handleLaunchMstsc = async () => {
    try {
      const res = await api.launchMstsc(session.workstation.id);
      setShortcutToast(res.message);
      setTimeout(() => setShortcutToast(null), 4000);
    } catch (err: any) {
      alert(`Gagal meluncurkan MSTSC: ${err.message}`);
    }
  };

  const handleDownloadRdp = () => {
    const url = api.getRdpDownloadUrl(session.workstation.id);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.workstation.hostname}.rdp`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
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
        onLaunchMstsc={handleLaunchMstsc}
        onDownloadRdp={handleDownloadRdp}
      />

      {/* Toast Notifikasi Shortcut */}
      {shortcutToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-cyan-500/60 text-cyan-200 px-4 py-2 rounded-xl text-xs shadow-2xl font-semibold animate-in fade-in duration-200">
          {shortcutToast}
        </div>
      )}

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
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleLaunchMstsc}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-700 hover:bg-cyan-600 text-white"
              >
                Buka dengan MSTSC Windows
              </button>
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white"
              >
                Kembali ke Dasbor Lab
              </button>
            </div>
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
