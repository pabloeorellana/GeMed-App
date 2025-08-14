// server/routes/catalogRoutes.js
import express from 'express';
import {
    getSpecialties, createSpecialty, updateSpecialty, deleteSpecialty,
    getPathologies, createPathology, updatePathology, deletePathology
} from '../controllers/catalogController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Rutas de lectura (para todos los usuarios autenticados)
router.use(protect);
router.get('/specialties', getSpecialties);
router.get('/pathologies', getPathologies);

// Rutas de escritura (solo para administradores)
router.post('/specialties', authorize('ADMIN'), createSpecialty);
router.put('/specialties/:id', authorize('ADMIN'), updateSpecialty);
router.delete('/specialties/:id', authorize('ADMIN'), deleteSpecialty);

router.post('/pathologies', authorize('ADMIN'), createPathology);
router.put('/pathologies/:id', authorize('ADMIN'), updatePathology);
router.delete('/pathologies/:id', authorize('ADMIN'), deletePathology);

export default router;