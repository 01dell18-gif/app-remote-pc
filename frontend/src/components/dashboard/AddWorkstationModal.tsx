import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Workstation, ConnectionMode } from '../../types';
import { useLabStore } from '../../stores/labStore';
import { api } from '../../services/api';

interface AddWorkstationModalProps {
  isOpen: boolean;
  onClose: () => void;
  workstationToEdit?: Workstation | null;
}

export const AddWorkstationModal: React.FC<AddWorkstationModalProps> = ({
  isOpen,
  onClose,
  workstationToEdit,
}) => {
  const { selectedLab, fetchWorkstations } = useLabStore();

  const [hostname, setHostname] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [macAddress, setMacAddress] = useState('');
  const [gridRow, setGridRow] = useState(1);
  const [gridColumn, setGridColumn] = useState(1);
  const [osFamily, setOsFamily] = useState('WINDOWS');
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('RDP_SHADOW');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (workstationToEdit) {
      setHostname(workstationToEdit.hostname);
      setIpAddress(workstationToEdit.ipAddress);
      setMacAddress(workstationToEdit.macAddress);
      setGridRow(workstationToEdit.gridRow);
      setGridColumn(workstationToEdit.gridColumn);
      setOsFamily(workstationToEdit.osFamily);
      setConnectionMode(workstationToEdit.connectionMode);
    } else {
      setHostname('');
      setIpAddress('192.168.1.');
      setMacAddress('');
      setGridRow(1);
      setGridColumn(1);
      setOsFamily('WINDOWS');
      setConnectionMode('RDP_SHADOW');
    }
    setErrorMsg(null);
  }, [workstationToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLab) return;
    setErrorMsg(null);

    // Validasi MAC address sederhana (12 hex)
    const cleanMac = macAddress.replace(/[^0-9a-fA-F]/g, '');
    if (cleanMac.length !== 12) {
      setErrorMsg('Alamat MAC harus tepat 12 karakter heksadesimal (contoh: 00:1A:2B:3C:4D:05)');
      return;
    }

    setIsSubmitting(true);
    try {
      if (workstationToEdit) {
        await api.updateWorkstation(workstationToEdit.id, {
          labId: selectedLab.id,
          hostname,
          ipAddress,
          macAddress,
          gridRow,
          gridColumn,
          osFamily,
          connectionMode,
        });
      } else {
        await api.createWorkstation({
          labId: selectedLab.id,
          hostname,
          ipAddress,
          macAddress,
          gridRow,
          gridColumn,
          osFamily,
          connectionMode,
        });
      }

      await fetchWorkstations();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan workstation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={workstationToEdit ? 'Sunting Workstation Klien' : 'Daftarkan Workstation Klien Baru'}
      subtitle={`Laboratorium: ${selectedLab?.labName || '-'}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nama Host / Komputer <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Misal: PC-LAB-01"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              className="w-full bg-surface-850 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Sistem Operasi
            </label>
            <select
              value={osFamily}
              onChange={(e) => setOsFamily(e.target.value)}
              className="w-full bg-surface-850 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
            >
              <option value="WINDOWS">Microsoft Windows (10/11)</option>
              <option value="LINUX">Linux (Ubuntu/Debian)</option>
              <option value="MACOS">Apple macOS</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Alamat IPv4 <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="192.168.1.101"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              className="w-full bg-surface-850 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Alamat MAC (Fisik) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="00:1A:2B:3C:4D:01"
              value={macAddress}
              onChange={(e) => setMacAddress(e.target.value)}
              className="w-full bg-surface-850 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">Dibutuhkan untuk paket Wake-on-LAN</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Baris Meja (Row)
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={gridRow}
              onChange={(e) => setGridRow(parseInt(e.target.value, 10) || 1)}
              className="w-full bg-surface-850 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Kolom Meja (Col)
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={gridColumn}
              onChange={(e) => setGridColumn(parseInt(e.target.value, 10) || 1)}
              className="w-full bg-surface-850 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Mode Remote
            </label>
            <select
              value={connectionMode}
              onChange={(e) => setConnectionMode(e.target.value as ConnectionMode)}
              className="w-full bg-surface-850 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
            >
              <option value="RDP_SHADOW">RDP Shadowing (Console)</option>
              <option value="RDP_FULL">RDP Mandiri (Port 3389)</option>
              <option value="VNC">VNC / RFB (Port 5900)</option>
              <option value="MOCK_AGENT">Mock Simulator (Lab Test)</option>
            </select>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-glow-teal transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'Menyimpan...' : workstationToEdit ? 'Simpan Perubahan' : 'Daftarkan Komputer'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
