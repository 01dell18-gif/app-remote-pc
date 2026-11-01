import { create } from 'zustand';
import { Laboratory, Workstation, RemoteSessionInfo } from '../types';
import { api } from '../services/api';

export type CardSize = 'small' | 'medium' | 'large';

interface LabState {
  labs: Laboratory[];
  selectedLab: Laboratory | null;
  workstations: Workstation[];
  activeRemoteSession: RemoteSessionInfo | null;
  isClassroomLocked: boolean;
  lockMessage: string;
  isLoading: boolean;
  searchQuery: string;
  statusFilter: 'ALL' | 'ONLINE' | 'OFFLINE' | 'IN_SESSION';
  cardSize: CardSize;
  selectedWorkstationIds: number[];

  // Actions
  fetchLabs: () => Promise<void>;
  selectLab: (labId: number) => Promise<void>;
  createLab: (data: { labName: string; subnetBroadcast: string; totalCapacity?: number }) => Promise<void>;
  updateLab: (id: number, data: { labName?: string; subnetBroadcast?: string; totalCapacity?: number }) => Promise<void>;
  deleteLab: (id: number) => Promise<void>;
  fetchWorkstations: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (filter: 'ALL' | 'ONLINE' | 'OFFLINE' | 'IN_SESSION') => void;
  setCardSize: (size: CardSize) => void;
  setActiveRemoteSession: (session: RemoteSessionInfo | null) => void;
  
  // Selection Actions
  setSelectedWorkstationIds: (ids: number[]) => void;
  toggleSelectWorkstation: (id: number) => void;
  toggleSelectLabWorkstations: (labWorkstations: Workstation[]) => void;
  selectAllWorkstations: () => void;
  clearSelectedWorkstations: () => void;

  // Power Actions
  wakeOnLanWorkstations: (ids: number[]) => Promise<{ success: boolean; message: string }>;
  shutdownWorkstations: (ids: number[], force?: boolean) => Promise<{ success: boolean; message: string }>;
  rebootWorkstations: (ids: number[]) => Promise<{ success: boolean; message: string }>;

  // Classroom
  toggleLockClassroom: (lock: boolean, message?: string) => Promise<void>;
  checkLockState: () => Promise<void>;
}

export const useLabStore = create<LabState>((set, get) => ({
  labs: [],
  selectedLab: null,
  workstations: [],
  activeRemoteSession: null,
  isClassroomLocked: false,
  lockMessage: '',
  isLoading: false,
  searchQuery: '',
  statusFilter: 'ALL',
  cardSize: 'medium',
  selectedWorkstationIds: [],

  fetchLabs: async () => {
    try {
      const res = await api.getLabs();
      set({ labs: res.labs });
      const current = get().selectedLab;
      if (res.labs.length > 0) {
        if (!current || !res.labs.some((l) => l.id === current.id)) {
          get().selectLab(res.labs[0].id);
        }
      } else {
        set({ selectedLab: null, workstations: [], selectedWorkstationIds: [] });
      }
    } catch (err) {
      console.error('Gagal mengambil daftar lab:', err);
    }
  },

  selectLab: async (labId: number) => {
    set({ isLoading: true });
    try {
      const res = await api.getLabWorkstations(labId);
      set({
        selectedLab: res.lab,
        workstations: res.workstations,
        selectedWorkstationIds: res.workstations.map((w: Workstation) => w.id),
        isLoading: false,
      });
      get().checkLockState();
    } catch (err) {
      console.error('Gagal memilih lab:', err);
      set({ isLoading: false });
    }
  },

  createLab: async (data) => {
    const res = await api.createLab(data);
    await get().fetchLabs();
    if (res.lab) {
      await get().selectLab(res.lab.id);
    }
  },

  updateLab: async (id, data) => {
    await api.updateLab(id, data);
    await get().fetchLabs();
    if (get().selectedLab?.id === id) {
      await get().selectLab(id);
    }
  },

  deleteLab: async (id) => {
    await api.deleteLab(id);
    await get().fetchLabs();
  },

  fetchWorkstations: async () => {
    const currentLab = get().selectedLab;
    if (!currentLab) return;
    try {
      const res = await api.getLabWorkstations(currentLab.id);
      const currentWorkstations = get().workstations;

      // Cek apakah ada perubahan nyata pada data workstation untuk menghindari re-render yang kedip-kedip
      const hasChanged =
        currentWorkstations.length !== res.workstations.length ||
        res.workstations.some((nw: Workstation, idx: number) => {
          const cw = currentWorkstations[idx];
          if (!cw) return true;
          return (
            cw.id !== nw.id ||
            cw.powerStatus !== nw.powerStatus ||
            cw.hostname !== nw.hostname ||
            cw.ipAddress !== nw.ipAddress ||
            cw.macAddress !== nw.macAddress ||
            cw.connectionMode !== nw.connectionMode ||
            cw.gridRow !== nw.gridRow ||
            cw.gridColumn !== nw.gridColumn ||
            cw.diagnostics?.pingSuccess !== nw.diagnostics?.pingSuccess ||
            cw.diagnostics?.portOpen !== nw.diagnostics?.portOpen ||
            cw.diagnostics?.latencyMs !== nw.diagnostics?.latencyMs ||
            cw.diagnostics?.message !== nw.diagnostics?.message
          );
        });

      if (!hasChanged) {
        // Data identik, lewati set state agar UI tetap tenang tanpa kedipan
        return;
      }

      const updates: Partial<LabState> = { workstations: res.workstations };
      // Jika belum ada yang terpilih sama sekali, pilih semua workstation lab secara otomatis
      if (get().selectedWorkstationIds.length === 0 && res.workstations.length > 0) {
        updates.selectedWorkstationIds = res.workstations.map((w: Workstation) => w.id);
      }
      set(updates);
    } catch (err) {
      console.error('Polling workstation gagal:', err);
    }
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setCardSize: (cardSize) => set({ cardSize }),
  setActiveRemoteSession: (activeRemoteSession) => set({ activeRemoteSession }),

  // Selection implementations
  setSelectedWorkstationIds: (ids: number[]) => set({ selectedWorkstationIds: ids }),

  toggleSelectWorkstation: (id: number) => {
    const current = get().selectedWorkstationIds;
    if (current.includes(id)) {
      set({ selectedWorkstationIds: current.filter((item) => item !== id) });
    } else {
      set({ selectedWorkstationIds: [...current, id] });
    }
  },

  toggleSelectLabWorkstations: (labWorkstations: Workstation[]) => {
    const current = get().selectedWorkstationIds;
    const labWsIds = labWorkstations.map((w) => w.id);
    const allInLabSelected = labWsIds.length > 0 && labWsIds.every((id) => current.includes(id));
    if (allInLabSelected) {
      set({ selectedWorkstationIds: current.filter((id) => !labWsIds.includes(id)) });
    } else {
      set({ selectedWorkstationIds: Array.from(new Set([...current, ...labWsIds])) });
    }
  },

  selectAllWorkstations: () => {
    set({ selectedWorkstationIds: get().workstations.map((w) => w.id) });
  },

  clearSelectedWorkstations: () => {
    set({ selectedWorkstationIds: [] });
  },

  wakeOnLanWorkstations: async (ids: number[]) => {
    const res = await api.wakeOnLan(ids);
    await get().fetchWorkstations();
    return res;
  },

  shutdownWorkstations: async (ids: number[], force = false) => {
    const res = await api.shutdown(ids, force);
    await get().fetchWorkstations();
    return res;
  },

  rebootWorkstations: async (ids: number[]) => {
    const res = await api.reboot(ids);
    await get().fetchWorkstations();
    return res;
  },

  toggleLockClassroom: async (lock: boolean, message?: string) => {
    const lab = get().selectedLab;
    if (!lab) return;
    const res = await api.lockClassroom(lab.id, lock, message);
    set({
      isClassroomLocked: res.lockState.isLocked,
      lockMessage: res.lockState.message,
    });
  },

  checkLockState: async () => {
    const lab = get().selectedLab;
    if (!lab) return;
    try {
      const res = await api.getLockState(lab.id);
      set({
        isClassroomLocked: res.state.isLocked,
        lockMessage: res.state.message,
      });
    } catch {}
  },
}));
