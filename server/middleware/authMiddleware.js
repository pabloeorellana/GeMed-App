import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error("FATAL ERROR (authMiddleware): JWT_SECRET no está definida.");
    process.exit(1);
}

export const protect = async (req, res, next) => {
        console.log(`AUTH_MIDDLEWARE (protect): Verificando ruta ${req.originalUrl}`); // LOG
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            // Verificacion del token
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
            console.log(`AUTH_MIDDLEWARE (protect): Token verificado para userId: ${req.user.userId}`); // LOG
            next(); 
        } catch (error) {
            console.error('Error de autenticación de token:', error.message);
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expirado, por favor inicie sesión de nuevo.' });
            }
            return res.status(401).json({ message: 'No autorizado, token inválido.' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'No autorizado, no se proporcionó token.' });
    }
};

// Middleware de Autorización
export const authorize = (...roles) => { 
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({ message: 'No autorizado (usuario o rol no definido en token).' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: `Rol '${req.user.role}' no autorizado para acceder a este recurso.` });
        }
        next();
    };
};