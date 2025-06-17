import React from 'react';
import { VirtualMachine, VMStatus } from '../types';
import { PowerIcon, StopIcon, LinkIcon, ChipIcon, LocationMarkerIcon, ClipboardCopyIcon, CogIcon } from './icons';

interface VMCardProps {
  vm: VirtualMachine;
  onStart: (vmId: string) => void;
  onStop: (vmId: string) => void;
  onConnect: (vm: VirtualMachine) => void; // onConnect ahora espera la VM completa
  onCopyToClipboard: (text: string, type: string) => void;
  projectId: string; // Asegúrate de que esta prop se sigue pasando desde App.tsx
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
    case 'FINALIZADO': 
      bgColor = 'bg-gcp-red';
      textColor = 'text-red-700';
      ringColor = 'ring-red-400';
      break;
    case 'PARADA': 
      bgColor = 'bg-gcp-red';
      textColor = 'text-red-700';
      ringColor = 'ring-red-400';
      break;
    case 'CORRER': 
      bgColor = 'bg-gcp-green';
      textColor = 'text-green-700';
      ringColor = 'ring-gcp-green';
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


export const VMCard: React.FC<VMCardProps> = ({ vm, onStart, onStop, onConnect, onCopyToClipboard, projectId }) => { // projectId añadido a las props
  // Ya no necesitamos showPopover ni isHovered
  // const [showPopover, setShowPopover] = React.useState(false); 
  // const popoverRef = React.useRef<HTMLDivElement>(null); 

  const isActuallyStopped = vm.status === VMStatus.STOPPED || vm.status === 'FINALIZADO' || vm.status === 'TERMINATED' || vm.status === 'PARADA';
  const isActuallyRunning = vm.status === VMStatus.RUNNING || vm.status === 'CORRER';
  const isStartingOrStopping = vm.status === 'PROVISIONING' || vm.status === 'SUSPENDING' || vm.status === 'STAGING';

  const canStart = isActuallyStopped && !isStartingOrStopping;
  const canStop = isActuallyRunning && !isStartingOrStopping;
  const canConnect = isActuallyRunning && !isStartingOrStopping; // Habilitar el botón Conectar

  // Determinar la clase CSS del botón de acción (verde/rojo o gris)
  const getActionButtonClass = (isEnabled: boolean, baseColor: string) => 
    `flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${isEnabled ? `bg-${baseColor}-500 hover:bg-${baseColor}-600 focus:ring-${baseColor}-500` : 'bg-gray-300 text-gray-500 cursor-not-allowed'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 disabled:opacity-50`;

  // Determinar el texto para el botón deshabilitado (estado de transición o final no accionable)
  const getDisabledButtonText = () => {
    if (isStartingOrStopping) {
      if (vm.status === 'PROVISIONING') return 'Iniciando...';
      if (vm.status === 'SUSPENDING') return 'Deteniendo...';
      if (vm.status === 'STAGING') return 'Preparando...';
      return 'Transición...';
    }
    if (vm.status === VMStatus.TERMINATED || vm.status === 'FINALIZADO') {
      return 'Terminada';
    }
    if (vm.status === 'PARADA') {
      return 'Parada';
    }
    return vm.status; 
  };

  return (
    <div 
      className="bg-white shadow-lg rounded-xl overflow-hidden flex flex-col transition-all hover:shadow-xl"
    >
      <div className="p-5 border-b border-gray-200">
        <div className="flex justify-between items-center relative"> 
          <h3 className="text-xl font-bold text-gray-800 truncate" title={vm.name}>{vm.name}</h3>
          {/* Ya no hay botón de "más opciones" aquí, todo en el modal principal */}
        </div>
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
          
          {/* Botón Conectar (este botón ahora abre el modal unificado de conexión) */}
          <button
            onClick={() => onConnect(vm)} {/* Pasa la VM completa a onConnect */}
            disabled={!canConnect} // Habilitado si canConnect es true
            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gcp-blue disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LinkIcon className="h-5 w-5 mr-1" />
            Conectar
          </button>
        </div>

        {/* Si la VM está en transición o no es accionable, mostrar un botón de estado deshabilitado */}
        { isStartingOrStopping || (!canStart && !canStop && !canConnect) ? ( // Si está en transición, O no puede ni encender, ni apagar, ni conectar
            <div className="flex space-x-2 mt-2 w-full"> {/* Usamos w-full para que ocupe todo el ancho */}
                <button
                disabled
                className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-500 bg-gray-200 cursor-not-allowed"
                >
                {getDisabledButtonText()}
                </button>
            </div>
        ) : null}
      </div>
    </div>
  );
};