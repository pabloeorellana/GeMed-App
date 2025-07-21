import express from 'express';
import { getPatients, createPatient, updatePatient } from '../controllers/patientController.js';
import { getClinicalRecords, addClinicalRecord } from '../controllers/clinicalRecordController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Aplicar middlewares a todas las rutas de este archivo
router.use(protect);
router.use(authorize('PROFESSIONAL', 'ADMIN'));

router.route('/')
    .get(getPatients)
    .post(createPatient);

router.route('/:id')
    .put(updatePatient);
    // Podrías añadir GET /:id para obtener un solo paciente y DELETE /:id si fuera necesario

router.route('/:patientId/clinical-records')
    .get(getClinicalRecords)
    .post(addClinicalRecord);
    
export default router;