// server/routes/adminRoutes.js
import express from 'express';
import { 
    getAllUsers, createUser, getUserById, updateUser, toggleUserStatus, resetUserPassword,
    deletePatientPermanently // <-- IMPORTAR NUEVA FUNCIÓN
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize('ADMIN'));

// Rutas de Usuarios
router.route('/users')
    .get(getAllUsers)
    .post(createUser);

router.route('/users/:id')
    .get(getUserById)
    .put(updateUser)
    .delete(toggleUserStatus);

router.route('/users/:id/reset-password')
    .put(resetUserPassword);

// NUEVA RUTA PARA PACIENTES
router.route('/patients/:id')
    .delete(deletePatientPermanently); // <-- AÑADIR NUEVA RUTA

export default router;