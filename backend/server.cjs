// backend/server.cjs
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const computePackage = require('@google-cloud/compute');
// Importamos los clientes para Logging y Monitoring que usaremos en la Fase 2
const { LoggingServiceV2Client } = require('@google-cloud/logging').v2;
const { MetricServiceClient } = require('@google-cloud/monitoring').v3;


// Cargar variables de entorno (principalmente para desarrollo local)
dotenv.config();

// --- CONFIGURACIÓN Y VALIDACIÓN CRÍTICA ---
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || 8080;
const ALLOWED_DOMAIN = 'gemigeo.com';
const ADMIN_EMAILS = ['christian.sanchez@gemigeo.com', 'carlos.micucci@gemigeo.com'];

let criticalEnvsValid = false;

// --- VERSIÓN DE DEPURACIÓN: Esta función ahora no detiene el proceso ---
function validateEnvironmentVariables() {
    let allVarsPresent = true;
    console.log("--- [DEBUG] Iniciando validación de variables de entorno críticas ---");

    if (!GCP_PROJECT_ID) {
        console.error("!!! ATENCIÓN: La variable de entorno GCP_PROJECT_ID no está definida. !!!");
        allVarsPresent = false;
    } else {
        console.log("    [DEBUG] GCP_PROJECT_ID: OK");
    }

    if (!GOOGLE_CLIENT_ID) {
        console.error("!!! ATENCIÓN: La variable de entorno GOOGLE_CLIENT_ID no está definida. !!!");
        allVarsPresent = false;
    } else {
        console.log("    [DEBUG] GOOGLE_CLIENT_ID: OK");
    }

    if (!JWT_SECRET || JWT_SECRET.length < 32) {
        console.error("!!! ATENCIÓN: JWT_SECRET no está definido o es demasiado corto. !!!");
        allVarsPresent = false;
    } else {
        console.log("    [DEBUG] JWT_SECRET: OK");
    }

    if (!allVarsPresent) {
         console.error("--- [DEBUG] Faltan una o más variables críticas. La inicialización de clientes de GCP se omitirá. ---");
    } else {
        console.log("--- [DEBUG] Todas las variables de entorno críticas están presentes. ---");
    }
    criticalEnvsValid = allVarsPresent;
}

// --- INICIALIZACIÓN DE EXPRESS ---
const app = express();
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://gcp-vm-dashboard-frontend-service-780691668337.europe-southwest1.run.app'
  ]
}));
app.use(express.json());

// --- CLIENTES DE GOOGLE CLOUD (declarados pero no inicializados) ---
let instancesClient, zonesClient, globalOperationsClient, imagesClient, disksClient;
let loggingClient, monitoringClient;
const googleAuthClient = new OAuth2Client(GOOGLE_CLIENT_ID);
const userSessions = new Map();

// --- FUNCIÓN DE INICIALIZACIÓN ASÍNCRONA ---
async function initializeGoogleCloudClients() {
    if (!criticalEnvsValid) {
        console.warn("--- [WARN] Omitiendo inicialización de clientes de GCP debido a que faltan variables de entorno. Las rutas de la API de VMs no funcionarán. ---");
        return false;
    }

    try {
        console.log("\n--- Inicializando clientes de Google Cloud ---");
        instancesClient = new computePackage.v1.InstancesClient({ projectId: GCP_PROJECT_ID });
        zonesClient = new computePackage.v1.ZonesClient({ projectId: GCP_PROJECT_ID });
        globalOperationsClient = new computePackage.v1.GlobalOperationsClient({ projectId: GCP_PROJECT_ID });
        imagesClient = new computePackage.v1.ImagesClient({ projectId: GCP_PROJECT_ID });
        disksClient = new computePackage.v1.DisksClient({ projectId: GCP_PROJECT_ID });
        loggingClient = new LoggingServiceV2Client({ projectId: GCP_PROJECT_ID });
        monitoringClient = new MetricServiceClient({ projectId: GCP_PROJECT_ID });
        console.log("--- ¡Todos los clientes de Google Cloud se han inicializado correctamente! ---\n");
        return true;
    } catch (error) {
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error("!!! ERROR FATAL AL INICIALIZAR LOS CLIENTES DE GCP !!!");
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error("Mensaje:", error.message);
        console.error("Causa probable: La cuenta de servicio del backend NO tiene los permisos necesarios (ej: 'Compute Viewer', 'Logs Viewer', 'Monitoring Viewer') o las APIs no están habilitadas.");
        console.error("Stack:", error.stack);
        return false;
    }
}


// --- LÓGICA DE LA APLICACIÓN (MIDDLEWARES, FUNCIONES, RUTAS) ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ message: 'Acceso denegado. No se proporcionó token de autenticación.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error("Error al verificar el token JWT de sesión:", err);
            if (err.name === 'TokenExpiredError') {
                return res.status(403).json({ message: 'Token de autenticación expirado. Por favor, inicia sesión de nuevo.' });
            }
            return res.status(403).json({ message: 'Token de autenticación inválido.' });
        }
        req.user = user;
        req.user.role = ADMIN_EMAILS.includes(user.email) ? 'admin' : 'user';
        const session = userSessions.get(user.id);
        if (session) {
            session.lastActivity = new Date();
        }
        next();
    });
};

async function getVmOsInfo(vm) {
    if (vm.disks && vm.disks[0] && vm.disks[0].licenses && vm.disks[0].licenses.length > 0) {
        const licenseUrl = vm.disks[0].licenses[0];
        return licenseUrl.split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    if (vm.disks && vm.disks[0] && vm.disks[0].architecture) {
        return vm.disks[0].architecture;
    }
    return 'Desconocido';
}

async function getLastUserWhoStartedVm(projectId, instanceName) {
    try {
        const filter = `resource.type="gce_instance" AND protoPayload.methodName="v1.compute.instances.start" AND resource.labels.instance_name="${instanceName}"`;

        const [entries] = await loggingClient.listLogEntries({
            resourceNames: [`projects/${projectId}`],
            filter: filter,
            orderBy: "timestamp desc",
            pageSize: 1,
        });

        if (entries.length > 0) {
            const latestEntry = entries[0];
            const user = latestEntry.protoPayload.authenticationInfo.principalEmail;
            const startTime = new Date(latestEntry.timestamp);
            const now = new Date();
            const durationMs = now - startTime;

            const days = Math.floor(durationMs / (1000 * 60 * 60 * 24));
            const hours = Math.floor((durationMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
            const durationStr = `${days}d ${hours}h ${minutes}m`;

            return {
                lastStartedBy: user,
                lastStartedAt: startTime.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
                uptimeSinceStart: durationStr
            };
        } else {
            return { lastStartedBy: "No se encontró registro de encendido." };
        }
    } catch (error) {
        console.error(`Error en getLastUserWhoStartedVm para ${instanceName}:`, error);
        return { lastStartedBy: "Error al buscar en logs." };
    }
}

async function getDiskUsage(projectId, instanceId) {
    try {
        const request = {
            name: `projects/${projectId}`,
            query: `fetch gce_instance::agent.googleapis.com/disk/percent_used
                    | filter (resource.instance_id == '${instanceId}' && metric.state == 'used')
                    | group_by 1m, [value_percent_used_mean: mean(value.percent_used)]
                    | every 1m
                    | within 5m`,
        };

        const [timeSeries] = await monitoringClient.queryTimeSeries(request);
        const diskPartitions = {};
        let highUsageAlert = false;

        timeSeries.forEach(series => {
            const device = series.labelValues.find(label => label.key === 'device').stringValue;
            const latestPoint = series.pointData[0];
            if (latestPoint) {
                const usagePercent = latestPoint.values[0].doubleValue;
                diskPartitions[device] = `${usagePercent.toFixed(2)}%`;
                if (usagePercent > 90.0) highUsageAlert = true;
            }
        });
        
        const diskInfo = { partitions: diskPartitions };
        if (highUsageAlert) {
            diskInfo.alert = "¡ATENCIÓN! Al menos un disco supera el 90% de uso.";
        }
        if (Object.keys(diskPartitions).length === 0) {
           diskInfo.status = "No hay datos de disco. Verifique que el Ops Agent esté instalado y activo en la VM.";
        }

        return diskInfo;
    } catch (error) {
        console.error(`Error en getDiskUsage para instancia ${instanceId}:`, error);
        return { status: "Error al consultar las métricas de disco." };
    }
}


app.get('/', (req, res) => {
  res.status(200).send('Backend server is running and ready.');
});

app.post('/api/auth/google', async (req, res) => {
    const { id_token } = req.body;
    if (!id_token) return res.status(400).json({ message: 'Falta el ID Token.' });
    try {
        const ticket = await googleAuthClient.verifyIdToken({ idToken: id_token, audience: GOOGLE_CLIENT_ID });
        const payload = ticket.getPayload();
        if (!payload || !payload.email || payload.hd !== ALLOWED_DOMAIN) {
            return res.status(403).json({ message: `Acceso denegado. Solo se permiten cuentas de ${ALLOWED_DOMAIN}.` });
        }
        const user = { id: payload.sub, email: payload.email, name: payload.name };
        const appToken = jwt.sign(user, JWT_SECRET, { expiresIn: '2h' });
        userSessions.set(user.id, { email: user.email, name: user.name, lastActivity: new Date() });
        res.json({ token: appToken, user: { email: user.email, name: user.name, role: ADMIN_EMAILS.includes(user.email) ? 'admin' : 'user' } });
    } catch (error) {
        console.error("Error al verificar el ID Token de Google:", error.message);
        res.status(401).json({ message: 'Fallo en la autenticación con Google.', error: error.message });
    }
});

app.get('/api/vms/:projectId', authenticateToken, async (req, res) => {
    if (!instancesClient) return res.status(503).json({ message: "Servidor no listo, clientes GCP no disponibles." });
    const { projectId } = req.params;
    try {
        let vms = [];
        const [zonesResponse] = await zonesClient.list({ project: projectId });
        const europeanZones = zonesResponse.filter(zone => zone.name.startsWith('europe-'));
        for (const zone of europeanZones) {
            const [zoneVms] = await instancesClient.list({ project: projectId, zone: zone.name });
            if (zoneVms && zoneVms.length > 0) vms.push(...zoneVms);
        }
        const mappedVms = await Promise.all(vms.map(async (vm) => ({
            id: vm.id,
            name: vm.name,
            status: vm.status,
            zone: vm.zone.split('/').pop(),
            externalIp: vm.networkInterfaces?.[0]?.accessConfigs?.[0]?.natIP,
            osInfo: await getVmOsInfo(vm),
            machineType: vm.machineType.split('/').pop(),
        })));
        res.json(mappedVms);
    } catch (error) {
        console.error('[BACKEND] Error en /api/vms:', error.message);
        res.status(500).json({ message: 'Failed to fetch VMs.', error: error.message });
    }
});

app.get('/api/vm-details/:projectId/:zone/:instanceName', authenticateToken, async (req, res) => {
    if (!loggingClient || !monitoringClient || !instancesClient) {
        return res.status(503).json({ message: "Servidor no listo, clientes GCP no disponibles." });
    }
    const { projectId, zone, instanceName } = req.params;

    try {
        const [instance] = await instancesClient.get({ project: projectId, zone, instance: instanceName });

        if (instance.status !== 'RUNNING') {
            return res.json({
                status: instance.status,
                details: "La VM no está en ejecución. No se pueden obtener datos de uso."
            });
        }

        const [userInfo, diskInfo] = await Promise.all([
            getLastUserWhoStartedVm(projectId, instanceName),
            getDiskUsage(projectId, instance.id)
        ]);
        
        res.json({
            userInfo,
            diskInfo,
            status: instance.status
        });

    } catch (error) {
        console.error(`[BACKEND] Error en /api/vm-details para ${instanceName}:`, error.message);
        res.status(500).json({ message: 'Failed to fetch VM details.', error: error.message });
    }
});


app.post('/api/vms/start/:vmId', authenticateToken, async (req, res) => {
    if (!instancesClient) return res.status(503).json({ message: "Servidor no listo, clientes GCP no disponibles." });
    const { vmId } = req.params;
    const { zone, projectId } = req.body;
    try {
        await instancesClient.start({ project: projectId, zone: zone, instance: vmId });
        res.json({ message: `VM ${vmId} is starting.` });
    } catch (error) {
        console.error(`[BACKEND] Error al iniciar VM ${vmId}:`, error.message);
        res.status(500).json({ message: 'Failed to start VM.', error: error.message });
    }
});

app.post('/api/vms/stop/:vmId', authenticateToken, async (req, res) => {
    if (!instancesClient) return res.status(503).json({ message: "Servidor no listo, clientes GCP no disponibles." });
    const { vmId } = req.params;
    const { zone, projectId } = req.body;
    try {
        await instancesClient.stop({ project: projectId, zone: zone, instance: vmId });
        res.json({ message: `VM ${vmId} is stopping.` });
    } catch (error) {
        console.error(`[BACKEND] Error al detener VM ${vmId}:`, error.message);
        res.status(500).json({ message: 'Failed to stop VM.', error: error.message });
    }
});


// --- FUNCIÓN PRINCIPAL DE ARRANQUE ---
async function startServer() {
    validateEnvironmentVariables();
    app.listen(PORT, () => {
        console.log(`✅ Servidor Express iniciado y escuchando en el puerto ${PORT}`);
        console.log("   El siguiente paso es inicializar los clientes de Google Cloud...");
        initializeGoogleCloudClients();
    });

    // Tarea de limpieza de sesiones inactivas
    setInterval(() => {
        try {
            const now = new Date();
            const INACTIVITY_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 horas
            userSessions.forEach((session, userId) => {
                if (now.getTime() - (session.lastActivity?.getTime() || 0) > INACTIVITY_THRESHOLD_MS) {
                    console.log(`[Sessions] Eliminando sesión inactiva para: ${session.email}`);
                    userSessions.delete(userId);
                }
            });
        } catch (error) {
            // Este catch evita que un error inesperado en la tarea de limpieza detenga el servidor
            console.error("[ERROR en Tarea de Limpieza de Sesiones]:", error);
        }
    }, 30 * 60 * 1000); // Se ejecuta cada 30 minutos
}

startServer();


