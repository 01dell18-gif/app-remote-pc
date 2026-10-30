export type Role = 'SUPERADMIN' | 'INSTRUCTOR' | 'LAB_ASSISTANT';

export type PowerStatus = 'ONLINE' | 'OFFLINE' | 'IN_SESSION' | 'UNREACHABLE';

export type ConnectionMode = 'RDP_FULL' | 'RDP_SHADOW' | 'VNC' | 'MOCK_AGENT';

export interface User {
  id: number;
  username: string;
  fullName: string;
  role: Role;
  isActive?: boolean;
}

export interface Laboratory {
  id: number;
  labName: string;
  subnetBroadcast: string;
  totalCapacity: number;
  createdAt: string;
  _count?: {
    workstations: number;
  };
}

export interface Workstation {
  id: number;
  labId: number;
  hostname: string;
  ipAddress: string;
  macAddress: string;
  gridRow: number;
  gridColumn: number;
  osFamily: 'WINDOWS' | 'LINUX' | 'MACOS' | string;
  connectionMode: ConnectionMode;
  powerStatus: PowerStatus;
  lastHeartbeat?: string | null;
}

export interface AuditTrail {
  id: number;
  userId: number;
  workstationId?: number | null;
  actionName: string;
  actionStatus: string;
  executedAt: string;
  metadataJson?: string | null;
  user?: {
    id: number;
    username: string;
    fullName: string;
    role: Role;
  };
  workstation?: {
    id: number;
    hostname: string;
    ipAddress: string;
  };
}

export interface RemoteSessionInfo {
  token: string;
  expiresInSeconds: number;
  workstation: {
    id: number;
    hostname: string;
    ipAddress: string;
    connectionMode: ConnectionMode;
    osFamily: string;
  };
}
