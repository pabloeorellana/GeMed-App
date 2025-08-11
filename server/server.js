// server.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Importación de Middlewares y Routers
import { protect, authorize } from './middleware/authMiddleware.js';
import userRoutes from './routes/userRoutes.js';
import availabilityRoutes from './routes/availabilityRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import clinicalRecordRoutes from './routes/clinicalRecordRoutes.js';
import statisticsRoutes from './routes/statisticsRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET no está definida en .env");
    process.exit(1);
}

const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5173'; 

const corsOptions = {
  origin: [frontendURL, 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

// --- Middlewares Globales ---
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Configuración y Pool de Base de Datos ---
const connectionOptions = process.env.DATABASE_URL
    ? { uri: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        timezone: '+00:00'
      };

let pool;
try {
    pool = mysql.createPool(connectionOptions);
    console.log(`Conectado exitosamente a la base de datos.`);
} catch (error) {
    console.error('Error al crear el pool de conexiones a la base de datos:', error);
    process.exit(1);
}

// Middleware para añadir el pool de DB a cada request
app.use((req, res, next) => {
    req.dbPool = pool;
    next();
});

// Middleware para servir archivos estáticos (subidas)
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

// --- Definición de Rutas ---

// 1. Rutas Públicas (no requieren autenticación)
app.use('/api/public', publicRoutes);

// 2. Ruta de Autenticación (también pública)
app.post('/api/auth/login', async (req, res) => {
    const { dni, password } = req.body;
    const currentPool = req.dbPool;

    if (!dni || !password) {
        return res.status(400).json({ message: 'DNI y contraseña son requeridos.' });
    }

    try {
        const [users] = await currentPool.query('SELECT * FROM Users WHERE dni = ? AND isActive = TRUE', [dni]);
        
        if (users.length === 0) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.passwordHash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }
        
        const payload = {
            userId: user.id,
            dni: user.dni,
            role: user.role,
            fullName: user.fullName
        };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
        await currentPool.query('UPDATE Users SET lastLogin = NOW() WHERE id = ?', [user.id]);
        
        res.json({
            token,
            user: {
                id: user.id,
                dni: user.dni,
                fullName: user.fullName,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('BACKEND LOGIN: Error en login:', error);
        res.status(500).json({ message: 'Error interno del servidor durante el login.' });
    }
});

// 3. Rutas Protegidas
app.use('/api/users', userRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/clinical-records', clinicalRecordRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/professional/data', protect, authorize('PROFESSIONAL'), (req, res) => {
    res.json({ message: `Bienvenido Profesional ${req.user.fullName}! Tus datos específicos están aquí.`});
});

// 4. Ruta de Health Check (al final de las rutas, antes del manejador de errores)
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Servidor NutriSmart está funcionando!' });
});

// --- Manejador de Errores Global ---
app.use((err, req, res, next) => {
    console.error('--- ERROR GLOBAL CAPTURADO ---');
    console.error('Mensaje:', err.message);
    console.error('Stack:', err.stack);
    console.error('-----------------------------');
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

app.listen(PORT, () => {
    console.log(`Servidor backend NutriSmart corriendo en http://localhost:${PORT}`);
});

// ... (todo tu server.js hasta antes del manejador de errores)

// Ruta de Health Check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Servidor NutriSmart está funcionando!' });
});

// --- LOG PARA VERIFICAR RUTAS REGISTRADAS ---
console.log("--- RUTAS REGISTRADAS EN EXPRESS ---");
const registeredRoutes = [];
app._router.stack.forEach(function(r){
  if (r.route && r.route.path){
    registeredRoutes.push(`${Object.keys(r.route.methods).join(', ').toUpperCase()} ${r.route.path}`);
  } else if (r.name === 'router') { // Para routers anidados como app.use('/api/users', userRoutes)
    r.handle.stack.forEach(function(nested) {
        if (nested.route && nested.route.path) {
            const prefix = r.regexp.source.replace('^\\', '').replace('\\/?(?=\\/|$)',''); // Obtener prefijo
            registeredRoutes.push(`${Object.keys(nested.route.methods).join(', ').toUpperCase()} ${prefix}${nested.route.path}`);
        }
    });
  }
});
registeredRoutes.sort().forEach(route => console.log(route));
console.log("------------------------------------");
// --- FIN DEL LOG ---


// --- Manejador de Errores Global ---
app.use((err, req, res, next) => {
    console.error('--- ERROR GLOBAL CAPTURADO ---');
    console.error('Mensaje:', err.message);
    console.error('Stack:', err.stack);
    console.error('-----------------------------');
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

app.listen(PORT, () => {
    console.log(`Servidor backend NutriSmart corriendo en el puerto: ${PORT}`);
});