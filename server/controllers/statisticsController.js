// @desc    Obtener estadísticas de turnos para el profesional logueado
// @route   GET /api/statistics
// @access  Privado (PROFESSIONAL, ADMIN)
export const getStatistics = async (req, res) => {
    const pool = req.dbPool;
    const professionalUserId = req.user.userId;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Se requieren fechas de inicio y fin.' });
    }

    try {
        // Ejecutar todas las consultas de agregación en paralelo
        const [totalAppointmentsResult, uniquePatientsResult, appointmentsByStatusResult] = await Promise.all([
            // 1. Contar el total de turnos (excluyendo cancelados)
            pool.query(
                'SELECT COUNT(*) as count FROM Appointments WHERE professionalUserId = ? AND dateTime BETWEEN ? AND ? AND status NOT LIKE ?',
                [professionalUserId, `${startDate} 00:00:00`, `${endDate} 23:59:59`, 'CANCELED%']
            ),
            // 2. Contar pacientes únicos (excluyendo cancelados)
            pool.query(
                'SELECT COUNT(DISTINCT patientId) as count FROM Appointments WHERE professionalUserId = ? AND dateTime BETWEEN ? AND ? AND status NOT LIKE ?',
                [professionalUserId, `${startDate} 00:00:00`, `${endDate} 23:59:59`, 'CANCELED%']
            ),
            // 3. Agrupar turnos por estado
            pool.query(
                'SELECT status, COUNT(*) as count FROM Appointments WHERE professionalUserId = ? AND dateTime BETWEEN ? AND ? GROUP BY status',
                [professionalUserId, `${startDate} 00:00:00`, `${endDate} 23:59:59`]
            )
        ]);

        const totalAppointments = totalAppointmentsResult[0][0].count || 0;
        const uniquePatients = uniquePatientsResult[0][0].count || 0;
        const appointmentsByStatusRaw = appointmentsByStatusResult[0];

        // Mapear los nombres de estado a los nombres de la UI
        const statusDetails = {
            COMPLETED: { label: 'Completados' },
            SCHEDULED: { label: 'Programados' },
            CONFIRMED: { label: 'Confirmados' },
            CANCELED_PROFESSIONAL: { label: 'Cancelado (Prof.)' },
            CANCELED_PATIENT: { label: 'Cancelado (Pac.)' },
            NO_SHOW: { label: 'No Asistió' },
        };

        const appointmentsByStatus = appointmentsByStatusRaw.map(item => ({
            name: statusDetails[item.status]?.label || item.status,
            value: item.count,
            key: item.status
        }));
        
        res.json({
            totalAppointments,
            uniquePatients,
            appointmentsByStatus
        });

    } catch (error) {
        console.error('Error en getStatistics:', error);
        res.status(500).json({ message: 'Error del servidor al obtener estadísticas' });
    }
};

// @desc    Obtener la lista detallada de turnos para un reporte
// @route   GET /api/statistics/appointments-list
// @access  Privado (PROFESSIONAL, ADMIN)
export const getAppointmentsListForReport = async (req, res) => {
    const pool = req.dbPool;
    const professionalUserId = req.user.userId;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Se requieren fechas de inicio y fin.' });
    }

    try {
        const query = `
            SELECT 
                a.dateTime,
                p.fullName AS patientName,
                a.status,
                cr.pathology,
                a.reasonForVisit
            FROM Appointments a
            JOIN Patients p ON a.patientId = p.id
            LEFT JOIN ClinicalRecords cr ON a.id = cr.appointmentId
            WHERE a.professionalUserId = ? 
              AND a.dateTime BETWEEN ? AND ?
            ORDER BY a.dateTime DESC
        `;
        const [appointmentsList] = await pool.query(query, [professionalUserId, `${startDate} 00:00:00`, `${endDate} 23:59:59`]);
        
        res.json(appointmentsList);

    } catch (error) {
        console.error('Error en getAppointmentsListForReport:', error);
        res.status(500).json({ message: 'Error del servidor al obtener la lista de turnos' });
    }
};