// src/components/ConnectModal.tsx
import React from 'react';
import { VirtualMachine } from '../types';
import { ClipboardCopyIcon, XIcon, DownloadIcon } from './icons'; 

interface ConnectModalProps {
  vm: VirtualMachine;
  onClose: () => void;
  onCopyToClipboard: (text: string, type: string) => void;
  projectId: string; 
}

export const ConnectModal: React.FC<ConnectModalProps> = ({ vm, onClose, onCopyToClipboard, projectId }) => {
  // Comandos SSH/gcloud (se mantienen solo para el caso Linux/Unknown si se siguen mostrando)
  const sshCommand = vm.externalIp ? `ssh your_user@${vm.externalIp}` : 'N/A (No External IP)';
  const gcloudCommand = `gcloud compute ssh ${vm.name} --zone=${vm.zone} --project=${projectId}`;
  
  // Detección de VM Windows (asumimos que el backend ya lo envía correctamente)
  const isWindowsVM = vm.osType === 'Windows'; 
  const isLinuxVM = vm.osType === 'Linux';
  const isUnknownOS = vm.osType === 'Unknown' || !vm.osType;

  // Función: Generar y descargar archivo .rdp
  const handleDownloadRDP = () => {
    if (!vm.externalIp) {
      alert('La VM no tiene una IP externa para la conexión RDP. No se puede descargar el archivo .RDP.');
      return;
    }

    const rdpContent = `
full address:s:${vm.externalIp}
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
`;

    const blob = new Blob([rdpContent], { type: 'application/x-rdp' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${vm.name}.rdp`; 
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    onCopyToClipboard(`Archivo RDP para ${vm.name} descargado`, 'Descarga RDP'); 
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

        {/* Ajustamos la cuadrícula para ser solo 1 columna si es Windows */}
        <div className={`grid ${isWindowsVM ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-6 text-sm`}>
          {/* Columna principal de conexión */}
          <div className="space-y-4">
            {/* CAMBIO 1: Título "Instrucciones" */}
            <h4 className="font-bold text-gray-800 border-b pb-2 mb-2">Instrucciones</h4>
            
            {isLinuxVM && ( // Opciones para Linux
              <div>
                <p className="font-medium text-gray-700">Abrir SSH en el Navegador</p> {/* CAMBIO 2 */}
                <div className="mt-1 flex items-center bg-gray-100 p-2 rounded-md">
                  <a 
                    href={`https://ssh.cloud.google.com/v2/ssh/projects/${projectId}/zones/${vm.zone}/instances/${vm.name}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-gcp-blue hover:underline flex-grow truncate"
                    title="Abrir SSH en Cloud Console"
                  >
                    Abrir SSH en la Consola de Google Cloud
                  </a>
                  <button
                    onClick={() => onCopyToClipboard(`https://ssh.cloud.google.com/v2/ssh/projects/${projectId}/zones/${vm.zone}/instances/${vm.name}`, 'Enlace SSH en Navegador')}
                    title="Copiar Enlace SSH en Navegador"
                    className="ml-2 p-1 text-gray-500 hover:text-gcp-blue rounded hover:bg-gray-200"
                  >
                    <ClipboardCopyIcon className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">Forma rápida y recomendada para VMs Linux</p> {/* CAMBIO 2 */}
              </div>
            )}

            {isWindowsVM && ( // Opciones para Windows - Solo descarga RDP y explicaciones
              <div>
                <p className="font-medium text-gray-700">Descargar archivo de Conexión RDP</p> {/* CAMBIO 2 */}
                <button
                  onClick={handleDownloadRDP}
                  className="mt-1 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={!vm.externalIp} 
                  title={vm.externalIp ? "Descargar archivo .RDP para la conexión" : "VM sin IP externa para descarga RDP directa"}
                >
                  <DownloadIcon className="h-5 w-5 mr-2" /> Descargar .RDP
                </button>
                {/* INSTRUCCIONES PERSONALIZADAS ACTUALIZADAS */}
                <p className="mt-2 text-xs text-blue-800 font-semibold bg-blue-50 p-2 rounded-md border border-blue-200">
                  Paso 1: Descargar el archivo .RDP
                </p>
                <p className="mt-2 text-xs text-blue-800 font-semibold bg-blue-50 p-2 rounded-md border border-blue-200">
                  Paso 2: Ejecutar el archivo .RDP y la primera vez le pedirá el usuario y la contraseña, recuerda darle a recordar credenciales al entrar
                </p>
                <p className="mt-2 text-xs text-blue-800 font-semibold bg-blue-50 p-2 rounded-md border border-blue-200">
                  Importante: El nombre de usuario y la contraseña para acceder a esta máquina RDP serán facilitados por el Área de IT de tu organización
                </p>
                <p className="mt-2 text-xs text-orange-800 font-semibold bg-orange-50 p-2 rounded-md border border-orange-200">
                  Recordatorio: Por favor, asegúrate de Apagar la máquina virtual cuando hayas terminado de usarla para evitar costes innecesarios
                </p>
                {!vm.externalIp && <p className="mt-1 text-xs text-orange-500">VM sin IP externa. La descarga de .RDP no es posible directamente</p>} {/* CAMBIO 2 */}
              </div>
            )}

            {isUnknownOS && ( // Si el SO es desconocido
              <div>
                <p className="font-medium text-gray-700">Opciones de Conexión (SO Desconocido)</p> {/* CAMBIO 2 */}
                 <div className="mt-1 flex items-center bg-gray-100 p-2 rounded-md">
                  <a 
                    href={`https://console.cloud.google.com/compute/instancesDetail/zones/${vm.zone}/instances/${projectId}`} // Asegúrate que esto apunta a la VM correcta
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-gcp-blue hover:underline flex-grow truncate"
                    title="Ir a detalles de la VM en Cloud Console"
                  >
                    Abrir en Consola de Google Cloud
                  </a>
                  <button
                    onClick={() => onCopyToClipboard(`https://console.cloud.google.com/compute/instancesDetail/zones/${vm.zone}/instances/${projectId}`, 'Enlace Consola VM')}
                    title="Copiar Enlace Consola VM"
                    className="ml-2 p-1 text-gray-500 hover:text-gcp-blue rounded hover:bg-gray-200"
                  >
                    <ClipboardCopyIcon className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1 text-xs text-orange-600 font-semibold">No se pudo determinar el tipo de sistema operativo. Considera revisar la configuración de la VM o usar la Consola de GCP para la conexión</p> {/* CAMBIO 2 */}
              </div>
            )}
          </div>

          {/* Columna "Comandos para Terminal / Cliente" */}
          {(!isWindowsVM || isLinuxVM || isUnknownOS) && ( // Solo muestra esta columna si NO es Windows O si es Linux/Unknown
            <div className="space-y-4">
              <h4 className="font-bold text-gray-800 border-b pb-2 mb-2">Comandos para Terminal / Cliente</h4>
              
              {isLinuxVM && ( // Opciones para Linux
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-gray-700">Via SSH (Cliente externo, IP Externa)</p> {/* CAMBIO 2 */}
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
                    <p className="mt-1 text-xs text-gray-500">Reemplaza <code>your_user</code> con tu usuario en la VM</p> {/* CAMBIO 2 */}
                    {!vm.externalIp && <p className="mt-1 text-xs text-orange-500">VM sin IP externa</p>} {/* CAMBIO 2 */}
                  </div>

                  <div>
                    <p className="font-medium text-gray-700">Via Google Cloud Shell (gcloud CLI)</p> {/* CAMBIO 2 */}
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
                    <p className="mt-1 text-xs text-gray-500">Útil si tienes la CLI de GCP configurada localmente</p> {/* CAMBIO 2 */}
                  </div>
                </div>
              )}

              {isUnknownOS && ( // Opciones genéricas si el SO es desconocido
                <div className="space-y-3">
                  <p className="font-medium text-gray-700">Opciones de Comando (SO Desconocido)</p> {/* CAMBIO 2 */}
                    <div>
                      <p className="font-medium text-gray-700">Intento SSH (IP Externa)</p> {/* CAMBIO 2 */}
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
                      {!vm.externalIp && <p className="mt-1 text-xs text-orange-500">VM sin IP externa</p>} {/* CAMBIO 2 */}
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Intento RDP (IP Externa)</p> {/* CAMBIO 2 */}
                      <div className="mt-1 flex items-center bg-gray-100 p-2 rounded-md text-xs">
                        <code className="text-gray-700 flex-grow select-all break-all">{vm.externalIp ? `mstsc /v:${vm.externalIp}` : 'N/A (No External IP)'}</code>
                        <button
                          onClick={() => onCopyToClipboard(vm.externalIp ? `mstsc /v:${vm.externalIp}` : '', 'Comando RDP')}
                          title="Copiar Comando RDP"
                          className="ml-2 p-1 text-gray-500 hover:text-gcp-blue rounded hover:bg-gray-200"
                        >
                          <ClipboardCopyIcon className="h-4 w-4" />
                        </button>
                      </div>
                      {!vm.externalIp && <p className="mt-1 text-xs text-orange-500">VM sin IP externa</p>} {/* CAMBIO 2 */}
                    </div>
                </div>
              )}
            </div>
          )} {/* Cierre del condicional para la columna de comandos */}
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
