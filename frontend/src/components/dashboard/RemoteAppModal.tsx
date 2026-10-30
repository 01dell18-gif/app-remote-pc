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
} from 'lucide-react';

interface RemoteAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetWorkstation?: Workstation | null; // null jika eksekusi seluruh lab
}

export const RemoteAppModal: React.FC<RemoteAppModalProps> = ({
  isOpen,
  onClose,
  targetWorkstation,
}) => {
  const { workstations, selectedLab } = useLabStore();

  const [activeTab, setActiveTab] = useState<'LAUNCH' | 'TERMINATE'>('LAUNCH');
  const [executionMode, setExecutionMode] = useState<'PATH' | 'SCRIPT'>('PATH');

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
      api.getAppPresets().then((res) => {
        if (res.presets) setPresets(res.presets);
      }).catch(() => {});
    }
  }, [isOpen]);

  const targetWorkstationIds = targetWorkstation
    ? [targetWorkstation.id]
    : workstations.filter((w) => w.powerStatus !== 'OFFLINE').map((w) => w.id);

  const targetLabel = targetWorkstation
    ? `${targetWorkstation.hostname} (${targetWorkstation.ipAddress})`
    : `Seluruh Komputer Aktif di ${selectedLab?.labName || 'Lab'} (${targetWorkstationIds.length} Unit)`;

  const handleApplyPreset = (p: any) => {
    setAppPath(p.appPath);
    setArgs(p.defaultArgs || '');
    setProcessName(p.processName || p.appPath);
    setExecutionMode('PATH');
  };

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (targetWorkstationIds.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Tidak ada workstation aktif yang menjadi target eksekusi.',
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await api.launchApp({
        workstationIds: targetWorkstationIds,
        appPath,
        args,
        executionType: executionMode,
        scriptContent,
      });

      setFeedback({
        type: 'success',
        message: res.message || 'Aplikasi berhasil dijalankan pada target!',
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
    if (targetWorkstationIds.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Tidak ada workstation aktif yang menjadi target penutupan.',
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await api.terminateApp({
        workstationIds: targetWorkstationIds,
        processName,
        force: forceKill,
      });

      setFeedback({
        type: 'success',
        message: res.message || 'Instruksi penutupan proses aplikasi berhasil dikirim!',
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
      title="Manajer Aplikasi & Skrip Jarak Jauh (Remote App Control)"
      subtitle={`Target: ${targetLabel}`}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Tab Pilihan: Jalankan vs Tutup Aplikasi */}
        <div className="flex items-center gap-2 p-1 bg-surface-850 rounded-2xl border border-slate-750">
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
            className={`p-3 rounded-xl flex items-center gap-2 text-xs animate-in fade-in duration-150 ${
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
                  <span>Alamat Path / Nama Executable</span>
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
                Penerima: {targetWorkstationIds.length} Workstation
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
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-glow-teal flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isSubmitting ? 'Mengeksekusi...' : 'Jalankan Aplikasi'}</span>
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
                Target: {targetWorkstationIds.length} Workstation
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
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-glow-rose flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>{isSubmitting ? 'Menghentikan...' : 'Tutup Proses Aplikasi'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
