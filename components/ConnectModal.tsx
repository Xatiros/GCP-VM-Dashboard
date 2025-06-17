// src/components/ConnectModal.tsx
import React from 'react';
import { VirtualMachine } from '../types';
import { ClipboardCopyIcon, XIcon, LinkIcon, TerminalIcon, DownloadIcon } from './icons'; // Asegúrate de importar DownloadIcon

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
  
  // Enlaces directos a la consola de Google Cloud
  const gcpInstancesBaseUrl = `https://console.cloud.google.com/compute/instancesDetail/zones/${vm.zone}/instances/${vm.name}?project=${projectId}`;
  const setWindowsPasswordLink = gcpInstancesBaseUrl; 

  // Enlace SSH en navegador (solo para Linux)
  const sshInBrowserLink = `https://ssh.cloud.google.com/v2/ssh/projects/${projectId}/zones/${vm.zone}/instances/${vm.name}`;

  // Detección de VM Windows (asumimos que el backend ya lo envía correctamente)
  const isWindowsVM = vm.osType === 'Windows'; 
  const isLinuxVM = vm.osType === 'Linux';
  const isUnknownOS = vm.osType === 'Unknown' || !vm.osType;

  // NUEVA FUNCIÓN: Generar y descargar archivo .rdp
  const handleDownloadRDP = () => {
    if (!vm.externalIp) {
      alert('La VM no tiene una IP externa para la conexión RDP.');
      return;
    }

    // Puedes establecer un nombre de usuario por defecto si lo deseas, o dejarlo vacío
    // Para VMs de GCP, "gcpuser" o "Administrador" son comunes.
    const rdpUsername = 'gcpuser'; // O 'Administrator', o simplemente dejarlo vacío si quieres que el usuario lo introduzca.

    const rdpContent = `
full address:s:${vm.externalIp}
username:s:${rdpUsername}
audiomode:i:0
videoplaybackmode:i:1
connection type:i:2
display a connection bar:i:1
desktopwidth:i:0
desktopheight:i:0
session bpp:i:24
compression:i:1
keyboardhook:i:2
audiocapturemode:i:0
redirectprinters:i:1
redirectcomports:i:0
redirectsmartcards:i:1
redirectclipboard:i:1
autoreconnection enabled:i:1
authentication level:i:3
negotiate security layer:i:1
remoteapplicationmode:i:0
shell working directory:s:
span monitors:i:0
drives:s:
gatewayhostname:s:
gatewayusagemethod:i:0
gatewaycredentialssource:i:0
full address:s:${vm.externalIp}
drdesktopenabled:i:0
maximizedestop:i:0
networkautodetect:i:1
bandwidthautodetect:i:1
displayconnectionbar:i:1
enablerdsaad:i:0
use multimon:i:0
`; // Puedes añadir más parámetros RDP si los necesitas

    const blob = new Blob([rdpContent], { type: 'application/x-rdp' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${vm.name}.rdp`; // Nombre del archivo RDP
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // Limpiar la URL del objeto
    
    onCopyToClipboard(rdpContent, 'Archivo RDP'); // Opcional: notificar que se descargó
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Conectar a {vm.name}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          {/* Columna principal de conexión (Consola GCP) */}
          <div className="space-y-4">
            <h4 className="font-bold text-gray-800 border-b pb-2 mb-2">Conexión Principal (Consola GCP)</h4>
            
            {isLinuxVM && ( // Opciones para Linux
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
            )}

            {isWindowsVM && ( // Opciones para Windows
              <div>
                <p className="font-medium text-gray-700">Gestionar Credenciales de Windows:</p>
                <div className="mt-1 flex items-center bg-gray-100 p-2 rounded-md">
                  <a 
                    href={setWindowsPasswordLink} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-gcp-blue hover:underline flex-grow truncate"
                    title="Establecer/Ver Contraseña de Windows y Opciones de RDP"
                  >
                    Abrir en Consola de Google Cloud
                  </a>
                  <button
                    onClick={() => onCopyToClipboard(setWindowsPasswordLink, 'Enlace Consola Windows')}
                    title="Copiar Enlace Consola Windows"
                    className="ml-2 p-1 text-gray-500 hover:text-gcp-blue rounded hover:bg-gray-200"
                  >
                    <ClipboardCopyIcon className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-700">
                  **Paso 1 (Crucial):** Haz clic en el botón de arriba para ir a la página de detalles de la VM en la Consola de Google Cloud.<br/>
                  Allí, busca y haz clic en **"Configurar contraseña de Windows"** para obtener o generar el usuario y la clave de acceso RDP. **Necesitarás esta información.**
                </p>
                {vm.externalIp && ( // Mostrar la opción de descarga solo si hay IP externa
                  <div className="mt-4">
                    <p className="font-medium text-gray-700">Descargar archivo .RDP:</p>
                    <button
                      onClick={handleDownloadRDP}
                      className="mt-1 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      disabled={!vm.externalIp} // Deshabilitar si no hay IP externa
                      title={vm.externalIp ? "Descargar archivo .RDP para la conexión" : "VM sin IP externa para descarga RDP directa"}
                    >
                      <DownloadIcon className="h-5 w-5 mr-2" /> Descargar .RDP
                    </button>
                    <p className="mt-1 text-xs text-gray-500">
                      **Paso 2:** Abre este archivo con tu cliente de Escritorio Remoto y usa las credenciales obtenidas en el Paso 1.
                    </p>
                  </div>
                )}
                {!vm.externalIp && <p className="mt-1 text-xs text-orange-500">VM sin IP externa. La descarga de .RDP no es posible directamente.</p>}
              </div>
            )}

            {isUnknownOS && ( // Si el SO es desconocido
              <div>
                <p className="font-medium text-gray-700">Opciones de Conexión (SO Desconocido):</p>
                 <div className="mt-1 flex items-center bg-gray-100 p-2 rounded-md">
                  <a 
                    href={gcpInstancesBaseUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-gcp-blue hover:underline flex-grow truncate"
                    title="Ir a detalles de la VM en Cloud Console"
                  >
                    Abrir en Consola de Google Cloud
                  </a>
                  <button
                    onClick={() => onCopyToClipboard(gcpInstancesBaseUrl, 'Enlace Consola VM')}
                    title="Copiar Enlace Consola VM"
                    className="ml-2 p-1 text-gray-500 hover:text-gcp-blue rounded hover:bg-gray-200"
                  >
                    <ClipboardCopyIcon className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1 text-xs text-orange-600 font-semibold">No se pudo determinar el tipo de sistema operativo. Considera revisar la configuración de la VM o usar la Consola de GCP para la conexión.</p>
              </div>
            )}
          </div>

          {/* Columna para opciones de comandos (SSH Cliente, gcloud, RDP Cliente) */}
          <div className="space-y-4">
            <h4 className="font-bold text-gray-800 border-b pb-2 mb-2">Comandos para Terminal / Cliente</h4>
            
            {isLinuxVM && ( // Opciones para Linux
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-gray-700">Via SSH (Cliente externo, IP Externa):</p>
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
                  {!vm.externalIp && <p className="mt-1 text-xs text-orange-500">VM sin IP externa.</p>}
                </div>

                <div>
                  <p className="font-medium text-gray-700">Via Google Cloud Shell (gcloud CLI):</p>
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
                   <p className="mt-1 text-xs text-gray-500">Útil si tienes la CLI de GCP configurada localmente.</p>
                </div>
              </div>
            )}

            {isWindowsVM && ( // Opciones para Windows
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-gray-700">Via Cliente RDP (<code>mstsc</code>, IP Externa):</p>
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
                  <p className="mt-1 text-xs text-gray-500">
                    Usa este comando en tu cliente de Escritorio Remoto (<code>mstsc</code> en Windows). 
                    **Necesitarás el usuario y la contraseña generados en la Consola de Google Cloud.**
                  </p>
                  {!vm.externalIp && <p className="mt-1 text-xs text-orange-500">VM sin IP externa. RDP por IP externa no es posible directamente.</p>}
                </div>
              </div>
            )}

            {isUnknownOS && ( // Opciones genéricas si el SO es desconocido
              <div className="space-y-3">
                 <p className="font-medium text-gray-700">Opciones de Comando (SO Desconocido):</p>
                  <div>
                    <p className="font-medium text-gray-700">Intento SSH (IP Externa):</p>
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
                    {!vm.externalIp && <p className="mt-1 text-xs text-orange-500">VM sin IP externa.</p>}
                  </div>
                   <div>
                    <p className="font-medium text-gray-700">Intento RDP (IP Externa):</p>
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
                    {!vm.externalIp && <p className="mt-1 text-xs text-orange-500">VM sin IP externa.</p>}
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
