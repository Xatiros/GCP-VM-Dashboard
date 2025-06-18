// backend/server.cjs
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');

const computePackage = require('@google-cloud/compute');

// Cargar las variables de entorno desde .env lo primero
dotenv.config();

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
      return res.status(403).json({ message: 'Token de autenticación inválido o expirado.' });
    }
    req.user = user;
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

// Logs de estado de inicialización
console.log("\n--- Estado de los clientes de Compute después de la inicialización ---");
console.log("instancesClient:", instancesClient ? 'Inicializado' : 'ERROR - No inicializado');
console.log("zonesClient:", zonesClient ? 'Inicializado' : 'ERROR - No inicializado');
console.log("globalOperationsClient:", globalOperationsClient ? 'Inicializado' : 'ERROR - No inicializado');
console.log("imagesClient:", imagesClient ? 'Inicializado' : 'ERROR - No inicializado');
console.log("----------------------------------------------------------\n");


/**
 * Intenta determinar el tipo de sistema operativo de una VM basada en su disco de arranque y metadatos de la imagen.
 * @param {object} vm - Objeto VM de la API de GCP.
 * @returns {Promise<string>} 'Windows', 'Linux', o 'Unknown'.
 */
async function getVmOsType(vm) {
  if (!imagesClient || typeof imagesClient.get !== 'function') {
    console.warn("[getVmOsType] Advertencia: imagesClient no está inicializado. No se puede determinar el tipo de SO. Devolviendo 'Unknown'.");
    return 'Unknown';
  }

  if (vm.disks && vm.disks.length > 0 && vm.disks[0].boot) {
    const bootDisk = vm.disks[0];
    
    // --- Log el contenido completo del bootDisk para depuración ---
    console.log(`[DEBUG DISKS] VM: ${vm.name}, bootDisk content: ${JSON.stringify(bootDisk, null, 2)}`);
    // --- Fin Log ---

    const sourceImageLink = bootDisk.sourceImage || bootDisk.initializeParams?.sourceImage;

    console.log(`[getVmOsType] VM: ${vm.name}, SourceImageLink: ${sourceImageLink}`); 
    
    if (sourceImageLink) {
      try {
        const urlParts = sourceImageLink.split('/');
        let imageProject = GCP_PROJECT_ID; 

        const projectsKeywordIndex = urlParts.indexOf('projects');
        if (projectsKeywordIndex !== -1 && projectsKeywordIndex + 1 < urlParts.length) {
            imageProject = urlParts[projectsKeywordIndex + 1];
        } else {
            console.warn(`[getVmOsType] No se pudo extraer project ID de la URL de la imagen: ${sourceImageLink}. Usando el Project ID de la aplicación: ${GCP_PROJECT_ID}.`);
        }

        const imagesKeywordIndex = urlParts.indexOf('images');
        let imageNameOrFamily = '';

        if (imagesKeywordIndex !== -1 && imagesKeywordIndex + 1 < urlParts.length) {
            imageNameOrFamily = urlParts[imagesKeywordIndex + 1];
            if (imageNameOrFamily === 'family' && imagesKeywordIndex + 2 < urlParts.length) {
                imageNameOrFamily = urlParts[imagesKeywordIndex + 2]; 
            }
        } else {
            throw new Error(`URL de imagen incompleta o mal formada: ${sourceImageLink}.`);
        }
        
        if (!imageNameOrFamily) {
             throw new Error(`No se pudo extraer el nombre o la familia de la imagen de la URL: ${sourceImageLink}.`);
        }

        console.log(`[getVmOsType] VM: ${vm.name}, Intentando imagesClient.get con project: '${imageProject}', image: '${imageNameOrFamily}'`);
        
        const [image] = await imagesClient.get({
          project: imageProject, 
          image: imageNameOrFamily, 
        });

        console.log(`[getVmOsType] VM: ${vm.name}, Imagen obtenida: name='${image.name}', family='${image.family || 'N/A'}', description='${image.description || 'N/A'}'`);

        const imageDescription = image.description ? image.description.toLowerCase() : '';
        const imageFamily = image.family ? image.family.toLowerCase() : '';
        const imageName = image.name ? image.name.toLowerCase() : '';
        
        if (imageDescription.includes('windows') || imageFamily.includes('windows') || imageName.includes('windows')) {
          console.log(`[getVmOsType] VM: ${vm.name}, SO detectado: Windows (desde imagen: ${imageNameOrFamily})`);
          return 'Windows';
        } else if (imageDescription.includes('linux') || imageFamily.includes('linux') || imageName.includes('linux') ||
                   imageDescription.includes('debian') || imageFamily.includes('debian') || imageName.includes('debian') ||
                   imageDescription.includes('ubuntu') || imageFamily.includes('ubuntu') || imageName.includes('ubuntu') ||
                   imageDescription.includes('centos') || imageFamily.includes('centos') || imageName.includes('centos') ||
                   imageDescription.includes('rhel') || imageFamily.includes('rhel') || imageName.includes('rhel') ||
                   imageDescription.includes('sles') || imageFamily.includes('sles') || imageName.includes('sles') ||
                   imageDescription.includes('coreos') || imageFamily.includes('coreos') || imageName.includes('coreos') ||
                   imageDescription.includes('fedora') || imageFamily.includes('fedora') || imageName.includes('fedora')) {
          console.log(`[getVmOsType] VM: ${vm.name}, SO detectado: Linux (desde imagen: ${imageNameOrFamily})`);
          return 'Linux';
        }
      } catch (imageError) {
        console.warn(`[getVmOsType] Error al obtener detalles de imagen para VM ${vm.name} con SourceImageLink ${sourceImageLink}: ${imageError.message}`);
        // Fallback: intentar inferir del nombre de la URL si imagesClient.get falló
        const nameFromUrl = sourceImageLink.split('/').pop().toLowerCase();
        console.log(`[getVmOsType] VM: ${vm.name}, Fallback de detección por nombre de URL: '${nameFromUrl}'`);
        if (nameFromUrl.includes('windows')) return 'Windows';
        if (nameFromUrl.includes('linux') || nameFromUrl.includes('debian') || nameFromUrl.includes('ubuntu')) return 'Linux';
      }
    }
  }
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
        osType: osType 
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
      osType: osType 
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

    // Este mensaje se envía al frontend
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
      osType: osType 
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