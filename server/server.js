// server/server.js
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import mysql from 'mysql2/promise';

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
import authRoutes from './routes/authRoutes.js';
import catalogRoutes from './routes/catalogRoutes.js'; // <-- NUEVA RUTA

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET no está definida en .env");
    process.exit(1);
}

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
        'http://localhost:5173',
        process.env.FRONTEND_URL
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

app.use((req, res, next) => {
    req.dbPool = pool;
    next();
});

app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

// --- Definición de Rutas ---
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/clinical-records', clinicalRecordRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/catalogs', catalogRoutes); // <-- AÑADIR NUEVA RUTA

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
    console.log(`Servidor backend NutriSmart corriendo en el puerto: ${PORT}`);
});

//Forzar redeploy final para prueba webhoook