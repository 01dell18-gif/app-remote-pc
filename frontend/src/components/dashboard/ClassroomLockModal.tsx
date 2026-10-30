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
  const { workstations, selectedLab, isClassroomLocked, toggleLockClassroom } = useLabStore();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
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
      if (targetWorkstation) {
        setSelectedIds([targetWorkstation.id]);
      } else {
        const activeIds = workstations
          .filter((w) => w.powerStatus !== 'OFFLINE')
          .map((w) => w.id);
        setSelectedIds(activeIds.length > 0 ? activeIds : workstations.map((w) => w.id));
      }
    }
  }, [isOpen, targetWorkstation, workstations]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggle = async (lock: boolean) => {
    if (selectedIds.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Silakan pilih setidaknya satu komputer target terlebih dahulu.',
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
          ? `Layar dan masukan pada ${selectedIds.length} komputer target berhasil dikunci.`
          : `Kunci layar pada ${selectedIds.length} komputer target telah dibuka.`,
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

        {/* Pemilihan Komputer Target */}
        <div className="p-3 rounded-xl bg-surface-950 border border-slate-800 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-amber-400" />
              <span>Target Komputer ({selectedIds.length} dari {workstations.length} dipilih):</span>
            </span>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() =>
                  setSelectedIds(
                    workstations.filter((w) => w.powerStatus !== 'OFFLINE').map((w) => w.id)
                  )
                }
                className="text-[10px] px-2 py-0.5 rounded bg-surface-850 hover:bg-surface-800 text-teal-300 border border-teal-500/30 transition-colors"
              >
                Pilih Semua Online
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(workstations.map((w) => w.id))}
                className="text-[10px] px-2 py-0.5 rounded bg-surface-850 hover:bg-surface-800 text-slate-300 border border-slate-700 transition-colors"
              >
                Semua Komputer
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-[10px] px-2 py-0.5 rounded bg-surface-850 hover:bg-surface-800 text-rose-300 border border-slate-700 transition-colors"
              >
                Batal Pilih
              </button>
            </div>
          </div>

          <div className="max-h-32 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 pt-1">
            {workstations.map((ws) => {
              const checked = selectedIds.includes(ws.id);
              const isOnline = ws.powerStatus === 'ONLINE' || ws.powerStatus === 'IN_SESSION';

              return (
                <div
                  key={ws.id}
                  onClick={() => toggleSelect(ws.id)}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-[11px] cursor-pointer transition-all ${
                    checked
                      ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                      : 'bg-surface-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {}}
                    className="accent-amber-400 rounded w-3.5 h-3.5 pointer-events-none"
                  />
                  <div className="truncate flex-1">
                    <div className="font-bold text-white truncate">{ws.hostname}</div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">{ws.ipAddress}</div>
                  </div>
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isOnline ? 'bg-emerald-400' : 'bg-rose-500'
                    }`}
                  />
                </div>
              );
            })}
          </div>
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
                disabled={isSubmitting || selectedIds.length === 0}
                onClick={() => handleToggle(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-glow-emerald disabled:opacity-50"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Buka Kunci Layar ({selectedIds.length} PC)</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting || selectedIds.length === 0}
                onClick={() => handleToggle(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-glow-amber disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Kunci Sekarang ({selectedIds.length} PC)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
