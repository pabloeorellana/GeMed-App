export const getAppointments = async (req, res) => {
    const pool = req.dbPool;
    const { startDate, endDate, patientId, professionalId_admin } = req.query;
    const loggedInUserId = req.user.userId;
    const loggedInUserRole = req.user.role;

    let query = `
        SELECT 
            a.id, a.dateTime, a.status, a.reasonForVisit, a.professionalNotes, a.patientNotes,
            p.fullName as patientFullName, p.dni as patientDni, p.email as patientEmail, p.phone as patientPhone,
            uProf.fullName as professionalFullName 
        FROM Appointments a
        JOIN Users uProf ON a.professionalUserId = uProf.id
        LEFT JOIN Patients p ON a.patientId = p.id 
        WHERE 1=1 
    `; 

    const queryParams = [];

    if (loggedInUserRole === 'PROFESSIONAL') {
        query += ' AND a.professionalUserId = ?';
        queryParams.push(loggedInUserId);
    } else if (loggedInUserRole === 'ADMIN' && professionalId_admin) {
        query += ' AND a.professionalUserId = ?';
        queryParams.push(professionalId_admin);
    }

    if (startDate) {
        query += ' AND a.dateTime >= ?';
        queryParams.push(new Date(startDate).toISOString().slice(0, 19).replace('T', ' '));
    }
    if (endDate) {
        query += ' AND a.dateTime <= ?';
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        queryParams.push(endOfDay.toISOString().slice(0, 19).replace('T', ' '));
    }
     if (patientId) {
        query += ' AND a.patientId = (SELECT id FROM Patients WHERE dni = ? LIMIT 1)';
        queryParams.push(patientId);
    }

    query += ' ORDER BY a.dateTime ASC';

    try {
        const [appointments] = await pool.query(query, queryParams);
        const events = appointments.map(appt => ({
            id: appt.id,
            title: appt.patientFullName || 'Turno Reservado', 
            start: new Date(appt.dateTime).toISOString(),
            end: new Date(new Date(appt.dateTime).getTime() + 30 * 60000).toISOString(),
            extendedProps: {
                patientId: appt.patientId, 
                patientDni: appt.patientDni,
                patientEmail: appt.patientEmail,
                patientPhone: appt.patientPhone,
                reasonForVisit: appt.reasonForVisit,
                status: appt.status,
                professionalNotes: appt.professionalNotes,
            },
        }));
        res.json(events);
    } catch (error) {
        console.error('Error en getAppointments:', error);
        res.status(500).json({ message: 'Error del servidor al obtener turnos' });
    }
};

export const createManualAppointment = async (req, res) => {
    const pool = req.dbPool;
    const professionalUserId = req.user.userId;
    const { patientId,
            dateTime,
            reasonForVisit,
           } = req.body;

    if (!patientId || !dateTime) {
        return res.status(400).json({ message: 'ID de paciente y fecha/hora son requeridos.' });
    }

    try {
        const appointmentDateTime = new Date(dateTime).toISOString().slice(0, 19).replace('T', ' ');
        const newAppointmentId = `appt_${uuidv4().substring(0,12)}`; 

        const [result] = await pool.query(
            'INSERT INTO Appointments (id, professionalUserId, patientId, dateTime, reasonForVisit, status) VALUES (?, ?, ?, ?, ?, ?)',
            [newAppointmentId, professionalUserId, patientId, appointmentDateTime, reasonForVisit || null, 'SCHEDULED']
        );
        
        const [newAppt] = await pool.query('SELECT * FROM Appointments WHERE id = ?', [newAppointmentId]);
        const patientQuery = await pool.query('SELECT * FROM Patients WHERE id = ?', [patientId]);
        const patientData = patientQuery[0][0];

        const event = {
            id: newAppt[0].id,
            title: patientData.fullName,
            start: new Date(newAppt[0].dateTime).toISOString(),
            end: new Date(new Date(newAppt[0].dateTime).getTime() + 30 * 60000).toISOString(), 
            extendedProps: {
                patientId: newAppt[0].patientId,
                patientDni: patientData.dni,
                patientEmail: patientData.email,
                patientPhone: patientData.phone,
                reasonForVisit: newAppt[0].reasonForVisit,
                status: newAppt[0].status,
                professionalNotes: newAppt[0].professionalNotes,
            }
        };
        res.status(201).json(event);

    } catch (error) {
        console.error('Error en createManualAppointment:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Ya existe un turno para este profesional en la fecha y hora seleccionadas.' });
        }
        res.status(500).json({ message: 'Error del servidor al crear el turno' });
    }
};

export const updateAppointmentStatus = async (req, res) => {
    const pool = req.dbPool;
    const { appointmentId } = req.params;
    const { status } = req.body;
    const professionalUserId = req.user.userId; 

    if (!status || !availableStatuses.includes(status.toUpperCase())) { 
        return res.status(400).json({ message: 'Estado inválido proporcionado.' });
    }

    try {
        const [result] = await pool.query(
            'UPDATE Appointments SET status = ? WHERE id = ? AND professionalUserId = ?',
            [status.toUpperCase(), appointmentId, professionalUserId]
        );
        if (result.affectedRows > 0) {
            res.json({ message: 'Estado del turno actualizado.' });
        } else {
            res.status(404).json({ message: 'Turno no encontrado o no autorizado para modificar.' });
        }
    } catch (error) {
        console.error('Error en updateAppointmentStatus:', error);
        res.status(500).json({ message: 'Error del servidor al actualizar estado del turno.' });
    }
};