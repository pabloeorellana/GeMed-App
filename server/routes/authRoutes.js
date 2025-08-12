// server/routes/authRoutes.js
import express from 'express';
import { loginUser } from '../controllers/authController.js'; // Crearemos este controlador

const router = express.Router();

router.post('/login', loginUser);
// Aquí irían otras rutas de auth como /forgot-password, /reset-password

export default router;