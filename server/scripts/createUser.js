import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import mysql from 'mysql2/promise';
// No necesitamos 'dotenv' ni 'path' aquí, ya que se maneja en el comando npm

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
};

// Logs para verificar las variables cargadas
console.log('--- Configuración de DB a usar ---');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('---------------------------------');

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
                if (user.dni === dni) console.error(`Error: El DNI ${dni} ya está registrado.`);
                if (user.email === email) console.error(`Error: El email ${email} ya está registrado.`);
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
            await connection.execute(
                'INSERT INTO Professionals (userId, specialty) VALUES (?, ?)',
                [userId, specialty || 'General']
            );
            console.log(`Datos profesionales para ${fullName} creados.`);
        }

        await connection.commit();
        console.log('Usuario guardado exitosamente.');

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error creando usuario:', error);
    } finally {
        if (connection) await connection.end();
        console.log("Conexión a DB cerrada.");
    }
};

const userToCreate = {
    dni: 'administrador',
    email: 'administrador@nutrismart.com',
    password: 'AdminPassword123!',
    fullName: 'Administrador del Sistema',
    role: 'ADMIN',
    specialty: null
};

console.log(`\nIniciando creación de usuario con rol: ${userToCreate.role}`);
createUser(
    userToCreate.dni,
    userToCreate.email,
    userToCreate.password,
    userToCreate.fullName,
    userToCreate.role,
    userToCreate.specialty
);