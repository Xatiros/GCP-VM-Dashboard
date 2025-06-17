import React from 'react';
import { VirtualMachine } from '../types';
import { ClipboardCopyIcon, XIcon } from './icons'; // Asegúrate de importar los iconos necesarios

interface ConnectModalProps {
  vm: VirtualMachine;
  onClose: () => void;
  onCopyToClipboard: (text: string, type: string) => void;
  projectId: string; // Asegúrate de que esta prop se sigue pasando desde App.tsx
}

export const ConnectModal: React.FC<ConnectModalProps> = ({ vm, onClose, onCopyToClipboard, projectId }) => {
  const sshInBrowserLink = `https://ssh.cloud.google.com/v2/ssh/projects/${projectId}/zones/${vm.zone}/instances/${vm.name}`;
  const setWindowsPasswordLink = `https://console.cloud.google.com/compute/instancesDetail/zones/${vm.zone}/instances/${vm.name}?project=${projectId}&tab=details`;

  // Detección de VM Windows (usando la propiedad osType)
  const isWindowsVM = vm.osType === 'Windows'; // Asegúrate de que vm.osType viene del backend

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Conectar a {vm.name}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4 text-sm">
          {/* Opción de conexión principal (SSH en navegador para Linux, Contraseña para Windows) */}
          {!isWindowsVM && ( // Si no es Windows (asume Linux)
            <div>
              <p className="font-medium text-gray-700">Conectar vía navegador (Consola de Google Cloud):</p>
              <div className="mt-1 flex items-center bg-gray-100 p-2 rounded-md">
                <a 
                  href={sshInBrowserLink} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-gcp-blue hover:underline flex-grow truncate"
                  title="Abrir SSH en Cloud Console"
                >
                  Abrir SSH en la Consola de Google Cloud
                </a>
                <button
                  onClick={() => onCopyToClipboard(sshInBrowserLink, 'Enlace SSH en Navegador')}
                  title="Copiar Enlace SSH en Navegador"
                  className="ml-2 p-1 text-gray-500 hover:text-gcp-blue rounded hover:bg-gray-200"
                >
                  <ClipboardCopyIcon className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">Esta es la forma más rápida de conectarse a VMs Linux.</p>
            </div>
          )}

          {isWindowsVM && ( // Si es Windows
            <div>
              <p className="font-medium text-gray-700">Establecer/Ver Contraseña de Windows (Consola GCP):</p>
              <div className="mt-1 flex items-center bg-gray-100 p-2 rounded-md">
                <a 
                  href={setWindowsPasswordLink} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-gcp-blue hover:underline flex-grow truncate"
                  title="Establecer/Ver Contraseña de Windows"
                >
                  Abrir Gestión de Contraseña en Consola de Google Cloud
                </a>
                <button
                  onClick={() => onCopyToClipboard(setWindowsPasswordLink, 'Enlace Contraseña Windows')}
                  title="Copiar Enlace Contraseña Windows"
                  className="ml-2 p-1 text-gray-500 hover:text-gcp-blue rounded hover:bg-gray-200"
                >
                  <ClipboardCopyIcon className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">Necesitarás un usuario y contraseña para RDP. Consíguelos aquí.</p>
            </div>
          )}
          
          <p className="text-xs text-gray-500 mt-4">
            Para opciones de conexión adicionales (como comandos SSH/gcloud o RDP con cliente),
            haz clic en el icono de terminal junto al nombre de la máquina virtual.
          </p>
        </div>

        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
