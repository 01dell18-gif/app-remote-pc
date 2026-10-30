import { create } from 'zustand';
import { Laboratory, Workstation, RemoteSessionInfo } from '../types';
import { api } from '../services/api';

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

  // Actions
  fetchLabs: () => Promise<void>;
  selectLab: (labId: number) => Promise<void>;
  fetchWorkstations: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (filter: 'ALL' | 'ONLINE' | 'OFFLINE' | 'IN_SESSION') => void;
  setActiveRemoteSession: (session: RemoteSessionInfo | null) => void;
  
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

  fetchLabs: async () => {
    try {
      const res = await api.getLabs();
      set({ labs: res.labs });
      if (res.labs.length > 0 && !get().selectedLab) {
        get().selectLab(res.labs[0].id);
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
        isLoading: false,
      });
      get().checkLockState();
    } catch (err) {
      console.error('Gagal memilih lab:', err);
      set({ isLoading: false });
    }
  },

  fetchWorkstations: async () => {
    const currentLab = get().selectedLab;
    if (!currentLab) return;
    try {
      const res = await api.getLabWorkstations(currentLab.id);
      set({ workstations: res.workstations });
    } catch (err) {
      console.error('Polling workstation gagal:', err);
    }
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setActiveRemoteSession: (activeRemoteSession) => set({ activeRemoteSession }),

  wakeOnLanWorkstations: async (ids: number[]) => {
    const res = await api.wakeOnLan(ids);
    // Segera refresh workstations
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
