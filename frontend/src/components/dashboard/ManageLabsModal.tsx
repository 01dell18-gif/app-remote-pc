import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useLabStore } from '../../stores/labStore';
import { Laboratory } from '../../types';
import { Plus, Edit2, Trash2, Layers, Check, X } from 'lucide-react';

interface ManageLabsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManageLabsModal: React.FC<ManageLabsModalProps> = ({ isOpen, onClose }) => {
  const { labs, selectedLab, selectLab, createLab, updateLab, deleteLab } = useLabStore();

  const [isAdding, setIsAdding] = useState(false);
  const [editingLabId, setEditingLabId] = useState<number | null>(null);

  // Form states
  const [labName, setLabName] = useState('');
  const [subnetBroadcast, setSubnetBroadcast] = useState('192.168.1.255');
  const [totalCapacity, setTotalCapacity] = useState(30);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const startEdit = (lab: Laboratory) => {
    setEditingLabId(lab.id);
    setLabName(lab.labName);
    setSubnetBroadcast(lab.subnetBroadcast);
    setTotalCapacity(lab.totalCapacity);
    setIsAdding(false);
    setErrorMsg(null);
  };

  const cancelEdit = () => {
    setEditingLabId(null);
    setIsAdding(false);
    setLabName('');
    setSubnetBroadcast('192.168.1.255');
    setTotalCapacity(30);
    setErrorMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!labName.trim() || !subnetBroadcast.trim()) {
      setErrorMsg('Nama Lab dan Subnet Broadcast wajib diisi');
      return;
    }

    try {
      if (editingLabId) {
        await updateLab(editingLabId, {
          labName: labName.trim(),
          subnetBroadcast: subnetBroadcast.trim(),
          totalCapacity: Number(totalCapacity),
        });
        cancelEdit();
      } else {
        await createLab({
          labName: labName.trim(),
          subnetBroadcast: subnetBroadcast.trim(),
          totalCapacity: Number(totalCapacity),
        });
        cancelEdit();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan laboratorium');
    }
  };

  const handleDelete = async (lab: Laboratory) => {
    if (labs.length <= 1) {
      alert('Tidak dapat menghapus lab terakhir. Minimal harus ada 1 ruang laboratorium.');
      return;
    }

    if (
      confirm(
        `PERINGATAN: Apakah Anda yakin ingin menghapus '${lab.labName}'?\nSeluruh data komputer dalam lab ini juga akan terhapus.`
      )
    ) {
      try {
        await deleteLab(lab.id);
      } catch (err: any) {
        alert(`Gagal menghapus lab: ${err.message}`);
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Kelola Ruang Laboratorium Komputer"
      subtitle="Tambah, ubah nama, atau hapus ruangan laboratorium"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Header tombol tambah */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Daftar ruangan laboratorium yang terdaftar di sistem ({labs.length} Lab):
          </p>
          {!isAdding && !editingLabId && (
            <button
              onClick={() => {
                setIsAdding(true);
                setLabName('');
                setSubnetBroadcast('192.168.1.255');
                setTotalCapacity(30);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-all shadow-glow-teal"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Lab Baru</span>
            </button>
          )}
        </div>

        {/* Form Tambah / Edit */}
        {(isAdding || editingLabId !== null) && (
          <form
            onSubmit={handleSave}
            className="p-4 bg-surface-850 rounded-2xl border border-brand-500/30 space-y-3 animate-in fade-in duration-200"
          >
            <div className="flex items-center justify-between pb-1 border-b border-slate-700/60">
              <span className="text-xs font-bold text-brand-300">
                {editingLabId ? 'Sunting Data Laboratorium' : 'Pendaftaran Laboratorium Baru'}
              </span>
              <button
                type="button"
                onClick={cancelEdit}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2 rounded-lg bg-rose-950/60 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Nama Ruang Lab <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Lab Komputasi A-101"
                value={labName}
                onChange={(e) => setLabName(e.target.value)}
                className="w-full bg-surface-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Subnet Broadcast WoL <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 192.168.1.255"
                  value={subnetBroadcast}
                  onChange={(e) => setSubnetBroadcast(e.target.value)}
                  className="w-full bg-surface-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Kapasitas Meja (Unit)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={totalCapacity}
                  onChange={(e) => setTotalCapacity(Number(e.target.value))}
                  className="w-full bg-surface-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={cancelEdit}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-xl shadow-glow-teal flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Lab</span>
              </button>
            </div>
          </form>
        )}

        {/* Tabel / Daftar Laboratorium */}
        <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden bg-surface-900/60">
          {labs.map((lab) => {
            const isCurrent = selectedLab?.id === lab.id;
            return (
              <div
                key={lab.id}
                className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${
                  isCurrent ? 'bg-brand-500/10' : 'hover:bg-surface-850/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isCurrent
                        ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white truncate">
                        {lab.labName}
                      </span>
                      {isCurrent && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand-500/20 text-brand-300">
                          Aktif
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Broadcast: <span className="text-teal-400">{lab.subnetBroadcast}</span> · Kapasitas: {lab.totalCapacity} unit
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {!isCurrent && (
                    <button
                      onClick={() => selectLab(lab.id)}
                      className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-surface-800 hover:bg-surface-750 rounded-lg transition-colors"
                    >
                      Buka
                    </button>
                  )}
                  <button
                    onClick={() => startEdit(lab)}
                    title="Sunting data lab"
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(lab)}
                    title="Hapus lab"
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-surface-850 hover:bg-surface-800 text-slate-300"
          >
            Selesai
          </button>
        </div>
      </div>
    </Modal>
  );
};
