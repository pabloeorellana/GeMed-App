// server/controllers/userController.js
import { v4 as uuidv4 } from 'uuid';

export const getMyUserProfile = async (req, res) => {
    const pool = req.dbPool;
    try {
        const [users] = await pool.query(
            'SELECT id, dni, email, fullName, phone, role, isActive, googleId, lastLogin, createdAt, updatedAt FROM Users WHERE id = ?',
            [req.user.userId]
        );

        if (users.length > 0) {
            res.json(users[0]);
        } else {
            res.status(404).json({ message: 'Usuario no encontrado' });
        }
    } catch (error) { // <<<--- AÑADIR LLAVES
        console.error('Error en getMyUserProfile:', error);
        res.status(500).json({ message: 'Error del servidor al obtener perfil del usuario' });
    } // <<<--- AÑADIR LLAVES
};

export const updateMyUserProfile = async (req, res) => {
    const pool = req.dbPool;
    const { fullName, email, phone } = req.body;

    if (!fullName || !email) {
        return res.status(400).json({ message: 'Nombre completo y email son requeridos' });
    }

    try {
        if (email !== req.user.email) {
            const [existingEmail] = await pool.query('SELECT id FROM Users WHERE email = ? AND id != ?', [email, req.user.userId]);
            if (existingEmail.length > 0) {
                return res.status(400).json({ message: 'El correo electrónico ya está en uso por otro usuario.' });
            }
        }

        const query = 'UPDATE Users SET fullName = ?, email = ?, phone = ?, updatedAt = NOW() WHERE id = ?';
        const params = [fullName, email, phone || null, req.user.userId];

        const [result] = await pool.query(query, params);

        if (result.affectedRows > 0) {
            const [updatedUsers] = await pool.query(
                'SELECT id, dni, email, fullName, phone, role FROM Users WHERE id = ?',
                [req.user.userId]
            );
            res.json(updatedUsers[0]);
        } else {
            res.status(404).json({ message: 'Usuario no encontrado para actualizar' });
        }
    } catch (error) { // <<<--- AÑADIR LLAVES
        console.error('Error en updateMyUserProfile:', error);
        res.status(500).json({ message: 'Error del servidor al actualizar perfil del usuario' });
    } // <<<--- AÑADIR LLAVES
};

export const getMyProfessionalProfile = async (req, res) => {
    const pool = req.dbPool;
    try {
        const [professionals] = await pool.query(
            'SELECT userId, specialty, description, createdAt, updatedAt FROM Professionals WHERE userId = ?',
            [req.user.userId]
        );

        if (professionals.length > 0) {
            res.json(professionals[0]);
        } else {
            res.status(200).json({ specialty: '', description: '' });
        }
    } catch (error) { // <<<--- AÑADIR LLAVES
        console.error('Error en getMyProfessionalProfile:', error);
        res.status(500).json({ message: 'Error del servidor al obtener perfil profesional' });
    } // <<<--- AÑADIR LLAVES
};

export const updateMyProfessionalProfile = async (req, res) => {
    const pool = req.dbPool;
    const { specialty, description } = req.body;

    try {
        const [existingProfile] = await pool.query('SELECT userId FROM Professionals WHERE userId = ?', [req.user.userId]);

        if (existingProfile.length > 0) {
            const [result] = await pool.query(
                'UPDATE Professionals SET specialty = ?, description = ?, updatedAt = NOW() WHERE userId = ?',
                [specialty || null, description || null, req.user.userId]
            );
            if (result.affectedRows > 0) {
                const [updatedProfessionals] = await pool.query(
                    'SELECT userId, specialty, description FROM Professionals WHERE userId = ?',
                    [req.user.userId]
                );
                res.json(updatedProfessionals[0]);
            } else {
                res.status(404).json({ message: 'Perfil profesional no se pudo actualizar.' });
            }
        } else {
            const [insertResult] = await pool.query(
                'INSERT INTO Professionals (userId, specialty, description) VALUES (?, ?, ?)',
                [req.user.userId, specialty || null, description || null]
            );
            if (insertResult.affectedRows > 0) {
                 const [newProfessionals] = await pool.query(
                    'SELECT userId, specialty, description FROM Professionals WHERE userId = ?',
                    [req.user.userId]
                );
                return res.status(201).json(newProfessionals[0]);
            }
            res.status(500).json({ message: 'Error al crear el perfil profesional.' });
        }
    } catch (error) { // <<<--- AÑADIR LLAVES
        console.error('Error en updateMyProfessionalProfile:', error);
        res.status(500).json({ message: 'Error del servidor al actualizar perfil profesional' });
    } // <<<--- AÑADIR LLAVES
};