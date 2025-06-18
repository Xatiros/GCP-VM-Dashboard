// src/components/VMCard.tsx
import React from 'react';
import { VirtualMachine, VMStatus } from '../types';
import { PowerIcon, StopIcon, LinkIcon, ChipIcon, LocationMarkerIcon, ClipboardCopyIcon, CogIcon, TerminalIcon } from './icons'; 

interface VMCardProps {
  vm: VirtualMachine;
  onStart: (vmId: string) => void;
  onStop: (vmId:string) => void;
  onConnect: (vm: VirtualMachine) => void; // onConnect abre el modal unificado
  onCopyToClipboard: (text: string, type: string) => void;
  projectId: string; // Necesario para los enlaces de conexión
}

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
    default: 
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
  // Estados de la VM unificados
  const isRunning = vm.status === VMStatus.RUNNING || vm.status === 'CORRER';
  const isStopped = vm.status === VMStatus.STOPPED || vm.status === 'FINALIZADO' || vm.status === 'TERMINATED' || vm.status === 'PARADA';
  const isTransitioning = vm.status === 'PROVISIONING' || vm.status === 'SUSPENDING' || vm.status === 'STAGING';

  // Habilitación de acciones
  const canStart = isStopped && !isTransitioning;
  const canStop = isRunning && !isTransitioning;
  // El botón de conexión ahora solo necesita que la VM esté corriendo y no en transición (la IP externa se valida en el modal)
  const canOpenConnectModal = isRunning && !isTransitioning; 

  // Detección de VM Windows
  const isWindowsVM = vm.osType === 'Windows'; 

  // Función para obtener clases de los botones de Encender/Apagar
  const getActionButtonClass = (isEnabled: boolean, baseColor: string) => 
    `flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white transition-colors duration-200 
    ${isEnabled ? `bg-${baseColor}-500 hover:bg-${baseColor}-600 focus:ring-${baseColor}-500` : 'bg-gray-300 text-gray-500 cursor-not-allowed'} 
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50`; 

  // Determinar el texto para el botón deshabilitado (estado de transición o final no accionable)
  const getDisabledButtonText = () => {
    if (vm.status === 'PROVISIONING') return 'Iniciando...';
    if (vm.status === 'SUSPENDING') return 'Deteniendo...';
    if (vm.status === 'STAGING') return 'Preparando...';
    if (vm.status === VMStatus.TERMINATED || vm.status === 'FINALIZADO') return 'Terminada';
    if (vm.status === 'PARADA') return 'Parada';
    return vm.status; 
  };

  return (
    <div 
      className="bg-white shadow-lg rounded-xl overflow-hidden flex flex-col transition-all hover:shadow-xl"
    >
      <div className="p-5 border-b border-gray-200">
        <div className="flex justify-between items-center relative"> 
          <h3 className="text-xl font-bold text-gray-800 truncate" title={vm.name}>{vm.name}</h3>
          {/* Botón de "Más opciones de conexión" (TerminalIcon) - Abre el ConnectModal unificado */}
          {!isTransitioning && ( 
            <button 
              onClick={() => onConnect(vm)} // ESTE BOTÓN YA LLEVA AL MODAL
              className="ml-2 p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
              title="Más opciones de conexión"
            >
              <TerminalIcon className="h-6 w-6" /> 
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
          
          {/* BOTÓN CONECTAR - AHORA SIEMPRE ABRE EL MODAL */}
          <button 
            onClick={() => onConnect(vm)} // Llama a onConnect para abrir el modal
            disabled={!canOpenConnectModal} // Habilita/deshabilita el botón según si se puede conectar
            className={`flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm transition-colors duration-200
              ${canOpenConnectModal 
                ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500' // Estilo activo
                : 'bg-gray-300 text-gray-500 cursor-not-allowed' // Estilo deshabilitado
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50`}
            title={canOpenConnectModal ? "Conectar a la máquina virtual" : "La VM debe estar en estado RUNNING para conectar"}
          >
            <LinkIcon className="h-5 w-5 mr-1" />
            Conectar
          </button>
        </div>

        {/* Botón de estado deshabilitado (si la VM está en transición) */}
        { isTransitioning && ( 
          <div className="flex space-x-2 mt-2 w-full"> 
              <div
              className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-gray-200 cursor-not-allowed" 
              >
              {getDisabledButtonText()}
              </div>
          </div>
        )}
      </div>
    </div>
  );
};



