import React from 'react';
import { VirtualMachine } from '../types';
import { ClipboardCopyIcon, XIcon, LinkIcon, TerminalIcon } from './icons'; 

interface ConnectModalProps { // Renombramos internamente este componente o sus props si fuera un Popover separado
  vm: VirtualMachine;
  onClose: () => void;
  onCopyToClipboard: (text: string, type: string) => void;
  projectId: string; 
  // Si este es el popover, onConnect ya no es necesaria aquí.
  // Si es el modal principal, onConnectVM es lo que lo abre.
}

// Este es el componente que se usará como POP-OVER para "Más opciones"
// Ya no será el ConnectModal original, sino un ConnectionCommandsPopover.
// El ConnectModal original (para SSH en navegador) se queda como está.

// --- Definición del ConnectionCommandsPopover (lo pondrás en VMCard.tsx o en un nuevo archivo) ---
// Por ahora, para la explicacion, asumo que esto se moverá dentro de VMCard.tsx o un archivo propio
// y que el ConnectModal original (para SSH en navegador) se mantiene SEPARADO.

// Vamos a crear un nuevo componente Popover en src/components/ConnectionCommandsPopover.tsx
// y luego lo importaremos en VMCard.tsx

// src/components/ConnectionCommandsPopover.tsx
// (Crear este archivo)
interface ConnectionCommandsPopoverProps {
  vm: VirtualMachine;
  projectId: string;
  onCopyToClipboard: (text: string, type: string) => void;
  onClose: () => void; // Para cerrar el popover al hacer clic fuera
}

export const ConnectionCommandsPopover: React.FC<ConnectionCommandsPopoverProps> = ({ vm, projectId, onCopyToClipboard, onClose }) => {
  const sshCommand = vm.externalIp ? `ssh your_user@${vm.externalIp}` : 'N/A (No External IP)';
  const gcloudCommand = `gcloud compute ssh ${vm.name} --zone=${vm.zone} --project=${projectId}`;
  const rdpCommand = vm.externalIp ? `mstsc /v:${vm.externalIp}` : 'N/A (No External IP)';
  const setWindowsPasswordLink = `https://console.cloud.google.com/compute/instancesDetail/zones/${vm.zone}/instances/${vm.name}?project=${projectId}&tab=details`;

  const popoverRef = React.useRef<HTMLDivElement>(null); 
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose(); 
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div ref={popoverRef} className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-lg z-20 border border-gray-200 p-4">
      <h4 className="font-semibold text-gray-800 mb-2">Comandos de Conexión Adicionales:</h4>
      
      {/* Opciones SSH/gcloud (solo si no es Windows o si es una VM Linux/Other) */}
      {(vm.osType === 'Linux' || vm.osType === 'Other') && (
        <div className="space-y-3 mb-3">
          <p className="font-medium text-gray-700">Via SSH (IP Externa):</p>
          <div className="mt-1 flex items-center bg-gray-100 p-2 rounded-md text-xs">
            <code className="text-gray-700 flex-grow select-all break-all">{sshCommand}</code>
            <button
              onClick={() => onCopyToClipboard(sshCommand, 'Comando SSH')}
              title="Copiar Comando SSH"
              className="ml-2 p-1 text-gray-500 hover:text-gcp-blue rounded hover:bg-gray-200"
            >
              <ClipboardCopyIcon className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">Reemplaza <code>your_user</code> con tu usuario en la VM.</p>
          {!vm.externalIp && <p className="mt-1 text-xs text-yellow-600">VM sin IP externa.</p>}

          <p className="font-medium text-gray-700">Via Google Cloud Shell (gcloud):</p>
          <div className="mt-1 flex items-center bg-gray-100 p-2 rounded-md text-xs">
            <code className="text-gray-700 flex-grow select-all break-all">{gcloudCommand}</code>
            <button
              onClick={() => onCopyToClipboard(gcloudCommand, 'Comando gcloud')}
              title="Copiar Comando gcloud"
              className="ml-2 p-1 text-gray-500 hover:text-gcp-blue rounded hover:bg-gray-200"
            >
              <ClipboardCopyIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Opciones RDP (solo si es Windows) */}
      {vm.osType === 'Windows' && (
        <div className="space-y-3">
          <p className="font-medium text-gray-700">Via Cliente RDP (IP Externa):</p>
          <div className="mt-1 flex items-center bg-gray-100 p-2 rounded-md text-xs">
            <code className="text-gray-700 flex-grow select-all break-all">{rdpCommand}</code>
            <button
              onClick={() => onCopyToClipboard(rdpCommand, 'Comando RDP')}
              title="Copiar Comando RDP"
              className="ml-2 p-1 text-gray-500 hover:text-gcp-blue rounded hover:bg-gray-200"
            >
              <ClipboardCopyIcon className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">Usa este comando en tu cliente de Escritorio Remoto (<code>mstsc</code> en Windows).</p>
          {!vm.externalIp && <p className="mt-1 text-xs text-yellow-600">VM sin IP externa. RDP puede requerir IAP/túnel.</p>}

          <p className="font-medium text-gray-700">Establecer/Ver Contraseña de Windows (Consola GCP):</p>
          <div className="mt-1 flex items-center bg-gray-100 p-2 rounded-md">
            <a 
              href={setWindowsPasswordLink} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-gcp-blue hover:underline flex-grow truncate"
              title="Establecer/Ver Contraseña de Windows"
            >
              Abrir en Consola de Google Cloud
            </a>
            <button
              onClick={() => onCopyToClipboard(setWindowsPasswordLink, 'Enlace Contraseña Windows')}
              title="Copiar Enlace Contraseña Windows"
              className="ml-2 p-1 text-gray-500 hover:text-gcp-blue rounded hover:bg-gray-200"
            >
              <ClipboardCopyIcon className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">Necesitarás un usuario y contraseña para RDP. Puedes gestionarlos aquí.</p>
        </div>
      )}
      
    </div>
  );
};
