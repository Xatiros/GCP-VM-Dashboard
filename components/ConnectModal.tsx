import React from 'react';
import { VirtualMachine } from '../types';
import { ClipboardCopyIcon, XIcon, TerminalIcon, LinkIcon } from './icons'; // Asegúrate de que TerminalIcon existe en icons.tsx

interface ConnectModalProps {
  vm: VirtualMachine;
  onClose: () => void;
  onCopyToClipboard: (text: string, type: string) => void;
  projectId: string; // Necesario para gcloud y SSH en navegador
}

export const ConnectModal: React.FC<ConnectModalProps> = ({ vm, onClose, onCopyToClipboard, projectId }) => {
  // Comandos SSH/gcloud/RDP
  const sshCommand = vm.externalIp ? `ssh your_user@${vm.externalIp}` : 'N/A (No External IP)';
  const gcloudCommand = `gcloud compute ssh ${vm.name} --zone=${vm.zone} --project=${projectId}`;
  const rdpCommand = vm.externalIp ? `mstsc /v:${vm.externalIp}` : 'N/A (No External IP)';
  
  // Enlaces directos a la consola de Google Cloud
  // URL base de la consola de instancias de Compute Engine
  const gcpInstancesBaseUrl = `https://console.cloud.google.com/compute/instancesDetail/zones/${vm.zone}/instances/${vm.name}?project=${projectId}`;
  const sshInBrowserLink = `https://ssh.cloud.google.com/v2/ssh/projects/${projectId}/zones/${vm.zone}/instances/${vm.name}`;
  const setWindowsPasswordLink = `${gcpInstancesBaseUrl}&tab=details`; // La página de detalles donde se puede establecer la contraseña

  // Determinar si es una VM Windows (una heurística simple, podrías necesitar una propiedad 'os' en VM)
  const isWindowsVM = vm.machineType.toLowerCase().includes('windows'); // Asumiendo que el tipo de máquina o SO indica Windows

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
          {/* Columna para opciones SSH/gcloud (para VMs Linux) */}
          {!isWindowsVM && (
            <div className="space-y-4">
              <h4 className="font-bold text-gray-800 border-b pb-2 mb-2">Conexión Linux (SSH)</h4>
              
              <div>
                <p className="font-medium text-gray-700">Via SSH (IP Externa):</p>
                <div className="mt-1 flex items-center bg-gray-100 p-2 rounded-md">
                  <code className="text-gray-700 flex-grow select-all break-all">{sshCommand}</code>
                  <button
                    onClick={() => onCopyToClipboard(sshCommand, 'Comando SSH')}
                    title="Copiar Comando SSH"
                    className="ml-2 p-1 text-gray-500 hover:text-gcp-blue rounded hover:bg-gray-200"
                  >
                    <ClipboardCopyIcon className="h-5 w-5" />
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">Reemplaza <code>your_user</code> con tu usuario en la VM.</p>
                {!vm.externalIp && <p className="mt-1 text-xs text-yellow-600">VM sin IP externa.</p>}
              </div>

              <div>
                <p className="font-medium text-gray-700">Via Google Cloud Shell (gcloud):</p>
                <div className="mt-1 flex items-center bg-gray-100 p-2 rounded-md">
                  <code className="text-gray-700 flex-grow select-all break-all">{gcloudCommand}</code>
                  <button
                    onClick={() => onCopyToClipboard(gcloudCommand, 'Comando gcloud')}
                    title="Copiar Comando gcloud"
                    className="ml-2 p-1 text-gray-500 hover:text-gcp-blue rounded hover:bg-gray-200"
                  >
                    <ClipboardCopyIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div>
                <p className="font-medium text-gray-700">Abrir SSH en el Navegador (Consola GCP):</p>
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
                    <ClipboardCopyIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Columna para opciones RDP (para VMs Windows) */}
          {isWindowsVM && (
            <div className="space-y-4">
              <h4 className="font-bold text-gray-800 border-b pb-2 mb-2">Conexión Windows (RDP)</h4>

              <div>
                <p className="font-medium text-gray-700">Via Cliente RDP (IP Externa):</p>
                <div className="mt-1 flex items-center bg-gray-100 p-2 rounded-md">
                  <code className="text-gray-700 flex-grow select-all break-all">{rdpCommand}</code>
                  <button
                    onClick={() => onCopyToClipboard(rdpCommand, 'Comando RDP')}
                    title="Copiar Comando RDP"
                    className="ml-2 p-1 text-gray-500 hover:text-gcp-blue rounded hover:bg-gray-200"
                  >
                    <ClipboardCopyIcon className="h-5 w-5" />
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">Usa este comando en tu cliente de Escritorio Remoto (<code>mstsc</code> en Windows).</p>
                {!vm.externalIp && <p className="mt-1 text-xs text-yellow-600">VM sin IP externa. RDP puede requerir IAP/túnel.</p>}
              </div>

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

              {/* Opcional: Enlace directo a RDP en el navegador si Google Cloud lo ofrece para RDP */}
              {/* Google Cloud Console tiene "Conectar usando el cliente RDP" que descarga un .rdp file. */}
              {/* Para RDP en el navegador similar a SSH, se necesita una infraestructura de Cloud Shell. */}
            </div>
          )}

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
