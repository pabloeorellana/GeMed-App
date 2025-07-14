import express from 'express';
import { getMyUserProfile, updateMyUserProfile, getMyProfessionalProfile, updateMyProfessionalProfile } from '../controllers/userController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

    // Rutas para el perfil del usuario general (tabla Users)
router.route('/me')
    .get(protect, getMyUserProfile) 
    .put(protect, updateMyUserProfile); 

    // Rutas específicas para el perfil profesional (tabla Professionals)
    // Solo accesibles por usuarios con rol 'PROFESSIONAL' (y quizás 'ADMIN')
router.route('/professionals/me')
    .get(protect, authorize('PROFESSIONAL', 'ADMIN'), getMyProfessionalProfile)
    .put(protect, authorize('PROFESSIONAL', 'ADMIN'), updateMyProfessionalProfile);

export default router;