import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Clipboard, ArrowDown, ArrowUp } from 'lucide-react';

interface ClipboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRemoteClipboard: string;
  onSendClipboard: (text: string) => void;
}

export const ClipboardModal: React.FC<ClipboardModalProps> = ({
  isOpen,
  onClose,
  currentRemoteClipboard,
  onSendClipboard,
}) => {
  const [text, setText] = useState('');

  const handleSend = () => {
    onSendClipboard(text);
    onClose();
  };

  const handleCopyFromRemote = async () => {
    try {
      await navigator.clipboard.writeText(currentRemoteClipboard);
      alert('Teks dari komputer target berhasil disalin ke clipboard lokal Anda!');
    } catch {
      alert('Tidak dapat mengakses clipboard browser');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sinkronisasi Papan Klip (Shared Clipboard)"
      subtitle="Pertukaran teks dua arah antara mesin lokal Anda dan komputer target"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Remote -> Local */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <ArrowDown className="w-3.5 h-3.5 text-teal-400" />
              <span>Teks Terakhir dari Komputer Target</span>
            </label>
            <button
              onClick={handleCopyFromRemote}
              className="text-[11px] text-brand-400 hover:text-brand-300 underline"
            >
              Salin ke Clipboard Lokal
            </button>
          </div>
          <div className="p-3 bg-surface-850 rounded-xl border border-slate-700/60 font-mono text-xs text-slate-200 max-h-24 overflow-y-auto">
            {currentRemoteClipboard || '(Belum ada teks dari target)'}
          </div>
        </div>

        {/* Local -> Remote */}
        <div>
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
            <ArrowUp className="w-3.5 h-3.5 text-teal-400" />
            <span>Kirim Teks ke Komputer Target</span>
          </label>
          <textarea
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ketik atau tempel teks di sini untuk dikirim ke komputer target..."
            className="w-full bg-surface-850 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
          />
        </div>

        <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSend}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-glow-teal flex items-center gap-1.5"
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span>Kirim ke Target</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
