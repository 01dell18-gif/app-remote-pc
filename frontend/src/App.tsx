import React, { useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import { useLabStore } from './stores/labStore';
import { Navbar } from './components/common/Navbar';
import { VeyonSidebar } from './components/dashboard/VeyonSidebar';
import { LabGrid } from './components/dashboard/LabGrid';
import { AddWorkstationModal } from './components/dashboard/AddWorkstationModal';
import { ClassroomLockModal } from './components/dashboard/ClassroomLockModal';
import { AuditLogsModal } from './components/dashboard/AuditLogsModal';
import { ManageLabsModal } from './components/dashboard/ManageLabsModal';
import { RemoteViewport } from './components/remote/RemoteViewport';
import { RemoteAppModal } from './components/dashboard/RemoteAppModal';
import { PowerControlModal } from './components/dashboard/PowerControlModal';
import { RestrictionModal } from './components/dashboard/RestrictionModal';
import { ImportExportModal } from './components/dashboard/ImportExportModal';
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

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [manageLabsModalOpen, setManageLabsModalOpen] = useState(false);
  const [remoteAppModalOpen, setRemoteAppModalOpen] = useState(false);
  const [powerModalOpen, setPowerModalOpen] = useState(false);
  const [powerModalMode, setPowerModalMode] = useState<'WAKE' | 'SHUTDOWN'>('WAKE');
  const [powerModalTarget, setPowerModalTarget] = useState<Workstation | null>(null);
  const [restrictionModalOpen, setRestrictionModalOpen] = useState(false);
  const [restrictionTarget, setRestrictionTarget] = useState<Workstation | null>(null);
  const [importExportModalOpen, setImportExportModalOpen] = useState(false);
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

  const handleOpenPowerModal = (mode: 'WAKE' | 'SHUTDOWN', ws?: Workstation) => {
    setPowerModalMode(mode);
    setPowerModalTarget(ws || null);
    setPowerModalOpen(true);
  };

  const handleOpenRestrictionModal = (ws?: Workstation) => {
    setRestrictionTarget(ws || null);
    setRestrictionModalOpen(true);
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
    <div className="h-screen bg-surface-950 text-slate-100 flex flex-col overflow-hidden">
      {/* Top Navigation */}
      <Navbar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onOpenAuditModal={() => setAuditModalOpen(true)}
        onOpenLockModal={() => setLockModalOpen(true)}
        onOpenManageLabsModal={() => setManageLabsModalOpen(true)}
        onOpenRemoteAppModal={() => handleOpenAppManager()}
        onOpenPowerModal={handleOpenPowerModal}
        onOpenRestrictionModal={() => handleOpenRestrictionModal()}
        onOpenImportExportModal={() => setImportExportModalOpen(true)}
      />

      {/* Classroom Lock Banner jika aktif */}
      {isClassroomLocked && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-center gap-2 text-xs font-semibold text-amber-300 shrink-0">
          <Lock className="w-3.5 h-3.5" />
          <span>
            STATUS LAB TERKUNCI: {lockMessage || 'Seluruh input siswa dinonaktifkan'}
          </span>
        </div>
      )}

      {/* Workspace Flex Layout: Veyon Sidebar Kiri + Main Area Kanan */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Pohon Ruangan & Komputer (Model Veyon) */}
        <VeyonSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onOpenManageLabs={() => setManageLabsModalOpen(true)}
          onOpenAddWorkstation={() => {
            setWorkstationToEdit(null);
            setAddModalOpen(true);
          }}
        />

        {/* Main Canvas Area */}
        <main className="flex-1 overflow-y-auto px-4 lg:px-6 py-5 space-y-5">
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
            onOpenRestrictionManager={handleOpenRestrictionModal}
          />
        </main>
      </div>

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

      <PowerControlModal
        isOpen={powerModalOpen}
        onClose={() => {
          setPowerModalOpen(false);
          setPowerModalTarget(null);
        }}
        initialMode={powerModalMode}
        targetWorkstation={powerModalTarget}
      />

      <ClassroomLockModal
        isOpen={lockModalOpen}
        onClose={() => setLockModalOpen(false)}
      />

      <RestrictionModal
        isOpen={restrictionModalOpen}
        onClose={() => {
          setRestrictionModalOpen(false);
          setRestrictionTarget(null);
        }}
        targetWorkstation={restrictionTarget}
      />

      <ImportExportModal
        isOpen={importExportModalOpen}
        onClose={() => setImportExportModalOpen(false)}
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
