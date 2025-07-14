import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { protect, authorize } from './middleware/authMiddleware.js';
import userRoutes from './routes/userRoutes.js';
import availabilityRoutes from './routes/availabilityRoutes.js';
import patientRoutes from './routes/patientRoutes.js';

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET no está definida en .env (verificado en server.js)");
    process.exit(1);
}

const corsOptions = {
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let pool;
try {
    pool = mysql.createPool(dbConfig);
    console.log(`Conectado exitosamente a la base de datos MySQL: ${process.env.DB_NAME}`);
} catch (error) {
    console.error('Error al crear el pool de conexiones a la base de datos:', error);
    process.exit(1);
}

app.use((req, res, next) => {
    req.dbPool = pool;
    next();
});

// --- Definición de Rutas ---

//app.use('/api/auth', authRoutes); // Asumiendo que mueves el login a su propio archivo de rutas
app.use('/api/users', userRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/patients', patientRoutes); // <<<--- USAR LAS RUTAS DE PACIENTES

app.post('/api/auth/login', async (req, res) => {
    console.log('BACKEND LOGIN: Solicitud recibida en /api/auth/login');
    const { dni, password } = req.body;
    const currentPool = req.dbPool;

    if (!dni || !password) {
        console.log('BACKEND LOGIN: DNI o contraseña faltantes');
        return res.status(400).json({ message: 'DNI y contraseña son requeridos.' });
    }

    try {
        console.log('BACKEND LOGIN: Buscando usuario por DNI:', dni);
        const [users] = await currentPool.query('SELECT * FROM Users WHERE dni = ? AND isActive = TRUE', [dni]);
        
        if (users.length === 0) {
            console.log('BACKEND LOGIN: Usuario no encontrado o inactivo para DNI:', dni);
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        const user = users[0];
        console.log('BACKEND LOGIN: Usuario encontrado, comparando contraseña...');
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        console.log('BACKEND LOGIN: Contraseña coincide:', isMatch);

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
        
        console.log('BACKEND LOGIN: Enviando respuesta exitosa');
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

app.use('/api/users', userRoutes);
app.use('/api/availability', availabilityRoutes);

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Servidor NutriSmart está funcionando!' });
});

app.get('/api/professional/data', protect, authorize('PROFESSIONAL'), (req, res) => {
    res.json({ message: `Bienvenido Profesional ${req.user.fullName}! Tus datos específicos están aquí.`});
});

app.use((err, req, res, next) => {
    console.error('ERROR GLOBAL:', err.stack);
    res.status(500).send('¡Algo salió mal en el servidor!');
});

app.listen(PORT, () => {
    console.log(`Servidor backend NutriSmart corriendo en http://localhost:${PORT}`);
});