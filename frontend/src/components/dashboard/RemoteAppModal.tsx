import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { useLabStore } from '../../stores/labStore';
import { Workstation } from '../../types';
import {
  Play,
  Square,
  Terminal,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Monitor,
} from 'lucide-react';

interface RemoteAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetWorkstation?: Workstation | null;
}

export const RemoteAppModal: React.FC<RemoteAppModalProps> = ({
  isOpen,
  onClose,
  targetWorkstation,
}) => {
  const { workstations, selectedLab } = useLabStore();

  const [activeTab, setActiveTab] = useState<'LAUNCH' | 'TERMINATE'>('LAUNCH');
  const [executionMode, setExecutionMode] = useState<'PATH' | 'SCRIPT'>('PATH');
  const [selectedWorkstationIds, setSelectedWorkstationIds] = useState<number[]>([]);

  // Launch states
  const [appPath, setAppPath] = useState('notepad.exe');
  const [args, setArgs] = useState('');
  const [scriptContent, setScriptContent] = useState(
    '@echo off\necho Halo dari Dosen Lab!\nstart https://google.com'
  );

  // Terminate states
  const [processName, setProcessName] = useState('notepad.exe');
  const [forceKill, setForceKill] = useState(true);

  // Presets from API
  const [presets, setPresets] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  useEffect(() => {
    if (isOpen) {
      setFeedback(null);
      if (targetWorkstation) {
        setSelectedWorkstationIds([targetWorkstation.id]);
      } else {
        const activeIds = workstations
          .filter((w) => w.powerStatus !== 'OFFLINE')
          .map((w) => w.id);
        setSelectedWorkstationIds(activeIds.length > 0 ? activeIds : workstations.map((w) => w.id));
      }

      api
        .getAppPresets()
        .then((res) => {
          if (res.presets) setPresets(res.presets);
        })
        .catch(() => {});
    }
  }, [isOpen, targetWorkstation, workstations]);

  const toggleWorkstationSelect = (id: number) => {
    setSelectedWorkstationIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleApplyPreset = (p: any) => {
    setAppPath(p.appPath);
    setArgs(p.defaultArgs || '');
    setProcessName(p.processName || p.appPath);
    setExecutionMode('PATH');
  };

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedWorkstationIds.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Silakan pilih setidaknya satu perangkat komputer sebelum menjalankan aplikasi.',
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await api.launchApp({
        workstationIds: selectedWorkstationIds,
        appPath,
        args,
        executionType: executionMode,
        scriptContent,
      });

      setFeedback({
        type: 'success',
        message: res.message || `Aplikasi berhasil dijalankan pada ${selectedWorkstationIds.length} komputer target!`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Gagal menjalankan aplikasi pada target',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTerminate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedWorkstationIds.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Silakan pilih setidaknya satu perangkat komputer sebelum menutup aplikasi.',
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await api.terminateApp({
        workstationIds: selectedWorkstationIds,
        processName,
        force: forceKill,
      });

      setFeedback({
        type: 'success',
        message: res.message || `Instruksi penutupan proses berhasil dikirim ke ${selectedWorkstationIds.length} komputer target!`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Gagal menutup aplikasi pada target',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manajer Aplikasi & Skrip Klien (Remote App Control)"
      subtitle={`Kelola eksekusi program di ${selectedLab?.labName || 'Laboratorium'}`}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Tab Pilihan: Jalankan vs Tutup Aplikasi */}
        <div className="flex items-center gap-2 p-1 bg-surface-950 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab('LAUNCH');
              setFeedback(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'LAUNCH'
                ? 'bg-brand-600 text-white shadow-glow-teal'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Buka / Jalankan Aplikasi</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('TERMINATE');
              setFeedback(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'TERMINATE'
                ? 'bg-rose-600 text-white shadow-glow-rose'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Tutup / Hentikan Aplikasi (Kill)</span>
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
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Pemilihan Komputer Target (Interactive Device Selector) */}
        <div className="p-3 rounded-xl bg-surface-950 border border-slate-800 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-teal-400" />
              <span>Target Komputer ({selectedWorkstationIds.length} dari {workstations.length} dipilih):</span>
            </span>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() =>
                  setSelectedWorkstationIds(
                    workstations.filter((w) => w.powerStatus !== 'OFFLINE').map((w) => w.id)
                  )
                }
                className="text-[10px] px-2 py-0.5 rounded bg-surface-850 hover:bg-surface-800 text-teal-300 border border-teal-500/30 transition-colors"
              >
                Pilih Semua Online
              </button>
              <button
                type="button"
                onClick={() => setSelectedWorkstationIds(workstations.map((w) => w.id))}
                className="text-[10px] px-2 py-0.5 rounded bg-surface-850 hover:bg-surface-800 text-slate-300 border border-slate-700 transition-colors"
              >
                Semua Komputer
              </button>
              <button
                type="button"
                onClick={() => setSelectedWorkstationIds([])}
                className="text-[10px] px-2 py-0.5 rounded bg-surface-850 hover:bg-surface-800 text-rose-300 border border-slate-700 transition-colors"
              >
                Batal Pilih
              </button>
            </div>
          </div>

          <div className="max-h-32 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 pt-1">
            {workstations.map((ws) => {
              const checked = selectedWorkstationIds.includes(ws.id);
              const isOnline = ws.powerStatus === 'ONLINE';
              const isInSession = ws.powerStatus === 'IN_SESSION';

              return (
                <div
                  key={ws.id}
                  onClick={() => toggleWorkstationSelect(ws.id)}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-[11px] cursor-pointer transition-all ${
                    checked
                      ? 'bg-teal-950/40 border-teal-500/50 text-teal-200'
                      : 'bg-surface-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {}}
                    className="accent-teal-400 rounded w-3.5 h-3.5 pointer-events-none"
                  />
                  <div className="truncate flex-1">
                    <div className="font-bold text-white truncate">{ws.hostname}</div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">{ws.ipAddress}</div>
                  </div>
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isOnline
                        ? 'bg-emerald-400 shadow-glow-emerald'
                        : isInSession
                        ? 'bg-amber-400'
                        : 'bg-rose-500'
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Presets Carousel / Grid */}
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>Pilihan Cepat Aplikasi Laboratorium:</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {presets.slice(0, 8).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className="p-2 rounded-xl bg-surface-850 hover:bg-surface-800 border border-slate-750/80 text-left transition-all hover:scale-[1.02] active:scale-[0.98] group"
              >
                <div className="text-[11px] font-bold text-slate-200 group-hover:text-brand-300 truncate">
                  {p.name}
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  {p.appPath}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Form Tab 1: LAUNCH APPLICATION */}
        {activeTab === 'LAUNCH' && (
          <form onSubmit={handleLaunch} className="space-y-4 pt-1">
            {/* Mode: Path vs Script */}
            <div className="flex items-center gap-4 text-xs font-medium text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="execMode"
                  checked={executionMode === 'PATH'}
                  onChange={() => setExecutionMode('PATH')}
                  className="text-brand-500 focus:ring-brand-500"
                />
                <span className="flex items-center gap-1">
                  <FolderOpen className="w-3.5 h-3.5 text-teal-400" />
                  <span>Alamat Path / Nama Executable (.exe)</span>
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="execMode"
                  checked={executionMode === 'SCRIPT'}
                  onChange={() => setExecutionMode('SCRIPT')}
                  className="text-brand-500 focus:ring-brand-500"
                />
                <span className="flex items-center gap-1">
                  <Terminal className="w-3.5 h-3.5 text-amber-400" />
                  <span>Skrip Perintah (Batch / Shell)</span>
                </span>
              </label>
            </div>

            {executionMode === 'PATH' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Lokasi Penyimpanan / Nama File Aplikasi (.exe / perintah sistem){' '}
                    <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: notepad.exe, chrome.exe, atau C:\Program Files\App\app.exe"
                    value={appPath}
                    onChange={(e) => setAppPath(e.target.value)}
                    className="w-full bg-surface-850 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Anda dapat memasukkan nama program bawaan (seperti <code>notepad.exe</code>, <code>calc.exe</code>, <code>code</code>) atau path lengkap di komputer klien.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Argumen / Parameter Tambahan (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: https://elearning.ac.id atau nama file"
                    value={args}
                    onChange={(e) => setArgs(e.target.value)}
                    className="w-full bg-surface-850 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Konten Skrip yang Dijalankan pada Komputer Target
                </label>
                <textarea
                  rows={4}
                  value={scriptContent}
                  onChange={(e) => setScriptContent(e.target.value)}
                  className="w-full bg-surface-850 border border-slate-700 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-brand-500"
                />
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                Target Terpilih: {selectedWorkstationIds.length} Komputer
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || selectedWorkstationIds.length === 0}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-glow-teal flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isSubmitting ? 'Mengeksekusi...' : `Jalankan Aplikasi (${selectedWorkstationIds.length} PC)`}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Form Tab 2: TERMINATE APPLICATION */}
        {activeTab === 'TERMINATE' && (
          <form onSubmit={handleTerminate} className="space-y-4 pt-1">
            <p className="text-xs text-slate-300 leading-relaxed">
              Kirim instruksi untuk menghentikan / menutup paksa aplikasi yang sedang berjalan pada komputer siswa (menggunakan utilitas <code>taskkill</code> di Windows atau <code>pkill</code> di Linux).
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nama Proses Aplikasi (.exe) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: notepad.exe, chrome.exe, msedge.exe, Code.exe"
                value={processName}
                onChange={(e) => setProcessName(e.target.value)}
                className="w-full bg-surface-850 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="forceKillCheck"
                checked={forceKill}
                onChange={(e) => setForceKill(e.target.checked)}
                className="rounded border-slate-700 text-rose-500 focus:ring-rose-500"
              />
              <label
                htmlFor="forceKillCheck"
                className="text-xs text-slate-300 cursor-pointer select-none"
              >
                Paksa Berhenti Seketika (<em>Force Kill / taskkill /F</em>)
              </label>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                Target Terpilih: {selectedWorkstationIds.length} Komputer
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || selectedWorkstationIds.length === 0}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-glow-rose flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>{isSubmitting ? 'Menghentikan...' : `Tutup Proses Aplikasi (${selectedWorkstationIds.length} PC)`}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
