import React, { useState, useRef } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { useLabStore } from '../../stores/labStore';
import {
  Download,
  Upload,
  FileCode,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Table,
} from 'lucide-react';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({ isOpen, onClose }) => {
  const { selectedLab, workstations, fetchWorkstations } = useLabStore();

  const [activeTab, setActiveTab] = useState<'EXPORT' | 'IMPORT'>('IMPORT');
  const [conflictMode, setConflictMode] = useState<'upsert' | 'skip'>('upsert');

  // Import state
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Download Sample CSV Template
  const handleDownloadTemplate = () => {
    const templateContent =
      'hostname,ipAddress,macAddress,osFamily,gridRow,gridColumn,connectionMode\n' +
      'PC-LAB-01,192.168.1.101,AA:BB:CC:DD:EE:01,WINDOWS,1,1,RDP_SHADOW\n' +
      'PC-LAB-02,192.168.1.102,AA:BB:CC:DD:EE:02,WINDOWS,1,2,RDP_SHADOW\n' +
      'PC-LAB-03,192.168.1.103,AA:BB:CC:DD:EE:03,LINUX,1,3,VNC\n';

    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_workstations_fyj.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export current lab as CSV
  const handleExportCSV = () => {
    if (workstations.length === 0) {
      alert('Tidak ada data komputer di lab ini untuk diekspor.');
      return;
    }

    const header = 'id,hostname,ipAddress,macAddress,powerStatus,osFamily,gridRow,gridColumn,connectionMode\n';
    const rows = workstations
      .map(
        (w) =>
          `${w.id},"${w.hostname}","${w.ipAddress}","${w.macAddress}","${w.powerStatus}","${w.osFamily}",${w.gridRow},${w.gridColumn},"${w.connectionMode}"`
      )
      .join('\n');

    const csvContent = header + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeLabName = (selectedLab?.labName || 'lab').replace(/[^a-zA-Z0-9_-]/g, '_');
    a.href = url;
    a.download = `workstations_${safeLabName}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export current lab as JSON
  const handleExportJSON = () => {
    if (workstations.length === 0) {
      alert('Tidak ada data komputer di lab ini untuk diekspor.');
      return;
    }

    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify({ lab: selectedLab, workstations }, null, 2));
    const a = document.createElement('a');
    const safeLabName = (selectedLab?.labName || 'lab').replace(/[^a-zA-Z0-9_-]/g, '_');
    a.href = dataStr;
    a.download = `backup_workstations_${safeLabName}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  // Handle parsing CSV or JSON text
  const parseContent = (content: string) => {
    setFeedback(null);
    const trimmed = content.trim();
    if (!trimmed) {
      setParsedRows([]);
      return;
    }

    // Coba parse JSON terlebih dahulu
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const json = JSON.parse(trimmed);
        const list = Array.isArray(json) ? json : json.workstations || [];
        setParsedRows(list);
        return;
      } catch (_) {}
    }

    // Parse CSV
    const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      setParsedRows([]);
      return;
    }

    const headerParts = lines[0].split(',').map((h) => h.replace(/["']/g, '').trim().toLowerCase());
    const items: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.replace(/["']/g, '').trim());
      const row: any = {};
      headerParts.forEach((h, idx) => {
        row[h] = parts[idx] || '';
      });

      // Mapping alias jika nama kolom berbeda
      const mapped = {
        hostname: row.hostname || row.name || row['nama host'] || `PC-${i}`,
        ipAddress: row.ipaddress || row.ip || row['alamat ip'] || '',
        macAddress: row.macaddress || row.mac || row['mac address'] || '',
        osFamily: row.osfamily || row.os || 'WINDOWS',
        gridRow: parseInt(row.gridrow || row.row || row.baris || '1', 10),
        gridColumn: parseInt(row.gridcolumn || row.column || row.kolom || String(i), 10),
        connectionMode: row.connectionmode || 'RDP_SHADOW',
      };

      if (mapped.ipAddress || mapped.macAddress) {
        items.push(mapped);
      }
    }

    setParsedRows(items);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      parseContent(text);
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async () => {
    if (!selectedLab) {
      setFeedback({ type: 'error', message: 'Silakan pilih laboratorium tujuan terlebih dahulu.' });
      return;
    }

    if (parsedRows.length === 0) {
      setFeedback({ type: 'error', message: 'Tidak ada baris data valid yang siap diimpor.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await api.importWorkstations({
        labId: selectedLab.id,
        workstations: parsedRows,
        mode: conflictMode,
      });

      setFeedback({
        type: 'success',
        message: res.message,
      });

      fetchWorkstations();
      setParsedRows([]);
      setCsvText('');
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Gagal memproses impor data komputer.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Impor & Ekspor Inventaris Komputer Lab"
      subtitle={`Kelola data perangkat secara massal untuk ${selectedLab?.labName || 'Laboratorium'}`}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Tab Pilihan: Impor vs Ekspor */}
        <div className="flex items-center gap-2 p-1 bg-surface-950 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab('IMPORT');
              setFeedback(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'IMPORT'
                ? 'bg-brand-600 text-white shadow-glow-teal'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Impor Data PC (Massal)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('EXPORT');
              setFeedback(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'EXPORT'
                ? 'bg-teal-600 text-white shadow-glow-teal'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Data Lab ({workstations.length} Unit)</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3 rounded-xl flex items-center gap-2 text-xs font-medium animate-in fade-in duration-150 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/60 border border-rose-500/30 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* TAB 1: IMPOR DATA */}
        {activeTab === 'IMPORT' && (
          <div className="space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-xs text-slate-300">
                Unggah file Spreadsheet (<strong>.CSV</strong>) atau <strong>.JSON</strong> untuk menambahkan banyak komputer sekaligus ke lab.
              </p>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg bg-surface-850 hover:bg-surface-800 text-brand-300 border border-brand-500/30 flex items-center gap-1.5 font-semibold transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Unduh Contoh Template CSV</span>
              </button>
            </div>

            {/* Input File & Drag-drop */}
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv,.json,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-surface-850 hover:bg-surface-800 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-2 transition-colors"
              >
                <Upload className="w-4 h-4 text-brand-400" />
                <span>Pilih File CSV / JSON dari Komputer</span>
              </button>
              <span className="text-[11px] text-slate-400">atau tempel teks di bawah:</span>
            </div>

            {/* Textarea Paste */}
            <div>
              <textarea
                rows={3}
                placeholder="Tempel baris teks CSV di sini (contoh: PC-01, 192.168.1.101, AA:BB:CC:DD:EE:01)..."
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value);
                  parseContent(e.target.value);
                }}
                className="w-full bg-surface-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Resolusi Konflik Duplikasi */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-950 border border-slate-800 text-xs">
              <span className="font-semibold text-slate-300">Jika Alamat MAC sudah ada di database:</span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="radio"
                    name="conflictMode"
                    checked={conflictMode === 'upsert'}
                    onChange={() => setConflictMode('upsert')}
                    className="accent-brand-500"
                  />
                  <span>Perbarui Data (Update)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="radio"
                    name="conflictMode"
                    checked={conflictMode === 'skip'}
                    onChange={() => setConflictMode('skip')}
                    className="accent-brand-500"
                  />
                  <span>Lewati (Skip)</span>
                </label>
              </div>
            </div>

            {/* Tabel Pratinjau Baris Siap Impor */}
            {parsedRows.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Table className="w-3.5 h-3.5 text-brand-400" />
                    <span>Pratinjau Data ({parsedRows.length} Komputer Siap Diimpor):</span>
                  </span>
                </div>

                <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-800 bg-surface-950">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-surface-850/80 text-[10px] uppercase font-bold text-slate-400 sticky top-0">
                      <tr>
                        <th className="p-2">Hostname</th>
                        <th className="p-2">IP Address</th>
                        <th className="p-2">MAC Address</th>
                        <th className="p-2">OS</th>
                        <th className="p-2">Grid (R,C)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                      {parsedRows.map((r, idx) => (
                        <tr key={idx} className="hover:bg-surface-850/40">
                          <td className="p-2 font-bold text-white font-sans">{r.hostname}</td>
                          <td className="p-2 text-teal-300">{r.ipAddress}</td>
                          <td className="p-2 text-slate-400">{r.macAddress}</td>
                          <td className="p-2 text-slate-300">{r.osFamily}</td>
                          <td className="p-2 text-slate-400">{r.gridRow}, {r.gridColumn}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tombol Eksekusi Impor */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-800">
              <span className="text-[11px] text-slate-400">
                Target Lab: <strong className="text-white">{selectedLab?.labName}</strong>
              </span>

              <button
                type="button"
                onClick={handleImportSubmit}
                disabled={isSubmitting || parsedRows.length === 0}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-glow-teal flex items-center gap-1.5 disabled:opacity-50 transition-all"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Memproses Impor...' : `Impor ${parsedRows.length} Komputer ke Database`}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: EKSPOR DATA */}
        {activeTab === 'EXPORT' && (
          <div className="space-y-4 pt-1">
            <p className="text-xs text-slate-300 leading-relaxed">
              Unduh seluruh daftar komputer di laboratorium ini untuk keperluan arsip, laporan inventaris sekolah/kampus, atau pemindahan data ke lab lain.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Opsi Ekspor CSV */}
              <div className="p-4 rounded-2xl bg-surface-850 border border-slate-800 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>Format CSV (Excel)</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Format baris tabel yang dapat langsung dibuka dan disunting menggunakan Microsoft Excel atau Google Sheets.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-glow-emerald transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh File CSV ({workstations.length} PC)</span>
                </button>
              </div>

              {/* Opsi Ekspor JSON */}
              <div className="p-4 rounded-2xl bg-surface-850 border border-slate-800 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <FileCode className="w-4 h-4 text-teal-400" />
                    <span>Cadangan JSON (Lengkap)</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Format struktur data asli sistem FYJ Channel Remote, cocok untuk backup dan restore ke server lain.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="w-full py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-glow-teal transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Cadangan JSON</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
