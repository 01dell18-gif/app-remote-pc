import React, { useState } from 'react';
import {
  Maximize2,
  Minimize2,
  X,
  Clipboard,
  Activity,
  ChevronDown,
  ChevronUp,
  Monitor,
  Download,
} from 'lucide-react';

interface FloatingToolbarProps {
  hostname: string;
  ipAddress: string;
  rttMs: number;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onInjectShortcut: (shortcut: string) => void;
  onOpenClipboard: () => void;
  onDisconnect: () => void;
  onLaunchMstsc?: () => void;
  onDownloadRdp?: () => void;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  hostname,
  ipAddress,
  rttMs,
  isFullscreen,
  onToggleFullscreen,
  onInjectShortcut,
  onOpenClipboard,
  onDisconnect,
  onLaunchMstsc,
  onDownloadRdp,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside aria-label="Bilah Kontrol Remote" className="fixed top-3 left-1/2 -translate-x-1/2 z-50 transition-all duration-300">
      <div className="glass-panel-elevated rounded-2xl px-3 py-1.5 flex items-center gap-3 text-xs shadow-2xl border border-slate-700/80 bg-surface-900/90 backdrop-blur-md">
        {/* Workstation Badge */}
        <div className="flex items-center gap-2 pr-3 border-r border-slate-700/60">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-glow-emerald animate-pulse" />
          <div className="flex flex-col">
            <span className="font-bold text-white text-[11px] leading-tight tracking-wide">{hostname}</span>
            <span className="text-[10px] text-slate-400 font-mono leading-tight">{ipAddress}</span>
          </div>
        </div>

        {/* Latency RTT Badge */}
        <div
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-surface-850 border border-slate-800 text-[10px] font-mono"
          title="Round Trip Time (Latensi)"
        >
          <Activity className="w-3 h-3 text-teal-400" />
          <span className={rttMs < 50 ? 'text-emerald-400' : rttMs < 100 ? 'text-amber-400' : 'text-rose-400'}>
            {rttMs} ms
          </span>
        </div>

        {!isCollapsed && (
          <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
            {/* Native Windows RDP (MSTSC) Button */}
            {onLaunchMstsc && (
              <button
                onClick={onLaunchMstsc}
                title="Buka langsung menggunakan aplikasi Microsoft Remote Desktop (MSTSC)"
                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 transition-colors"
              >
                <Monitor className="w-3 h-3" />
                <span>Buka MSTSC</span>
              </button>
            )}

            {/* Download .RDP Profile */}
            {onDownloadRdp && (
              <button
                onClick={onDownloadRdp}
                title="Unduh file konfigurasi .RDP"
                className="p-1.5 rounded-xl bg-surface-850 hover:bg-surface-800 text-slate-300 hover:text-white border border-slate-750 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}

            {/* System Shortcut Buttons */}
            <div className="flex items-center gap-1 px-1 bg-surface-850/60 rounded-xl border border-slate-800">
              <button
                onClick={() => onInjectShortcut('Ctrl+Alt+Del')}
                title="Kirim kombinasi Ctrl + Alt + Delete"
                className="px-2 py-1 rounded-lg text-[10px] font-bold font-mono text-slate-300 hover:text-white hover:bg-slate-700/60 transition-colors"
              >
                Ctrl+Alt+Del
              </button>
              <button
                onClick={() => onInjectShortcut('Alt+Tab')}
                title="Kirim kombinasi Alt + Tab"
                className="px-2 py-1 rounded-lg text-[10px] font-bold font-mono text-slate-300 hover:text-white hover:bg-slate-700/60 transition-colors"
              >
                Alt+Tab
              </button>
              <button
                onClick={() => onInjectShortcut('Win')}
                title="Kirim tombol Logo Windows"
                className="px-2 py-1 rounded-lg text-[10px] font-bold font-mono text-slate-300 hover:text-white hover:bg-slate-700/60 transition-colors"
              >
                Win Key
              </button>
              <button
                onClick={() => onInjectShortcut('Esc')}
                title="Kirim tombol Escape"
                className="px-2 py-1 rounded-lg text-[10px] font-bold font-mono text-slate-300 hover:text-white hover:bg-slate-700/60 transition-colors"
              >
                Esc
              </button>
            </div>

            {/* Clipboard Sync */}
            <button
              onClick={onOpenClipboard}
              title="Buka Papan Klip Dua Arah (Shared Clipboard)"
              className="p-1.5 rounded-xl bg-surface-850 hover:bg-surface-800 text-slate-300 hover:text-teal-400 border border-slate-750 transition-colors"
            >
              <Clipboard className="w-3.5 h-3.5" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={onToggleFullscreen}
              title={isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh'}
              className="p-1.5 rounded-xl bg-surface-850 hover:bg-surface-800 text-slate-300 hover:text-white border border-slate-750 transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
          title={isCollapsed ? 'Perluas Toolbar' : 'Perkecil Toolbar'}
        >
          {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>

        {/* Disconnect button */}
        <button
          onClick={onDisconnect}
          title="Putus Sesi dan Kembali ke Dasbor"
          className="px-2.5 py-1 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 font-semibold text-[11px] flex items-center gap-1 transition-all active:scale-95"
        >
          <X className="w-3.5 h-3.5" />
          <span>Putus</span>
        </button>
      </div>
    </aside>
  );
};
