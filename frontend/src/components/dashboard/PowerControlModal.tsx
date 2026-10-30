import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useLabStore } from '../../stores/labStore';
import { Workstation } from '../../types';
import {
  Zap,
  Power,
  CheckSquare,
  Square,
  CheckCircle2,
  AlertCircle,
  Monitor,
  Search,
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
  const { workstations, selectedLab, wakeOnLanWorkstations, shutdownWorkstations } = useLabStore();

  const [mode, setMode] = useState<'WAKE' | 'SHUTDOWN'>(initialMode);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Inisialisasi pilihan perangkat saat modal dibuka atau mode berubah
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setFeedback(null);
      setSearchFilter('');

      if (targetWorkstation) {
        setSelectedIds([targetWorkstation.id]);
      } else {
        if (initialMode === 'WAKE') {
          // Pre-select semua komputer yang OFFLINE untuk WoL
          const offlineIds = workstations
            .filter((w) => w.powerStatus === 'OFFLINE')
            .map((w) => w.id);
          setSelectedIds(offlineIds.length > 0 ? offlineIds : workstations.map((w) => w.id));
        } else {
          // Pre-select semua komputer yang ONLINE atau IN_SESSION untuk Shutdown
          const activeIds = workstations
            .filter((w) => w.powerStatus !== 'OFFLINE')
            .map((w) => w.id);
          setSelectedIds(activeIds);
        }
      }
    }
  }, [isOpen, initialMode, targetWorkstation, workstations]);

  const handleModeChange = (newMode: 'WAKE' | 'SHUTDOWN') => {
    setMode(newMode);
    setFeedback(null);
    if (!targetWorkstation) {
      if (newMode === 'WAKE') {
        const offlineIds = workstations
          .filter((w) => w.powerStatus === 'OFFLINE')
          .map((w) => w.id);
        setSelectedIds(offlineIds.length > 0 ? offlineIds : workstations.map((w) => w.id));
      } else {
        const activeIds = workstations
          .filter((w) => w.powerStatus !== 'OFFLINE')
          .map((w) => w.id);
        setSelectedIds(activeIds);
      }
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(workstations.map((w) => w.id));
  };

  const selectOnlyOffline = () => {
    setSelectedIds(workstations.filter((w) => w.powerStatus === 'OFFLINE').map((w) => w.id));
  };

  const selectOnlyOnline = () => {
    setSelectedIds(workstations.filter((w) => w.powerStatus !== 'OFFLINE').map((w) => w.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const filteredList = workstations.filter((w) => {
    const q = searchFilter.toLowerCase();
    return (
      w.hostname.toLowerCase().includes(q) ||
      w.ipAddress.includes(q) ||
      w.macAddress.toLowerCase().includes(q)
    );
  });

  const handleExecute = async () => {
    if (selectedIds.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Silakan pilih setidaknya satu perangkat komputer terlebih dahulu.',
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      if (mode === 'WAKE') {
        await wakeOnLanWorkstations(selectedIds);
        setFeedback({
          type: 'success',
          message: `Berhasil mengirim sinyal Magic Packet Wake-on-LAN ke ${selectedIds.length} komputer.`,
        });
      } else {
        await shutdownWorkstations(selectedIds);
        setFeedback({
          type: 'success',
          message: `Perintah shutdown berhasil dikirim ke ${selectedIds.length} komputer.`,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Terjadi kesalahan saat memproses perintah daya.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manajemen Daya Komputer (Power Control)"
      subtitle={`Pilih perangkat dan tindakan daya di ${selectedLab?.labName || 'Laboratorium'}`}
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Tab Pilihan Mode: Nyalakan (WoL) vs Matikan (Shutdown) */}
        <div className="flex rounded-xl bg-surface-950 p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => handleModeChange('WAKE')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              mode === 'WAKE'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${mode === 'WAKE' ? 'text-emerald-400 fill-current' : ''}`} />
            <span>Nyalakan Komputer (Wake-on-LAN)</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange('SHUTDOWN')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              mode === 'SHUTDOWN'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Power className="w-3.5 h-3.5 text-rose-400" />
            <span>Matikan Komputer (Shutdown)</span>
          </button>
        </div>

        {/* Kotak Info Penjelasan Singkat */}
        <div
          className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
            mode === 'WAKE'
              ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-200/90'
              : 'bg-rose-950/20 border-rose-500/20 text-rose-200/90'
          }`}
        >
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

        {/* Pemilihan Perangkat Komputer Target */}
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-brand-400" />
              <span>Pilih Komputer Target ({selectedIds.length} dari {workstations.length} dipilih):</span>
            </label>

            {/* Tombol Pemilihan Cepat */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={selectAll}
                className="text-[11px] px-2 py-0.5 rounded bg-surface-850 hover:bg-surface-800 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              >
                Pilih Semua
              </button>
              {mode === 'WAKE' ? (
                <button
                  type="button"
                  onClick={selectOnlyOffline}
                  className="text-[11px] px-2 py-0.5 rounded bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 transition-colors"
                >
                  Hanya Offline
                </button>
              ) : (
                <button
                  type="button"
                  onClick={selectOnlyOnline}
                  className="text-[11px] px-2 py-0.5 rounded bg-teal-950/40 hover:bg-teal-900/60 text-teal-300 border border-teal-500/30 transition-colors"
                >
                  Hanya Online
                </button>
              )}
              <button
                type="button"
                onClick={clearSelection}
                className="text-[11px] px-2 py-0.5 rounded bg-surface-850 hover:bg-surface-800 text-rose-300 border border-slate-700 transition-colors"
              >
                Batal
              </button>
            </div>
          </div>

          {/* Kotak Pencarian Perangkat */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari host atau IP komputer..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-surface-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Daftar Scrollable Perangkat */}
          <div className="max-h-56 overflow-y-auto space-y-1 rounded-xl bg-surface-950 p-2 border border-slate-800/80">
            {filteredList.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                Tidak ada komputer yang cocok dengan pencarian
              </div>
            ) : (
              filteredList.map((ws) => {
                const isSelected = selectedIds.includes(ws.id);
                const isOnline = ws.powerStatus === 'ONLINE';
                const isInSession = ws.powerStatus === 'IN_SESSION';

                return (
                  <div
                    key={ws.id}
                    onClick={() => toggleSelect(ws.id)}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-all border ${
                      isSelected
                        ? mode === 'WAKE'
                          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                          : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                        : 'bg-surface-900/60 border-transparent text-slate-300 hover:bg-surface-850 hover:border-slate-750'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {isSelected ? (
                        <CheckSquare
                          className={`w-4 h-4 shrink-0 ${
                            mode === 'WAKE' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        />
                      ) : (
                        <Square className="w-4 h-4 shrink-0 text-slate-500" />
                      )}
                      <div className="truncate">
                        <span className="font-bold text-white mr-2">{ws.hostname}</span>
                        <span className="text-[11px] font-mono text-slate-400">{ws.ipAddress}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                        {ws.macAddress}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          isOnline
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : isInSession
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {isOnline ? 'Online' : isInSession ? 'Sesi' : 'Offline'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
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
            disabled={isSubmitting || selectedIds.length === 0}
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
                <span>Nyalakan {selectedIds.length} Komputer (WoL)</span>
              </>
            ) : (
              <>
                <Power className="w-3.5 h-3.5" />
                <span>Matikan {selectedIds.length} Komputer (Shutdown)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
