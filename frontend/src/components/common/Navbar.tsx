import React, { useState } from 'react';
import {
  Zap,
  Power,
  Lock,
  History,
  LogOut,
  ChevronDown,
  Layers,
  Terminal,
  Ban,
  FileSpreadsheet,
  PanelLeft,
  Wifi,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useLabStore } from '../../stores/labStore';

interface NavbarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenAuditModal: () => void;
  onOpenLockModal: () => void;
  onOpenManageLabsModal: () => void;
  onOpenRemoteAppModal: () => void;
  onOpenPowerModal: (mode: 'WAKE' | 'SHUTDOWN') => void;
  onOpenRestrictionModal: () => void;
  onOpenImportExportModal: () => void;
  onOpenScanModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  sidebarOpen,
  onToggleSidebar,
  onOpenAuditModal,
  onOpenLockModal,
  onOpenManageLabsModal,
  onOpenRemoteAppModal,
  onOpenPowerModal,
  onOpenRestrictionModal,
  onOpenImportExportModal,
  onOpenScanModal,
}) => {
  const { user, logout } = useAuthStore();
  const {
    workstations,
    isClassroomLocked,
  } = useLabStore();

  const [powerDropdownOpen, setPowerDropdownOpen] = useState(false);

  const onlineCount = workstations.filter((w) => w.powerStatus === 'ONLINE').length;
  const inSessionCount = workstations.filter((w) => w.powerStatus === 'IN_SESSION').length;
  const offlineCount = workstations.filter((w) => w.powerStatus === 'OFFLINE').length;

  const canManage = user?.role === 'SUPERADMIN' || user?.role === 'INSTRUCTOR';
  const isAdmin = user?.role === 'SUPERADMIN' || user?.role === 'INSTRUCTOR';

  return (
    <header className="sticky top-0 z-40 w-full bg-surface-900/95 backdrop-blur-md border-b border-slate-800/80 shadow-xl">
      <div className="max-w-[1700px] mx-auto px-4 lg:px-6 h-16 flex items-center justify-between gap-4">
        {/* Sisi Kiri: Toggle Sidebar, Brand Logo & Active Lab Badge */}
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Tombol Toggle Sidebar Veyon */}
          <button
            onClick={onToggleSidebar}
            title={sidebarOpen ? 'Sembunyikan Panel Ruangan' : 'Tampilkan Panel Ruangan & Komputer (Veyon)'}
            className={`p-2 rounded-xl transition-all border shrink-0 ${
              sidebarOpen
                ? 'bg-brand-500/15 text-brand-300 border-brand-500/30 shadow-sm'
                : 'bg-surface-850 hover:bg-surface-800 text-slate-300 border-slate-700/80 hover:text-white'
            }`}
          >
            <PanelLeft className="w-4 h-4" />
          </button>

          {/* Brand Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <img
              src="/logo.png"
              alt="FYJ Channel Logo"
              className="w-10 h-10 rounded-full object-contain shadow-glow-teal border border-slate-700/80 bg-slate-900 p-0.5 hover:scale-105 transition-transform"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-sm sm:text-base tracking-tight whitespace-nowrap">
                  FYJ Channel <span className="text-brand-400">Remote</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-500/10 text-brand-400 border border-brand-500/20 whitespace-nowrap hidden sm:inline-block">
                  LAN GATEWAY
                </span>
              </div>
              <span className="text-[10px] text-slate-400 whitespace-nowrap hidden lg:block">
                Sistem Kendali & Pemantauan Lab Komputer
              </span>
            </div>
          </div>
        </div>

        {/* Ringkasan Metrik Cepat */}
        <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-surface-850/80 border border-slate-800/90 text-xs shrink-0 shadow-sm">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-glow-emerald" />
            <span className="text-slate-400">Online:</span>
            <span className="font-bold text-white">{onlineCount}</span>
          </div>
          <div className="w-px h-3.5 bg-slate-800" />
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-glow-amber" />
            <span className="text-slate-400">Sesi:</span>
            <span className="font-bold text-white">{inSessionCount}</span>
          </div>
          <div className="w-px h-3.5 bg-slate-800" />
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-slate-400">Offline:</span>
            <span className="font-bold text-white">{offlineCount}</span>
          </div>
        </div>

        {/* Sisi Kanan: Menu Tindakan Kontrol & Profil Akun */}
        <div className="flex items-center gap-2.5 shrink-0">
          {canManage && (
            <div className="flex items-center gap-2">
              {/* Tombol Pindai Jaringan LAN */}
              {onOpenScanModal && (
                <button
                  onClick={onOpenScanModal}
                  title="Pindai subnet LAN untuk mendeteksi seluruh komputer aktif"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-850 hover:bg-surface-800 text-cyan-300 border border-cyan-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Wifi className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">Pindai LAN</span>
                </button>
              )}

              {/* Dropdown Aksi Utama */}
              <div className="relative">
                <button
                  onClick={() => setPowerDropdownOpen(!powerDropdownOpen)}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                    isClassroomLocked
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                      : 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-900/30'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Menu Kendali Lab</span>
                  <span className="sm:hidden">Kendali</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${powerDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {powerDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setPowerDropdownOpen(false)} />
                    <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-surface-900 border border-slate-700 shadow-2xl p-2 z-40 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3 py-2 border-b border-slate-800">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Tindakan Massal Seluruh Lab
                        </span>
                      </div>

                      <div className="mt-1 space-y-1">
                        {/* Opsi 1: Bangunkan (WoL) */}
                        <button
                          onClick={() => {
                            setPowerDropdownOpen(false);
                            onOpenPowerModal('WAKE');
                          }}
                          className="w-full text-left p-2 rounded-xl hover:bg-emerald-950/30 border border-transparent hover:border-emerald-500/30 transition-all flex items-start gap-2.5 group"
                        >
                          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform shrink-0 mt-0.5">
                            <Zap className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white group-hover:text-emerald-300">
                                Nyalakan Komputer (Wake-on-LAN)
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold font-mono">
                                WoL
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                              Pancarkan paket sinyal UDP Magic Packet ke subnet lab untuk menghidupkan PC serentak.
                            </p>
                          </div>
                        </button>

                        {/* Opsi 2: Matikan (Shutdown) */}
                        <button
                          onClick={() => {
                            setPowerDropdownOpen(false);
                            onOpenPowerModal('SHUTDOWN');
                          }}
                          className="w-full text-left p-2 rounded-xl hover:bg-rose-950/30 border border-transparent hover:border-rose-500/30 transition-all flex items-start gap-2.5 group"
                        >
                          <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 group-hover:scale-110 transition-transform shrink-0 mt-0.5">
                            <Power className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white group-hover:text-rose-300">
                                Matikan Komputer (Shutdown)
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold font-mono">
                                Daya
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                              Instruksi pematian sistem operasi teratur (graceful) atau paksa pada jam pulang praktikum.
                            </p>
                          </div>
                        </button>

                        {/* Opsi 3: Kunci Kelas (Lock Screen) */}
                        <button
                          onClick={() => {
                            setPowerDropdownOpen(false);
                            onOpenLockModal();
                          }}
                          className="w-full text-left p-2 rounded-xl hover:bg-amber-950/30 border border-transparent hover:border-amber-500/30 transition-all flex items-start gap-2.5 group"
                        >
                          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-110 transition-transform shrink-0 mt-0.5">
                            <Lock className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white group-hover:text-amber-300">
                                {isClassroomLocked ? 'Buka Kunci Layar Siswa' : 'Kunci Layar & Masukan Siswa'}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold font-mono">
                                Fokus
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                              Nonaktifkan mouse, keyboard & tampilkan overlay instruksi ke siswa.
                            </p>
                          </div>
                        </button>

                        {/* Opsi 4: Buka / Tutup Aplikasi (Remote App) */}
                        <button
                          onClick={() => {
                            setPowerDropdownOpen(false);
                            onOpenRemoteAppModal();
                          }}
                          className="w-full text-left p-2 rounded-xl hover:bg-teal-950/30 border border-transparent hover:border-teal-500/30 transition-all flex items-start gap-2.5 group"
                        >
                          <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 group-hover:scale-110 transition-transform shrink-0 mt-0.5">
                            <Terminal className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white group-hover:text-teal-300">
                                Buka / Tutup Aplikasi (Remote App)
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-semibold font-mono">
                                Eksekusi
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                              Jalankan software atau hentikan proses aplikasi di komputer target.
                            </p>
                          </div>
                        </button>

                        {/* Opsi 5: Blokir Aplikasi & Website */}
                        <button
                          onClick={() => {
                            setPowerDropdownOpen(false);
                            onOpenRestrictionModal();
                          }}
                          className="w-full text-left p-2 rounded-xl hover:bg-purple-950/30 border border-transparent hover:border-purple-500/30 transition-all flex items-start gap-2.5 group"
                        >
                          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-110 transition-transform shrink-0 mt-0.5">
                            <Ban className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white group-hover:text-purple-300">
                                Blokir Aplikasi & Website
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold font-mono">
                                Proteksi
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                              Batasi akses game, sosmed, aplikasi, atau link website tertentu siswa.
                            </p>
                          </div>
                        </button>

                        {/* Opsi 6: Kelola & Tambah Ruang Lab */}
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setPowerDropdownOpen(false);
                              onOpenManageLabsModal();
                            }}
                            className="w-full text-left p-2 rounded-xl hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all flex items-start gap-2.5 group"
                          >
                            <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20 group-hover:scale-110 transition-transform shrink-0 mt-0.5">
                              <Layers className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white group-hover:text-brand-300">
                                  Kelola Ruangan Lab
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 font-semibold font-mono">
                                  Setup
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                                Tambah ruang lab baru, subnet siaran WoL, & ubah kapasitas kursi.
                              </p>
                            </div>
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Tombol Impor & Ekspor Database PC */}
              {isAdmin && (
                <button
                  onClick={onOpenImportExportModal}
                  title="Impor atau ekspor database inventaris komputer massal (CSV/JSON)"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-850 hover:bg-surface-800 text-teal-300 border border-teal-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
                  <span className="hidden sm:inline">Impor / Ekspor</span>
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
              <span className="text-xs font-bold text-white truncate max-w-[120px]">{user?.fullName}</span>
              <span className="text-[10px] text-brand-400 font-mono font-medium">{user?.role}</span>
            </div>

            <button
              onClick={logout}
              title="Keluar dari Sistem"
              className="p-2 rounded-xl bg-surface-850 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/60 hover:border-rose-500/40 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
