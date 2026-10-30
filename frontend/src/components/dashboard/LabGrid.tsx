import React, { useMemo } from 'react';
import { Workstation } from '../../types';
import { WorkstationCard } from './WorkstationCard';
import { Search, Filter, MonitorOff, LayoutGrid } from 'lucide-react';
import { useLabStore } from '../../stores/labStore';

interface LabGridProps {
  onEditWorkstation: (ws: Workstation) => void;
  onDeleteWorkstation: (id: number) => void;
}

export const LabGrid: React.FC<LabGridProps> = ({
  onEditWorkstation,
  onDeleteWorkstation,
}) => {
  const {
    workstations,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
  } = useLabStore();

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

  return (
    <div className="space-y-6">
      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-900/60 p-3 rounded-2xl border border-slate-800/80">
        {/* Search */}
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

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 hidden sm:block" />
          {(['ALL', 'ONLINE', 'IN_SESSION', 'OFFLINE'] as const).map((filter) => {
            const labels = {
              ALL: 'Semua',
              ONLINE: 'Online',
              IN_SESSION: 'Dalam Sesi',
              OFFLINE: 'Offline',
            };
            const isActive = statusFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
                }`}
              >
                {labels[filter]}
              </button>
            );
          })}
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
            Pastikan kata kunci pencarian Anda benar, atau tambahkan komputer baru ke dalam laboratorium ini.
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

              {/* Workstation cards grid in this row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {rowWorkstations.map((ws) => (
                  <WorkstationCard
                    key={ws.id}
                    workstation={ws}
                    onEdit={onEditWorkstation}
                    onDelete={onDeleteWorkstation}
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
