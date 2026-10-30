import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { useLabStore } from '../../stores/labStore';
import { Workstation } from '../../types';
import {
  Ban,
  CheckCircle2,
  AlertCircle,
  Monitor,
  Globe,
  AppWindow,
  Sparkles,
  Unlock,
  Trash2,
  ShieldAlert,
} from 'lucide-react';

interface RestrictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetWorkstation?: Workstation | null;
}

export const RestrictionModal: React.FC<RestrictionModalProps> = ({
  isOpen,
  onClose,
  targetWorkstation,
}) => {
  const { workstations, selectedLab, selectedWorkstationIds } = useLabStore();

  const [activeTab, setActiveTab] = useState<'APP' | 'WEBSITE'>('APP');
  const [actionMode, setActionMode] = useState<'BLOCK' | 'UNBLOCK'>('BLOCK');

  // Input states
  const [targetName, setTargetName] = useState('Discord.exe');
  const [reason, setReason] = useState('Fokus praktikum pembelajaran');

  // Presets and Active list
  const [presets, setPresets] = useState<{ apps: any[]; websites: any[] }>({
    apps: [],
    websites: [],
  });
  const [activeRestrictions, setActiveRestrictions] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  useEffect(() => {
    if (isOpen) {
      setFeedback(null);
      loadRestrictionsData();
    }
  }, [isOpen]);

  const effectiveIds = targetWorkstation
    ? [targetWorkstation.id]
    : selectedWorkstationIds;

  const loadRestrictionsData = async () => {
    try {
      const res = await api.getRestrictions();
      if (res.presets) setPresets(res.presets);
      if (res.activeRestrictions) setActiveRestrictions(res.activeRestrictions);
    } catch (_) {}
  };

  const handleApplyPreset = (item: any) => {
    if (activeTab === 'APP') {
      setTargetName(item.processName);
    } else {
      setTargetName(item.domain);
    }
  };

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (effectiveIds.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Silakan pilih atau centang setidaknya satu komputer melalui menu Ruangan & Komputer di sebelah kiri.',
      });
      return;
    }

    if (!targetName.trim()) {
      setFeedback({
        type: 'error',
        message: 'Nama aplikasi atau alamat website tidak boleh kosong.',
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await api.applyRestriction({
        workstationIds: effectiveIds,
        type: activeTab,
        target: targetName.trim(),
        action: actionMode,
        reason,
      });

      setFeedback({
        type: 'success',
        message: res.message,
      });
      if (res.activeRestrictions) {
        setActiveRestrictions(res.activeRestrictions);
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Gagal memproses pembatasan',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickUnblock = async (rule: any) => {
    setIsSubmitting(true);
    try {
      const res = await api.applyRestriction({
        workstationIds: rule.workstationIds,
        type: rule.type,
        target: rule.target,
        action: 'UNBLOCK',
      });
      setFeedback({ type: 'success', message: res.message });
      if (res.activeRestrictions) setActiveRestrictions(res.activeRestrictions);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pembatasan Aplikasi & Link Website (App & Web Blocker)"
      subtitle={`Kontrol hak akses perangkat di ${selectedLab?.labName || 'Laboratorium'}`}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Tab Pilihan: Blokir Aplikasi vs Blokir Website */}
        <div className="flex items-center gap-2 p-1 bg-surface-950 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab('APP');
              setTargetName('Discord.exe');
              setFeedback(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'APP'
                ? 'bg-purple-600 text-white shadow-glow-purple'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <AppWindow className="w-3.5 h-3.5" />
            <span>Nonaktifkan Aplikasi (.exe)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('WEBSITE');
              setTargetName('youtube.com');
              setFeedback(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'WEBSITE'
                ? 'bg-indigo-600 text-white shadow-glow-indigo'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Blokir Link Website / Domain</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 rounded-xl flex items-center gap-2 text-xs font-medium animate-in fade-in duration-150 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/60 border border-rose-500/30 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Target Komputer (Dipilih Melalui Menu Ruangan & Komputer) */}
        <div className="p-3.5 rounded-xl bg-surface-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-purple-400" />
              <span>Target Komputer:</span>
            </span>
            <span className="text-teal-400 font-mono font-bold">
              {targetWorkstation
                ? '1 Perangkat Dipilih'
                : `${effectiveIds.length} dari ${workstations.length} Perangkat Terpilih`}
            </span>
          </div>

          {targetWorkstation ? (
            <div className="flex items-center justify-between p-2 rounded-lg bg-surface-900 border border-slate-800 text-xs">
              <span className="font-bold text-white">{targetWorkstation.hostname}</span>
              <span className="font-mono text-slate-400 text-[11px]">{targetWorkstation.ipAddress}</span>
            </div>
          ) : effectiveIds.length === 0 ? (
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                Belum ada perangkat yang dipilih. Silakan centang komputer pada menu{' '}
                <strong>Ruangan & Komputer</strong> di sebelah kiri.
              </span>
            </div>
          ) : (
            <div>
              <div className="text-[11px] text-slate-400 mb-1.5">
                Daftar PC yang telah dipilih melalui menu Ruangan & Komputer:
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {workstations
                  .filter((w) => effectiveIds.includes(w.id))
                  .map((w) => (
                    <span
                      key={w.id}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-900 border border-slate-800 text-[11px] font-mono text-slate-300"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          w.powerStatus === 'ONLINE'
                            ? 'bg-emerald-400 shadow-glow-emerald'
                            : w.powerStatus === 'IN_SESSION'
                            ? 'bg-amber-400'
                            : 'bg-rose-500'
                        }`}
                      />
                      {w.hostname}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Template Pilihan Cepat */}
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Preset Cepat {activeTab === 'APP' ? 'Aplikasi Game & Sosmed' : 'Website Populer'}:</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {(activeTab === 'APP' ? presets.apps : presets.websites).slice(0, 8).map((p: any) => (
              <button
                key={p.name}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className="p-2 rounded-xl bg-surface-850 hover:bg-surface-800 border border-slate-750/80 text-left transition-all hover:scale-[1.02] active:scale-[0.98] group"
              >
                <div className="text-[11px] font-bold text-slate-200 group-hover:text-purple-300 truncate">
                  {p.name}
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  {activeTab === 'APP' ? p.processName : p.domain}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Form Eksekusi Pembatasan */}
        <form onSubmit={handleExecute} className="space-y-3 pt-1">
          {/* Opsi Mode Aksi: Blokir vs Buka Blokir */}
          <div className="flex items-center gap-4 text-xs font-medium text-slate-300">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="banActionMode"
                checked={actionMode === 'BLOCK'}
                onChange={() => setActionMode('BLOCK')}
                className="text-purple-500 focus:ring-purple-500"
              />
              <span className="flex items-center gap-1 text-rose-300 font-bold">
                <Ban className="w-3.5 h-3.5 text-rose-400" />
                <span>Terapkan Pemblokiran (Block)</span>
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="banActionMode"
                checked={actionMode === 'UNBLOCK'}
                onChange={() => setActionMode('UNBLOCK')}
                className="text-emerald-500 focus:ring-emerald-500"
              />
              <span className="flex items-center gap-1 text-emerald-300 font-bold">
                <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Buka Blokir (Lepaskan)</span>
              </span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {activeTab === 'APP' ? (
                <>Nama File Proses Aplikasi (.exe) <span className="text-rose-400">*</span></>
              ) : (
                <>Alamat Link / Domain Website <span className="text-rose-400">*</span></>
              )}
            </label>
            <input
              type="text"
              required
              placeholder={
                activeTab === 'APP'
                  ? 'Contoh: RobloxPlayerBeta.exe, Discord.exe, steam.exe'
                  : 'Contoh: youtube.com, facebook.com, tiktok.com'
              }
              value={targetName}
              onChange={(e) => setTargetName(e.target.value)}
              className="w-full bg-surface-850 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              {activeTab === 'APP'
                ? 'Sistem akan mematikan proses jika sedang terbuka dan mendaftarkan proteksi sistem agar tidak dapat diluncurkan siswa.'
                : 'Sistem akan mengalihkan (sinkhole) domain ke 127.0.0.1 pada resolver DNS Windows lokal komputer siswa.'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Alasan Pembatasan (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Sedang berlangsung ujian praktikum lab"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-surface-850 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-mono">
              Target: {effectiveIds.length} Komputer
            </span>

            <button
              type="submit"
              disabled={isSubmitting || effectiveIds.length === 0}
              className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg disabled:opacity-50 ${
                actionMode === 'BLOCK'
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
              }`}
            >
              {actionMode === 'BLOCK' ? (
                <>
                  <Ban className="w-3.5 h-3.5" />
                  <span>Blokir {activeTab === 'APP' ? 'Aplikasi' : 'Website'} ({effectiveIds.length} PC)</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Buka Blokir ({effectiveIds.length} PC)</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Daftar Pembatasan Aktif */}
        {activeRestrictions.length > 0 && (
          <div className="pt-3 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 mb-2">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Daftar Pembatasan yang Sedang Aktif ({activeRestrictions.length}):</span>
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1.5">
              {activeRestrictions.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-surface-950 border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        rule.type === 'APP'
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-indigo-500/20 text-indigo-300'
                      }`}
                    >
                      {rule.type}
                    </span>
                    <span className="font-mono font-bold text-white truncate">{rule.target}</span>
                    <span className="text-[10px] text-slate-500 hidden sm:inline">
                      ({rule.workstationIds?.length || 0} PC)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleQuickUnblock(rule)}
                    disabled={isSubmitting}
                    title="Buka blokir aturan ini"
                    className="p-1 px-2 rounded-lg bg-surface-850 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700/60 transition-colors flex items-center gap-1 text-[11px]"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Hapus Blokir</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
