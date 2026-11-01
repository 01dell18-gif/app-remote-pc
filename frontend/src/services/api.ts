import { User, Laboratory, Workstation, AuditTrail, RemoteSessionInfo } from '../types';

const API_BASE = '/api/v1';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('fyj_remote_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    localStorage.removeItem('fyj_remote_token');
    localStorage.removeItem('fyj_remote_user');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }
  return data;
}

export const api = {
  // Auth
  async login(username: string, password: string): Promise<{ success: boolean; token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return handleResponse(res);
  },

  async getProfile(): Promise<{ success: boolean; user: User }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // Labs
  async getLabs(): Promise<{ success: boolean; labs: Laboratory[] }> {
    const res = await fetch(`${API_BASE}/labs`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async getLabWorkstations(labId: number): Promise<{ success: boolean; lab: Laboratory; workstations: Workstation[] }> {
    const res = await fetch(`${API_BASE}/labs/${labId}/workstations`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async createLab(data: { labName: string; subnetBroadcast: string; totalCapacity?: number }): Promise<{ success: boolean; lab: Laboratory }> {
    const res = await fetch(`${API_BASE}/labs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateLab(id: number, data: { labName?: string; subnetBroadcast?: string; totalCapacity?: number }): Promise<{ success: boolean; lab: Laboratory }> {
    const res = await fetch(`${API_BASE}/labs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async deleteLab(id: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/labs/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // Workstations
  async createWorkstation(data: Partial<Workstation>): Promise<{ success: boolean; workstation: Workstation }> {
    const res = await fetch(`${API_BASE}/workstations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateWorkstation(id: number, data: Partial<Workstation>): Promise<{ success: boolean; workstation: Workstation }> {
    const res = await fetch(`${API_BASE}/workstations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async deleteWorkstation(id: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/workstations/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // On-demand Ping & Diagnostics
  async pingWorkstation(id: number): Promise<{ success: boolean; workstation: Workstation }> {
    const res = await fetch(`${API_BASE}/workstations/${id}/ping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // Scan Network
  async scanNetwork(subnet?: string): Promise<{
    success: boolean;
    subnet: string;
    count: number;
    devices: Array<{ ip: string; isRdpOpen: boolean; isVncOpen: boolean }>;
  }> {
    const res = await fetch(`${API_BASE}/workstations/scan-network`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ subnet }),
    });
    return handleResponse(res);
  },

  async syncAllWorkstations(labId?: number): Promise<{
    success: boolean;
    message: string;
    workstations: Workstation[];
  }> {
    const url = labId ? `${API_BASE}/workstations/sync-all?labId=${labId}` : `${API_BASE}/workstations/sync-all`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // Power
  async wakeOnLan(workstationIds: number[]): Promise<{ success: boolean; message: string; results: any[] }> {
    const res = await fetch(`${API_BASE}/power/wol`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ workstationIds }),
    });
    return handleResponse(res);
  },

  async shutdown(workstationIds: number[], force = false): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/power/shutdown`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ workstationIds, force }),
    });
    return handleResponse(res);
  },

  async reboot(workstationIds: number[]): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/power/reboot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ workstationIds }),
    });
    return handleResponse(res);
  },

  // Classroom
  async lockClassroom(labId: number, lock: boolean, message?: string): Promise<{ success: boolean; message: string; lockState: any }> {
    const res = await fetch(`${API_BASE}/classroom/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ labId, lock, message }),
    });
    return handleResponse(res);
  },

  async getLockState(labId: number): Promise<{ success: boolean; state: { isLocked: boolean; message: string; lockedAt: string | null } }> {
    const res = await fetch(`${API_BASE}/classroom/lock/${labId}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // Remote Session
  async getRemoteToken(workstationId: number): Promise<RemoteSessionInfo> {
    const res = await fetch(`${API_BASE}/remote/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ workstationId }),
    });
    return handleResponse(res);
  },

  // Direct MSTSC (Windows Native Remote Desktop)
  async launchMstsc(id: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/remote/${id}/mstsc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // Download .RDP Profile
  getRdpDownloadUrl(id: number): string {
    return `${API_BASE}/remote/${id}/rdp`;
  },

  // Audit Logs
  async getAuditLogs(limit = 40): Promise<{ success: boolean; logs: AuditTrail[] }> {
    const res = await fetch(`${API_BASE}/audit/logs?limit=${limit}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // Remote Execution (Buka & Tutup Aplikasi)
  async launchApp(data: {
    workstationIds: number[];
    appPath: string;
    args?: string;
    executionType?: 'PATH' | 'SCRIPT';
    scriptContent?: string;
  }): Promise<{ success: boolean; message: string; results: any[] }> {
    const res = await fetch(`${API_BASE}/execution/launch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async terminateApp(data: {
    workstationIds: number[];
    processName: string;
    force?: boolean;
  }): Promise<{ success: boolean; message: string; results: any[] }> {
    const res = await fetch(`${API_BASE}/execution/terminate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async getAppPresets(): Promise<{ success: boolean; presets: any[] }> {
    const res = await fetch(`${API_BASE}/execution/presets`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // Pembatasan Aplikasi & Link Website (Restrictions)
  async applyRestriction(data: {
    workstationIds: number[];
    type: 'APP' | 'WEBSITE';
    target: string;
    action: 'BLOCK' | 'UNBLOCK';
    reason?: string;
  }): Promise<{ success: boolean; message: string; activeRestrictions: any[] }> {
    const res = await fetch(`${API_BASE}/execution/restrictions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async getRestrictions(): Promise<{ success: boolean; activeRestrictions: any[]; presets: any }> {
    const res = await fetch(`${API_BASE}/execution/restrictions`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  // Ekspor & Impor Database Komputer
  async exportWorkstations(labId?: number): Promise<{ success: boolean; count: number; workstations: Workstation[] }> {
    const url = labId ? `${API_BASE}/workstations/export?labId=${labId}` : `${API_BASE}/workstations/export`;
    const res = await fetch(url, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res);
  },

  async importWorkstations(data: {
    labId: number;
    workstations: any[];
    mode?: string;
  }): Promise<{
    success: boolean;
    message: string;
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
    errors: string[];
  }> {
    const res = await fetch(`${API_BASE}/workstations/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
};
