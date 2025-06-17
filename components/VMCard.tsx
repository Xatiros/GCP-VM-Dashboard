// src/components/VMCard.tsx
import React from 'react';
import { VirtualMachine, VMStatus } from '../types';
import { PowerIcon, StopIcon, LinkIcon, ChipIcon, LocationMarkerIcon, ClipboardCopyIcon, CogIcon, TerminalIcon } from './icons'; 
// Asegúrate de que todos los iconos que usas están importados correctamente desde './icons'

interface VMCardProps {
  vm: VirtualMachine;
  onStart: (vmId: string) => void;
  onStop: (vmId:string) => void;
  onConnect: (vm: VirtualMachine) => void; // onConnect abre el modal unificado
  onCopyToClipboard: (text: string, type: string) => void;
  projectId: string; // Necesario para los enlaces de conexión
}

// Helper para el indicador de estado (no cambia, pero lo incluyo completo por contexto)
const StatusIndicator: React.FC<{ status: VMStatus | string }> = ({ status }) => {
  let bgColor = 'bg-gray-400';
  let textColor = 'text-gray-700';
  let ringColor = 'ring-gray-400';

  switch (status) {
    case VMStatus.RUNNING:
    case 'CORRER': 
      bgColor = 'bg-gcp-green';
      textColor = 'text-green-700';
      ringColor = 'ring-gcp-green';
      break;
    case VMStatus.STOPPED:
    case 'FINALIZADO': 
    case 'TERMINATED':
    case 'PARADA': 
      bgColor = 'bg-gcp-red';
      textColor = 'text-red-700';
      ringColor = 'ring-gcp-red';
      break;
    case 'PROVISIONING':
    case 'STAGING':
      bgColor = 'bg-gcp-yellow';
      textColor = 'text-yellow-700';
      ringColor = 'ring-gcp-yellow';
      break;
    case 'SUSPENDING':
      bgColor = 'bg-orange-400';
      textColor = 'text-orange-700';
      ringColor = 'ring-orange-400';
      break;
    default: // Para cualquier otro estado no esperado
      bgColor = 'bg-gray-400';
      textColor = 'text-gray-700';
      ringColor = 'ring-gray-400';
      break;
  }

  return (
    <div className="flex items-center">
      <span className={`h-3 w-3 ${bgColor} rounded-full inline-block mr-2 ring-2 ring-offset-1 ${ringColor} opacity-75`}></span>
      <span className={`text-sm font-medium ${textColor}`}>{status}</span>
      {(status === 'PROVISIONING' || status === 'SUSPENDING' || status === 'STAGING') && (
          <CogIcon className="h-4 w-4 ml-1 text-current animate-spin" />
      )}
    </div>
  );
};


export const VMCard: React.FC<VMCardProps> = ({ vm, onStart, onStop, onConnect, onCopyToClipboard, projectId }) => {
  // Estados de la VM unificados para mayor claridad
  const isRunning = vm.status === VMStatus.RUNNING || vm.status === 'CORRER';
  const isStopped = vm.status === VMStatus.STOPPED || vm.status === 'FINALIZADO' || vm.status === 'TERMINATED' || vm.status === 'PARADA';
  const isTransitioning = vm.status === 'PROVISIONING' || vm.status === 'SUSPENDING' || vm.status === 'STAGING';

  // Habilitación de acciones
  const canStart = isStopped && !isTransitioning;
  const canStop = isRunning && !isTransitioning;
  // El botón de conexión principal se habilita si la VM está corriendo y no en transición, Y tiene IP externa
  const canConnectDirectLink = isRunning && !isTransitioning && vm.externalIp; 

  // Enlaces directos a Google Cloud Console
  const sshInBrowserLink = `https://ssh.cloud.google.com/v2/ssh/projects/${projectId}/zones/${vm.zone}/instances/${vm.name}`;
  // Este enlace lleva a la página de detalles de la VM, donde se puede "Establecer contraseña de Windows"
  const setWindowsPasswordLink = `https://console.cloud.google.com/compute/instancesDetail/zones/${vm.zone}/instances/${vm.name}?project=${projectId}`;

  // Detección de VM Windows (asumimos que el backend ya lo envía correctamente)
  const isWindowsVM = vm.osType === 'Windows'; 

  // Función para obtener clases de los botones de Encender/Apagar
  const getActionButtonClass = (isEnabled: boolean, baseColor: string) => 
    `flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white transition-colors duration-200 
    ${isEnabled ? `bg-${baseColor}-500 hover:bg-${baseColor}-600 focus:ring-${baseColor}-500` : 'bg-gray-300 text-gray-500 cursor-not-allowed'} 
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50`; // Eliminado disabled:opacity-50, ya lo controla el cursor-not-allowed

  // Determinar el texto para el botón deshabilitado (estado de transición o final no accionable)
  const getDisabledButtonText = () => {
    if (vm.status === 'PROVISIONING') return 'Iniciando...';
    if (vm.status === 'SUSPENDING') return 'Deteniendo...';
    if (vm.status === 'STAGING') return 'Preparando...';
    if (vm.status === VMStatus.TERMINATED || vm.status === 'FINALIZADO') return 'Terminada';
    if (vm.status === 'PARADA') return 'Parada';
    return vm.status; // Fallback para otros estados
  };

  return (
    <div 
      className="bg-white shadow-lg rounded-xl overflow-hidden flex flex-col transition-all hover:shadow-xl"
    >
      <div className="p-5 border-b border-gray-200">
        <div className="flex justify-between items-center relative"> 
          <h3 className="text-xl font-bold text-gray-800 truncate" title={vm.name}>{vm.name}</h3>
          {/* Botón de "Más opciones de conexión" (TerminalIcon) - Siempre visible si no está en transición */}
          {!isTransitioning && ( 
            <button 
              onClick={() => onConnect(vm)} // Este botón abre el ConnectModal unificado
              className="ml-2 p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
              title="Más opciones de conexión"
            >
              <TerminalIcon className="h-6 w-6" /> {/* Icono de terminal */}
            </button>
          )}
        </div>
        <div className="mt-1 flex items-center justify-between">
          <StatusIndicator status={vm.status} />
          {vm.osType && ( // Mostrar el tipo de OS si está disponible
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{vm.osType}</span>
          )}
        </div>
      </div>
      
      <div className="p-5 space-y-3 text-sm text-gray-600 flex-grow">
        <div className="flex items-center">
          <LocationMarkerIcon className="h-4 w-4 mr-2 text-gray-400" />
          <span>{vm.zone}</span>
        </div>
        {vm.externalIp && (
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <LinkIcon className="h-4 w-4 mr-2 text-gray-400" />
              <span>Ext. IP: {vm.externalIp}</span>
            </div>
            <button 
              onClick={() => onCopyToClipboard(vm.externalIp!, 'IP Externa')} 
              title="Copiar IP Externa"
              className="ml-2 p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700"
            >
              <ClipboardCopyIcon className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex items-center justify-between">
            <div className="flex items-center">
                <ChipIcon className="h-4 w-4 mr-2 text-gray-400" />
                <span>IP Int: {vm.internalIp}</span>
            </div>
            <button 
              onClick={() => onCopyToClipboard(vm.internalIp, 'IP Interna')} 
              title="Copiar IP Interna"
              className="ml-2 p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700"
            >
              <ClipboardCopyIcon className="h-4 w-4" />
            </button>
        </div>
        <div className="flex items-center">
          <CogIcon className="h-4 w-4 mr-2 text-gray-400" />
          <span>Tipo: {vm.machineType}</span>
        </div>
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex space-x-2"> {/* Fila principal de botones */}
          {/* Botón Encender */}
          <button
            onClick={() => onStart(vm.id)} 
            disabled={!canStart}
            className={getActionButtonClass(canStart, 'green')}
          >
            <PowerIcon className="h-5 w-5 mr-1" />
            Encender
          </button>

          {/* Botón Apagar */}
          <button
            onClick={() => onStop(vm.id)} 
            disabled={!canStop}
            className={getActionButtonClass(canStop, 'red')}
          >
            <StopIcon className="h-5 w-5 mr-1" />
            Apagar
          </button>
          
          {/* Botón de Conexión Directa a Consola (SSH para Linux, RDP para Windows) */}
          {isWindowsVM ? (
            <a 
              href={setWindowsPasswordLink} 
              target="_blank" 
              rel="noopener noreferrer" 
              // ESTILOS MEJORADOS PARA EL BOTÓN DE CONEXIÓN
              className={`flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm transition-colors duration-200
                ${canConnectDirectLink 
                  ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500' // Azul brillante para activo
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed' // Gris claro para deshabilitado
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50`}
              onClick={(e) => { if (!canConnectDirectLink) e.preventDefault(); }} // Prevenir navegación si deshabilitado
            >
              <LinkIcon className="h-5 w-5 mr-1" />
              Conectar (RDP)
            </a>
          ) : ( // Asumiendo que es Linux o desconocido, ofrecemos SSH por defecto aquí
            <a 
              href={sshInBrowserLink} 
              target="_blank" 
              rel="noopener noreferrer" 
              // ESTILOS MEJORADOS PARA EL BOTÓN DE CONEXIÓN (SSH)
              className={`flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm transition-colors duration-200
                ${canConnectDirectLink 
                  ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500' // Azul brillante para activo
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed' // Gris claro para deshabilitado
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50`}
              onClick={(e) => { if (!canConnectDirectLink) e.preventDefault(); }}
            >
              <LinkIcon className="h-5 w-5 mr-1" />
              Conectar (SSH)
            </a>
          )}
        </div>

        {/* Botón de estado deshabilitado (si la VM está en transición) - Esto ahora es un div para mensajes */}
        { isTransitioning && ( 
          <div className="flex space-x-2 mt-2 w-full"> 
              <div
              className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-gray-200 cursor-not-allowed" // Mejorar el color del texto a gray-700
              >
              {getDisabledButtonText()}
              </div>
          </div>
        )}
      </div>
    </div>
  );
};