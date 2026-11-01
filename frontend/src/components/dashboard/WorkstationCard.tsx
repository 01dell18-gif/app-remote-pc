import React, { useState } from 'react';
import {
  MoreVertical,
  Zap,
  Power,
  RotateCcw,
  Edit2,
  Trash2,
  ExternalLink,
  Terminal,
  Ban,
  RefreshCw,
  Monitor,
  Download,
  HelpCircle,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Workstation } from '../../types';
import { CardSize } from '../../stores/labStore';
import { StatusIndicator } from '../common/StatusIndicator';
import { useAuthStore } from '../../stores/authStore';
import { useLabStore } from '../../stores/labStore';
import { api } from '../../services/api';

interface WorkstationCardProps {
  workstation: Workstation;
  onEdit: (ws: Workstation) => void;
  onDelete: (id: number) => void;
  onOpenAppManager: (ws: Workstation) => void;
  onOpenRestrictionManager?: (ws: Workstation) => void;
  size?: CardSize;
}

export const WorkstationCard: React.FC<WorkstationCardProps> = React.memo(({
  workstation,
  onEdit,
  onDelete,
  onOpenAppManager,
  onOpenRestrictionManager,
  size = 'medium',
}) => {
  const { user } = useAuthStore();
  const {
    wakeOnLanWorkstations,
    shutdownWorkstations,
    rebootWorkstations,
    setActiveRemoteSession,
    fetchWorkstations,
  } = useLabStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [pingFeedback, setPingFeedback] = useState<string | null>(null);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  // Akses wewenang kontrol & manajemen (SUPERADMIN & INSTRUCTOR)
  const canControl = user?.role === 'SUPERADMIN' || user?.role === 'INSTRUCTOR';
  const canManage = user?.role === 'SUPERADMIN' || user?.role === 'INSTRUCTOR';
  const isOnline = workstation.powerStatus === 'ONLINE' || workstation.powerStatus === 'IN_SESSION';

  const targetPort = workstation.connectionMode === 'VNC' ? 5900 : 3389;

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

  const handleLaunchMstsc = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.launchMstsc(workstation.id);
      setPingFeedback(res.message);
      setTimeout(() => setPingFeedback(null), 4000);
    } catch (err: any) {
      alert(`Gagal meluncurkan MSTSC: ${err.message}`);
    }
  };

  const handleDownloadRdp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = api.getRdpDownloadUrl(workstation.id);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workstation.hostname}.rdp`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePing = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPinging(true);
    setPingFeedback(null);
    try {
      const res = await api.pingWorkstation(workstation.id);
      await fetchWorkstations();
      const diag = res.workstation.diagnostics;
      if (diag) {
        setPingFeedback(diag.message);
      } else {
        setPingFeedback('Pemeriksaan selesai.');
      }
    } catch (err: any) {
      setPingFeedback(`Galat ping: ${err.message}`);
    } finally {
      setIsPinging(false);
      setTimeout(() => setPingFeedback(null), 5000);
    }
  };

  const handleWoL = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    await wakeOnLanWorkstations([workstation.id]);
    setPingFeedback('Sinyal Wake-on-LAN telah dipancarkan!');
    setTimeout(() => setPingFeedback(null), 4000);
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
    <div className="relative group bg-surface-900/95 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-200 flex flex-col">
      {/* Header Kartu */}
      <div
        className={`${
          size === 'small' ? 'px-2.5 py-1.5' : size === 'large' ? 'px-4 py-3' : 'px-3.5 py-2'
        } bg-surface-850/90 border-b border-slate-800/80 flex items-center justify-between gap-1`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <StatusIndicator status={workstation.powerStatus} size={size === 'small' ? 'sm' : 'md'} />
          <span
            className={`${
              size === 'small' ? 'text-[11px]' : size === 'large' ? 'text-sm' : 'text-xs'
            } font-bold text-white truncate tracking-wide`}
            title={workstation.hostname}
          >
            {workstation.hostname}
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono shrink-0">
            R{workstation.gridRow}C{workstation.gridColumn}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isOnline && workstation.diagnostics?.latencyMs !== null && (
            <span className="text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 font-mono px-1.5 py-0.5 rounded">
              ⚡ {workstation.diagnostics?.latencyMs ?? 1}ms
            </span>
          )}

          <span className="text-[10px] text-slate-400 font-semibold px-1.5 py-0.5 rounded bg-slate-800/80 hidden sm:inline-block">
            {workstation.connectionMode.replace('_', ' ')}
          </span>

          {/* Tombol Cepat: Sunting & Hapus Langsung di Header */}
          {canManage && (
            <div className="flex items-center gap-0.5 ml-1 border-l border-slate-750 pl-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(workstation);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-750 transition-colors"
                title="Sunting Data Perangkat (Hostname, IP, MAC)"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(workstation.id);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                title="Hapus Perangkat dari Lab"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Context Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-750 transition-colors"
              title="Menu Tindakan Lengkap"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-1 w-52 rounded-xl bg-surface-850 border border-slate-700 shadow-2xl py-1 z-30 text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-100">
                  {canControl && (
                    <>
                      <button
                        onClick={handleStartRemote}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-700/60 text-brand-300 font-semibold"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Koneksi Interaktif (Web)</span>
                      </button>

                      <button
                        onClick={handleLaunchMstsc}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-700/60 text-cyan-300 font-medium"
                      >
                        <Monitor className="w-3.5 h-3.5" />
                        <span>Buka RDP Windows (MSTSC)</span>
                      </button>

                      <button
                        onClick={handleDownloadRdp}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-700/60 text-slate-300 font-medium"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Unduh Profil (.RDP)</span>
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

                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onOpenAppManager(workstation);
                        }}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-700/60 text-teal-300 font-medium"
                      >
                        <Terminal className="w-3.5 h-3.5" />
                        <span>Buka / Tutup Aplikasi</span>
                      </button>

                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onOpenRestrictionManager?.(workstation);
                        }}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-700/60 text-purple-300 font-medium"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Batasi Aplikasi / Web</span>
                      </button>
                    </>
                  )}

                  {/* Menu Sunting & Hapus Workstation */}
                  {canManage && (
                    <>
                      <div className="my-1 border-t border-slate-750" />
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onEdit(workstation);
                        }}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-amber-950/40 text-amber-300 font-medium"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                        <span>Sunting Data Perangkat</span>
                      </button>

                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onDelete(workstation.id);
                        }}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-rose-950/40 text-rose-400 font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>Hapus Komputer dari Lab</span>
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Badan Kartu (Workstation Monitor / Diagnostic View) */}
      <div className="relative flex-1 bg-slate-950 flex flex-col justify-between overflow-hidden min-h-[160px] p-3">
        {/* Toast Notifikasi Feedback Cepat */}
        {pingFeedback && (
          <div className="absolute top-2 inset-x-2 z-20 bg-slate-900/95 border border-cyan-500/50 text-cyan-200 text-[11px] p-2 rounded-lg shadow-xl animate-in fade-in duration-150 flex items-start gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 shrink-0 mt-0.5 text-cyan-400" />
            <span className="flex-1 leading-tight">{pingFeedback}</span>
          </div>
        )}

        {!isOnline ? (
          /* TAMPILAN JIKA TIDAK TERHUBUNG (OFFLINE / UNREACHABLE) */
          <div className="flex flex-col h-full justify-between gap-2.5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-1.5 text-rose-400 font-bold text-xs">
                <WifiOff className="w-4 h-4 shrink-0 text-rose-500" />
                <span>TIDAK TERHUBUNG</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                Port {targetPort} Tertutup
              </span>
            </div>

            {/* Kotak Informasi Diagnosa Jaringan */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col gap-1 text-[11px]">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-500">Target IP:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-cyan-300 font-semibold">{workstation.ipAddress}</span>
                  {canManage && (
                    <button
                      onClick={() => onEdit(workstation)}
                      title="Ubah Alamat IP atau Hostname"
                      className="text-[10px] text-amber-400 hover:text-amber-300 underline font-medium"
                    >
                      [Ubah]
                    </button>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-500">MAC (Fisik):</span>
                <span className="font-mono text-slate-300">{workstation.macAddress}</span>
              </div>
              <div className="mt-1 pt-1.5 border-t border-slate-800/60 text-slate-400 text-[10.5px] leading-relaxed">
                <span className="text-amber-400/90 font-medium">Diagnosa: </span>
                {workstation.diagnostics?.message ||
                  'Host tidak merespons koneksi ICMP Ping atau TCP Port 3389. Komputer fisik kemungkinan mati atau port belum diizinkan.'}
              </div>
            </div>

            {/* Panel Bantuan / Troubleshoot Toggle */}
            {showTroubleshoot && (
              <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-2.5 text-[10.5px] text-amber-200/90 leading-tight flex flex-col gap-1">
                <div className="font-bold flex items-center gap-1 text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5" /> Panduan Solusi PC Fisik:
                </div>
                <div>1. Pastikan PC fisik dinyalakan (atau klik Bangunkan WoL).</div>
                <div>2. Di PC target: Buka <b>Settings &rarr; System &rarr; Remote Desktop</b> &rarr; Aktifkan.</div>
                <div>3. Pastikan Firewall Windows mengizinkan Inbound Port 3389.</div>
              </div>
            )}

            {/* Tombol Aksi Cepat Saat Offline */}
            <div className="flex items-center gap-1.5 pt-1">
              {canControl && (
                <button
                  onClick={handleWoL}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  title="Kirim Magic Packet WoL"
                >
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Bangunkan (WoL)</span>
                </button>
              )}

              <button
                onClick={handlePing}
                disabled={isPinging}
                className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-medium text-[11px] flex items-center gap-1 transition-all disabled:opacity-50"
                title="Uji Ping & Cek Port Sekarang"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isPinging ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Uji Ping</span>
              </button>

              <button
                onClick={() => setShowTroubleshoot(!showTroubleshoot)}
                className={`p-1.5 rounded-lg border text-slate-300 transition-colors ${
                  showTroubleshoot ? 'bg-amber-900/50 border-amber-600' : 'bg-slate-850 border-slate-700 hover:bg-slate-750'
                }`}
                title="Lihat Panduan Solusi"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>
          </div>
        ) : (
          /* TAMPILAN JIKA TERHUBUNG (ONLINE / AKTIF) */
          <div className="flex flex-col h-full justify-between gap-2">
            {/* Header Status Perangkat */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{workstation.powerStatus === 'IN_SESSION' ? 'SESI REMOTE AKTIF' : 'TERHUBUNG & AKTIF'}</span>
              </div>
              <span className="text-[10px] text-cyan-300 font-mono bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/50">
                {workstation.osFamily}
              </span>
            </div>

            {/* Representasi Monitor Komputer Asli */}
            <div className="relative bg-gradient-to-br from-slate-900 via-slate-900/90 to-surface-850 border border-slate-750 rounded-xl p-2.5 flex flex-col justify-between gap-1 shadow-inner">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-200 font-semibold truncate">
                  <Monitor className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                  <span className="truncate">{workstation.hostname}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{workstation.ipAddress}</span>
              </div>

              <div className="text-[10px] text-slate-400 flex items-center justify-between mt-1">
                <span>Protokol: {workstation.connectionMode.replace('_', ' ')}</span>
                <span className="text-emerald-400 font-mono">Port {targetPort} Open</span>
              </div>

              <div className="text-[9.5px] text-slate-500 truncate mt-0.5">
                {workstation.diagnostics?.message || 'Workstation siap untuk pengawasan dan kendali jarak jauh penuh.'}
              </div>
            </div>

            {/* Tombol Kendali Cepat di Kartu */}
            <div className="flex items-center gap-1.5 pt-1">
              <button
                onClick={handleStartRemote}
                disabled={connecting}
                className="flex-1 py-1.5 px-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all shadow-md shadow-brand-900/40 disabled:opacity-50"
                title="Buka Viewport Remote di Web"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{connecting ? 'Menghubungkan...' : 'Remote Web'}</span>
              </button>

              <button
                onClick={handleLaunchMstsc}
                className="py-1.5 px-2 rounded-lg bg-cyan-700/80 hover:bg-cyan-600 text-white font-semibold text-[11px] flex items-center justify-center gap-1 transition-all"
                title="Buka langsung dengan Microsoft Remote Desktop Windows (MSTSC)"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">MSTSC</span>
              </button>

              <button
                onClick={handleDownloadRdp}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                title="Unduh Profil .RDP"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handlePing}
                disabled={isPinging}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 border border-slate-700 transition-colors"
                title="Uji Ping"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Kartu */}
      <div className="px-3.5 py-1.5 bg-surface-900 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
        <span className="font-mono text-slate-300 truncate">{workstation.ipAddress}</span>
        <span className="font-mono text-slate-500 truncate">{workstation.macAddress}</span>
      </div>
    </div>
  );
});
