// frontend/App.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Header } from './components/Header';
import { VMList } from './components/VMList';
import { ConnectModal } from './components/ConnectModal';
import { Spinner } from './components/Spinner';
import { Toast } from './components/Toast';
import { VirtualMachine, VMStatus, GCPProject } from './types';
import { fetchVMs as apiFetchVMs, startVM as apiStartVM, stopVM as apiStopVM } from './services/vmService';
import { RefreshIcon, SearchIcon, CogIcon } from './components/icons'; // Asegúrate de que CogIcon está importado para el spinner
import { AuthButton } from './components/AuthButton';

// Define la URL de autenticación del backend
const BACKEND_AUTH_ENDPOINT_URL = process.env.VITE_APP_BACKEND_AUTH_URL || 'http://localhost:3001/api/auth/google';

// Configuración del polling
const POLLING_INTERVAL_MS = 5000;// 5 segundos para la actualización automática

const App: React.FC = () => {
  const [vms, setVms] = useState<VirtualMachine[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<VMStatus | 'ALL'>('ALL');
  const [zoneFilter, setZoneFilter] = useState<string | 'ALL'>('ALL'); 
  
  const [selectedVMForConnect, setSelectedVMForConnect] = useState<VirtualMachine | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Ya tienes los pollingTimers, pero para el polling global usaremos el useEffect principal
  // const pollingTimers = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // --- ESTADO DE AUTENTICACIÓN ---
  const [appToken, setAppToken] = useState<string | null>(localStorage.getItem('appToken'));
  const [userEmail, setUserEmail] = useState<string | null>(localStorage.getItem('userEmail'));
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  // --- FIN ESTADO DE AUTENTICACIÓN ---

  // Tus credenciales y proyectos
  const GCP_PROJECT_ID_REAL = 'puestos-de-trabajo-potentes'; 
  const GOOGLE_CLIENT_ID = '780691668337-fagffk8595v6cdasflrj5pbpcoloc96d.apps.googleusercontent.com'; 

  const ALL_PROJECTS: GCPProject[] = [
    { id: GCP_PROJECT_ID_REAL, name: 'Puestos de Trabajos Potentes' },
  ];
  const [selectedProject, setSelectedProject] = useState<GCPProject>(
    ALL_PROJECTS.find(p => p.id === GCP_PROJECT_ID_REAL) || ALL_PROJECTS[0]
  );

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000); 
  };

  const loadVMs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!selectedProject || !selectedProject.id || !appToken) { 
        // Si no hay token, no intentes cargar, pero no lo trates como un error de API
        // El useEffect de autenticación ya manejará esto.
        setIsLoading(false);
        return;
      }
      const fetchedVMs = await apiFetchVMs(selectedProject.id, appToken); 
      setVms(fetchedVMs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar VMs.';
      setError(`No se pudieron cargar las máquinas virtuales: ${errorMessage}. Inténtalo de nuevo.`);
      console.error("Error al cargar VMs en el frontend:", err);
      showToast('Error al cargar VMs.');
      // Si el error es de autenticación/autorización, forzar logout
      if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('No autorizado') || errorMessage.includes('sesión expirada')) {
        showToast("Sesión expirada o no autorizada. Por favor, inicie sesión de nuevo.");
        handleLogout();
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject, appToken]); // Depende de selectedProject y appToken

  // Polling general de la lista de VMs
  useEffect(() => {
    if (appToken) { 
      loadVMs(); // Carga inicial
      showToast(`Actualizando VMs cada ${POLLING_INTERVAL_MS / 1000} segundos.`); // Notificación de inicio de polling
      const intervalId = setInterval(loadVMs, POLLING_INTERVAL_MS);
      return () => {
        clearInterval(intervalId);
        showToast("Actualización automática de VMs detenida."); // Notificación al detener
      };
    } else {
      // Si no hay token, limpiar VMs y errores para el estado de no autenticado
      setVms([]);
      setError(null);
      setIsLoading(false);
    }
  }, [appToken, loadVMs]); // Depende de appToken y loadVMs

  // Tu lógica de polling individual (la que ya tenías)
  const pollingTimers = useRef<{ [key: string]: NodeJS.Timeout }>({}); // Mantenemos esta referencia si es para polling post-operación
  const startPollingVMStatus = useCallback((vmId: string, expectedFinalStatus: VMStatus) => {
    if (pollingTimers.current[vmId]) {
      clearTimeout(pollingTimers.current[vmId]);
    }

    const poll = async () => {
      await loadVMs(); // Refresca la lista completa
      const currentVm = vms.find(vm => vm.id === vmId);

      const isFinalState = (status: VMStatus | string) => 
        status === VMStatus.RUNNING || status === VMStatus.STOPPED || 
        status === VMStatus.TERMINATED || status === 'FINALIZADO' || status === 'PARADA'; // Añadido 'PARADA'

      if (currentVm && isFinalState(currentVm.status)) {
          console.log(`Polling detenido para VM ${vmId}. Estado final alcanzado: ${currentVm.status}`);
          delete pollingTimers.current[vmId];
          showToast(`Estado de VM '${currentVm.name}' actualizado a ${currentVm.status}.`); // Notificación específica
          return;
      }
      
      pollingTimers.current[vmId] = setTimeout(poll, 5000); 
    };

    // Inicia el primer poll después de un pequeño retraso si la operación no es instantánea
    // setTimeout(poll, 1000); // Esto ya se maneja con el setTimeout en handleStart/StopVM
    poll(); // Inicia el polling inmediatamente
  }, [loadVMs, vms]); // Depende de loadVMs y vms (para encontrar la VM actual)

  // Limpiar timers individuales al desmontar
  useEffect(() => {
    return () => {
      for (const vmId in pollingTimers.current) {
        clearTimeout(pollingTimers.current[vmId]);
      }
    };
  }, []);


  const handleStartVM = async (vmId: string) => {
    const vmToStart = vms.find(vm => vm.id === vmId);
    if (!vmToStart || !appToken) return;

    if (!window.confirm(`¿Estás seguro de que quieres INICIAR la VM '${vmToStart.name}'?`)) {
      return;
    }

    // Optimistic UI update
    setVms(prevVms => prevVms.map(vm => vm.id === vmId ? { ...vm, status: VMStatus.PROVISIONING } : vm));
    showToast(`Iniciando VM '${vmToStart.name}'...`);
    try {
      const updatedVM = await apiStartVM(vmId, vmToStart.zone, selectedProject.id, appToken); 
      setVms(prevVms => prevVms.map(vm => vm.id === vmId ? updatedVM : vm));
      // No necesitamos showToast aquí, el polling individual lo manejará al llegar a estado final
      
      // Iniciar polling individual para esta VM específica
      startPollingVMStatus(vmId, VMStatus.RUNNING); 

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al iniciar VM.';
      setError(`Fallo al iniciar VM '${vmToStart.name}': ${errorMessage}.`);
      // Revertir el estado si hay un error
      setVms(prevVms => prevVms.map(vm => vm.id === vmId ? { ...vmToStart, status: VMStatus.STOPPED } : vm)); // Revertir a STOPPED
      showToast(`Error al iniciar VM '${vmToStart.name}'.`);
      console.error("Error al iniciar VM:", err);
      if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('No autorizado') || errorMessage.includes('sesión expirada')) {
        handleLogout();
      }
    }
  };

  const handleStopVM = async (vmId: string) => {
    const vmToStop = vms.find(vm => vm.id === vmId);
    if (!vmToStop || !appToken) return;

    if (!window.confirm(`¿Estás seguro de que quieres DETENER la VM '${vmToStop.name}'? Esto podría interrumpir servicios.`)) {
      return;
    }
    // Optimistic UI update
    setVms(prevVms => prevVms.map(vm => vm.id === vmId ? { ...vm, status: VMStatus.SUSPENDING } : vm));
    showToast(`Deteniendo VM '${vmToStop.name}'...`);
    try {
      const updatedVM = await apiStopVM(vmId, vmToStop.zone, selectedProject.id, appToken); 
      setVms(prevVms => prevVms.map(vm => vm.id === vmId ? updatedVM : vm));
      // No necesitamos showToast aquí, el polling individual lo manejará al llegar a estado final

      // Iniciar polling individual para esta VM específica
      startPollingVMStatus(vmId, VMStatus.STOPPED); 

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al detener VM.';
      setError(`Fallo al detener VM '${vmToStop.name}': ${errorMessage}.`);
      // Revertir el estado si hay un error
      setVms(prevVms => prevVms.map(vm => vm.id === vmId ? { ...vmToStop, status: VMStatus.RUNNING } : vm)); // Revertir a RUNNING
      showToast(`Error al detener VM '${vmToStop.name}'.`);
      console.error("Error al detener VM:", err);
      if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('No autorizado') || errorMessage.includes('sesión expirada')) {
        handleLogout();
      }
    }
  };

  const handleConnectVM = (vm: VirtualMachine) => {
    setSelectedVMForConnect(vm);
  };

  const handleCopyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
      .then(() => showToast(`${type} copiado al portapapeles!`))
      .catch(err => {
        showToast(`Fallo al copiar ${type}.`);
        console.error('Fallo al copiar texto: ', err);
      });
  };

  const handleGoogleAuthSuccess = async (googleIdToken: string) => {
    setIsAuthenticating(true);
    setError(null);
    try {
      const response = await fetch(BACKEND_AUTH_ENDPOINT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id_token: googleIdToken }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fallo al obtener token de sesión de la aplicación.');
      }

      const data = await response.json();
      localStorage.setItem('appToken', data.token); 
      localStorage.setItem('userEmail', data.user.email); 
      setAppToken(data.token);
      setUserEmail(data.user.email);
      showToast(`Bienvenido, ${data.user.name || data.user.email}!`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido de autenticación.';
      setError(`Error de autenticación: ${errorMessage}`);
      showToast('Error en el inicio de sesión con Google.');
      console.error("Error en handleGoogleAuthSuccess:", err);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('appToken');
    localStorage.removeItem('userEmail');
    setAppToken(null); 
    setUserEmail(null);
    setVms([]); 
    showToast('Sesión cerrada.');
  };


  const availableZones = useMemo(() => {
    const zones = new Set(vms.map(vm => vm.zone));
    return ['ALL', ...Array.from(zones).sort()];
  }, [vms]);

  const filteredVMs = useMemo(() => {
    return vms.filter(vm => {
      const nameMatch = vm.name.toLowerCase().includes(searchTerm.toLowerCase());
      const statusMatch = statusFilter === 'ALL' || vm.status === statusFilter;
      const zoneMatch = zoneFilter === 'ALL' || vm.zone === zoneFilter;
      return nameMatch && statusMatch && zoneMatch;
    });
  }, [vms, searchTerm, statusFilter, zoneFilter]);

  // --- Lógica de renderizado condicional basada en autenticación ---
  if (!appToken) { 
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        {isAuthenticating ? (
          <Spinner className="h-10 w-10 text-gcp-blue" />
        ) : (
          <AuthButton 
            clientId={GOOGLE_CLIENT_ID}
            onSuccess={handleGoogleAuthSuccess}
            onError={(err) => {
              setError(`Fallo en la autenticación de Google: ${err.message}`);
              showToast("Fallo en el inicio de sesión.");
            }}
          />
        )}
        {error && <div className="text-center py-4 text-red-600 bg-red-100 border border-red-400 rounded-md fixed bottom-5 left-5 right-5 z-50">{error}</div>}
      </div>
    );
  }
  // --- FIN Lógica de renderizado condicional ---


  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        appName="Cloud VM Manager" 
        projects={ALL_PROJECTS}
        selectedProject={selectedProject}
        onProjectChange={setSelectedProject}
        userEmail={userEmail}
        onLogout={handleLogout}
      />
      <main className="flex-grow p-4 md:p-6 lg:p-8">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-6 p-4 bg-white shadow rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div className="lg:col-span-2">
                <label htmlFor="search-vm" className="block text-sm font-medium text-gray-700 mb-1">
                  Buscar nombre de máquina virtual
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="search-vm"
                    className="focus:ring-gcp-blue focus:border-gcp-blue block w-full pl-10 sm:text-sm border-gray-300 rounded-md p-2"
                    placeholder="ej., mi-servidor-web"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  Filtrar por estado
                </label>
                <select
                  id="status-filter"
                  className="focus:ring-gcp-blue focus:border-gcp-blue block w-full sm:text-sm border-gray-300 rounded-md p-2"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as VMStatus | 'ALL')}
                >
                  <option value="ALL">Todos los estados</option>
                  {Object.values(VMStatus).map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="zone-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  Filtrar por zona
                </label>
                <select
                  id="zone-filter"
                  className="focus:ring-gcp-blue focus:border-gcp-blue block w-full sm:text-sm border-gray-300 rounded-md p-2"
                  value={zoneFilter}
                  onChange={(e) => setZoneFilter(e.target.value)}
                >
                  {availableZones.map(zone => (
                    <option key={zone} value={zone}>{zone === 'ALL' ? 'Todas las zonas' : zone}</option>
                  ))}
                </select>
              </div>
              <div className="mt-4 md:mt-0 md:col-start-2 lg:col-start-auto">
                   <button
                     onClick={loadVMs} // Este botón ahora llama a la misma función que el polling
                     disabled={isLoading}
                     // Usar un color base que sea siempre visible
                     className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50"
                   >
                     <RefreshIcon className={`h-5 w-5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                     Actualizar máquinas virtuales
                   </button>
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="flex justify-center items-center py-10">
              <Spinner />
              <p className="ml-2 text-gray-600">Cargando máquinas virtuales...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-4 text-red-600 bg-red-100 border border-red-400 rounded-md">
              {error}
            </div>
          )}

          {!isLoading && !error && filteredVMs.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              <p className="text-xl">No se encontraron VMs que coincidan con tus criterios.</p>
              <p>Prueba ajustando tus filtros o actualizando la lista.</p>
            </div>
          )}

          {!isLoading && !error && filteredVMs.length > 0 && (
            <VMList
              vms={filteredVMs}
              onStart={handleStartVM}
              onStop={handleStopVM}
              onConnect={handleConnectVM} // Esto abrirá el ConnectModal (ahora el modal unificado)
              onCopyToClipboard={handleCopyToClipboard}
              projectId={selectedProject.id} // Pasar el projectId a VMList
            />
          )}
        </div>
      </main>
      {/* El ConnectModal se abre aquí. selectedVMForConnect lo controla. */}
      {selectedVMForConnect && (
        <ConnectModal
          vm={selectedVMForConnect}
          onClose={() => setSelectedVMForConnect(null)}
          onCopyToClipboard={handleCopyToClipboard}
          projectId={selectedProject.id}
        />
      )}
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
    </div>
  );
};

export default App;