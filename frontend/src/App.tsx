import React, { useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import { useLabStore } from './stores/labStore';
import { Navbar } from './components/common/Navbar';
import { LabGrid } from './components/dashboard/LabGrid';
import { AddWorkstationModal } from './components/dashboard/AddWorkstationModal';
import { ClassroomLockModal } from './components/dashboard/ClassroomLockModal';
import { AuditLogsModal } from './components/dashboard/AuditLogsModal';
import { ManageLabsModal } from './components/dashboard/ManageLabsModal';
import { RemoteViewport } from './components/remote/RemoteViewport';
import { RemoteAppModal } from './components/dashboard/RemoteAppModal';
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
  const [manageLabsModalOpen, setManageLabsModalOpen] = useState(false);
  const [remoteAppModalOpen, setRemoteAppModalOpen] = useState(false);
  const [appModalTarget, setAppModalTarget] = useState<Workstation | null>(null);
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

  const handleOpenAppManager = (ws?: Workstation) => {
    setAppModalTarget(ws || null);
    setRemoteAppModalOpen(true);
  };

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
        onOpenManageLabsModal={() => setManageLabsModalOpen(true)}
        onOpenRemoteAppModal={() => handleOpenAppManager()}
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
      <main className="flex-1 max-w-[1700px] w-full mx-auto px-4 lg:px-6 py-6 space-y-6">
        {/* Lab Header Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-black text-white tracking-tight">
                {selectedLab?.labName || 'Memuat Laboratorium...'}
              </h1>
              <button
                onClick={() => setManageLabsModalOpen(true)}
                className="text-xs px-2.5 py-1 rounded-lg bg-surface-850 hover:bg-surface-800 text-brand-400 border border-brand-500/20 font-medium transition-colors"
              >
                Kelola Lab
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Subnet Siaran WoL: <span className="text-teal-400 font-semibold">{selectedLab?.subnetBroadcast}</span> · Kapasitas: {selectedLab?.totalCapacity} Meja Komputer
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
          onOpenAppManager={handleOpenAppManager}
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

      <ManageLabsModal
        isOpen={manageLabsModalOpen}
        onClose={() => setManageLabsModalOpen(false)}
      />

      <RemoteAppModal
        isOpen={remoteAppModalOpen}
        onClose={() => {
          setRemoteAppModalOpen(false);
          setAppModalTarget(null);
        }}
        targetWorkstation={appModalTarget}
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
