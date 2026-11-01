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
import { ScanNetworkModal } from './components/dashboard/ScanNetworkModal';
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
  const [scanModalOpen, setScanModalOpen] = useState(false);
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
      }, 8000);
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
        onOpenScanModal={() => setScanModalOpen(true)}
      />

      {/* Classroom Locked Overlay Alert */}
      {isClassroomLocked && (
        <div className="bg-amber-600/90 text-white px-4 py-2 flex items-center justify-between text-xs font-semibold shadow-lg shrink-0">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span>Mode Kunci Kelas Aktif: "{lockMessage || 'Layar dan masukan siswa saat ini dinonaktifkan'}"</span>
          </div>
          <button
            onClick={() => setLockModalOpen(true)}
            className="px-2.5 py-1 bg-amber-800 hover:bg-amber-700 rounded-lg text-[11px] font-bold"
          >
            Buka Kunci
          </button>
        </div>
      )}

      {/* Main Workspace: Sidebar & Lab Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Panel Veyon */}
        <VeyonSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onOpenManageLabs={() => setManageLabsModalOpen(true)}
          onOpenAddWorkstation={() => {
            setWorkstationToEdit(null);
            setAddModalOpen(true);
          }}
        />

        {/* Lab Workspace Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-surface-950/60 custom-scrollbar">
          {/* Active Lab Header */}
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg lg:text-xl font-bold text-white tracking-tight">
                  {selectedLab?.labName || 'Pilih Ruang Laboratorium'}
                </h1>
                <button
                  onClick={() => setManageLabsModalOpen(true)}
                  className="text-xs text-brand-400 hover:text-brand-300 font-semibold px-2 py-0.5 rounded bg-brand-500/10 border border-brand-500/20"
                >
                  Ganti Lab
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Kapasitas: <span className="text-teal-400 font-semibold">{selectedLab?.totalCapacity || 30} Meja Komputer</span>
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-glow-emerald" />
              <span>Sinkronisasi Real-Time</span>
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

      <ScanNetworkModal
        isOpen={scanModalOpen}
        onClose={() => setScanModalOpen(false)}
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
