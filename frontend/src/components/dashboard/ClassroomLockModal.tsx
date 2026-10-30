import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Lock, Unlock, Monitor, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLabStore } from '../../stores/labStore';
import { Workstation } from '../../types';

interface ClassroomLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetWorkstation?: Workstation | null;
}

export const ClassroomLockModal: React.FC<ClassroomLockModalProps> = ({
  isOpen,
  onClose,
  targetWorkstation,
}) => {
  const {
    workstations,
    selectedLab,
    isClassroomLocked,
    selectedWorkstationIds,
    toggleLockClassroom,
  } = useLabStore();

  const [customMsg, setCustomMsg] = useState(
    'Layar Dikunci oleh Dosen/Instruktur. Harap perhatikan penjelasan materi di papan depan!'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  useEffect(() => {
    if (isOpen) {
      setFeedback(null);
    }
  }, [isOpen]);

  const effectiveIds = targetWorkstation
    ? [targetWorkstation.id]
    : selectedWorkstationIds;

  const handleToggle = async (lock: boolean) => {
    if (effectiveIds.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Silakan pilih atau centang setidaknya satu komputer melalui menu Ruangan & Komputer di sebelah kiri.',
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      await toggleLockClassroom(lock, customMsg);
      setFeedback({
        type: 'success',
        message: lock
          ? `Layar dan masukan pada ${effectiveIds.length} komputer target berhasil dikunci.`
          : `Kunci layar pada ${effectiveIds.length} komputer target telah dibuka.`,
      });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Gagal mengubah status penguncian: ${err.message}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Penguncian Masukan & Layar Siswa (Classroom Lock)"
      subtitle={`Kelola kontrol layar siswa di ${selectedLab?.labName || 'Laboratorium'}`}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-300 leading-relaxed">
          Fitur ini menonaktifkan periferal mouse dan keyboard pada komputer siswa yang dipilih serta menampilkan layar pesan statis agar perhatian siswa terpusat pada pengajar/instruktur.
        </p>

        {/* Feedback alert */}
        {feedback && (
          <div
            className={`p-3 rounded-xl flex items-center gap-2 text-xs font-medium animate-in fade-in duration-150 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/60 border border-rose-500/30 text-rose-300'
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
        <div className="p-3.5 rounded-xl bg-surface-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-amber-400" />
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

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Pesan Layar yang Ditampilkan ke Siswa (Overlay Banner)
          </label>
          <textarea
            rows={3}
            value={customMsg}
            onChange={(e) => setCustomMsg(e.target.value)}
            className="w-full bg-surface-850 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
          >
            Tutup
          </button>

          <div className="flex items-center gap-2">
            {isClassroomLocked ? (
              <button
                type="button"
                disabled={isSubmitting || effectiveIds.length === 0}
                onClick={() => handleToggle(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-glow-emerald disabled:opacity-50"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Buka Kunci Layar ({effectiveIds.length} PC)</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting || effectiveIds.length === 0}
                onClick={() => handleToggle(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-glow-amber disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Kunci Sekarang ({effectiveIds.length} PC)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
