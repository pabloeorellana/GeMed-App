// server/controllers/adminController.js
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// @desc    Obtener todos los usuarios del sistema (incluyendo inactivos para el admin)
// @route   GET /api/admin/users
// @access  Privado (ADMIN)
export const getAllUsers = async (req, res) => {
    const pool = req.dbPool;
    try {
        const [users] = await pool.query(
            'SELECT id, dni, fullName, email, role, isActive, createdAt FROM Users ORDER BY fullName ASC'
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

// @desc    Desactivar/Reactivar un usuario (Soft Delete)
// @route   DELETE /api/admin/users/:id
// @access  Privado (ADMIN)
export const toggleUserStatus = async (req, res) => {
    const pool = req.dbPool;
    const { id: userId } = req.params;
    
    // Evitar que el admin se desactive a sí mismo
    if (req.user.userId === userId) {
        return res.status(400).json({ message: 'No puede desactivar su propia cuenta de administrador.' });
    }

    try {
        // Primero, obtenemos el estado actual del usuario
        const [users] = await pool.query('SELECT isActive FROM Users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        
        const currentStatus = users[0].isActive;
        const newStatus = !currentStatus; // Invertir el estado

        // Actualizar el estado
        await pool.query('UPDATE Users SET isActive = ? WHERE id = ?', [newStatus, userId]);
        
        const action = newStatus ? 'reactivado' : 'desactivado';
        res.json({ message: `Usuario ${action} exitosamente.` });
    } catch (error) {
        console.error('Error en toggleUserStatus (admin):', error);
        res.status(500).json({ message: 'Error del servidor al cambiar el estado del usuario.' });
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

// @desc    Restablecer la contraseña de un usuario
// @route   PUT /api/admin/users/:id/reset-password
// @access  Privado (ADMIN)
export const resetUserPassword = async (req, res) => {
    const pool = req.dbPool;
    const { id: userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: 'La nueva contraseña es requerida y debe tener al menos 6 caracteres.' });
    }

    try {
        const [users] = await pool.query('SELECT id FROM Users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        await pool.query(
            'UPDATE Users SET passwordHash = ? WHERE id = ?',
            [passwordHash, userId]
        );

        res.json({ message: 'Contraseña restablecida exitosamente.' });
    } catch (error) {
        console.error('Error en resetUserPassword (admin):', error);
        res.status(500).json({ message: 'Error del servidor al restablecer la contraseña.' });
    }
};

// NUEVA FUNCIÓN
// @desc    Eliminar un paciente permanentemente (Hard Delete)
// @route   DELETE /api/admin/patients/:id
// @access  Privado (ADMIN)
export const deletePatientPermanently = async (req, res) => {
    const pool = req.dbPool;
    const { id: patientId } = req.params;

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Eliminar registros de ClinicalRecords asociados
        await connection.execute(
            'DELETE FROM ClinicalRecords WHERE patientId = ?',
            [patientId]
        );

        // Eliminar turnos asociados
        await connection.execute(
            'DELETE FROM Appointments WHERE patientId = ?',
            [patientId]
        );

        // Finalmente, eliminar el paciente
        const [patientResult] = await connection.execute(
            'DELETE FROM Patients WHERE id = ?',
            [patientId]
        );

        if (patientResult.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Paciente no encontrado.' });
        }

        await connection.commit();
        res.json({ message: 'Paciente y todos sus datos asociados han sido eliminados permanentemente.' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error en deletePatientPermanently (admin):', error);
        res.status(500).json({ message: 'Error del servidor al eliminar el paciente.' });
    } finally {
        if (connection) connection.release();
    }
};