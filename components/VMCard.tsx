import React from 'react';
import { VirtualMachine, VMStatus } from '../types';
import { PowerIcon, StopIcon, LinkIcon, ChipIcon, LocationMarkerIcon, ClipboardCopyIcon, CogIcon } from './icons';

interface VMCardProps {
  vm: VirtualMachine;
  onStart: () => void;
  onStop: () => void;
  onConnect: () => void;
  onCopyToClipboard: (text: string, type: string) => void;
}

const StatusIndicator: React.FC<{ status: VMStatus | string }> = ({ status }) => {
  let bgColor = 'bg-gray-400';
  let textColor = 'text-gray-700';
  let ringColor = 'ring-gray-400';

  switch (status) {
    case VMStatus.RUNNING:
      bgColor = 'bg-gcp-green';
      textColor = 'text-green-700';
      ringColor = 'ring-gcp-green';
      break;
    case VMStatus.STOPPED:
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
    case 'TERMINATED':
      bgColor = 'bg-slate-500';
      textColor = 'text-slate-700';
      ringColor = 'ring-slate-500';
      break;
    case 'FINALIZADO': // Mapeo si la API devuelve exactamente "FINALIZADO"
      bgColor = 'bg-gcp-red';
      textColor = 'text-red-700';
      ringColor = 'ring-red-400';
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


export const VMCard: React.FC<VMCardProps> = ({ vm, onStart, onStop, onConnect, onCopyToClipboard }) => {
  // Ya no necesitamos isHovered
  // const [isHovered, setIsHovered] = React.useState(false); 

  const isActuallyStopped = vm.status === VMStatus.STOPPED || vm.status === 'FINALIZADO' || vm.status === 'TERMINATED';
  const isActuallyRunning = vm.status === VMStatus.RUNNING;
  const isStartingOrStopping = vm.status === 'PROVISIONING' || vm.status === 'SUSPENDING' || vm.status === 'STAGING';

  // canStart y canStop determinan si el botón está HABILITADO
  const canStart = isActuallyStopped && !isStartingOrStopping;
  const canStop = isActuallyRunning && !isStartingOrStopping;
  const canConnect = isActuallyRunning && !isStartingOrStopping;

  // Determinar la clase CSS del botón de acción (verde/rojo o gris)
  const getActionButtonClass = (isEnabled: boolean, baseColor: string) => 
    `flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${isEnabled ? `bg-${baseColor}-500 hover:bg-${baseColor}-600 focus:ring-${baseColor}-500` : 'bg-gray-300 text-gray-500 cursor-not-allowed'} focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50`;


  return (
    <div 
      className="bg-white shadow-lg rounded-xl overflow-hidden flex flex-col transition-all hover:shadow-xl"
      // Eliminamos el onMouseEnter/onMouseLeave
      // onMouseEnter={() => setIsHovered(true)} 
      // onMouseLeave={() => setIsHovered(false)}
    >
      <div className="p-5 border-b border-gray-200">
        <h3 className="text-xl font-bold text-gray-800 truncate" title={vm.name}>{vm.name}</h3>
        <div className="mt-1">
          <StatusIndicator status={vm.status} />
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
              onClick={() => onCopyToClipboard(vm.externalIp!, 'External IP')} 
              title="Copy External IP"
              className="ml-2 p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700"
            >
              <ClipboardCopyIcon className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex items-center justify-between">
            <div className="flex items-center">
                <ChipIcon className="h-4 w-4 mr-2 text-gray-400" />
                <span>Int. IP: {vm.internalIp}</span>
            </div>
            <button 
              onClick={() => onCopyToClipboard(vm.internalIp, 'Internal IP')} 
              title="Copy Internal IP"
              className="ml-2 p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700"
            >
              <ClipboardCopyIcon className="h-4 w-4" />
            </button>
        </div>
        <div className="flex items-center">
          <CogIcon className="h-4 w-4 mr-2 text-gray-400" />
          <span>Type: {vm.machineType}</span>
        </div>
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex space-x-2"> {/* Los 3 botones principales siempre visibles */}
          {/* Botón Encender */}
          <button
            onClick={onStart}
            disabled={!canStart}
            className={getActionButtonClass(canStart, 'green')}
          >
            <PowerIcon className="h-5 w-5 mr-1" />
            Encender
          </button>

          {/* Botón Apagar */}
          <button
            onClick={onStop}
            disabled={!canStop}
            className={getActionButtonClass(canStop, 'red')}
          >
            <StopIcon className="h-5 w-5 mr-1" />
            Apagar
          </button>
          
          {/* Botón Conectar */}
          <button
            onClick={onConnect}
            disabled={!canConnect}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gcp-blue disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LinkIcon className="h-5 w-5 mr-1" />
            Conectar
          </button>
        </div>
      </div>
    </div>
  );
};