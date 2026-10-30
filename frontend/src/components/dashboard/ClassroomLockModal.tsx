import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Lock, Unlock } from 'lucide-react';
import { useLabStore } from '../../stores/labStore';

interface ClassroomLockModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClassroomLockModal: React.FC<ClassroomLockModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { selectedLab, isClassroomLocked, toggleLockClassroom } = useLabStore();
  const [customMsg, setCustomMsg] = useState(
    'Layar Dikunci oleh Dosen/Instruktur. Harap perhatikan penjelasan materi di papan depan!'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggle = async (lock: boolean) => {
    setIsSubmitting(true);
    try {
      await toggleLockClassroom(lock, customMsg);
      onClose();
    } catch (err: any) {
      alert(`Gagal mengubah status penguncian: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Penguncian Masukan & Layar Siswa (Classroom Lock)"
      subtitle={`Target: Seluruh Komputer di ${selectedLab?.labName || 'Laboratorium'}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-300 leading-relaxed">
          Fitur ini menonaktifkan periferal mouse dan keyboard pada seluruh komputer siswa yang terhubung serta menampilkan layar pesan statis agar perhatian siswa terpusat pada pengajar.
        </p>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Pesan Layar yang Ditampilkan ke Siswa
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
                disabled={isSubmitting}
                onClick={() => handleToggle(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-glow-emerald"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Buka Kunci Layar (Unlock)</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleToggle(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-glow-amber"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Kunci Sekarang</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
