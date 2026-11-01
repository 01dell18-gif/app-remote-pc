import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { useLabStore } from '../../stores/labStore';
import { Search, Monitor, Plus, Check, Loader2, Wifi } from 'lucide-react';

interface ScanNetworkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScanNetworkModal: React.FC<ScanNetworkModalProps> = ({ isOpen, onClose }) => {
  const { selectedLab, fetchWorkstations } = useLabStore();
  const [subnet, setSubnet] = useState('10.10.10');
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<Array<{ ip: string; isRdpOpen: boolean; isVncOpen: boolean }>>([]);
  const [addedIps, setAddedIps] = useState<Set<string>>(new Set());
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleScan = async () => {
    setIsScanning(true);
    setStatusMsg(`Memindai subnet ${subnet}.0/24 (254 host)... Mohon tunggu beberapa detik.`);
    setDevices([]);
    try {
      const res = await api.scanNetwork(subnet);
      setDevices(res.devices);
      setStatusMsg(`Pemindaian selesai: Ditemukan ${res.devices.length} perangkat aktif.`);
    } catch (err: any) {
      setStatusMsg(`Galat saat memindai: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddDevice = async (device: { ip: string; isRdpOpen: boolean; isVncOpen: boolean }) => {
    if (!selectedLab) return;
    const ipLastOctet = device.ip.split('.')[3];
    const defaultHostname = `PC-LAB-${ipLastOctet.padStart(2, '0')}`;
    const defaultMac = `00:1A:2B:3C:4D:${ipLastOctet.padStart(2, '0').slice(-2)}`;

    try {
      await api.createWorkstation({
        labId: selectedLab.id,
        hostname: defaultHostname,
        ipAddress: device.ip,
        macAddress: defaultMac,
        connectionMode: device.isRdpOpen ? 'RDP_SHADOW' : device.isVncOpen ? 'VNC' : 'RDP_SHADOW',
        osFamily: 'WINDOWS',
      });
      setAddedIps((prev) => new Set(prev).add(device.ip));
      await fetchWorkstations();
    } catch (err: any) {
      alert(`Gagal menambahkan PC ${device.ip}: ${err.message}`);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pindai Jaringan Komputer Lab (Network Scanner)">
      <div className="space-y-4">
        <p className="text-xs text-slate-400 leading-relaxed">
          Pindai jaringan lokal (LAN) untuk mendeteksi seluruh komputer yang sedang aktif, status port RDP (3389), dan
          VNC (5900) agar dapat langsung ditambahkan ke inventaris lab.
        </p>

        {/* Form Subnet */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Subnet Prefiks (/24)</label>
            <div className="flex items-center gap-1 bg-surface-900 border border-slate-700 rounded-xl px-3 py-2 text-xs">
              <span className="text-slate-500 font-mono">192.168.1 atau</span>
              <input
                type="text"
                value={subnet}
                onChange={(e) => setSubnet(e.target.value.trim())}
                placeholder="10.10.10"
                className="bg-transparent text-white font-mono font-bold focus:outline-none flex-1"
              />
              <span className="text-slate-500 font-mono">.0/24</span>
            </div>
          </div>

          <div className="pt-5">
            <button
              onClick={handleScan}
              disabled={isScanning || !subnet}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Memindai...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Pindai Sekarang</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Pesan Status */}
        {statusMsg && (
          <div className="text-[11px] text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 p-2 rounded-xl flex items-center gap-2">
            <Wifi className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Hasil Pemindaian */}
        <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
          {devices.map((d) => (
            <div
              key={d.ip}
              className="bg-surface-850 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-brand-400" />
                <div>
                  <div className="font-mono font-bold text-slate-200">{d.ip}</div>
                  <div className="text-[10px] flex items-center gap-2 mt-0.5">
                    <span className={d.isRdpOpen ? 'text-emerald-400' : 'text-slate-500'}>
                      RDP 3389: {d.isRdpOpen ? 'Terbuka (Siap)' : 'Tertutup'}
                    </span>
                    <span className={d.isVncOpen ? 'text-emerald-400' : 'text-slate-500'}>
                      VNC: {d.isVncOpen ? 'Aktif' : 'Non-aktif'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                {addedIps.has(d.ip) ? (
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1 bg-emerald-950/60 border border-emerald-800/80 px-2 py-1 rounded-lg">
                    <Check className="w-3 h-3" /> Terdaftar
                  </span>
                ) : (
                  <button
                    onClick={() => handleAddDevice(d)}
                    className="text-[11px] bg-slate-800 hover:bg-brand-600 text-slate-200 hover:text-white px-2.5 py-1 rounded-lg border border-slate-700 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Tambahkan
                  </button>
                )}
              </div>
            </div>
          ))}

          {!isScanning && devices.length === 0 && (
            <div className="text-center py-6 text-xs text-slate-500">
              Belum ada hasil pemindaian. Masukkan subnet di atas dan klik "Pindai Sekarang".
            </div>
          )}
        </div>

        <div className="border-t border-slate-800 pt-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
          >
            Tutup
          </button>
        </div>
      </div>
    </Modal>
  );
};
