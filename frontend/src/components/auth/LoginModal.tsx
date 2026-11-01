import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Sparkles } from 'lucide-react';

export const LoginModal: React.FC = () => {
  const { login, isLoading, error } = useAuthStore();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(username, password);
  };

  const handleQuickLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    login(u, p);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/95 backdrop-blur-xl">
      <div className="w-full max-w-md bg-surface-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Logo and Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <img
            src="/logo.png"
            alt="FYJ Channel Logo"
            className="w-16 h-16 rounded-full object-contain shadow-glow-teal border border-slate-700/80 bg-slate-900 p-1 mb-3 hover:scale-105 transition-transform"
          />
          <h2 className="text-xl font-black text-white tracking-tight">
            FYJ Channel <span className="text-brand-400">Remote</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Gateway Pengendali & Pemantauan Jaringan Laboratorium Komputer Berbasis Web
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nama Pengguna (Username)
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-surface-850 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Kata Sandi (Password)
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-850 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl font-bold text-xs bg-brand-600 hover:bg-brand-500 text-white shadow-glow-teal transition-all disabled:opacity-50 mt-2"
          >
            {isLoading ? 'Mengautentikasi...' : 'Masuk ke Sistem'}
          </button>
        </form>

        {/* Quick Demo Login Presets */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <div className="flex items-center gap-1.5 justify-center text-[11px] text-slate-400 font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>Pilih Akun Instan (Demo Mode)</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickLogin('admin', 'admin123')}
              className="p-2 rounded-xl bg-surface-850 hover:bg-surface-800 border border-slate-750 text-center transition-colors group"
            >
              <div className="text-[11px] font-bold text-brand-300 group-hover:text-brand-200">Admin</div>
              <div className="text-[9px] text-slate-400">SUPERADMIN</div>
            </button>

            <button
              onClick={() => handleQuickLogin('instructor', 'instructor123')}
              className="p-2 rounded-xl bg-surface-850 hover:bg-surface-800 border border-slate-750 text-center transition-colors group"
            >
              <div className="text-[11px] font-bold text-teal-300 group-hover:text-teal-200">Dosen</div>
              <div className="text-[9px] text-slate-400">INSTRUCTOR</div>
            </button>

            <button
              onClick={() => handleQuickLogin('assistant', 'assistant123')}
              className="p-2 rounded-xl bg-surface-850 hover:bg-surface-800 border border-slate-750 text-center transition-colors group"
            >
              <div className="text-[11px] font-bold text-sky-300 group-hover:text-sky-200">Asisten</div>
              <div className="text-[9px] text-slate-400">ASSISTANT</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
