// server/controllers/authController.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export const loginUser = async (req, res) => {
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
};