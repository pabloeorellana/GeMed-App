import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path'; 

const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath }); 

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

// CONSOLE LOGS PARA VERIFICAR
console.log(`Intentando cargar .env desde: ${envPath}`);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD is set:', !!process.env.DB_PASSWORD); 
console.log('DB_NAME:', process.env.DB_NAME);


const createUser = async (dni, email, password, fullName, role, specialty = null) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log("Conectado a la DB para crear usuario...");

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        const userId = uuidv4();

        const [existingUsers] = await connection.execute(
            'SELECT dni, email FROM Users WHERE dni = ? OR email = ?',
            [dni, email]
        );

        if (existingUsers.length > 0) {
            existingUsers.forEach(user => {
                if (user.dni === dni) {
                    console.error(`Error: El DNI ${dni} ya está registrado.`);
                }
                if (user.email === email) {
                    console.error(`Error: El email ${email} ya está registrado.`);
                }
            });
            return;
        }

        await connection.beginTransaction();

        await connection.execute(
            'INSERT INTO Users (id, dni, email, passwordHash, fullName, role, isActive) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, dni, email, passwordHash, fullName, role, true]
        );
        console.log(`Usuario ${fullName} (ID: ${userId}) creado con rol ${role}.`);

        if (role === 'PROFESSIONAL') {
            if (!specialty) {
                specialty = 'General';
            }
            await connection.execute(
                'INSERT INTO Professionals (userId, specialty) VALUES (?, ?)',
                [userId, specialty]
            );
            console.log(`Datos profesionales para ${fullName} creados con especialidad: ${specialty}.`);
        }

        await connection.commit();
        console.log('Usuario y datos adicionales (si aplica) guardados exitosamente.');

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error creando usuario:', error);
        } finally {
        if (connection) await connection.end();
        console.log("Conexión a DB cerrada.");
    }
};


createUser(
'11223344P',
'profesional1@nutrismart.com',
'ProfPass123!',
'Dr. Ejemplo Uno',
'PROFESSIONAL',
'Nutrición Deportiva'
).catch(err => console.error("Fallo la ejecución de createUser para Profesional:", err));