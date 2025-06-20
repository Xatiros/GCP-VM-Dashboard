// src/components/VMCard.tsx
import React from 'react';
// --- INICIO DE MODIFICACIONES: He añadido 'ServerIcon' para la RAM ---
import { VirtualMachine, VMStatus } from '../types';
import { PowerIcon, StopIcon, LinkIcon, ChipIcon, LocationMarkerIcon, ClipboardCopyIcon, CogIcon, ServerIcon } from './icons';
// --- FIN DE MODIFICACIONES ---

interface VMCardProps {
  vm: VirtualMachine;
  onStartVM: (vmId: string) => void; 
  onStopVM: (vmId:string) => void;   
  onConnectVM: (vm: VirtualMachine) => void;
  onCopyToClipboard: (text: string, type: string) => void;
  projectId: string;
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


export const VMCard: React.FC<VMCardProps> = ({ vm, onStartVM, onStopVM, onConnectVM, onCopyToClipboard, projectId }) => {
  const isRunning = vm.status === VMStatus.RUNNING || vm.status === 'CORRER';
  const isStopped = vm.status === VMStatus.STOPPED || vm.status === 'FINALIZADO' || vm.status === 'TERMINATED' || vm.status === 'PARADA';
  const isTransitioning = vm.status === 'PROVISIONING' || vm.status === 'SUSPENDING' || vm.status === 'STAGING';

  const canStart = isStopped && !isTransitioning;
  const canStop = isRunning && !isTransitioning;
  const canOpenConnectModal = isRunning && !isTransitioning; 

  const isWindowsVM = vm.osType === 'Windows'; 

  const getActionButtonClass = (isEnabled: boolean, baseColor: string) => 
    `flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white transition-colors duration-200 
    ${isEnabled ? `bg-${baseColor}-500 hover:bg-${baseColor}-600 focus:ring-${baseColor}-500` : 'bg-gray-300 text-gray-500 cursor-not-allowed'} 
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50`; 

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
        </div>
        <div className="mt-1 flex items-center justify-between">
          <StatusIndicator status={vm.status} />
          {vm.osType && (
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

        {/* --- INICIO DE MODIFICACIONES --- */}
        {/* Agrupamos las especificaciones de hardware para mayor claridad */}

        <div className="flex items-center">
          <CogIcon className="h-4 w-4 mr-2 text-gray-400" />
          <span>Tipo: {vm.machineType}</span>
        </div>
        
        {vm.diskSizeGb && (
          <div className="flex items-center">
            {/* Usamos un icono de disco duro de tu archivo de iconos si existe, o el SVG */}
            <svg className="h-4 w-4 mr-2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10m0 0h16M10 7l4 4m0 0l4-4m-4 4v10" />
            </svg>
            <span>Disco: {vm.diskSizeGb} GB</span>
          </div>
        )}

        {vm.vCpus && (
          <div className="flex items-center">
            <ChipIcon className="h-4 w-4 mr-2 text-gray-400" />
            <span>vCPUs: {vm.vCpus}</span>
          </div>
        )}
        
        {vm.memoryGb && (
          <div className="flex items-center">
            {/* He usado el icono 'ServerIcon' que importamos arriba para representar la RAM */}
            <ServerIcon className="h-4 w-4 mr-2 text-gray-400" />
            <span>RAM: {vm.memoryGb} GB</span>
          </div>
        )}
        {/* --- FIN DE MODIFICACIONES --- */}

      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex space-x-2">
          <button
            onClick={() => onStartVM(vm.id)} 
            disabled={!canStart}
            className={getActionButtonClass(canStart, 'green')}
          >
            <PowerIcon className="h-5 w-5 mr-1" />
            Encender
          </button>

          <button
            onClick={() => onStopVM(vm.id)} 
            disabled={!canStop}
            className={getActionButtonClass(canStop, 'red')}
          >
            <StopIcon className="h-5 w-5 mr-1" />
            Apagar
          </button>
          
          <button 
            onClick={() => onConnectVM(vm)}
            disabled={!canOpenConnectModal}
            className={`flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm transition-colors duration-200
              ${canOpenConnectModal 
                ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50`}
            title={canOpenConnectModal ? "Ver instrucciones de conexión" : "La VM debe estar en estado RUNNING para ver las instrucciones"}
          >
            <LinkIcon className="h-5 w-5 mr-1" />
            Conectar
          </button>
        </div>

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