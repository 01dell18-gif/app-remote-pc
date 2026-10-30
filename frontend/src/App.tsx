import React, { useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import { useLabStore } from './stores/labStore';
import { Navbar } from './components/common/Navbar';
import { LabGrid } from './components/dashboard/LabGrid';
import { AddWorkstationModal } from './components/dashboard/AddWorkstationModal';
import { ClassroomLockModal } from './components/dashboard/ClassroomLockModal';
import { AuditLogsModal } from './components/dashboard/AuditLogsModal';
import { RemoteViewport } from './components/remote/RemoteViewport';
import { LoginModal } from './components/auth/LoginModal';
import { Workstation } from './types';
import { api } from './services/api';
import { Lock } from 'lucide-react';

export const App: React.FC = () => {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const {
    fetchLabs,
    fetchWorkstations,
    activeRemoteSession,
    setActiveRemoteSession,
    isClassroomLocked,
    lockMessage,
    selectedLab,
  } = useLabStore();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [workstationToEdit, setWorkstationToEdit] = useState<Workstation | null>(null);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchLabs();
      const interval = setInterval(() => {
        fetchWorkstations();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchLabs, fetchWorkstations]);

  const handleEditWorkstation = (ws: Workstation) => {
    setWorkstationToEdit(ws);
    setAddModalOpen(true);
  };

  const handleDeleteWorkstation = async (id: number) => {
    if (confirm('Apakah Anda yakin ingin menghapus komputer ini dari inventaris lab?')) {
      try {
        await api.deleteWorkstation(id);
        fetchWorkstations();
      } catch (err: any) {
        alert(`Gagal menghapus: ${err.message}`);
      }
    }
  };

  if (!isAuthenticated) {
    return <LoginModal />;
  }

  return (
    <div className="min-h-screen bg-surface-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <Navbar
        onOpenAddModal={() => {
          setWorkstationToEdit(null);
          setAddModalOpen(true);
        }}
        onOpenAuditModal={() => setAuditModalOpen(true)}
        onOpenLockModal={() => setLockModalOpen(true)}
      />

      {/* Classroom Lock Banner jika aktif */}
      {isClassroomLocked && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-center gap-2 text-xs font-semibold text-amber-300">
          <Lock className="w-3.5 h-3.5" />
          <span>
            STATUS LAB TERKUNCI: {lockMessage || 'Seluruh input siswa dinonaktifkan'}
          </span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 lg:px-6 py-6 space-y-6">
        {/* Lab Header Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>{selectedLab?.labName || 'Memuat Laboratorium...'}</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Subnet Siaran WoL: <span className="text-teal-400">{selectedLab?.subnetBroadcast}</span> · Kapasitas: {selectedLab?.totalCapacity} Unit
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sinkronisasi Otomatis Tiap 5 Detik</span>
          </div>
        </div>

        {/* Spatial Lab Desk Grid */}
        <LabGrid
          onEditWorkstation={handleEditWorkstation}
          onDeleteWorkstation={handleDeleteWorkstation}
        />
      </main>

      {/* Modals */}
      <AddWorkstationModal
        isOpen={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setWorkstationToEdit(null);
        }}
        workstationToEdit={workstationToEdit}
      />

      <ClassroomLockModal
        isOpen={lockModalOpen}
        onClose={() => setLockModalOpen(false)}
      />

      <AuditLogsModal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
      />

      {/* Full-Screen Remote Desktop Viewport */}
      {activeRemoteSession && (
        <RemoteViewport
          session={activeRemoteSession}
          onClose={() => setActiveRemoteSession(null)}
        />
      )}
    </div>
  );
};
