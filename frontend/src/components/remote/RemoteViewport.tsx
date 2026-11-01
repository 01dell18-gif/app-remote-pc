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
  const realScreenImageRef = useRef<HTMLImageElement | null>(null);

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

  // Render kanvas lokal (Layar Fisik Asli)
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. JIKA LAYAR ASLI DITERIMA DARI AGEN PERANGKAT FISIK
    if (realScreenImageRef.current) {
      ctx.drawImage(realScreenImageRef.current, 0, 0, V_WIDTH, V_HEIGHT);
      return;
    }

    // 2. TAMPILAN GATEWAY PERANGKAT ASLI (MENUNGGU / KONTROL RDP)
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

    // Header Jendela Gateway
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, V_WIDTH, 44);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`🖥️ REMOTE PERANGKAT FISIK: ${session.workstation.hostname} (${session.workstation.ipAddress})`, 24, 27);

    // Kartu Status Tengah
    const boxW = 660;
    const boxH = 340;
    const boxX = (V_WIDTH - boxW) / 2;
    const boxY = (V_HEIGHT - boxH) / 2;

    ctx.fillStyle = '#0b1329';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Layar Fisik: ${session.workstation.hostname}`, V_WIDTH / 2, boxY + 50);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText(`Alamat IP Target: ${session.workstation.ipAddress} | Port RDP 3389 Aktif`, V_WIDTH / 2, boxY + 80);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillText(`PILIHAN KONTROL PERANGKAT ASLI:`, V_WIDTH / 2, boxY + 130);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillText(`1. Klik tombol 'Buka MSTSC' di bilah atas untuk layar penuh Windows asli (60 FPS)`, V_WIDTH / 2, boxY + 165);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText(`2. Untuk streaming layar langsung di dalam peramban web ini:`, V_WIDTH / 2, boxY + 215);

    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 12px JetBrains Mono, monospace';
    ctx.fillText(`Jalankan 'JALANKAN_APLIKASI.bat' di PC ${session.workstation.hostname} dan pilih Opsi [2]`, V_WIDTH / 2, boxY + 245);

    ctx.fillStyle = '#64748b';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText(`Sistem sedang mendengarkan streaming frame dari perangkat...`, V_WIDTH / 2, boxY + 295);
  }, [session.workstation.hostname, session.workstation.ipAddress]);

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
        if (msg.type === 'REAL_SCREEN_FRAME' && msg.data) {
          const img = new Image();
          img.onload = () => {
            realScreenImageRef.current = img;
          };
          img.src = msg.data;
        } else if (msg.type === 'PONG') {
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
