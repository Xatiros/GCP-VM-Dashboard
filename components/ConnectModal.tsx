// src/components/ConnectModal.tsx
import React from 'react';
import { VirtualMachine } from '../types';
import { ClipboardCopyIcon, XIcon, LinkIcon, TerminalIcon } from './icons'; 

interface ConnectModalProps {
  vm: VirtualMachine;
  onClose: () => void;
  onCopyToClipboard: (text: string, type: string) => void;
  projectId: string; 
}

export const ConnectModal: React.FC<ConnectModalProps> = ({ vm, onClose, onCopyToClipboard, projectId }) => {
  // Comandos SSH/gcloud/RDP
  const sshCommand = vm.externalIp ? `ssh your_user@${vm.externalIp}` : 'N/A (No External IP)';
  const gcloudCommand = `gcloud compute ssh ${vm.name} --zone=${vm.zone} --project=${projectId}`;
  const rdpCommand = vm.externalIp ? `mstsc /v:${vm.externalIp}` : 'N/A (No External IP)';
  
  // Enlaces directos a la consola de Google Cloud para RDP
  const gcpInstancesBaseUrl = `https://console.cloud.google.com/compute/instancesDetail/zones/${vm.zone}/instances/${vm.name}?project=${projectId}`;
  const setWindowsPasswordLink = `${gcpInstancesBaseUrl}&tab=details`; 

  // Enlace SSH en navegador (solo para el botón principal "Conectar" si es Linux)
  const sshInBrowserLink = `https://ssh.cloud.google.com/v2/ssh/projects/${projectId}/zones/${vm.zone}/instances/${vm.name}`;

  // Detección de VM Windows (usando la nueva propiedad osType)
  const isWindowsVM = vm.osType === 'Windows'; // Asegúrate de que vm.osType viene del backend

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl p-6"> {/* Modal más ancho para más opciones */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Conectar a {vm.name}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm"> {/* Usamos una cuadrícula para organizar las opciones */}
          {/* Columna principal de conexión (SSH en navegador para Linux, o Gestión de Contraseña para Windows) */}
          <div className="space-y-4">
              <h4 className="font-bold text-gray-800 border-b pb-2 mb-2">Conexión Principal (Consola GCP)</h4>
              {!isWindowsVM ? ( // Linux
                <div>
                  <p className="font-medium text-gray-700">Abrir SSH en el Navegador:</p>
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
                  <p className="mt-1 text-xs text-gray-500">Forma rápida y recomendada para VMs Linux.</p>
                </div>
              ) : ( // Windows
                <div>
                  <p className="font-medium text-gray-700">Gestionar Contraseña de Windows:</p>
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
                  <p className="mt-1 text-xs text-gray-500">Necesitarás un usuario y contraseña para RDP. Consíguelos aquí.</p>
                </div>
              )}
          </div>

          {/* Columna para opciones de comandos (SSH Cliente, gcloud, RDP Cliente) */}
          <div className="space-y-4">
              <h4 className="font-bold text-gray-800 border-b pb-2 mb-2">Comandos para Terminal / Cliente</h4>
              
              {!isWindowsVM && ( // Opciones para Linux
                <div className="space-y-3">
                  <div>
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
                  </div>

                  <div>
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
                </div>
              )}

              {isWindowsVM && ( // Opciones para Windows
                <div className="space-y-3">
                  <div>
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
                  </div>
                </div>
              )}
          </div>
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
