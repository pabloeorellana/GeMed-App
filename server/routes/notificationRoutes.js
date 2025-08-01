import express from 'express';
import { getNotifications, markNotificationsAsRead } from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // Todas las rutas de notificaciones son protegidas

router.route('/').get(getNotifications);
router.route('/mark-as-read').put(markNotificationsAsRead);

export default router;