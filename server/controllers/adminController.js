// server/controllers/adminController.js
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// @desc    Obtener todos los usuarios del sistema
// @route   GET /api/admin/users
// @access  Privado (ADMIN)
export const getAllUsers = async (req, res) => {
    const pool = req.dbPool;
    try {
        const [users] = await pool.query(
            'SELECT id, dni, fullName, email, role, isActive, createdAt FROM Users'
        );
        res.json(users);
    } catch (error) {
        console.error('Error en getAllUsers:', error);
        res.status(500).json({ message: 'Error del servidor al obtener usuarios.' });
    }
};

// @desc    Crear un nuevo usuario (Profesional o Admin)
// @route   POST /api/admin/users
// @access  Privado (ADMIN)
export const createUser = async (req, res) => {
    const pool = req.dbPool;
    const { dni, email, password, fullName, role, specialty } = req.body;

    if (!dni || !email || !password || !fullName || !role) {
        return res.status(400).json({ message: 'Faltan campos requeridos (dni, email, password, fullName, role).' });
    }
    if (role === 'PROFESSIONAL' && !specialty) {
        return res.status(400).json({ message: 'La especialidad es requerida para el rol Profesional.' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [existing] = await connection.query('SELECT dni, email FROM Users WHERE dni = ? OR email = ?', [dni, email]);
        if (existing.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'El DNI o el email ya están registrados.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const userId = uuidv4();

        await connection.query(
            'INSERT INTO Users (id, dni, email, passwordHash, fullName, role) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, dni, email, passwordHash, fullName, role]
        );

        if (role === 'PROFESSIONAL') {
            await connection.query(
                'INSERT INTO Professionals (userId, specialty) VALUES (?, ?)',
                [userId, specialty]
            );
        }

        await connection.commit();
        
        const [newUser] = await connection.query('SELECT id, dni, fullName, email, role, isActive, createdAt FROM Users WHERE id = ?', [userId]);
        res.status(201).json(newUser[0]);

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error en createUser (admin):', error);
        res.status(500).json({ message: 'Error del servidor al crear el usuario.' });
    } finally {
        if (connection) connection.release();
    }
};

// @desc    Actualizar un usuario
// @route   PUT /api/admin/users/:id
// @access  Privado (ADMIN)
export const updateUser = async (req, res) => {
    const pool = req.dbPool;
    const { id: userId } = req.params;
    const { fullName, email, role, isActive, specialty } = req.body;

    // Validación básica
    if (!fullName || !email || !role) {
        return res.status(400).json({ message: 'Nombre, email y rol son requeridos.' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Actualizar la tabla Users
        await connection.query(
            'UPDATE Users SET fullName = ?, email = ?, role = ?, isActive = ? WHERE id = ?',
            [fullName, email, role, isActive, userId]
        );

        // Si el rol es PROFESIONAL, actualizar o insertar en la tabla Professionals
        if (role === 'PROFESSIONAL') {
            const [existingProfile] = await connection.query('SELECT userId FROM Professionals WHERE userId = ?', [userId]);
            if (existingProfile.length > 0) {
                await connection.query(
                    'UPDATE Professionals SET specialty = ? WHERE userId = ?',
                    [specialty || '', userId]
                );
            } else {
                await connection.query(
                    'INSERT INTO Professionals (userId, specialty) VALUES (?, ?)',
                    [userId, specialty || '']
                );
            }
        }

        await connection.commit();
        res.json({ message: 'Usuario actualizado exitosamente.' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error en updateUser (admin):', error);
        res.status(500).json({ message: 'Error del servidor al actualizar usuario.' });
    } finally {
        if (connection) connection.release();
    }
};

// @desc    Eliminar un usuario
// @route   DELETE /api/admin/users/:id
// @access  Privado (ADMIN)
export const deleteUser = async (req, res) => {
    const pool = req.dbPool;
    const { id: userId } = req.params;
    try {
        await pool.query('DELETE FROM Users WHERE id = ?', [userId]);
        res.json({ message: 'Usuario eliminado.' });
    } catch (error) {
        console.error('Error en deleteUser (admin):', error);
        res.status(500).json({ message: 'Error del servidor al eliminar usuario.' });
    }
};

// @desc    Obtener un usuario por su ID
// @route   GET /api/admin/users/:id
// @access  Privado (ADMIN)
export const getUserById = async (req, res) => {
    const pool = req.dbPool;
    const { id: userId } = req.params;
    try {
        // Unir con Professionals para obtener la especialidad si el usuario es un profesional
        const [users] = await pool.query(`
            SELECT u.id, u.dni, u.fullName, u.email, u.role, u.isActive, p.specialty 
            FROM Users u
            LEFT JOIN Professionals p ON u.id = p.userId
            WHERE u.id = ?
        `, [userId]);

        if (users.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        res.json(users[0]);
    } catch (error) {
        console.error('Error en getUserById (admin):', error);
        res.status(500).json({ message: 'Error del servidor al obtener el usuario.' });
    }
};
