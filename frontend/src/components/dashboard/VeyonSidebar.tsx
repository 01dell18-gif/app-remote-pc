import React, { useState, useMemo } from 'react';
import { useLabStore } from '../../stores/labStore';
import { useAuthStore } from '../../stores/authStore';
import { Workstation } from '../../types';
import { api } from '../../services/api';
import {
  Layers,
  ChevronDown,
  ChevronRight,
  Settings2,
  Search,
  CheckSquare,
  Square,
  PanelLeftClose,
  DoorOpen,
  ExternalLink,
} from 'lucide-react';

interface VeyonSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onOpenManageLabs: () => void;
  onSelectWorkstation?: (ws: Workstation) => void;
}

export const VeyonSidebar: React.FC<VeyonSidebarProps> = ({
  isOpen,
  onToggle,
  onOpenManageLabs,
  onSelectWorkstation,
}) => {
  const { user } = useAuthStore();
  const {
    labs,
    selectedLab,
    selectLab,
    workstations,
    selectedWorkstationIds,
    toggleSelectWorkstation,
    toggleSelectLabWorkstations,
    selectAllWorkstations,
    clearSelectedWorkstations,
    setActiveRemoteSession,
  } = useLabStore();

  const isAdmin = user?.role === 'SUPERADMIN';

  // State ekspansi per lab (default lab aktif terbuka)
  const [expandedLabIds, setExpandedLabIds] = useState<number[]>([1, 2]);
  const [filterQuery, setFilterQuery] = useState('');

  const toggleExpand = (labId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedLabIds((prev) =>
      prev.includes(labId) ? prev.filter((id) => id !== labId) : [...prev, labId]
    );
  };

  // Hitung total komputer di seluruh lab
  const totalWorkstationsCount = useMemo(() => {
    return labs.reduce((acc, lab) => acc + (lab.workstations?.length || lab._count?.workstations || 0), 0);
  }, [labs]);

  if (!isOpen) {
    return (
      <div className="hidden lg:flex flex-col items-center py-4 px-2 bg-surface-900 border-r border-slate-800 shrink-0 w-12 z-20 h-full">
        <button
          onClick={onToggle}
          title="Buka Panel Ruangan & Komputer (Veyon Sidebar)"
          className="p-2 rounded-xl bg-surface-850 hover:bg-surface-800 text-brand-400 hover:text-brand-300 border border-slate-700/80 transition-all hover:scale-105"
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-72 sm:w-80 bg-surface-900/98 backdrop-blur-md border-r border-slate-800 flex flex-col shrink-0 h-full z-30 transition-all select-none">
      {/* Sidebar Header (Veyon Style: Lokasi & Komputer) */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0 bg-surface-900">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20 shrink-0">
            <DoorOpen className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-black text-white uppercase tracking-wider truncate flex items-center gap-1.5">
              <span>Ruangan & Komputer</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-mono truncate">
              {labs.length} Ruang Lab · {totalWorkstationsCount} Komputer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isAdmin && (
            <button
              onClick={onOpenManageLabs}
              title="Kelola Ruang Lab (Tambah, Edit, Hapus)"
              className="p-1.5 rounded-lg hover:bg-surface-800 text-slate-400 hover:text-white transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onToggle}
            title="Tutup Panel Sidebar"
            className="p-1.5 rounded-lg hover:bg-surface-800 text-slate-400 hover:text-white transition-colors"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Kotak Filter Pencarian Cepat di Sidebar */}
      <div className="p-2.5 border-b border-slate-800/80 shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari ruang atau PC..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full bg-surface-950 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>
      </div>

      {/* Baris Status & Aksi Pemilihan Cepat Perangkat Terpilih */}
      <div className="px-3 py-1.5 bg-surface-950/80 border-b border-slate-800/80 flex items-center justify-between text-[11px] shrink-0">
        <span className="text-slate-400">
          Target: <strong className="text-teal-400 font-mono font-bold">{selectedWorkstationIds.length}</strong> PC Terpilih
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={selectAllWorkstations}
            className="text-[10px] text-teal-400 hover:text-teal-300 hover:underline font-semibold"
          >
            Pilih Semua
          </button>
          <span className="text-slate-600">·</span>
          <button
            type="button"
            onClick={clearSelectedWorkstations}
            className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline font-semibold"
          >
            Batal
          </button>
        </div>
      </div>

      {/* Tree View Ruangan & Komputer (Persis Model Veyon) */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
        {labs.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500">
            Belum ada ruangan lab.
          </div>
        ) : (
          labs.map((lab) => {
            const isSelected = selectedLab?.id === lab.id;
            const isExpanded = expandedLabIds.includes(lab.id);

            // Komputer dalam lab ini (jika lab aktif, gunakan workstations dari store agar powerStatus real-time)
            const labComputers: Workstation[] = isSelected
              ? workstations
              : lab.workstations || [];

            // Filter pencarian
            const filteredComputers = labComputers.filter((ws) => {
              if (!filterQuery) return true;
              const q = filterQuery.toLowerCase();
              return (
                ws.hostname.toLowerCase().includes(q) ||
                ws.ipAddress.includes(q) ||
                lab.labName.toLowerCase().includes(q)
              );
            });

            // Status centang lab
            const labWsIds = labComputers.map((w) => w.id);
            const allChecked = labWsIds.length > 0 && labWsIds.every((id) => selectedWorkstationIds.includes(id));
            const someChecked = labWsIds.some((id) => selectedWorkstationIds.includes(id)) && !allChecked;

            return (
              <div key={lab.id} className="rounded-xl overflow-hidden transition-colors">
                {/* Node Ruangan Lab (Header Tree) */}
                <div
                  onClick={() => selectLab(lab.id)}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-brand-500/15 border-brand-500/30 text-white font-bold'
                      : 'border-transparent text-slate-300 hover:bg-surface-850 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {/* Tombol Panah Expand/Collapse */}
                    <button
                      type="button"
                      onClick={(e) => toggleExpand(lab.id, e)}
                      className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-white"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Checkbox Lab */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectLabWorkstations(labComputers);
                      }}
                      className="cursor-pointer text-slate-400 hover:text-white shrink-0"
                    >
                      {allChecked ? (
                        <CheckSquare className="w-3.5 h-3.5 text-brand-400" />
                      ) : someChecked ? (
                        <div className="w-3.5 h-3.5 border border-brand-400 rounded flex items-center justify-center bg-brand-500/20">
                          <div className="w-1.5 h-1.5 bg-brand-400 rounded-sm" />
                        </div>
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </div>

                    <span className="truncate text-xs font-semibold" title={lab.labName}>
                      {lab.labName}
                    </span>
                  </div>

                  {/* Badge Jumlah Unit */}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono shrink-0 ml-1 ${
                      isSelected
                        ? 'bg-brand-500/25 text-brand-300 font-bold'
                        : 'bg-surface-800 text-slate-400'
                    }`}
                  >
                    {labComputers.length || lab._count?.workstations || 0}
                  </span>
                </div>

                {/* Sub-item Tree: Daftar Komputer Siswa (Indented) */}
                {isExpanded && (
                  <div className="ml-5 pl-2.5 border-l border-slate-800/80 my-1 space-y-0.5">
                    {filteredComputers.length === 0 ? (
                      <div className="text-[11px] text-slate-500 py-1 pl-2">
                        {filterQuery ? 'Tidak ada kecocokan' : 'Belum ada komputer'}
                      </div>
                    ) : (
                      filteredComputers.map((ws) => {
                        const isChecked = selectedWorkstationIds.includes(ws.id);
                        const isOnline = ws.powerStatus === 'ONLINE';
                        const isInSession = ws.powerStatus === 'IN_SESSION';

                        return (
                          <div
                            key={ws.id}
                            onClick={() => {
                              if (onSelectWorkstation) onSelectWorkstation(ws);
                            }}
                            className={`flex items-center justify-between py-1.5 px-2 rounded-lg text-xs cursor-pointer group transition-colors ${
                              isChecked
                                ? 'bg-surface-850 text-white font-medium'
                                : 'text-slate-400 hover:bg-surface-850/60 hover:text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              {/* Checkbox Workstation */}
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelectWorkstation(ws.id);
                                }}
                                className="cursor-pointer text-slate-500 group-hover:text-slate-300 shrink-0"
                              >
                                {isChecked ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-brand-400" />
                                ) : (
                                  <Square className="w-3.5 h-3.5" />
                                )}
                              </div>

                              {/* Status Dot */}
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  isOnline
                                    ? 'bg-emerald-400 shadow-glow-emerald'
                                    : isInSession
                                    ? 'bg-amber-400'
                                    : 'bg-rose-500'
                                }`}
                              />

                              <div className="truncate">
                                <span className="font-semibold text-white mr-1.5">
                                  {ws.hostname}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500">
                                  {ws.ipAddress}
                                </span>
                              </div>
                            </div>

                            {/* Tombol Cepat Remote (Muncul saat hover jika online) */}
                            {isOnline && (
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    const session = await api.getRemoteToken(ws.id);
                                    setActiveRemoteSession(session);
                                  } catch (err: any) {
                                    alert(err.message);
                                  }
                                }}
                                title="Buka Remote Desktop"
                                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-700 text-brand-400 transition-opacity"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Sidebar (Status Ringkas) */}
      <div className="p-3 border-t border-slate-800 bg-surface-900 shrink-0 flex items-center justify-between text-[11px] text-slate-400">
        <span className="font-mono">
          Lab Aktif: <strong className="text-white">{selectedLab?.labName || '-'}</strong>
        </span>

        {isAdmin && (
          <button
            onClick={onOpenManageLabs}
            className="text-[10px] text-brand-400 hover:text-brand-300 font-semibold underline underline-offset-2"
          >
            Kelola Lab
          </button>
        )}
      </div>
    </aside>
  );
};
