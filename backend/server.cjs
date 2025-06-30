// backend/server.cjs
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const computePackage = require('@google-cloud/compute');

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
        console.log("    [DEBUG] GCP_PROJECT_ID: OK");
    }

    if (!GOOGLE_CLIENT_ID) {
        console.error("!!! ATENCIÓN: La variable de entorno GOOGLE_CLIENT_ID no está definida. !!!");
        allVarsPresent = false;
    } else {
        console.log("    [DEBUG] GOOGLE_CLIENT_ID: OK");
    }

    if (!JWT_SECRET || JWT_SECRET.length < 32) {
        console.error("!!! ATENCIÓN: JWT_SECRET no está definido o es demasiado corto. !!!");
        allVarsPresent = false;
    } else {
        console.log("    [DEBUG] JWT_SECRET: OK");
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
const googleAuthClient = new OAuth2Client(GOOGLE_CLIENT_ID);
const userSessions = new Map();

// --- FUNCIÓN DE INICIALIZACIÓN ASÍNCRONA ---
async function initializeGoogleCloudClients() {
    // Solo intentar si la validación inicial pasó
    if (!criticalEnvsValid) {
        console.warn("--- [WARN] Omitiendo inicialización de clientes de GCP debido a que faltan variables de entorno. Las rutas de la API de VMs no funcionarán. ---");
        return false;
    }

    try {
        console.log("\n--- Inicializando clientes de Google Cloud Compute ---");
        instancesClient = new computePackage.v1.InstancesClient({ projectId: GCP_PROJECT_ID });
        zonesClient = new computePackage.v1.ZonesClient({ projectId: GCP_PROJECT_ID });
        globalOperationsClient = new computePackage.v1.GlobalOperationsClient({ projectId: GCP_PROJECT_ID });
        imagesClient = new computePackage.v1.ImagesClient({ projectId: GCP_PROJECT_ID });
        disksClient = new computePackage.v1.DisksClient({ projectId: GCP_PROJECT_ID });
        console.log("--- ¡Todos los clientes de Google Cloud se han inicializado correctamente! ---\n");
        return true;
    } catch (error) {
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error("!!! ERROR FATAL AL INICIALIZAR LOS CLIENTES DE GCP !!!");
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error("Mensaje:", error.message);
        console.error("Causa probable: La cuenta de servicio del backend NO tiene los permisos necesarios (ej: 'Compute Viewer') o la API de 'Compute Engine' no está habilitada en el proyecto.");
        console.error("Stack:", error.stack);
        return false;
    }
}


// --- LÓGICA DE LA APLICACIÓN (MIDDLEWARES, FUNCIONES, RUTAS) ---
// (El resto del código de tus rutas y funciones va aquí sin cambios)
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
        if (userSessions.has(user.id)) {
            userSessions.get(user.id).lastActivity = new Date();
        }
        next();
    });
};

async function getVmOsType(vm) {
    if (!imagesClient || !disksClient) {
        console.warn("[getVmOsType] Advertencia: Clientes de imágenes o discos no están inicializados.");
        return 'Unknown';
    }
    if (!vm.disks || vm.disks.length === 0 || !vm.disks[0].boot) {
        return 'Unknown';
    }
    const bootDisk = vm.disks[0];
    if (bootDisk.guestOsFeatures) {
        const guestFeatures = bootDisk.guestOsFeatures.map(f => f.type).filter(Boolean).map(t => t.toLowerCase());
        if (guestFeatures.includes('windows')) return 'Windows';
    }
    if (bootDisk.licenses) {
        const licenseLower = bootDisk.licenses[0].toLowerCase();
        if (licenseLower.includes('windows')) return 'Windows';
        if (licenseLower.includes('linux') || licenseLower.includes('debian') || licenseLower.includes('ubuntu')) return 'Linux';
    }
    return 'Unknown';
}

app.get('/', (req, res) => {
  res.status(200).send('Backend server is running and ready.');
});

app.post('/api/auth/google', async (req, res) => {
    const { id_token } = req.body;
    if (!id_token) return res.status(400).json({ message: 'Falta el ID Token.' });
    try {
        const ticket = await googleAuthClient.verifyIdToken({
            idToken: id_token,
            audience: GOOGLE_CLIENT_ID,
        });
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
            osType: await getVmOsType(vm),
        })));
        res.json(mappedVms);
    } catch (error) {
        console.error('[BACKEND] Error en /api/vms:', error.message);
        res.status(500).json({ message: 'Failed to fetch VMs.', error: error.message });
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
    // Validar las variables al inicio
    validateEnvironmentVariables();

    // Iniciar el servidor Express y empezar a escuchar
    app.listen(PORT, () => {
        console.log(`✅ Servidor Express iniciado y escuchando en el puerto ${PORT}`);
        console.log("   El endpoint de health check está activo.");
        console.log("   El siguiente paso es inicializar los clientes de Google Cloud...");
        
        initializeGoogleCloudClients();
    });

    // Limpieza de sesiones inactivas
    setInterval(() => {
        const now = new Date();
        const INACTIVITY_THRESHOLD_MS = 2 * 60 * 60 * 1000;
        userSessions.forEach((session, userId) => {
            if (now.getTime() - (session.lastActivity?.getTime() || 0) > INACTIVITY_THRESHOLD_MS) {
                console.log(`[Sessions] Eliminando sesión inactiva para: ${session.email}`);
                userSessions.delete(userId);
            }
        });
    }, 30 * 60 * 1000);
}

// ¡Ejecutar la función de arranque!
startServer();


