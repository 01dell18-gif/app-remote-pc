import React from 'react';
import {
  Monitor,
  Zap,
  Power,
  Lock,
  Plus,
  History,
  LogOut,
  ChevronDown,
  Layers,
  Shield,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useLabStore } from '../../stores/labStore';

interface NavbarProps {
  onOpenAddModal: () => void;
  onOpenAuditModal: () => void;
  onOpenLockModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAddModal,
  onOpenAuditModal,
  onOpenLockModal,
}) => {
  const { user, logout } = useAuthStore();
  const {
    labs,
    selectedLab,
    selectLab,
    workstations,
    wakeOnLanWorkstations,
    shutdownWorkstations,
    isClassroomLocked,
  } = useLabStore();

  const onlineCount = workstations.filter((w) => w.powerStatus === 'ONLINE').length;
  const inSessionCount = workstations.filter((w) => w.powerStatus === 'IN_SESSION').length;
  const offlineCount = workstations.filter((w) => w.powerStatus === 'OFFLINE').length;

  const handleWakeAll = async () => {
    const offlineIds = workstations.filter((w) => w.powerStatus === 'OFFLINE').map((w) => w.id);
    if (offlineIds.length === 0) {
      alert('Semua workstation sudah menyala!');
      return;
    }
    if (confirm(`Kirim paket Wake-on-LAN ke ${offlineIds.length} unit komputer yang sedang mati?`)) {
      await wakeOnLanWorkstations(offlineIds);
    }
  };

  const handleShutdownAll = async () => {
    const activeIds = workstations.filter((w) => w.powerStatus !== 'OFFLINE').map((w) => w.id);
    if (activeIds.length === 0) {
      alert('Tidak ada workstation aktif untuk dimatikan.');
      return;
    }
    if (confirm(`PENTING: Matikan ${activeIds.length} unit komputer aktif di lab ini secara tertib?`)) {
      await shutdownWorkstations(activeIds);
    }
  };

  const canManage = user?.role === 'SUPERADMIN' || user?.role === 'INSTRUCTOR';
  const isAdmin = user?.role === 'SUPERADMIN';

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 shadow-md">
      <div className="max-w-[1600px] mx-auto px-4 lg:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand & Lab Selector */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-teal-400 flex items-center justify-center shadow-glow-teal text-slate-950">
              <Monitor className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base tracking-tight">
                  FYJ Channel <span className="text-brand-400">Remote</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  LAN GATEWAY
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Sistem Kendali & Pemantauan Lab Komputer
              </p>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-slate-800 hidden md:block" />

          {/* Lab Selector Dropdown */}
          <div className="relative group">
            <select
              value={selectedLab?.id || ''}
              onChange={(e) => selectLab(Number(e.target.value))}
              aria-label="Pilih Ruang Laboratorium"
              className="appearance-none bg-surface-850 hover:bg-surface-800 border border-slate-700/60 rounded-xl pl-9 pr-9 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
            >
              {labs.map((lab) => (
                <option key={lab.id} value={lab.id} className="bg-surface-900 text-slate-200">
                  {lab.labName} ({lab.subnetBroadcast})
                </option>
              ))}
            </select>
            <Layers className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Live Metrics Summary */}
        <div className="hidden xl:flex items-center gap-4 px-3 py-1.5 rounded-xl bg-surface-900/80 border border-slate-800/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-glow-emerald" />
            <span className="text-slate-300 font-medium">{onlineCount}</span>
            <span className="text-slate-400">Online</span>
          </div>
          <div className="w-[1px] h-3.5 bg-slate-800" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-glow-amber" />
            <span className="text-slate-300 font-medium">{inSessionCount}</span>
            <span className="text-slate-400">Sesi</span>
          </div>
          <div className="w-[1px] h-3.5 bg-slate-800" />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-glow-rose" />
            <span className="text-slate-300 font-medium">{offlineCount}</span>
            <span className="text-slate-400">Offline</span>
          </div>
        </div>

        {/* Action Controls & User */}
        <div className="flex items-center gap-2.5">
          {canManage && (
            <>
              {/* Wake All */}
              <button
                onClick={handleWakeAll}
                title="Bangunkan seluruh PC offline via Magic Packet Wake-on-LAN"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>Nyalakan Semua (WoL)</span>
              </button>

              {/* Shutdown All */}
              <button
                onClick={handleShutdownAll}
                title="Matikan seluruh PC aktif di lab ini"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Power className="w-3.5 h-3.5 text-rose-400" />
                <span>Matikan Semua</span>
              </button>

              {/* Lock Classroom */}
              <button
                onClick={onOpenLockModal}
                title="Kunci masukan mouse & keyboard siswa"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isClassroomLocked
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-glow-amber animate-pulse'
                    : 'bg-surface-850 hover:bg-surface-800 text-slate-300 border border-slate-700/60'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isClassroomLocked ? 'Layar Terkunci' : 'Kunci Layar'}</span>
              </button>

              {/* Add Workstation (Admin only) */}
              {isAdmin && (
                <button
                  onClick={onOpenAddModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-glow-teal transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="hidden md:inline">Tambah PC</span>
                </button>
              )}
            </>
          )}

          {/* Audit Logs */}
          <button
            onClick={onOpenAuditModal}
            title="Riwayat Jejak Audit"
            className="p-2 rounded-xl bg-surface-850 hover:bg-surface-800 text-slate-400 hover:text-slate-200 border border-slate-700/60 transition-colors"
          >
            <History className="w-4 h-4" />
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="hidden lg:block text-right">
              <p className="text-xs font-semibold text-slate-200 leading-tight">
                {user?.fullName || 'Pengguna'}
              </p>
              <div className="flex items-center justify-end gap-1 text-[10px] text-brand-400">
                <Shield className="w-3 h-3" />
                <span>{user?.role}</span>
              </div>
            </div>
            <button
              onClick={logout}
              title="Keluar (Logout)"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
