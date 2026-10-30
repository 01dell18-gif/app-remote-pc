import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useLabStore } from '../../stores/labStore';
import { Workstation } from '../../types';
import {
  Zap,
  Power,
  CheckCircle2,
  AlertCircle,
  Monitor,
} from 'lucide-react';

interface PowerControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'WAKE' | 'SHUTDOWN';
  targetWorkstation?: Workstation | null;
}

export const PowerControlModal: React.FC<PowerControlModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'WAKE',
  targetWorkstation,
}) => {
  const {
    workstations,
    selectedLab,
    selectedWorkstationIds,
    wakeOnLanWorkstations,
    shutdownWorkstations,
  } = useLabStore();

  const [mode, setMode] = useState<'WAKE' | 'SHUTDOWN'>(initialMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setFeedback(null);
    }
  }, [isOpen, initialMode]);

  // Gunakan perangkat yang sudah dipilih dari menu samping Ruangan & Komputer
  const effectiveIds = targetWorkstation
    ? [targetWorkstation.id]
    : selectedWorkstationIds;

  const handleExecute = async () => {
    if (effectiveIds.length === 0) {
      setFeedback({
        type: 'error',
        message:
          'Silakan pilih atau centang setidaknya satu komputer melalui menu Ruangan & Komputer di sebelah kiri.',
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      if (mode === 'WAKE') {
        const res = await wakeOnLanWorkstations(effectiveIds);
        setFeedback({
          type: 'success',
          message:
            res.message ||
            `Sinyal bangun (Magic Packet) berhasil dikirimkan ke ${effectiveIds.length} komputer.`,
        });
      } else {
        const res = await shutdownWorkstations(effectiveIds, false);
        setFeedback({
          type: 'success',
          message:
            res.message ||
            `Perintah shutdown ACPI berhasil dikirimkan ke ${effectiveIds.length} komputer.`,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Gagal mengeksekusi operasi manajemen daya.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        targetWorkstation
          ? `Manajemen Daya: ${targetWorkstation.hostname}`
          : 'Manajemen Daya Komputer Lab'
      }
      subtitle={
        selectedLab
          ? `Ruang Lab: ${selectedLab.labName} · Subnet: ${selectedLab.subnetBroadcast}`
          : undefined
      }
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Switch Mode: WoL vs Shutdown */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-surface-950 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setMode('WAKE');
              setFeedback(null);
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              mode === 'WAKE'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-surface-850'
            }`}
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Nyalakan (WoL)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('SHUTDOWN');
              setFeedback(null);
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              mode === 'SHUTDOWN'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-surface-850'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>Matikan (Shutdown)</span>
          </button>
        </div>

        {/* Ringkasan Penjelasan Mode */}
        <div className="p-3 rounded-xl bg-surface-850/60 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2.5">
          {mode === 'WAKE' ? (
            <>
              <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 fill-current" />
              <div>
                <strong className="text-white block mb-0.5">Sinyal Magic Packet (UDP Broadcast Port 7/9)</strong>
                Mengirimkan paket jaringan khusus ke alamat MAC perangkat komputer yang sedang mati (offline) agar BIOS/NIC menyalakan motherboard.
              </div>
            </>
          ) : (
            <>
              <Power className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block mb-0.5">Perintah Shutdown ACPI Sistem Operasi</strong>
                Mengirim sinyal penutupan sistem operasi yang tertib dan aman ke komputer klien yang sedang aktif (online).
              </div>
            </>
          )}
        </div>

        {/* Feedback Notifikasi */}
        {feedback && (
          <div
            className={`p-3 rounded-xl flex items-center gap-2.5 text-xs font-medium animate-in fade-in duration-200 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Target Komputer (Dipilih Melalui Menu Ruangan & Komputer) */}
        <div className="p-3.5 rounded-xl bg-surface-950 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-brand-400" />
              <span>Target Komputer:</span>
            </span>
            <span className="text-teal-400 font-mono font-bold">
              {targetWorkstation
                ? '1 Perangkat Dipilih'
                : `${effectiveIds.length} dari ${workstations.length} Perangkat Terpilih`}
            </span>
          </div>

          {targetWorkstation ? (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-900 border border-slate-800 text-xs">
              <span className="font-bold text-white">{targetWorkstation.hostname}</span>
              <span className="font-mono text-slate-400 text-[11px]">{targetWorkstation.ipAddress}</span>
            </div>
          ) : effectiveIds.length === 0 ? (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
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
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                {workstations
                  .filter((w) => effectiveIds.includes(w.id))
                  .map((w) => (
                    <span
                      key={w.id}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-900 border border-slate-800 text-[11px] font-mono text-slate-200"
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

        {/* Tombol Aksi Bawah */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface-850 hover:bg-surface-800 text-slate-300 transition-colors"
          >
            Tutup
          </button>

          <button
            type="button"
            onClick={handleExecute}
            disabled={isSubmitting || effectiveIds.length === 0}
            className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
              mode === 'WAKE'
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
            }`}
          >
            {isSubmitting ? (
              <span className="animate-pulse">Memproses Instruksi...</span>
            ) : mode === 'WAKE' ? (
              <>
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Nyalakan {effectiveIds.length} Komputer (WoL)</span>
              </>
            ) : (
              <>
                <Power className="w-3.5 h-3.5" />
                <span>Matikan {effectiveIds.length} Komputer (Shutdown)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
