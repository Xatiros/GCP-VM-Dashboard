// backend/server.cjs
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');

const computePackage = require('@google-cloud/compute');

// Cargar las variables de entorno desde .env lo primero
dotenv.config();

// --- DEBUG server.cjs: LOGGING TEMPRANO DE VARIABLES (¡TEMPORAL PARA DEPURACIÓN!) ---
// Esto se ejecuta tan pronto como el script Node.js empiece,
// capturando las variables después de que dotenv las haya cargado.
console.log("--- DEBUG server.cjs: Early Environment Variables (after dotenv) ---");
console.log(`GCP_PROJECT_ID (in server.cjs): '${process.env.GCP_PROJECT_ID}'`);
console.log(`GOOGLE_CLIENT_ID (in server.cjs): '${process.env.GOOGLE_CLIENT_ID}'`);
console.log(`JWT_SECRET (in server.cjs): '${process.env.JWT_SECRET ? 'DEFINED (length: ' + process.env.JWT_SECRET.length + ')' : 'UNDEFINED'}'`);
console.log("--- END DEBUG server.cjs ---");
// --- FIN DEBUG TEMPORAL ---

const app = express();
const port = process.env.PORT || 8080; 

// --- CONFIGURACIÓN DE AUTENTICACIÓN ---
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID; 
const JWT_SECRET = process.env.JWT_SECRET; 
const ALLOWED_DOMAIN = 'gemigeo.com';

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// --- VALIDACIÓN CRÍTICA DE VARIABLES DE ENTORNO ---
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID; 

if (!GCP_PROJECT_ID) {
    console.error("Error fatal: La variable de entorno GCP_PROJECT_ID no está definida. La aplicación no puede iniciarse.");
    process.exit(1); 
}
if (!GOOGLE_CLIENT_ID) {
    console.error("Error fatal: GOOGLE_CLIENT_ID no está definido. La aplicación no puede iniciarse.");
    process.exit(1);
}
if (!JWT_SECRET || JWT_SECRET.length < 32) { 
    console.error("Error fatal: JWT_SECRET no está definido o es demasiado corto (se recomienda al menos 32 caracteres). La aplicación no puede iniciarse de forma segura.");
    process.exit(1);
}
// --- FIN VALIDACIÓN ---

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({ message: 'Acceso denegado. No se proporcionó token de autenticación.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error("Error al verificar el token JWT de sesión:", err);
      // Si el token expira, es una razón común para reautenticar
      if (err.name === 'TokenExpiredError') {
        return res.status(403).json({ message: 'Token de autenticación expirado. Por favor, inicia sesión de nuevo.' });
      }
      return res.status(403).json({ message: 'Token de autenticación inválido.' });
    }
    req.user = user;
    // Actualizar última actividad del usuario si ya está logueado
    if (userSessions.has(user.id)) {
        userSessions.get(user.id).lastActivity = new Date();
    }
    next();
  });
};

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://gcp-vm-dashboard-frontend-service-780691668337.europe-southwest1.run.app'
  ]
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('OK');
});

let instancesClient;
let zonesClient;
let globalOperationsClient;
let imagesClient; 
let disksClient; 

// --- ALMACÉN EN MEMORIA PARA SESIONES DE USUARIO ---
// Clave: user.id (payload.sub de Google)
// Valor: { email: string, name: string, loginTime: Date, lastActivity: Date }
const userSessions = new Map();

// Opcional: Limpiar sesiones inactivas periódicamente (para evitar que el mapa crezca indefinidamente en memoria)
setInterval(() => {
    const now = new Date();
    const INACTIVITY_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 horas de inactividad
    userSessions.forEach((session, userId) => {
        if (now.getTime() - session.lastActivity.getTime() > INACTIVITY_THRESHOLD_MS) {
            console.log(`[Sessions] Eliminando sesión inactiva para: ${session.email}`);
            userSessions.delete(userId);
        }
    });
}, 30 * 60 * 1000); // Ejecutar cada 30 minutos


// Inicialización de clientes de Compute Engine
try {
  if (computePackage.v1 && computePackage.v1.InstancesClient && typeof computePackage.v1.InstancesClient === 'function') {
    instancesClient = new computePackage.v1.InstancesClient({ projectId: GCP_PROJECT_ID });
    console.log("Cliente de Instancias inicializado.");
  } else {
    throw new Error("No se encontró el constructor InstancesClient en computePackage.v1.");
  }
} catch (e) {
  console.error("Error fatal al inicializar Cliente de Instancias:", e.message);
}

try {
  if (computePackage.v1 && computePackage.v1.ZonesClient && typeof computePackage.v1.ZonesClient === 'function') {
    zonesClient = new computePackage.v1.ZonesClient({ projectId: GCP_PROJECT_ID });
    console.log("Cliente de Zonas inicializado.");
  } else {
    throw new Error("No se encontró el constructor ZonesClient en computePackage.v1.");
  }
} catch (e) {
  console.error("Error fatal al inicializar Cliente de Zonas:", e.message);
}

try {
  if (computePackage.v1 && computePackage.v1.GlobalOperationsClient && typeof computePackage.v1.GlobalOperationsClient === 'function') {
    globalOperationsClient = new computePackage.v1.GlobalOperationsClient({ projectId: GCP_PROJECT_ID });
    console.log("Cliente de Operaciones Globales inicializado.");
  } else {
    throw new Error("No se encontró el constructor GlobalOperationsClient en computePackage.v1.");
  }
} catch (e) {
  console.error("Error fatal al inicializar Cliente de Operaciones Globales:", e.message);
}

try {
  if (computePackage.v1 && computePackage.v1.ImagesClient && typeof computePackage.v1.ImagesClient === 'function') {
    imagesClient = new computePackage.v1.ImagesClient({ projectId: GCP_PROJECT_ID });
    console.log("Cliente de Imágenes inicializado.");
  } else {
    throw new Error("No se encontró el constructor ImagesClient en computePackage.v1.");
  }
} catch (e) {
  console.error("Error fatal al inicializar Cliente de Imágenes:", e.message);
}

try {
  if (computePackage.v1 && computePackage.v1.DisksClient && typeof computePackage.v1.DisksClient === 'function') {
    disksClient = new computePackage.v1.DisksClient({ projectId: GCP_PROJECT_ID });
    console.log("Cliente de Discos inicializado.");
  } else {
    throw new Error("No se encontró el constructor DisksClient en computePackage.v1.");
  }
} catch (e) {
  console.error("Error fatal al inicializar Cliente de Discos:", e.message);
}


console.log("\n--- Estado de los clientes de Compute después de la inicialización ---");
console.log("instancesClient:", instancesClient ? 'Inicializado' : 'ERROR - No inicializado');
console.log("zonesClient:", zonesClient ? 'Inicializado' : 'ERROR - No inicializado');
console.log("globalOperationsClient:", globalOperationsClient ? 'Inicializado' : 'ERROR - No inicializado');
console.log("imagesClient:", imagesClient ? 'Inicializado' : 'ERROR - No inicializado');
console.log("disksClient:", disksClient ? 'Inicializado' : 'ERROR - No inicializado'); 
console.log("----------------------------------------------------------\n");


/**
 * Intenta determinar el tipo de sistema operativo de una VM.
 * Prioriza guestOsFeatures y licenses, luego detalles del disco, y finalmente el nombre de la VM.
 * @param {object} vm - Objeto VM de la API de GCP.
 * @returns {Promise<string>} 'Windows', 'Linux', o 'Unknown'.
 */
async function getVmOsType(vm) {
  // Asegurarse de que los clientes necesarios están inicializados
  if (!imagesClient || typeof imagesClient.get !== 'function' || !disksClient || typeof disksClient.get !== 'function') {
    console.warn("[getVmOsType] Advertencia: Clientes de imágenes o discos no están completamente inicializados. No se puede determinar el tipo de SO. Devolviendo 'Unknown'.");
    return 'Unknown';
  }
  // console.log(`[getVmOsType] DEBUG: Clientes ImagesClient(${!!imagesClient}) y DisksClient(${!!disksClient}) inicializados.`);


  // Si la VM no tiene un disco de arranque, no podemos determinar el SO a partir de él.
  if (!vm.disks || vm.disks.length === 0 || !vm.disks[0].boot) {
    console.log(`[getVmOsType] VM: ${vm.name}, No tiene disco de arranque. Devolviendo 'Unknown'.`);
    return 'Unknown'; 
  }

  const bootDisk = vm.disks[0];
  console.log(`[DEBUG DISKS] VM: ${vm.name}, bootDisk content: ${JSON.stringify(bootDisk, null, 2)}`); // Log para depuración


  // --- ESTRATEGIA 1: Detección por guestOsFeatures y licenses del bootDisk (Más directa y rápida) ---
  if (bootDisk.guestOsFeatures && Array.isArray(bootDisk.guestOsFeatures)) {
      const guestFeatures = bootDisk.guestOsFeatures.map(f => f.type).filter(Boolean).map(t => t.toLowerCase());
      if (guestFeatures.includes('windows')) {
          console.log(`[getVmOsType] VM: ${vm.name}, SO detectado: Windows (desde guestOsFeatures)`);
          return 'Windows'; 
      }
  }

  if (bootDisk.licenses && Array.isArray(bootDisk.licenses)) {
      const licenseLink = bootDisk.licenses[0]; 
      const licenseLower = licenseLink.toLowerCase();
      if (licenseLower.includes('windows')) {
          console.log(`[getVmOsType] VM: ${vm.name}, SO detectado: Windows (desde licenses)`);
          return 'Windows'; 
      }
      if (licenseLower.includes('debian') || licenseLower.includes('ubuntu') || licenseLower.includes('rhel') || licenseLower.includes('centos') || licenseLower.includes('sles') || licenseLower.includes('fedora') || licenseLower.includes('linux')) {
          console.log(`[getVmOsType] VM: ${vm.name}, SO detectado: Linux (desde licenses)`);
          return 'Linux'; 
      }
  }
  // --- FIN ESTRATEGIA 1 ---

  // --- ESTRATEGIA 2: Obtener detalles completos del DISCO persistente (Si Estrategia 1 falló) ---
  const diskSourceLink = bootDisk.source; 
  if (diskSourceLink) {
      try {
          const diskUrlParts = diskSourceLink.split('/');
          const diskName = diskUrlParts[diskUrlParts.length - 1];
          const diskZone = diskUrlParts[diskUrlParts.length - 3]; 
          const diskProject = diskUrlParts[diskUrlParts.indexOf('projects') + 1];

          console.log(`[getVmOsType] VM: ${vm.name}, Intentando obtener detalles del disco: project='${diskProject}', zone='${diskZone}', disk='${diskName}'`);
          const [detailedDisk] = await disksClient.get({
              project: diskProject,
              zone: diskZone,
              disk: diskName
          });

          console.log(`[getVmOsType] VM: ${vm.name}, Disco detallado obtenido: ${detailedDisk.name}`);

          if (detailedDisk.licenses && Array.isArray(detailedDisk.licenses)) {
              const diskLicenseLink = detailedDisk.licenses[0];
              const diskLicenseLower = diskLicenseLink.toLowerCase();
              if (diskLicenseLower.includes('windows')) {
                  console.log(`[getVmOsType] VM: ${vm.name}, SO detectado: Windows (desde licenses de disco detallado)`);
                  return 'Windows'; 
              }
              if (diskLicenseLower.includes('debian') || diskLicenseLower.includes('ubuntu') || diskLicenseLower.includes('rhel') || diskLicenseLower.includes('centos') || diskLicenseLower.includes('sles') || diskLicenseLower.includes('fedora') || diskLicenseLower.includes('linux')) {
                  console.log(`[getVmOsType] VM: ${vm.name}, SO detectado: Linux (desde licenses de disco detallado)`);
                  return 'Linux'; 
              }
          }
          
          const detailedSourceImageLink = detailedDisk.sourceImage;
          if (detailedSourceImageLink) {
              const urlParts = detailedSourceImageLink.split('/');
              let imageProject = GCP_PROJECT_ID; 

              const projectsKeywordIndex = urlParts.indexOf('projects');
              if (projectsKeywordIndex !== -1 && projectsKeywordIndex + 1 < urlParts.length) {
                  imageProject = urlParts[projectsKeywordIndex + 1];
              }

              const imagesKeywordIndex = urlParts.indexOf('images');
              let imageNameOrFamily = '';

              if (imagesKeywordIndex !== -1 && imagesKeywordIndex + 1 < urlParts.length) {
                  imageNameOrFamily = urlParts[imagesKeywordIndex + 1];
                  if (imageNameOrFamily === 'family' && imagesKeywordIndex + 2 < urlParts.length) {
                      imageNameOrFamily = urlParts[imagesKeywordIndex + 2]; 
                  }
              }
              
              if (imageNameOrFamily) {
                  console.log(`[getVmOsType] VM: ${vm.name}, Intentando imagesClient.get con (desde disco detallado) project: '${imageProject}', image: '${imageNameOrFamily}'`);
                  const [image] = await imagesClient.get({
                      project: imageProject, 
                      image: imageNameOrFamily, 
                  });

                  const imageDescription = image.description ? image.description.toLowerCase() : '';
                  const imageFamily = image.family ? image.family.toLowerCase() : '';
                  const imageName = image.name ? image.name.toLowerCase() : '';
                  
                  if (imageDescription.includes('windows') || imageFamily.includes('windows') || imageName.includes('windows')) {
                    console.log(`[getVmOsType] VM: ${vm.name}, SO detectado: Windows (desde imagen detallada: ${imageNameOrFamily})`);
                    return 'Windows'; 
                  } else if (imageDescription.includes('linux') || imageFamily.includes('linux') || imageName.includes('linux') ||
                             imageDescription.includes('debian') || imageFamily.includes('debian') || imageName.includes('debian') ||
                             imageDescription.includes('ubuntu') || imageFamily.includes('ubuntu') || imageName.includes('ubuntu') ||
                             imageDescription.includes('centos') || imageFamily.includes('centos') || imageName.includes('centos') ||
                             imageDescription.includes('rhel') || imageFamily.includes('rhel') || imageName.includes('rhel') ||
                             imageDescription.includes('sles') || imageFamily.includes('sles') || imageName.includes('sles') ||
                             imageDescription.includes('coreos') || imageFamily.includes('coreos') || imageName.includes('coreos') ||
                             imageDescription.includes('fedora') || imageFamily.includes('fedora') || imageName.includes('fedora')) {
                    console.log(`[getVmOsType] VM: ${vm.name}, SO detectado: Linux (desde imagen detallada: ${imageNameOrFamily})`);
                    return 'Linux'; 
                  }
              }
          }
      } catch (diskError) {
          console.warn(`[getVmOsType] Error al obtener detalles del disco ${diskSourceLink} para VM ${vm.name}: ${diskError.message}`);
      }
  }
  // --- FIN ESTRATEGIA 2 ---

  // --- ESTRATEGIA 3: Inferir del nombre de la VM como último recurso ---
  const vmNameLower = vm.name.toLowerCase();
  if (vmNameLower.includes('windows') || vmNameLower.includes('win-')) {
    console.log(`[getVmOsType] VM: ${vm.name}, SO detectado: Windows (desde nombre de VM)`);
    return 'Windows'; 
  } else if (vmNameLower.includes('linux') || vmNameLower.includes('debian') || vmNameLower.includes('ubuntu') || vmNameLower.includes('centos') || vmNameLower.includes('rhel') || vmNameLower.includes('server')) {
    console.log(`[getVmOsType] VM: ${vm.name}, SO detectado: Linux (desde nombre de VM)`);
    return 'Linux'; 
  }

  // Si ninguna estrategia detecta el SO
  console.log(`[getVmOsType] VM: ${vm.name}, No se pudo determinar el SO. Devolviendo 'Unknown'.`);
  return 'Unknown';
}


app.post('/api/auth/google', async (req, res) => {
  const { id_token } = req.body;

  if (!id_token) {
    return res.status(400).json({ message: 'Falta el ID Token.' });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email || !payload.hd) {
      console.warn("Payload incompleto o sin email/dominio en token de Google:", payload);
      return res.status(401).json({ message: 'Token de Google inválido o incompleto.' });
    }

    if (payload.hd !== ALLOWED_DOMAIN) {
      console.warn(`Intento de inicio de sesión de dominio no permitido: ${payload.email}`);
      return res.status(403).json({ message: `Acceso denegado. Solo se permiten cuentas de ${ALLOWED_DOMAIN}.` });
    }

    const user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      domain: payload.hd,
    };
    const appToken = jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });

    console.log(`Usuario autenticado y autorizado: ${user.email}`);
    // --- REGISTRAR SESIÓN DE USUARIO ---
    userSessions.set(user.id, {
        email: user.email,
        name: user.name,
        loginTime: new Date(),
        lastActivity: new Date(),
    });
    console.log(`[Sessions] Usuario '${user.email}' inició sesión. Sesiones activas: ${userSessions.size}`);
    // --- FIN REGISTRO ---
    res.json({ token: appToken, user: { email: user.email, name: user.name } });

  } catch (error) {
    console.error("Error al verificar el ID Token de Google:", error.message);
    res.status(401).json({ message: 'Fallo en la autenticación con Google.', error: error.message });
  }
});

app.get('/api/vms/:projectId', authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  console.log(`[BACKEND] Recibida solicitud GET para VMs en el proyecto: ${projectId} (por ${req.user.email})`);
  try {
    let vms = [];

    if (!zonesClient || typeof zonesClient.list !== 'function') {
      throw new Error("Cliente de Zonas no inicializado o no tiene el método 'list'.");
    }
    console.log(`[BACKEND] Intentando listar zonas para el proyecto: ${projectId}`);
    const [zonesResponse] = await zonesClient.list({ project: projectId });

    const europeanZones = zonesResponse.filter(zone => zone.name.startsWith('europe-'));
    const zones = europeanZones.map(zone => zone.name);

    console.log(`[BACKEND] Zonas EUROPEAS encontradas para el proyecto ${projectId}: ${zones.join(', ')}`);

    if (!instancesClient || typeof instancesClient.list !== 'function') {
      throw new Error("Cliente de Instancias no inicializado o no tiene el método 'list'.");
    }
    for (const zoneName of zones) {
      console.log(`[BACKEND] Listando VMs en la zona: ${zoneName}`);
      const [zoneVms] = await instancesClient.list({ project: projectId, zone: zoneName });
      if (zoneVms && zoneVms.length > 0) {
        vms.push(...zoneVms);
      }
    }

    console.log(`[BACKEND] Se encontraron ${vms.length} VMs en las zonas europeas de GCP.`);

    const mappedVms = await Promise.all(vms.map(async (vm) => { 
    const osType = await getVmOsType(vm); 
    
    // Extraer vCPUs y Memoria
    let vCpus = undefined;
    let memoryGb = undefined;

    const machineTypeName = vm.machineType ? vm.machineType.split('/').pop() : '';
    // Intentar extraer vCPUs del nombre de la máquina (ej. e2-standard-4 -> 4)
    const match = machineTypeName.match(/(\d+)$/); // Busca números al final
    if (match && match[1]) {
        vCpus = parseInt(match[1], 10);
    }
    
    // Obtener memoria de guestMemoryMb (si existe) y convertir a GB
    if (vm.guestMemoryMb) {
        memoryGb = parseFloat((vm.guestMemoryMb / 1024).toFixed(2)); // Convertir MB a GB, con 2 decimales
    } else {
        // Fallback: Inferir de nombres comunes si guestMemoryMb no está disponible
        if (machineTypeName.includes('e2-standard')) {
            if (vCpus === 2) memoryGb = 8;
            else if (vCpus === 4) memoryGb = 16;
            else if (vCpus === 8) memoryGb = 32;
            else if (vCpus === 16) memoryGb = 64;
        } else if (machineTypeName.includes('n1-standard')) {
             if (vCpus === 1) memoryGb = 3.75;
             else if (vCpus === 2) memoryGb = 7.5;
             else if (vCpus === 4) memoryGb = 15;
        }
        // Puedes añadir más inferencias para otros tipos de máquina si lo necesitas
        if (memoryGb) memoryGb = parseFloat(memoryGb.toFixed(2)); // Asegurar 2 decimales para inferencias
    }


    return {
        id: vm.id,
        name: vm.name,
        status: vm.status === 'CORRER' ? 'RUNNING' : (vm.status === 'PARADA' ? 'STOPPED' : vm.status),
        zone: vm.zone.split('/').pop(),
        region: vm.zone.split('/')[4].split('-').slice(0, 2).join('-'),
        externalIp: vm.networkInterfaces && vm.networkInterfaces[0]?.accessConfigs?.[0]?.natIP || undefined,
        internalIp: vm.networkInterfaces && vm.networkInterfaces[0]?.networkIP || undefined,
        machineType: vm.machineType.split('/').pop(),
        creationTimestamp: vm.creationTimestamp,
        osType: osType,
        diskSizeGb: vm.disks && vm.disks.length > 0 ? vm.disks[0].diskSizeGb : undefined,
        vCpus: vCpus, // <-- INCLUIR vCPUs
        memoryGb: memoryGb // <-- INCLUIR memoryGb
    };
}));

    console.log("[BACKEND] VMs mapeadas, enviando respuesta al frontend...");
    res.json(mappedVms);
  } catch (error) {
    console.error('[BACKEND] Error en la ruta /api/vms:', error.message);
    res.status(500).json({ message: 'Failed to fetch VMs from Google Cloud.', error: error.message, stack: error.stack });
  }
});

app.post('/api/vms/start/:vmId', authenticateToken, async (req, res) => {
  const { vmId } = req.params;
  const { zone, projectId } = req.body;
  console.log(`[BACKEND] Recibida solicitud POST para iniciar VM: ${vmId} en zona: ${zone}, proyecto: ${projectId} (por ${req.user.email})`);
  try {
    if (!instancesClient || typeof instancesClient.start !== 'function') {
      throw new Error("Cliente de Instances no inicializado o no tiene el método 'start'.");
    }

    const [, operation] = await instancesClient.start({
      project: projectId,
      zone: zone,
      instance: vmId,
    });

    if (!globalOperationsClient || typeof globalOperationsClient.wait !== 'function') {
      console.warn(`[BACKEND] GlobalOperationsClient no inicializado o no tiene el método 'wait()' para VM ${vmId}. El estado puede tardar en actualizarse.`);
    } else {
        try {
            const zoneNameForWait = zone; 
            await globalOperationsClient.wait({
                project: projectId,
                zone: zoneNameForWait,
                operation: operation.name,
            });
            console.log(`[BACKEND] Operación de inicio para VM ${vmId} completada usando GlobalOperationsClient.wait().`);
        } catch (waitError) {
            console.error(`[BACKEND] Error al esperar la operación de VM ${vmId}:`, waitError.message);
        }
    }

    const [updatedVm] = await instancesClient.get({
      project: projectId,
      zone: zone,
      instance: vmId,
    });

    const actualStatusFromGCP = updatedVm.status;
    let statusToReturn = actualStatusFromGCP;

    if (actualStatusFromGCP === 'STAGING' || actualStatusFromGCP === 'PROVISIONING' || actualStatusFromGCP === 'RUNNING' || actualStatusFromGCP === 'STOPPED' || actualStatusFromGCP === 'PARADA') {
        statusToReturn = 'RUNNING';
    } else if (actualStatusFromGCP === 'CORRER') {
        statusToReturn = 'RUNNING';
    }

    const osType = await getVmOsType(updatedVm); 
    console.log(`[BACKEND] VM ${vmId} iniciada. Estado actualizado (antes de mapear): ${actualStatusFromGCP}. Estado final devuelto: ${statusToReturn}. SO: ${osType}`);

    // Extraer vCPUs y Memoria para la VM actualizada también
    let vCpus = undefined;
    let memoryGb = undefined;

    const machineTypeName = updatedVm.machineType ? updatedVm.machineType.split('/').pop() : '';
    const match = machineTypeName.match(/(\d+)$/);
    if (match && match[1]) {
        vCpus = parseInt(match[1], 10);
    }
    
    if (updatedVm.guestMemoryMb) {
        memoryGb = parseFloat((updatedVm.guestMemoryMb / 1024).toFixed(2));
    } else {
        if (machineTypeName.includes('e2-standard')) {
            if (vCpus === 2) memoryGb = 8;
            else if (vCpus === 4) memoryGb = 16;
            else if (vCpus === 8) memoryGb = 32;
            else if (vCpus === 16) memoryGb = 64;
        } else if (machineTypeName.includes('n1-standard')) {
             if (vCpus === 1) memoryGb = 3.75;
             else if (vCpus === 2) memoryGb = 7.5;
             else if (vCpus === 4) memoryGb = 15;
        }
        if (memoryGb) memoryGb = parseFloat(memoryGb.toFixed(2));
    }

    const mappedVm = {
      id: updatedVm.id,
      name: updatedVm.name,
      status: statusToReturn,
      zone: updatedVm.zone ? updatedVm.zone.split('/').pop() : 'N/A',
      region: updatedVm.zone ? updatedVm.zone.split('/')[4].split('-').slice(0, 2).join('-') : 'N/A',
      externalIp: updatedVm.networkInterfaces && updatedVm.networkInterfaces[0]?.accessConfigs?.[0]?.natIP || undefined,
      internalIp: updatedVm.networkInterfaces && updatedVm.networkInterfaces[0]?.networkIP || undefined,
      machineType: updatedVm.machineType ? updatedVm.machineType.split('/').pop() : 'N/A',
      creationTimestamp: updatedVm.creationTimestamp,
      osType: osType,
      diskSizeGb: updatedVm.disks && updatedVm.disks.length > 0 ? updatedVm.disks[0].diskSizeGb : undefined,
      vCpus: vCpus, // <-- INCLUIR vCPUs
      memoryGb: memoryGb // <-- INCLUIR memoryGb
    };
    res.json(mappedVm);
  } catch (error) {
    // --- NUEVOS LOGS DETALLADOS DE ERRORES DE START_VM ---
    console.error(`[BACKEND][START_VM_ERROR] Error al iniciar VM ${vmId}:`);
    console.error(`[BACKEND][START_VM_ERROR] Mensaje de error general: ${error.message}`);
    if (error.code) console.error(`[BACKEND][START_VM_ERROR] Código de error GCP: ${error.code}`);
    if (error.errors && error.errors.length > 0) {
        console.error(`[BACKEND][START_VM_ERROR] Errores detallados de GCP: ${JSON.stringify(error.errors, null, 2)}`);
    } else if (error.details) { // A veces, los errores se anidan en 'details'
        console.error(`[BACKEND][START_VM_ERROR] Detalles adicionales del error: ${JSON.stringify(error.details, null, 2)}`);
    }
    // --- FIN NUEVOS LOGS ---

    res.status(500).json({ message: 'Failed to start VM on Google Cloud via backend.', error: error.message, stack: error.stack });
  }
});

app.post('/api/vms/stop/:vmId', authenticateToken, async (req, res) => {
  const { vmId } = req.params;
  const { zone, projectId } = req.body;
  console.log(`[BACKEND] Recibida solicitud POST para detener VM: ${vmId} en zona: ${zone}, proyecto: ${projectId} (por ${req.user.email})`);
  try {
    if (!instancesClient || typeof instancesClient.stop !== 'function') {
      throw new Error("Cliente de Instances no inicializado o no tiene el método 'stop'.");
    }
    const [, operation] = await instancesClient.stop({
      project: projectId,
      zone: zone,
      instance: vmId,
    });

    if (!globalOperationsClient || typeof globalOperationsClient.wait !== 'function') {
      console.warn(`[BACKEND] GlobalOperationsClient no inicializado o no tiene el método 'wait()' para VM ${vmId}. El estado puede tardar en actualizarse.`);
    } else {
        try {
            const zoneNameForWait = zone;
            await globalOperationsClient.wait({
                project: projectId,
                zone: zoneNameForWait,
                operation: operation.name,
            });
            console.log(`[BACKEND] Operación de detención para VM ${vmId} completada usando GlobalOperationsClient.wait().`);
        } catch (waitError) {
            console.error(`[BACKEND] Error al esperar la operación de detención de VM ${vmId}:`, waitError.message);
        }
    }

    const [updatedVm] = await instancesClient.get({
      project: projectId,
      zone: zone,
      instance: vmId,
    });

    const actualStatusFromGCP = updatedVm.status;
    let statusToReturn = actualStatusFromGCP;

    if (actualStatusFromGCP === 'STOPPED' || actualStatusFromGCP === 'TERMINATED' || actualStatusFromGCP === 'SUSPENDING' || actualStatusFromGCP === 'PARADA') {
        statusToReturn = 'STOPPED';
    } else if (actualStatusFromGCP === 'PROVISIONING' || actualStatusFromGCP === 'STAGING' || actualStatusFromGCP === 'RUNNING' || actualStatusFromGCP === 'CORRER') {
        if (actualStatusFromGCP === 'CORRER') {
            statusToReturn = 'RUNNING';
        }
    }

    const osType = await getVmOsType(updatedVm); 
    console.log(`[BACKEND] VM ${vmId} detenida. Estado actualizado (antes de mapear): ${actualStatusFromGCP}. Estado final devuelto: ${statusToReturn}. SO: ${osType}`);

    const mappedVm = {
      id: updatedVm.id,
      name: updatedVm.name,
      status: statusToReturn,
      zone: updatedVm.zone ? updatedVm.zone.split('/').pop() : 'N/A',
      region: updatedVm.zone ? updatedVm.zone.split('/')[4].split('-').slice(0, 2).join('-') : 'N/A',
      externalIp: updatedVm.networkInterfaces && updatedVm.networkInterfaces[0]?.accessConfigs?.[0]?.natIP || undefined,
      internalIp: updatedVm.networkInterfaces && updatedVm.networkInterfaces[0]?.networkIP || undefined,
      machineType: updatedVm.machineType ? updatedVm.machineType.split('/').pop() : 'N/A',
      creationTimestamp: updatedVm.creationTimestamp,
      osType: osType,
      diskSizeGb: updatedVm.disks && updatedVm.disks.length > 0 ? updatedVm.disks[0].diskSizeGb : undefined 
    };
    res.json(mappedVm);
  } catch (error) {
    console.error('Error stopping VM:', error.message);
    res.status(500).json({ message: 'Failed to stop VM on Google Cloud.', error: error.message, stack: error.stack });
  }
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});