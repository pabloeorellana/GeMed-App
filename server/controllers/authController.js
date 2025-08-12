import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Función para generar un token JWT
const generateToken = (id) => {
    // Es crucial que JWT_SECRET esté definido en tus variables de entorno (.env)
    // y sea accesible en el entorno de Railway.
    if (!process.env.JWT_SECRET) {
        // En un escenario real, podrías querer lanzar un error más específico
        // o manejarlo de otra forma si la aplicación no puede funcionar sin él.
        console.error("FATAL ERROR: JWT_SECRET no está definida en .env para generar el token.");
        // Podrías lanzar un error que sea capturado por el manejador de errores global
        throw new Error("Server configuration error: JWT_SECRET not defined.");
    }
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '1d', // El token expira en 1 día. Puedes ajustarlo según tus necesidades.
    });
};

/**
 * @desc Autenticar usuario y obtener token
 * @route POST /api/auth/login
 * @access Public
 */
export const loginUser = async (req, res, next) => {
    const { email, password } = req.body;

    // Acceder al pool de conexiones de la base de datos que se adjuntó en el middleware de server.js
    const pool = req.dbPool;

    try {
        // 1. Validar que se recibieron email y password
        if (!email || !password) {
            return res.status(400).json({ message: 'Por favor, ingrese email y contraseña.' });
        }

        // 2. Buscar el usuario en la base de datos por email
        // Usamos pool.execute para consultas preparadas, más seguras contra inyección SQL.
        const [rows] = await pool.execute(
            'SELECT user_id, email, password, role, full_name FROM users WHERE email = ?',
            [email]
        );

        const user = rows[0]; // El primer elemento del array `rows` es el usuario, si se encuentra.

        // 3. Verificar si el usuario existe
        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // 4. Comparar la contraseña ingresada con la contraseña hasheada almacenada
        // bcrypt.compare devuelve una promesa.
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // 5. Si las credenciales son correctas, generar un token JWT
        const token = generateToken(user.user_id);

        // 6. Enviar respuesta exitosa con los datos del usuario y el token
        res.status(200).json({
            user_id: user.user_id,
            email: user.email,
            fullName: user.full_name,
            role: user.role,
            token, // Se envía el token al cliente
            message: 'Inicio de sesión exitoso.'
        });

    } catch (error) {
        console.error('Error en loginUser:', error);
        // Pasar el error al manejador de errores global de Express.
        // Esto es importante para que los errores sean manejados de forma consistente
        // y no se queden colgando las peticiones.
        next(error);
    }
};

// Puedes añadir otras funciones de autenticación aquí según sea necesario,
// por ejemplo, para registrar nuevos usuarios, manejar recuperación de contraseña, etc.
// export const registerUser = async (req, res, next) => { /* ... */ };
// export const forgotPassword = async (req, res, next) => { /* ... */ };