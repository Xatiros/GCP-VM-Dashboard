import React from 'react';
import { VirtualMachine } from '../types';
import { ClipboardCopyIcon, XIcon } from './icons'; // Asegúrate de tener LinkIcon si quieres un icono para el enlace

interface ConnectModalProps {
  vm: VirtualMachine;
  onClose: () => void;
  onCopyToClipboard: (text: string, type: string) => void;
  projectId: string;
}

export const ConnectModal: React.FC<ConnectModalProps> = ({ vm, onClose, onCopyToClipboard, projectId }) => {
  const sshCommand = vm.externalIp ? `ssh your_user@${vm.externalIp}` : 'N/A (No External IP)';
  const gcloudCommand = `gcloud compute ssh ${vm.name} --zone=${vm.zone} --project=${projectId}`;
  
  // --- NUEVO: Generar el enlace para SSH en el navegador ---
  const sshInBrowserLink = `https://ssh.cloud.google.com/v2/ssh/projects/${projectId}/zones/${vm.zone}/instances/${vm.name}`;
  // --- FIN NUEVO ---

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Connect to {vm.name}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4 text-sm">
          {/* Opciones existentes: SSH y gcloud */}
          {vm.externalIp && (
            <div>
              <p className="font-medium text-gray-700">Via SSH (External IP):</p>
              <div className="mt-1 flex items-center bg-gray-100 p-2 rounded-md">
                <code className="text-gray-700 flex-grow select-all">{sshCommand}</code>
                <button
                  onClick={() => onCopyToClipboard(sshCommand, 'SSH Command')}
                  title="Copy SSH Command"
                  className="ml-2 p-1 text-gray-500 hover:text-gcp-blue rounded hover:bg-gray-200"
                >
                  <ClipboardCopyIcon className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">Replace <code>your_user</code> with your username on the VM.</p>
            </div>
          )}

          <div>
            <p className="font-medium text-gray-700">Via Google Cloud Shell (gcloud):</p>
            <div className="mt-1 flex items-center bg-gray-100 p-2 rounded-md">
              <code className="text-gray-700 flex-grow select-all">{gcloudCommand}</code>
              <button
                onClick={() => onCopyToClipboard(gcloudCommand, 'gcloud Command')}
                title="Copy gcloud Command"
                className="ml-2 p-1 text-gray-500 hover:text-gcp-blue rounded hover:bg-gray-200"
              >
                <ClipboardCopyIcon className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">Replace <code>YOUR_PROJECT_ID</code> with your actual GCP Project ID.</p>
            {!vm.externalIp && <p className="mt-1 text-xs text-yellow-600">Note: This VM does not have an external IP. gcloud SSH will use IAP by default if configured.</p>}
          </div>

          {/* --- NUEVA OPCIÓN: Conectar en el navegador --- */}
          <div>
            <p className="font-medium text-gray-700">Connect via browser (Google Cloud Console):</p>
            <div className="mt-1 flex items-center bg-gray-100 p-2 rounded-md">
              <a 
                href={sshInBrowserLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-gcp-blue hover:underline flex-grow truncate"
                title={sshInBrowserLink} // Muestra el enlace completo al pasar el ratón
              >
                Open SSH in Cloud Console
              </a>
              {/* Opcional: un botón para copiar el enlace directo si prefieren no hacer clic */}
              <button
                onClick={() => onCopyToClipboard(sshInBrowserLink, 'SSH in Browser Link')}
                title="Copy SSH in Browser Link"
                className="ml-2 p-1 text-gray-500 hover:text-gcp-blue rounded hover:bg-gray-200"
              >
                <ClipboardCopyIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          {/* --- FIN NUEVA OPCIÓN --- */}
          
          <p className="text-xs text-gray-500 mt-4">
            For more connection options, refer to the 
            <a href="https://cloud.google.com/compute/docs/instances/connecting-to-instance" target="_blank" rel="noopener noreferrer" className="text-gcp-blue hover:underline ml-1">
              GCP documentation
            </a>.
          </p>
        </div>

        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
