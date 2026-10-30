import React, { useMemo } from 'react';
import { Workstation } from '../../types';
import { WorkstationCard } from './WorkstationCard';
import {
  Search,
  Filter,
  MonitorOff,
  LayoutGrid,
  ChevronDown,
} from 'lucide-react';
import { useLabStore } from '../../stores/labStore';

interface LabGridProps {
  onEditWorkstation: (ws: Workstation) => void;
  onDeleteWorkstation: (id: number) => void;
  onOpenAppManager: (ws: Workstation) => void;
  onOpenRestrictionManager?: (ws: Workstation) => void;
}

export const LabGrid: React.FC<LabGridProps> = ({
  onEditWorkstation,
  onDeleteWorkstation,
  onOpenAppManager,
  onOpenRestrictionManager,
}) => {
  const {
    workstations,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    cardSize,
    setCardSize,
  } = useLabStore();

  const onlineCount = workstations.filter((w) => w.powerStatus === 'ONLINE').length;
  const inSessionCount = workstations.filter((w) => w.powerStatus === 'IN_SESSION').length;
  const offlineCount = workstations.filter((w) => w.powerStatus === 'OFFLINE').length;

  const filteredWorkstations = useMemo(() => {
    return workstations.filter((ws) => {
      const matchesSearch =
        ws.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ws.ipAddress.includes(searchQuery) ||
        ws.macAddress.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' || ws.powerStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [workstations, searchQuery, statusFilter]);

  // Kelompokkan workstation berdasarkan Baris (Row) untuk denah spasial lab
  const rows = useMemo(() => {
    const map = new Map<number, Workstation[]>();
    for (const ws of filteredWorkstations) {
      const row = ws.gridRow || 1;
      if (!map.has(row)) map.set(row, []);
      map.get(row)!.push(ws);
    }
    // Sort columns dalam tiap row
    for (const [_, list] of map.entries()) {
      list.sort((a, b) => a.gridColumn - b.gridColumn);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [filteredWorkstations]);

  // Kolom grid CSS responsif berdasarkan ukuran kartu
  const getGridColsClass = () => {
    switch (cardSize) {
      case 'small':
        return 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3';
      case 'large':
        return 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6';
      case 'medium':
      default:
        return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4';
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter, Search, and View Size Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-surface-900/80 p-3 rounded-2xl border border-slate-800 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama host, IP, atau MAC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-850 border border-slate-700/60 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        {/* Filter Dropdown & View Size switcher */}
        <div className="flex items-center gap-3 flex-wrap justify-between lg:justify-end">
          {/* Status Filter Dropdown (Menghemat Ruang) */}
          <div className="relative shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              aria-label="Filter Status Komputer"
              className="appearance-none bg-surface-850 hover:bg-surface-800 border border-slate-700/80 text-xs font-semibold text-slate-200 pl-8 pr-8 py-2 rounded-xl focus:outline-none focus:border-brand-500 cursor-pointer transition-colors shadow-sm"
            >
              <option value="ALL">Semua Status ({workstations.length})</option>
              <option value="ONLINE">🟢 Online ({onlineCount})</option>
              <option value="IN_SESSION">🟡 Dalam Sesi ({inSessionCount})</option>
              <option value="OFFLINE">🔴 Offline ({offlineCount})</option>
            </select>
            <Filter className="w-3.5 h-3.5 text-brand-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* View Size Dropdown (Menghemat Ruang) */}
          <div className="relative shrink-0">
            <select
              value={cardSize}
              onChange={(e) => setCardSize(e.target.value as any)}
              aria-label="Ukuran Tampilan Grid"
              className="appearance-none bg-surface-850 hover:bg-surface-800 border border-slate-700/80 text-xs font-semibold text-slate-200 pl-8 pr-8 py-2 rounded-xl focus:outline-none focus:border-brand-500 cursor-pointer transition-colors shadow-sm"
            >
              <option value="small">Ukuran: Kecil (Rapat)</option>
              <option value="medium">Ukuran: Sedang (Default)</option>
              <option value="large">Ukuran: Besar (HD)</option>
            </select>
            <LayoutGrid className="w-3.5 h-3.5 text-brand-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Grid Display */}
      {filteredWorkstations.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-800/60 text-slate-400">
            <MonitorOff className="w-8 h-8" />
          </div>
          <h4 className="text-sm font-semibold text-slate-200">
            Tidak ada workstation yang cocok
          </h4>
          <p className="text-xs text-slate-400 max-w-sm">
            Pastikan kata kunci pencarian Anda benar, atau sesuaikan filter status komputer.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {rows.map(([rowNum, rowWorkstations]) => (
            <div key={rowNum} className="space-y-3">
              {/* Row Header Label */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-850 border border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <LayoutGrid className="w-3.5 h-3.5 text-brand-400" />
                  <span>Baris Meja {rowNum}</span>
                </div>
                <div className="flex-1 h-[1px] bg-slate-800/80" />
                <span className="text-[11px] text-slate-400">
                  {rowWorkstations.length} Komputer
                </span>
              </div>

              {/* Workstation cards grid in this row with dynamic columns */}
              <div className={getGridColsClass()}>
                {rowWorkstations.map((ws) => (
                  <WorkstationCard
                    key={ws.id}
                    workstation={ws}
                    onEdit={onEditWorkstation}
                    onDelete={onDeleteWorkstation}
                    onOpenAppManager={onOpenAppManager}
                    onOpenRestrictionManager={onOpenRestrictionManager}
                    size={cardSize}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
