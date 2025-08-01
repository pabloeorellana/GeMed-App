// server/routes/adminRoutes.js
import express from 'express';
import { getAllUsers, createUser, getUserById, updateUser, deleteUser } from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Aplicar middleware para asegurar que solo los admins accedan a estas rutas
router.use(protect);
router.use(authorize('ADMIN'));

router.route('/users')
    .get(getAllUsers)
    .post(createUser);

router.route('/users/:id')
    .get(getUserById)
    .put(updateUser)
    .delete(deleteUser);

export default router;