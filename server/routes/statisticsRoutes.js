import express from 'express';
// Asegúrate de que ambos controladores se importen correctamente
import { getStatistics, getAppointmentsListForReport } from '../controllers/statisticsController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize('PROFESSIONAL', 'ADMIN'));

router.route('/')
    .get(getStatistics);

router.route('/appointments-list')
    .get(getAppointmentsListForReport); // Aquí se usa la función importada

export default router;