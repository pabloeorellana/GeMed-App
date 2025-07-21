// server/routes/publicRoutes.js
import express from 'express';
import { lookupPatientByDni } from '../controllers/patientController.js';
import { getAvailability } from '../controllers/availabilityController.js';
import { createPublicAppointment } from '../controllers/appointmentController.js';

const router = express.Router();

router.get('/availability', getAvailability);
router.get('/patients/lookup', lookupPatientByDni);
router.post('/appointments', createPublicAppointment);

export default router;