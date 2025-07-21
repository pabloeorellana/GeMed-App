import { v4 as uuidv4 } from 'uuid';

// @desc    Obtener los turnos de un profesional para un rango de fechas
// @route   GET /api/appointments
// @access  Privado (PROFESSIONAL, ADMIN)
export const getAppointments = async (req, res) => {
    const pool = req.dbPool;
    const professionalUserId = req.user.userId;
    const { startDate, endDate } = req.query; // Esperamos ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD

    if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Se requieren fechas de inicio y fin.' });
    }

    try {
        // Hacemos un JOIN para obtener el nombre del paciente directamente
        const [appointments] = await pool.query(
            `SELECT 
                a.id, 
                a.dateTime AS start, 
                DATE_ADD(a.dateTime, INTERVAL 30 MINUTE) AS end, -- Asumimos 30 min por ahora
                p.fullName AS title,
                a.status,
                a.reasonForVisit,
                a.professionalNotes,
                a.patientId,
                p.dni AS patientDni,
                p.email AS patientEmail,
                p.phone AS patientPhone
             FROM Appointments a
             JOIN Patients p ON a.patientId = p.id
             WHERE a.professionalUserId = ? AND a.dateTime BETWEEN ? AND ?`,
            [professionalUserId, `${startDate} 00:00:00`, `${endDate} 23:59:59`]
        );
        res.json(appointments);
    } catch (error) {
        console.error('Error en getAppointments:', error);
        res.status(500).json({ message: 'Error del servidor al obtener turnos' });
    }
};

// @desc    Crear un turno manualmente
// @route   POST /api/appointments/manual
// @access  Privado (PROFESSIONAL, ADMIN)
export const createManualAppointment = async (req, res) => {
    const pool = req.dbPool;
    const professionalUserId = req.user.userId;
    const { patientId, dateTime, reasonForVisit } = req.body;

    if (!patientId || !dateTime) {
        return res.status(400).json({ message: 'Se requiere paciente y fecha/hora.' });
    }

    // TODO: Validación avanzada: verificar si el slot está realmente disponible
    // (cruzar con ProfessionalAvailability, ProfessionalTimeBlocks y otros Appointments)

    try {
        const appointmentId = `appt_${new Date().getTime()}`; // ID simple, podrías usar UUID
        const formattedDateTime = new Date(dateTime).toISOString().slice(0, 19).replace('T', ' ');

        await pool.query(
            'INSERT INTO Appointments (id, dateTime, patientId, professionalUserId, reasonForVisit, status) VALUES (?, ?, ?, ?, ?, ?)',
            [appointmentId, formattedDateTime, patientId, professionalUserId, reasonForVisit || null, 'SCHEDULED']
        );

        // Devolver el turno recién creado
        const [newAppointment] = await pool.query(`
            SELECT a.id, a.dateTime AS start, DATE_ADD(a.dateTime, INTERVAL 30 MINUTE) AS end, p.fullName AS title, a.status, a.reasonForVisit, a.professionalNotes, a.patientId, p.dni AS patientDni, p.email AS patientEmail, p.phone AS patientPhone
            FROM Appointments a JOIN Patients p ON a.patientId = p.id WHERE a.id = ?`,
            [appointmentId]
        );

        res.status(201).json(newAppointment[0]);
    } catch (error) {
        console.error('Error en createManualAppointment:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Ya existe un turno en este horario.' });
        }
        res.status(500).json({ message: 'Error del servidor al crear el turno' });
    }
};

// @desc    Actualizar el estado de un turno
// @route   PUT /api/appointments/:id/status
// @access  Privado (PROFESSIONAL, ADMIN)
export const updateAppointmentStatus = async (req, res) => {
    const pool = req.dbPool;
    const { id: appointmentId } = req.params;
    const { status } = req.body;
    const professionalUserId = req.user.userId;

    if (!status) {
        return res.status(400).json({ message: 'Se requiere un estado.' });
    }
    // TODO: Validar que 'status' sea uno de los valores permitidos

    try {
        const [result] = await pool.query(
            'UPDATE Appointments SET status = ? WHERE id = ? AND professionalUserId = ?',
            [status, appointmentId, professionalUserId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Turno no encontrado o no autorizado.' });
        }
        res.json({ message: 'Estado del turno actualizado.' });
    } catch (error) {
        console.error('Error en updateAppointmentStatus:', error);
        res.status(500).json({ message: 'Error del servidor al actualizar estado.' });
    }
};

// @desc    Reprogramar un turno
// @route   PUT /api/appointments/:id/reprogram
// @access  Privado (PROFESSIONAL, ADMIN)
export const reprogramAppointment = async (req, res) => {
    const pool = req.dbPool;
    const { id: appointmentId } = req.params;
    const { newDateTime } = req.body;
    const professionalUserId = req.user.userId;

    if (!newDateTime) {
        return res.status(400).json({ message: 'Se requiere una nueva fecha y hora.' });
    }
    
    const formattedNewDateTime = new Date(newDateTime).toISOString().slice(0, 19).replace('T', ' ');

    try {
        const [result] = await pool.query(
            'UPDATE Appointments SET dateTime = ? WHERE id = ? AND professionalUserId = ?',
            [formattedNewDateTime, appointmentId, professionalUserId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Turno no encontrado o no autorizado.' });
        }
        res.json({ message: 'Turno reprogramado.' });
    } catch (error) {
        console.error('Error en reprogramAppointment:', error);
         if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Ya existe un turno en el nuevo horario seleccionado.' });
        }
        res.status(500).json({ message: 'Error del servidor al reprogramar.' });
    }
};

// @desc    Eliminar un turno
// @route   DELETE /api/appointments/:id
// @access  Privado (PROFESSIONAL, ADMIN)
export const deleteAppointment = async (req, res) => {
    const pool = req.dbPool;
    const { id: appointmentId } = req.params;
    const professionalUserId = req.user.userId;

    try {
        const [result] = await pool.query(
            'DELETE FROM Appointments WHERE id = ? AND professionalUserId = ?',
            [appointmentId, professionalUserId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Turno no encontrado o no autorizado.' });
        }
        res.json({ message: 'Turno eliminado.' });
    } catch (error) {
        console.error('Error en deleteAppointment:', error);
        res.status(500).json({ message: 'Error del servidor al eliminar turno.' });
    }
};

// @desc    Guardar notas del profesional en un turno
// @route   PUT /api/appointments/:id/notes
// @access  Privado (PROFESSIONAL)
export const updateProfessionalNotes = async (req, res) => {
    const pool = req.dbPool;
    const { id: appointmentId } = req.params;
    const { professionalNotes } = req.body;
    const professionalUserId = req.user.userId;

    try {
         const [result] = await pool.query(
            'UPDATE Appointments SET professionalNotes = ? WHERE id = ? AND professionalUserId = ?',
            [professionalNotes, appointmentId, professionalUserId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Turno no encontrado o no autorizado.' });
        }
        res.json({ message: 'Notas guardadas.' });
    } catch(error) {
        console.error('Error en updateProfessionalNotes:', error);
        res.status(500).json({ message: 'Error del servidor al guardar notas.' });
    }
};
// @desc    Crear un nuevo turno desde la vista pública del paciente
// @route   POST /api/public/appointments
// @access  Público
export const createPublicAppointment = async (req, res) => {
    const pool = req.dbPool;
    const { professionalId, dateTime, patientDetails } = req.body;
    const { dni, firstName, lastName, email, phone, birthDate } = patientDetails;

    // Validación de entrada
    if (!professionalId || !dateTime || !dni || !firstName || !lastName || !email) {
        return res.status(400).json({ message: 'Faltan datos requeridos para la reserva.' });
    }

    let connection;
    try {
        connection = await pool.getConnection(); // Obtener una conexión del pool para la transacción
        await connection.beginTransaction();

        // 1. VERIFICAR DISPONIBILIDAD DEL SLOT (CRÍTICO)
        const formattedDateTime = new Date(dateTime).toISOString().slice(0, 19).replace('T', ' ');
                console.log(`VERIFICANDO SLOT: professionalId=${professionalId}, dateTime=${formattedDateTime}`);
        
        const [existingAppointments] = await connection.query(
            'SELECT id FROM Appointments WHERE professionalUserId = ? AND dateTime = ? AND status NOT LIKE ? FOR UPDATE',
            [professionalId, formattedDateTime, 'CANCELED%']
        );
                console.log(`SLOTS ENCONTRADOS: ${existingAppointments.length}`, existingAppointments);

        // 'FOR UPDATE' bloquea las filas seleccionadas, previniendo que otra transacción las lea y cree un turno duplicado.

        if (existingAppointments.length > 0) {
            await connection.rollback();
            return res.status(409).json({ message: 'Lo sentimos, este horario ya no está disponible. Por favor, seleccione otro.' }); // 409 Conflict
        }

        // 2. BUSCAR O CREAR PACIENTE
        let patientId;
        const [existingPatients] = await connection.query('SELECT id FROM Patients WHERE dni = ?', [dni]);

        if (existingPatients.length > 0) {
            // El paciente ya existe, usar su ID
            patientId = existingPatients[0].id;
            // Opcional: Actualizar datos del paciente si han cambiado
            await connection.query(
                'UPDATE Patients SET firstName = ?, lastName = ?, fullName = ?, email = ?, phone = ?, birthDate = ?, updatedAt = NOW() WHERE id = ?',
                [firstName, lastName, `${firstName} ${lastName}`, email, phone || null, birthDate ? new Date(birthDate).toISOString().slice(0, 10) : null, patientId]
            );
        } else {
            // El paciente no existe, crearlo
            const fullName = `${firstName} ${lastName}`;
            const formattedBirthDate = birthDate ? new Date(birthDate).toISOString().slice(0, 10) : null;
            const [newPatientResult] = await connection.query(
                'INSERT INTO Patients (dni, fullName, firstName, lastName, email, phone, birthDate, createdByProfessionalId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [dni, fullName, firstName, lastName, email, phone || null, formattedBirthDate, professionalId]
            );
            patientId = newPatientResult.insertId;
        }

        // 3. CREAR EL TURNO
        const appointmentId = `appt_${uuidv4()}`; // Usar UUID para un ID más robusto
        await connection.query(
            'INSERT INTO Appointments (id, dateTime, patientId, professionalUserId, status) VALUES (?, ?, ?, ?, ?)',
            [appointmentId, formattedDateTime, patientId, professionalId, 'SCHEDULED']
        );
        
        // 4. CONFIRMAR TRANSACCIÓN
        await connection.commit();

        // (Opcional) Aquí podrías desencadenar el envío de un email de confirmación
        
        res.status(201).json({
            message: '¡Turno confirmado exitosamente!',
            appointment: {
                id: appointmentId,
                dateTime: formattedDateTime,
                patientId: patientId,
            }
        });

    } catch (error) {
        if (connection) await connection.rollback(); // Revertir cambios si algo falla
        console.error('Error en createPublicAppointment:', error);
        res.status(500).json({ message: 'Error del servidor al procesar la reserva.' });
    } finally {
        if (connection) connection.release(); // Liberar la conexión de vuelta al pool
    }
};