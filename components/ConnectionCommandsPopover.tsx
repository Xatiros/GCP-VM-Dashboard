// src/components/ConnectionCommandsPopover.tsx
import React from 'react';
import { VirtualMachine } from '../types';
import { ClipboardCopyIcon, TerminalIcon } from './icons'; // Asegúrate de que TerminalIcon está en icons.tsx

interface ConnectionCommandsPopoverProps {
  vm: VirtualMachine;
  projectId: string;
  onCopyToClipboard: (text: string, type: string) => void;
  onClose: () => void; // Para cerrar el popover al hacer clic fuera
}

export const ConnectionCommandsPopover: React.FC<ConnectionCommandsPopoverProps> = ({ vm, projectId, onCopyToClipboard, onClose }) => {
  const sshCommand = vm.externalIp ? `ssh your_user@${vm.externalIp}` : 'N/A (No External IP)';
  const gcloudCommand = `gcloud compute ssh <span class="math-inline">\{vm\.name\} \-\-zone\=</span>{vm.zone} --project=${projectId}`;
  const rdpCommand = vm.externalIp ? `mstsc /v:${vm.externalIp}` : 'N/A (No External IP)';
  const setWindowsPasswordLink = `https://console.cloud.google.com/compute/instancesDetail/zones/<span class="math-inline">\{vm\.zone\}/instances/</span>{vm.name}?project=${projectId}&tab=details`;

  // Determinar si es una VM Windows (usando la nueva propiedad osType)
  const isWindowsVM = vm.osType === 'Windows';

  // Usar useRef para el popover y detectar clics fuera
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
      {(!isWindowsVM) && ( // Si no es una VM Windows
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
      {isWindowsVM && (
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