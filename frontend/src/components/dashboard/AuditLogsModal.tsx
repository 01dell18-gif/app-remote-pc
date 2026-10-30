import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { AuditTrail } from '../../types';
import { api } from '../../services/api';
import { RefreshCw } from 'lucide-react';

interface AuditLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogsModal: React.FC<AuditLogsModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<AuditTrail[]>([]);
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs(50);
      setLogs(res.logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Catatan Jejak Audit Keamanan (Audit Logs)"
      subtitle="Rekaman aktivitas daya, sesi remote, dan perubahan konfigurasi sistem"
      maxWidth="4xl"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Menampilkan 50 rekaman aktivitas terakhir</span>
          <button
            onClick={loadLogs}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs bg-surface-850 hover:bg-surface-800 text-slate-300 border border-slate-700/60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>

        <div className="border border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-850 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Waktu</th>
                <th className="py-2.5 px-3">Operator</th>
                <th className="py-2.5 px-3">Aksi</th>
                <th className="py-2.5 px-3">Target PC</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Detail Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                    Belum ada riwayat aktivitas yang tercatat.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-850/40 transition-colors">
                    <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.executedAt).toLocaleString([], {
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-2 px-3 text-slate-200 font-sans font-medium whitespace-nowrap">
                      {log.user?.fullName || log.user?.username || `User #${log.userId}`}
                      <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-slate-800 text-brand-400 font-mono">
                        {log.user?.role}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-300">
                      {log.actionName}
                    </td>
                    <td className="py-2 px-3 text-slate-300">
                      {log.workstation ? (
                        <span>
                          {log.workstation.hostname} ({log.workstation.ipAddress})
                        </span>
                      ) : (
                        <span className="text-slate-400 font-sans">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          log.actionStatus === 'SUCCESS'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-950/60 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {log.actionStatus}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-400 text-[10px] max-w-xs truncate" title={log.metadataJson || ''}>
                      {log.metadataJson || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};
