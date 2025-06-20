// backend/server.cjsMore actions
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');

const computePackage = require('@google-cloud/compute');

// Cargar las variables de entorno desde .env lo primero
dotenv.config();

// --- CAMBIO CLAVE: LOGGING TEMPRANO DE VARIABLES (dentro de server.cjs) ---
console.log("--- DEBUG server.cjs: Early Environment Variables (after dotenv) ---");
console.log(`GCP_PROJECT_ID (in server.cjs): '${process.env.GCP_PROJECT_ID}'`);
console.log(`GOOGLE_CLIENT_ID (in server.cjs): '${process.env.GOOGLE_CLIENT_ID}'`);
console.log(`JWT_SECRET (in server.cjs): '${process.env.JWT_SECRET ? 'DEFINED (length: ' + process.env.JWT_SECRET.length + ')' : 'UNDEFINED'}'`);
console.log("--- END DEBUG server.cjs ---");
// --- FIN CAMBIO CLAVE ---

const app = express();
const port = process.env.PORT || 8080; 
@@ -54,12 +56,14 @@
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
@@ -84,7 +88,6 @@
let globalOperationsClient;
let imagesClient; 
let disksClient; 
let machineTypesClient; // --- NUEVO: Cliente para tipos de máquina ---

// --- ALMACÉN EN MEMORIA PARA SESIONES DE USUARIO ---
const userSessions = new Map();
@@ -157,269 +160,212 @@
  console.error("Error fatal al inicializar Cliente de Discos:", e.message);
}

// --- NUEVO: Inicialización del MachineTypesClient ---
try {
  if (computePackage.v1 && computePackage.v1.MachineTypesClient && typeof computePackage.v1.MachineTypesClient === 'function') {
    machineTypesClient = new computePackage.v1.MachineTypesClient({ projectId: GCP_PROJECT_ID });
    console.log("Cliente de MachineTypes inicializado.");
  } else {
    throw new Error("No se encontró el constructor MachineTypesClient en computePackage.v1.");
  }
} catch (e) {
  console.error("Error fatal al inicializar Cliente de MachineTypes:", e.message);
}
// --- FIN NUEVO ---


console.log("\n--- Estado de los clientes de Compute después de la inicialización ---");
console.log("instancesClient:", instancesClient ? 'Inicializado' : 'ERROR - No inicializado');
console.log("zonesClient:", zonesClient ? 'Inicializado' : 'ERROR - No inicializado');
console.log("globalOperationsClient:", globalOperationsClient ? 'Inicializado' : 'ERROR - No inicializado');
console.log("imagesClient:", imagesClient ? 'Inicializado' : 'ERROR - No inicializado');
console.log("disksClient:", disksClient ? 'Inicializado' : 'ERROR - No inicializado'); 
console.log("machineTypesClient:", machineTypesClient ? 'Inicializado' : 'ERROR - No inicializado'); // --- NUEVO ---
console.log("----------------------------------------------------------\n");


/**
 * Intenta determinar el tipo de sistema operativo de una VM.
 * ... (sin cambios en esta función, la omito por brevedad) ...
 */
 * Intenta determinar el tipo de sistema operativo de una VM.
 * Prioriza guestOsFeatures y licenses, luego detalles del disco, y finalmente el nombre de la VM.
 * @param {object} vm - Objeto VM de la API de GCP.
 * @returns {Promise<string>} 'Windows', 'Linux', o 'Unknown'.
 */
async function getVmOsType(vm) {
  // ... tu código original para getVmOsType ...
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
  if (!imagesClient || typeof imagesClient.get !== 'function' || !disksClient || typeof disksClient.get !== 'function') {
    console.warn("[getVmOsType] Advertencia: Clientes de imágenes o discos no están completamente inicializados. No se puede determinar el tipo de SO. Devolviendo 'Unknown'.");
    return 'Unknown';
  }
  // console.log(`[getVmOsType] DEBUG: Clientes ImagesClient(${!!imagesClient}) y DisksClient(${!!disksClient}) inicializados.`);

// --- NUEVO: Función auxiliar para obtener vCPUs y RAM de forma precisa ---
/**
 * Obtiene los detalles de hardware (vCPU y RAM) de una VM consultando su tipo de máquina.
 * @param {object} vm - El objeto de la VM de la API de Compute Engine.
 * @returns {Promise<{vCpus: number|undefined, memoryGb: number|undefined}>}
 */
async function getVmHardwareDetails(vm) {
    if (!vm.machineType) {
        console.warn(`[getVmHardwareDetails] VM ${vm.name} no tiene machineType. No se pueden obtener detalles de hardware.`);
        return { vCpus: undefined, memoryGb: undefined };
    }

    if (!machineTypesClient || typeof machineTypesClient.get !== 'function') {
        console.error("[getVmHardwareDetails] Error: machineTypesClient no está inicializado. No se puede continuar.");
        return { vCpus: undefined, memoryGb: undefined };
    }
    
    try {
        const urlParts = vm.machineType.split('/');
        const machineTypeName = urlParts.pop();
        const zoneName = vm.zone.split('/').pop();

        const [machineTypeDetails] = await machineTypesClient.get({
            project: GCP_PROJECT_ID,
            zone: zoneName,
            machineType: machineTypeName,
        });
        
        const vCpus = machineTypeDetails.guestCpus;
        const memoryGb = parseFloat((machineTypeDetails.memoryMb / 1024).toFixed(2));

        console.log(`[getVmHardwareDetails] VM ${vm.name}: ${machineTypeName} -> vCPUs: ${vCpus}, RAM: ${memoryGb} GB`);
        
        return { vCpus, memoryGb };

    } catch (error) {
        console.error(`[getVmHardwareDetails] Error al obtener detalles para el tipo de máquina ${vm.machineType} de la VM ${vm.name}: ${error.message}`);
        // Devolvemos undefined si falla la consulta para no romper el mapeo
        return { vCpus: undefined, memoryGb: undefined };
    }
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
// --- FIN NUEVO ---


app.post('/api/auth/google', async (req, res) => {
  // ... tu código original para /api/auth/google ...
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
@@ -453,28 +399,55 @@
    console.log(`[BACKEND] Se encontraron ${vms.length} VMs en las zonas europeas de GCP.`);

    const mappedVms = await Promise.all(vms.map(async (vm) => { 
        const osType = await getVmOsType(vm); 
        
        // --- MODIFICADO: Usar la nueva función para obtener hardware ---
        const { vCpus, memoryGb } = await getVmHardwareDetails(vm);
        // --- FIN MODIFICADO ---

        return {
            id: vm.id,
            name: vm.name,
            status: vm.status, // Se enviará el estado real (RUNNING, TERMINATED, etc.)
            zone: vm.zone.split('/').pop(),
            region: vm.zone.split('/')[4].split('-').slice(0, 2).join('-'),
            externalIp: vm.networkInterfaces && vm.networkInterfaces[0]?.accessConfigs?.[0]?.natIP || undefined,
            internalIp: vm.networkInterfaces && vm.networkInterfaces[0]?.networkIP || undefined,
            machineType: vm.machineType.split('/').pop(),
            creationTimestamp: vm.creationTimestamp,
            osType: osType,
            diskSizeGb: vm.disks && vm.disks.length > 0 ? vm.disks[0].diskSizeGb : undefined,
            vCpus: vCpus,
            memoryGb: memoryGb
        };
    }));
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
@@ -484,107 +457,182 @@
  }
});

// --- MODIFICADO: Endpoint /start para usar la nueva función de hardware ---
app.post('/api/vms/start/:vmId', authenticateToken, async (req, res) => {
    const { vmId } = req.params;
    const { zone, projectId } = req.body;
    console.log(`[BACKEND] Recibida solicitud POST para iniciar VM: ${vmId} en zona: ${zone}, proyecto: ${projectId} (por ${req.user.email})`);
    try {
        if (!instancesClient || typeof instancesClient.start !== 'function') {
            throw new Error("Cliente de Instances no inicializado o no tiene el método 'start'.");
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

        const [, operation] = await instancesClient.start({
            project: projectId,
            zone: zone,
            instance: vmId,
        });
        
        // Esperar a que la operación termine (código original omitido por brevedad)
        // ...

        const [updatedVm] = await instancesClient.get({
            project: projectId,
            zone: zone,
            instance: vmId,
        });

        const osType = await getVmOsType(updatedVm); 
        // --- Usar la nueva función para obtener hardware ---
        const { vCpus, memoryGb } = await getVmHardwareDetails(updatedVm);
        
        const mappedVm = {
            id: updatedVm.id,
            name: updatedVm.name,
            status: updatedVm.status, // Devolver el estado real
            zone: updatedVm.zone ? updatedVm.zone.split('/').pop() : 'N/A',
            region: updatedVm.zone ? updatedVm.zone.split('/')[4].split('-').slice(0, 2).join('-') : 'N/A',
            externalIp: updatedVm.networkInterfaces && updatedVm.networkInterfaces[0]?.accessConfigs?.[0]?.natIP || undefined,
            internalIp: updatedVm.networkInterfaces && updatedVm.networkInterfaces[0]?.networkIP || undefined,
            machineType: updatedVm.machineType ? updatedVm.machineType.split('/').pop() : 'N/A',
            creationTimestamp: updatedVm.creationTimestamp,
            osType: osType,
            diskSizeGb: updatedVm.disks && updatedVm.disks.length > 0 ? updatedVm.disks[0].diskSizeGb : undefined,
            vCpus: vCpus,
            memoryGb: memoryGb
        };
        res.json(mappedVm);
    } catch (error) {
        console.error(`[BACKEND][START_VM_ERROR] Error al iniciar VM ${vmId}:`, error.message);
        res.status(500).json({ message: 'Failed to start VM.', error: error.message });
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

// --- MODIFICADO: Endpoint /stop para devolver un objeto VM consistente ---
app.post('/api/vms/stop/:vmId', authenticateToken, async (req, res) => {
    const { vmId } = req.params;
    const { zone, projectId } = req.body;
    console.log(`[BACKEND] Recibida solicitud POST para detener VM: ${vmId} en zona: ${zone}, proyecto: ${projectId} (por ${req.user.email})`);
    try {
        if (!instancesClient || typeof instancesClient.stop !== 'function') {
            throw new Error("Cliente de Instances no inicializado o no tiene el método 'stop'.");
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
        const [, operation] = await instancesClient.stop({
            project: projectId,
            zone: zone,
            instance: vmId,
        });

        // Esperar a que la operación termine (código original omitido por brevedad)
        // ...

        const [updatedVm] = await instancesClient.get({
            project: projectId,
            zone: zone,
            instance: vmId,
        });

        const osType = await getVmOsType(updatedVm);
        // --- Usar la nueva función para obtener hardware ---
        const { vCpus, memoryGb } = await getVmHardwareDetails(updatedVm);
        
        const mappedVm = {
            id: updatedVm.id,
            name: updatedVm.name,
            status: updatedVm.status, // Devolver el estado real
            zone: updatedVm.zone ? updatedVm.zone.split('/').pop() : 'N/A',
            region: updatedVm.zone ? updatedVm.zone.split('/')[4].split('-').slice(0, 2).join('-') : 'N/A',
            externalIp: updatedVm.networkInterfaces && updatedVm.networkInterfaces[0]?.accessConfigs?.[0]?.natIP || undefined,
            internalIp: updatedVm.networkInterfaces && updatedVm.networkInterfaces[0]?.networkIP || undefined,
            machineType: updatedVm.machineType ? updatedVm.machineType.split('/').pop() : 'N/A',
            creationTimestamp: updatedVm.creationTimestamp,
            osType: osType,
            diskSizeGb: updatedVm.disks && updatedVm.disks.length > 0 ? updatedVm.disks[0].diskSizeGb : undefined,
            vCpus: vCpus,
            memoryGb: memoryGb
        };
        res.json(mappedVm);
    } catch (error) {
        console.error('Error stopping VM:', error.message);
        res.status(500).json({ message: 'Failed to stop VM.', error: error.message });
    }
});

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
  console.log(`Backend server listening at http://localhost:${port}` );
