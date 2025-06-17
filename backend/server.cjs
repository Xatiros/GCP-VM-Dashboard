// backend/server.cjs
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');

const computePackage = require('@google-cloud/compute');

dotenv.config();

const app = express();
const port = process.env.PORT || 8080; // Usar 8080 como fallback consistente con Dockerfile

// --- CONFIGURACIÓN DE AUTENTICACIÓN ---
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID; 
const JWT_SECRET = process.env.JWT_SECRET || '1823ca911266eafe96c0b42a9331fc097b1a84a974e4e206208685d93dc37bddd2c68fa9a094548da1ad5a3f3936a9fc1d5b6d7d80c684494c60654c07bb197984f34ac1e6ea34ce3d9a6a4e89a3dfbbb1081c1bf5752102e9bf782e3bd3c1711f83035b2c0248c32be814eefa615590b0eb7c946d0adfed5cc4f726eb0ec343a8859c91b4fcb7f7b91e5e2cc626daf4bfb3bcc81298177f494f21fb8d9068b76ebcde811d097152761203e03550c60bc2052130fae3411baf5a5b7d333d6497795fea3e5ad8132ba2508644ed73c394c1046936aa1ad9e994da6f6dd6610ac80bfc9adff55009d401033917daee194fbbdcc1c38732be40e83b8bd35f66f5e5'; 
const ALLOWED_DOMAIN = 'gemigeo.com';

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

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
    'https://gcp-vm-dashboard-frontend-service-780691668337.europe-southwest1.run.app' // ¡Asegúrate de que esta URL sea la correcta de tu frontend desplegado!
  ]
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('OK'); // Ruta de health check para Cloud Run
});

let instancesClient;
let zonesClient;
let globalOperationsClient;

const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID; 

if (!GCP_PROJECT_ID) {
    console.error("Error fatal: La variable de entorno GCP_PROJECT_ID no está definida.");
    process.exit(1);
}

try {
  if (computePackage.v1 && computePackage.v1.InstancesClient && typeof computePackage.v1.InstancesClient === 'function') {
    instancesClient = new computePackage.v1.InstancesClient({ projectId: GCP_PROJECT_ID });
    console.log("Cliente de Instancias (para start/stop/list) inicializado con: new v1.InstancesClient()");
  } else {
    throw new Error("No se encontró el constructor InstancesClient en computePackage.v1.");
  }
} catch (e) {
  console.error("Error fatal al inicializar Cliente de Instancias (para start/stop/list):", e.message);
  process.exit(1);
}

try {
  if (computePackage.v1 && computePackage.v1.ZonesClient && typeof computePackage.v1.ZonesClient === 'function') {
    zonesClient = new computePackage.v1.ZonesClient({ projectId: GCP_PROJECT_ID });
    console.log("Cliente de Zonas inicializado con: new v1.ZonesClient()");
  } else {
    throw new Error("No se encontró el constructor ZonesClient en computePackage.v1.");
  }
} catch (e) {
  console.error("Error fatal al inicializar Cliente de Zonas:", e.message);
  process.exit(1);
}

try {
  if (computePackage.v1 && computePackage.v1.GlobalOperationsClient && typeof computePackage.v1.GlobalOperationsClient === 'function') {
    globalOperationsClient = new computePackage.v1.GlobalOperationsClient({ projectId: GCP_PROJECT_ID });
    console.log("Cliente de Operaciones Globales inicializado con: new v1.GlobalOperationsClient()");
  } else {
    throw new Error("No se encontró el constructor GlobalOperationsClient en computePackage.v1.");
  }
} catch (e) {
  console.error("Error fatal al inicializar Cliente de Operaciones Globales:", e.message);
  process.exit(1);
}

console.log("\n--- Estado de los clientes de Compute después de la inicialización ---");
console.log("instancesClient:", instancesClient ? 'Inicializado' : 'ERROR');
console.log("instancesClient.list (si existe):", typeof instancesClient.list === 'function' ? 'Function' : 'Undefined/Not a function');
console.log("instancesClient.start (si existe):", typeof instancesClient.start === 'function' ? 'Function' : 'Undefined/Not a function');
console.log("instancesClient.stop (si existe):", typeof instancesClient.stop === 'function' ? 'Function' : 'Undefined/Not a function');
console.log("zonesClient:", zonesClient ? 'Inicializado' : 'ERROR');
console.log("zonesClient.list (si existe):", typeof zonesClient.list === 'function' ? 'Function' : 'Undefined/Not a function');
console.log("globalOperationsClient:", globalOperationsClient ? 'Inicializado' : 'ERROR');
console.log("globalOperationsClient.wait (si existe):", typeof globalOperationsClient.wait === 'function' ? 'Function' : 'Undefined/Not a function');
console.log("----------------------------------------------------------\n");

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

    const mappedVms = vms.map((vm: any) => { // Asegúrate que 'vm' puede tener la propiedad 'disks' de la API
        // Heurística para detectar Windows: Buscar licencias de Windows en los discos.
        // La API de Compute Engine devuelve información de discos en vm.disks.
        const isWindows = vm.disks && vm.disks.length > 0 && 
                          vm.disks[0].licenses && 
                          vm.disks[0].licenses.some((license: string) => license.includes('windows'));

        const osType = isWindows ? 'Windows' : 'Linux'; // Si no detecta Windows, asume Linux.

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
            osType: osType, // ¡Añadimos el tipo de SO!
        };
    });

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

    console.log(`[BACKEND] VM ${vmId} iniciada. Estado actualizado (antes de mapear): ${actualStatusFromGCP}. Estado final devuelto: ${statusToReturn}`);

    const mappedVm = {
      id: updatedVm.id,
      name: updatedVm.name,
      status: statusToReturn, 
      zone: updatedVm.zone ? updatedVm.zone.split('/').pop() : 'N/A',
      region: updatedVm.zone ? updatedVm.zone.split('/')[4].split('-').slice(0, 2).join('-') : 'N/A',
      externalIp: updatedVm.networkInterfaces && updatedVm.networkInterfaces[0]?.accessConfigs?.[0]?.natIP || undefined,
      internalIp: updatedVm.networkInterfaces && updatedVm.networkInterfaces[0]?.networkIP || undefined,
      machineType: updatedVm.machineType ? updatedVm.machineType.split('/').pop() : 'N/A',
      osType: updatedVm.disks && updatedVm.disks.length > 0 && updatedVm.disks[0].licenses && updatedVm.disks[0].licenses.some((license: string) => license.includes('windows'))
              ? 'Windows'
              : 'Linux',
      creationTimestamp: updatedVm.creationTimestamp,
    };
    res.json(mappedVm);
  } catch (error) {
    console.error('Error starting VM:', error.message);
    res.status(500).json({ message: 'Failed to start VM on Google Cloud.', error: error.message, stack: error.stack });
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
    
    console.log(`[BACKEND] VM ${vmId} detenida. Estado actualizado (antes de mapear): ${actualStatusFromGCP}. Estado final devuelto: ${statusToReturn}`);

    const mappedVm = {
      id: updatedVm.id,
      name: updatedVm.name,
      status: statusToReturn, 
      zone: updatedVm.zone ? updatedVm.zone.split('/').pop() : 'N/A',
      region: updatedVm.zone ? updatedVm.zone.split('/')[4].split('-').slice(0, 2).join('-') : 'N/A',
      externalIp: updatedVm.networkInterfaces && updatedVm.networkInterfaces[0]?.accessConfigs?.[0]?.natIP || undefined,
      internalIp: updatedVm.networkInterfaces && updatedVm.networkInterfaces[0]?.networkIP || undefined,
      machineType: updatedVm.machineType ? updatedVm.machineType.split('/').pop() : 'N/A',
      osType: updatedVm.disks && updatedVm.disks.length > 0 && updatedVm.disks[0].licenses && updatedVm.disks[0].licenses.some((license: string) => license.includes('windows'))
              ? 'Windows'
              : 'Linux',
      creationTimestamp: updatedVm.creationTimestamp,
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