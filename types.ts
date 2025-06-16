
export enum VMStatus {
  RUNNING = 'RUNNING', // Asegúrate de que es 'RUNNING' en MAYÚSCULAS
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
  isWindows?: boolean; 
}

export interface GCPProject {
  id: string;
  name: string;
}
