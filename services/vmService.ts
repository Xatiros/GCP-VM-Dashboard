// src/services/vmService.ts
import { VirtualMachine, VMStatus } from '../types';

// La URL base de la API del backend.
// En desarrollo local (npm run dev), import.meta.env.VITE_APP_BACKEND_API_BASE_URL estará indefinida,
// por lo que usará 'http://localhost:8080/api'.
// En producción (Cloud Build), VITE_APP_BACKEND_API_BASE_URL se inyectará desde tu cloudbuild.yaml de frontend.
const API_BASE_URL = import.meta.env.VITE_APP_BACKEND_API_BASE_URL || 'http://localhost:8080/api'; 

export const fetchVMs = async (projectId: string, token: string): Promise<VirtualMachine[]> => {
  console.log(`[vmService] Fetching VMs for project ${projectId} from backend: ${API_BASE_URL}/vms/${projectId}`); 
  try {
    const response = await fetch(`${API_BASE_URL}/vms/${projectId}`, {
      headers: {
        'Authorization': `Bearer ${token}`, 
      },
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('No autorizado o sesión expirada. Por favor, inicia sesión de nuevo.');
      }
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || response.statusText}`);
    }
    const data: VirtualMachine[] = await response.json();
    return data;
  } catch (error: any) { // Especificar tipo para 'error'
    console.error('[vmService] Error fetching VMs from backend:', error);
    throw new Error(`Failed to fetch VMs from Google Cloud via backend: ${error.message}`); 
  }
};

export const startVM = async (vmId: string, zone: string, projectId: string, token: string): Promise<VirtualMachine> => {
  console.log(`[vmService] Starting VM ${vmId} via backend: ${API_BASE_URL}/vms/start/${vmId}`); 
  try {
    const response = await fetch(`${API_BASE_URL}/vms/start/${vmId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, 
      },
      body: JSON.stringify({ zone, projectId }),
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('No autorizado o sesión expirada. Por favor, inicia sesión de nuevo.');
      }
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || response.statusText}`);
    }
    const data: VirtualMachine = await response.json();
    return data;
  } catch (error: any) { // Especificar tipo para 'error'
    console.error('[vmService] Error starting VM via backend:', error);
    throw new Error(`Failed to start VM on Google Cloud via backend: ${error.message}`);
  }
};

export const stopVM = async (vmId: string, zone: string, projectId: string, token: string): Promise<VirtualMachine> => {
  console.log(`[vmService] Stopping VM ${vmId} via backend: ${API_BASE_URL}/vms/stop/${vmId}`); 
  try {
    const response = await fetch(`${API_BASE_URL}/vms/stop/${vmId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, 
      },
      body: JSON.stringify({ zone, projectId }),
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('No autorizado o sesión expirada. Por favor, inicia sesión de nuevo.');
      }
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || response.statusText}`);
    }
    const data: VirtualMachine = await response.json();
    return data;
  } catch (error: any) { // Especificar tipo para 'error'
    console.error('[vmService] Error stopping VM via backend:', error);
    throw new Error(`Failed to stop VM on Google Cloud via backend: ${error.message}`);
  }
};