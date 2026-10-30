import React, { useState, useEffect, useRef } from 'react';
import {
  MoreVertical,
  Play,
  Zap,
  Power,
  RotateCcw,
  Edit2,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { Workstation } from '../../types';
import { StatusIndicator } from '../common/StatusIndicator';
import { useAuthStore } from '../../stores/authStore';
import { useLabStore } from '../../stores/labStore';
import { api } from '../../services/api';

interface WorkstationCardProps {
  workstation: Workstation;
  onEdit: (ws: Workstation) => void;
  onDelete: (id: number) => void;
}

export const WorkstationCard: React.FC<WorkstationCardProps> = ({
  workstation,
  onEdit,
  onDelete,
}) => {
  const { user } = useAuthStore();
  const {
    wakeOnLanWorkstations,
    shutdownWorkstations,
    rebootWorkstations,
    setActiveRemoteSession,
    isClassroomLocked,
    lockMessage,
  } = useLabStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const canControl = user?.role === 'SUPERADMIN' || user?.role === 'INSTRUCTOR';
  const isAdmin = user?.role === 'SUPERADMIN';
  const isOnline = workstation.powerStatus === 'ONLINE' || workstation.powerStatus === 'IN_SESSION';

  // Mini canvas adaptive snapshot generator (1-2 FPS)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let tick = 0;

    const renderPreview = () => {
      tick++;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      if (!isOnline) {
        // Layar mati / Powered Off
        ctx.fillStyle = '#060a12';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#334155';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('STANDBY / POWER OFF', w / 2, h / 2 - 8);

        ctx.font = '9px JetBrains Mono, monospace';
        ctx.fillStyle = '#1e293b';
        ctx.fillText('Listening for WoL Magic Packet', w / 2, h / 2 + 10);
      } else if (isClassroomLocked) {
        // Layar Terkunci oleh Instruktur
        ctx.fillStyle = '#451a03';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('INPUT TERKUNCI', w / 2, h / 2 - 10);

        ctx.font = '9px Inter, sans-serif';
        ctx.fillStyle = '#fed7aa';
        ctx.fillText(lockMessage || 'Perhatikan instruksi di depan', w / 2, h / 2 + 10);
      } else {
        // Layar Aktif (Simulasi Desktop)
        // Background wallpaper
        const grad = ctx.createLinearGradient(0, 0, w, h);
        if (workstation.osFamily === 'LINUX') {
          grad.addColorStop(0, '#2e0854');
          grad.addColorStop(1, '#0f172a');
        } else {
          grad.addColorStop(0, '#0c4a6e');
          grad.addColorStop(1, '#0369a1');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Terminal window mockup di tengah
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(25, 20, w - 50, h - 50);

        // Window header
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(25, 20, w - 50, 14);

        // Window dots
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(32, 27, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(39, 27, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(46, 27, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Terminal text
        ctx.font = '7.5px JetBrains Mono, monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`student@${workstation.hostname.toLowerCase()}:~$`, 32, 45);

        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`active_app: code .`, 32, 57);

        // Blinking cursor
        if (Math.floor(tick / 15) % 2 === 0) {
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(115, 50, 4, 8);
        }

        // Activity graph simulation
        ctx.strokeStyle = '#2dd4bf';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const startY = 80;
        ctx.moveTo(32, startY);
        for (let x = 32; x < w - 35; x += 10) {
          const randY = startY + Math.sin((x + tick * 4) * 0.1) * 8;
          ctx.lineTo(x, randY);
        }
        ctx.stroke();

        // Taskbar bawah
        ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
        ctx.fillRect(0, h - 16, w, 16);

        // Start logo
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(6, h - 12, 8, 8);

        // Clock
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        ctx.font = '8px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(timeStr, w - 8, h - 5);
      }
    };

    renderPreview();
    const interval = setInterval(renderPreview, 1000); // 1 FPS refresh
    return () => clearInterval(interval);
  }, [isOnline, isClassroomLocked, lockMessage, workstation.hostname, workstation.osFamily]);

  const handleStartRemote = async () => {
    if (!canControl) return;
    setConnecting(true);
    try {
      const session = await api.getRemoteToken(workstation.id);
      setActiveRemoteSession(session);
    } catch (err: any) {
      alert(`Gagal memulai sesi remote: ${err.message}`);
    } finally {
      setConnecting(false);
    }
  };

  const handleWoL = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    await wakeOnLanWorkstations([workstation.id]);
  };

  const handleShutdown = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (confirm(`Matikan unit '${workstation.hostname}'?`)) {
      await shutdownWorkstations([workstation.id]);
    }
  };

  const handleReboot = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (confirm(`Mulai ulang (reboot) '${workstation.hostname}'?`)) {
      await rebootWorkstations([workstation.id]);
    }
  };

  return (
    <div className="relative group bg-surface-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-200 flex flex-col">
      {/* Header Kartu */}
      <div className="px-3.5 py-2.5 bg-surface-850/80 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <StatusIndicator status={workstation.powerStatus} size="sm" />
          <span className="text-xs font-bold text-white truncate tracking-wide" title={workstation.hostname}>
            {workstation.hostname}
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
            R{workstation.gridRow}C{workstation.gridColumn}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-400 font-semibold px-1.5 py-0.5 rounded bg-slate-800/80">
            {workstation.connectionMode.replace('_', ' ')}
          </span>

          {/* Context Menu Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-750 transition-colors"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-1 w-44 rounded-xl bg-surface-850 border border-slate-700 shadow-2xl py-1 z-30 text-xs text-slate-200">
                  {canControl && (
                    <>
                      <button
                        onClick={handleStartRemote}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-700/60 text-brand-300"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Koneksi Interaktif</span>
                      </button>

                      <button
                        onClick={handleWoL}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-700/60 text-emerald-400"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Kirim Wake-on-LAN</span>
                      </button>

                      <button
                        onClick={handleReboot}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-700/60 text-amber-400"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Mulai Ulang (Reboot)</span>
                      </button>

                      <button
                        onClick={handleShutdown}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-700/60 text-rose-400"
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>Matikan (Shutdown)</span>
                      </button>

                      <div className="my-1 border-t border-slate-750" />
                    </>
                  )}

                  {isAdmin && (
                    <>
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onEdit(workstation);
                        }}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-700/60 text-slate-300"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Sunting Identitas</span>
                      </button>

                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onDelete(workstation.id);
                        }}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-rose-950/40 text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus Komputer</span>
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mini Screen Canvas Viewport */}
      <div
        className="relative aspect-video bg-black cursor-pointer overflow-hidden group/screen"
        onClick={handleStartRemote}
      >
        <canvas
          ref={canvasRef}
          width={320}
          height={180}
          className="w-full h-full object-cover block"
        />

        {/* Hover Overlay with 1-Click Remote Button */}
        {canControl && (
          <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover/screen:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-[2px]">
            <button
              disabled={connecting}
              className="px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-glow-teal transform hover:scale-105 active:scale-95 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{connecting ? 'Menghubungkan...' : 'Kendalikan Layar'}</span>
            </button>
            <span className="text-[10px] text-slate-300 font-mono">
              Port: {workstation.connectionMode === 'VNC' ? '5900' : '3389'}
            </span>
          </div>
        )}
      </div>

      {/* Footer Kartu */}
      <div className="p-3 bg-surface-900 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <div className="flex flex-col gap-0.5">
          <span className="text-slate-300 font-semibold">{workstation.ipAddress}</span>
          <span className="text-[10px] text-slate-400">{workstation.macAddress}</span>
        </div>

        <div className="flex items-center gap-1">
          {workstation.powerStatus === 'OFFLINE' ? (
            <button
              onClick={handleWoL}
              title="Kirim Wake-on-LAN Magic Packet"
              className="p-1.5 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            <button
              onClick={handleStartRemote}
              title="Buka Remote Control Interaktif"
              className="p-1.5 rounded-lg bg-brand-950/50 hover:bg-brand-900/60 text-brand-400 border border-brand-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
