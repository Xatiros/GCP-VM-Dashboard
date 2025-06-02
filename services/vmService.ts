// src/services/vmService.ts
import { VirtualMachine, VMStatus } from '../types';

const API_BASE_URL = 'https://gcp-vm-dashboard-780691668337.europe-southwest1.run.app/api';

// --- MODIFICAR FUNCIONES PARA ACEPTAR Y ENVIAR TOKEN ---
export const fetchVMs = async (projectId: string, token: string): Promise<VirtualMachine[]> => {
  console.log(`Fetching VMs for project ${projectId} from backend...`);
  try {
    const response = await fetch(`${API_BASE_URL}/vms/${projectId}`, {
      headers: {
        'Authorization': `Bearer ${token}`, // ¡Añadir el token aquí!
      },
    });
    if (!response.ok) {
      // Manejar errores de autenticación/autorización (401, 403)
      if (response.status === 401 || response.status === 403) {
        throw new Error('No autorizado o sesión expirada. Por favor, inicia sesión de nuevo.');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: VirtualMachine[] = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching VMs from backend:', error);
    throw new Error('Failed to fetch VMs from Google Cloud via backend.');
  }
};

export const startVM = async (vmId: string, zone: string, projectId: string, token: string): Promise<VirtualMachine> => {
  console.log(`Starting VM ${vmId} via backend...`);
  try {
    const response = await fetch(`${API_BASE_URL}/vms/start/${vmId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // ¡Añadir el token aquí!
      },
      body: JSON.stringify({ zone, projectId }),
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('No autorizado o sesión expirada. Por favor, inicia sesión de nuevo.');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: VirtualMachine = await response.json();
    return data;
  } catch (error) {
    console.error('Error starting VM via backend:', error);
    throw new Error('Failed to start VM on Google Cloud via backend.');
  }
};

export const stopVM = async (vmId: string, zone: string, projectId: string, token: string): Promise<VirtualMachine> => {
  console.log(`Stopping VM ${vmId} via backend...`);
  try {
    const response = await fetch(`${API_BASE_URL}/vms/stop/${vmId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // ¡Añadir el token aquí!
      },
      body: JSON.stringify({ zone, projectId }),
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('No autorizado o sesión expirada. Por favor, inicia sesión de nuevo.');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: VirtualMachine = await response.json();
    return data;
  } catch (error) {
    console.error('Error stopping VM via backend:', error);
    throw new Error('Failed to stop VM on Google Cloud via backend.');
  }
};
// --- FIN MODIFICACIÓN DE FUNCIONES ---