import React, { useState } from 'react';
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
  Settings2,
  Terminal,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useLabStore } from '../../stores/labStore';

interface NavbarProps {
  onOpenAddModal: () => void;
  onOpenAuditModal: () => void;
  onOpenLockModal: () => void;
  onOpenManageLabsModal: () => void;
  onOpenRemoteAppModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAddModal,
  onOpenAuditModal,
  onOpenLockModal,
  onOpenManageLabsModal,
  onOpenRemoteAppModal,
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

  const [labDropdownOpen, setLabDropdownOpen] = useState(false);

  const onlineCount = workstations.filter((w) => w.powerStatus === 'ONLINE').length;
  const inSessionCount = workstations.filter((w) => w.powerStatus === 'IN_SESSION').length;
  const offlineCount = workstations.filter((w) => w.powerStatus === 'OFFLINE').length;

  const handleWakeAll = async () => {
    const offlineIds = workstations.filter((w) => w.powerStatus === 'OFFLINE').map((w) => w.id);
    if (offlineIds.length === 0) {
      alert('Semua workstation di lab ini sudah dalam kondisi menyala!');
      return;
    }
    if (confirm(`Kirim sinyal Magic Packet Wake-on-LAN ke ${offlineIds.length} unit komputer yang sedang mati?`)) {
      await wakeOnLanWorkstations(offlineIds);
    }
  };

  const handleShutdownAll = async () => {
    const activeIds = workstations.filter((w) => w.powerStatus !== 'OFFLINE').map((w) => w.id);
    if (activeIds.length === 0) {
      alert('Tidak ada workstation yang aktif untuk dimatikan.');
      return;
    }
    if (confirm(`PENTING: Matikan ${activeIds.length} unit komputer aktif di lab ini secara tertib?`)) {
      await shutdownWorkstations(activeIds);
    }
  };

  const canManage = user?.role === 'SUPERADMIN' || user?.role === 'INSTRUCTOR';
  const isAdmin = user?.role === 'SUPERADMIN';

  return (
    <header className="sticky top-0 z-40 w-full bg-surface-900/95 backdrop-blur-md border-b border-slate-800/80 shadow-xl">
      <div className="max-w-[1700px] mx-auto px-4 lg:px-6 h-16 flex items-center justify-between gap-3">
        {/* Sisi Kiri: Brand Logo & Pemilih Lab */}
        <div className="flex items-center gap-4 min-w-0">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-teal-500 to-emerald-400 flex items-center justify-center shadow-glow-teal text-slate-950">
              <Monitor className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base tracking-tight whitespace-nowrap">
                  FYJ Channel <span className="text-brand-400">Remote</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-500/10 text-brand-400 border border-brand-500/20 whitespace-nowrap hidden sm:inline-block">
                  LAN GATEWAY
                </span>
              </div>
              <span className="text-[11px] text-slate-400 whitespace-nowrap hidden lg:block">
                Sistem Kendali & Pemantauan Lab Komputer
              </span>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-slate-800 hidden md:block shrink-0" />

          {/* Pemilih Lab Custom (Dropdown Modern) */}
          <div className="relative shrink-0">
            <button
              onClick={() => setLabDropdownOpen(!labDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-850 hover:bg-surface-800 border border-slate-700/80 text-xs font-semibold text-white transition-all shadow-sm"
            >
              <Layers className="w-3.5 h-3.5 text-brand-400" />
              <span className="max-w-[160px] sm:max-w-[220px] truncate text-left">
                {selectedLab ? selectedLab.labName : 'Pilih Laboratorium'}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${labDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {labDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setLabDropdownOpen(false)}
                />
                <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-surface-850 border border-slate-700 shadow-2xl p-2 z-30 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Ruangan Lab Tersedia</span>
                    <span className="text-teal-400 font-mono">{labs.length} Lab</span>
                  </div>

                  <div className="space-y-1 max-h-56 overflow-y-auto my-1">
                    {labs.map((lab) => {
                      const active = selectedLab?.id === lab.id;
                      return (
                        <button
                          key={lab.id}
                          onClick={() => {
                            selectLab(lab.id);
                            setLabDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between ${
                            active
                              ? 'bg-brand-500/20 text-brand-300 font-bold border border-brand-500/30'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div className="truncate mr-2">
                            <div className="truncate">{lab.labName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Subnet: {lab.subnetBroadcast}
                            </div>
                          </div>
                          {active && <span className="w-2 h-2 rounded-full bg-brand-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {isAdmin && (
                    <div className="pt-2 border-t border-slate-800 mt-1">
                      <button
                        onClick={() => {
                          setLabDropdownOpen(false);
                          onOpenManageLabsModal();
                        }}
                        className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-brand-400 hover:bg-brand-500/10 flex items-center justify-center gap-1.5 transition-colors border border-brand-500/20"
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                        <span>Kelola / Tambah Ruang Lab</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Ringkasan Metrik Cepat */}
        <div className="hidden xl:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-surface-850/80 border border-slate-800 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-glow-emerald" />
            <span className="text-white font-bold">{onlineCount}</span>
            <span className="text-slate-400">Online</span>
          </div>
          <div className="w-[1px] h-3.5 bg-slate-800" />
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-glow-amber" />
            <span className="text-white font-bold">{inSessionCount}</span>
            <span className="text-slate-400">Sesi</span>
          </div>
          <div className="w-[1px] h-3.5 bg-slate-800" />
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-glow-rose" />
            <span className="text-white font-bold">{offlineCount}</span>
            <span className="text-slate-400">Offline</span>
          </div>
        </div>

        {/* Sisi Kanan: Aksi Cepat & Profil Pengguna */}
        <div className="flex items-center gap-2 shrink-0">
          {canManage && (
            <div className="flex items-center gap-1.5">
              {/* Tombol WoL Massal */}
              <button
                onClick={handleWakeAll}
                title="Bangunkan seluruh komputer mati di lab ini via Wake-on-LAN"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                <span>Nyalakan Semua (WoL)</span>
              </button>

              {/* Tombol Shutdown Massal */}
              <button
                onClick={handleShutdownAll}
                title="Matikan seluruh komputer aktif secara tertib"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Power className="w-3.5 h-3.5 text-rose-400" />
                <span>Matikan Semua</span>
              </button>

              {/* Tombol Kunci Layar Siswa */}
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
                <span className="hidden sm:inline">
                  {isClassroomLocked ? 'Layar Terkunci' : 'Kunci Layar'}
                </span>
              </button>

              {/* Tombol Jalankan / Tutup Aplikasi Massal */}
              <button
                onClick={onOpenRemoteAppModal}
                title="Buka atau tutup aplikasi pada seluruh komputer lab"
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-850 hover:bg-surface-800 text-teal-300 border border-teal-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Terminal className="w-3.5 h-3.5 text-teal-400" />
                <span>Jalankan Aplikasi</span>
              </button>

              {/* Tombol Tambah Komputer */}
              {isAdmin && (
                <button
                  onClick={onOpenAddModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-glow-teal transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Tambah PC</span>
                </button>
              )}
            </div>
          )}

          {/* Audit Logs */}
          <button
            onClick={onOpenAuditModal}
            title="Riwayat Jejak Audit"
            className="p-2 rounded-xl bg-surface-850 hover:bg-surface-800 text-slate-400 hover:text-slate-200 border border-slate-700/60 transition-colors"
          >
            <History className="w-4 h-4" />
          </button>

          {/* Profil Akun Pengguna */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-xs font-bold text-white leading-tight">
                {user?.fullName || 'Pengguna'}
              </span>
              <div className="flex items-center justify-end gap-1 text-[10px] text-brand-400 font-mono font-semibold">
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
