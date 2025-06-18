// src/types.ts
export enum VMStatus {
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED',
  TERMINATED = 'TERMINATED',
  PROVISIONING = 'PROVISIONING',
  STAGING = 'STAGING',
  SUSPENDING = 'SUSPENDING',
}

export interface VirtualMachine {
  id: string;
  name: string;
  status: VMStatus;
  zone: string;
  region: string; 
  externalIp?: string;
  internalIp: string;
  machineType: string;
  creationTimestamp?: string; 
  osType?: 'Linux' | 'Windows' | 'Other'; 
  diskSizeGb?: string;
}

export interface GCPProject {
  id: string;
  name: string;
}
