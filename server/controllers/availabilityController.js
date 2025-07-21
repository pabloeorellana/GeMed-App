// server/controllers/availabilityController.js
import { format, parseISO, addMinutes, isBefore } from 'date-fns';

export const getRegularSchedules = async (req, res) => {
    const pool = req.dbPool;
    const professionalUserId = req.user.userId;
    try {
        const [schedules] = await pool.query(
            'SELECT id, dayOfWeek, startTime, endTime, slotDurationMinutes FROM ProfessionalAvailability WHERE professionalUserId = ? ORDER BY dayOfWeek, startTime',
            [professionalUserId]
        );
        res.json(schedules);
    } catch (error) {
        console.error('Error en getRegularSchedules:', error);
        res.status(500).json({ message: 'Error del servidor al obtener horarios regulares' });
    }
};

export const addRegularSchedule = async (req, res) => {
    const pool = req.dbPool;
    const professionalUserId = req.user.userId;
    const { dayOfWeek, startTime, endTime, slotDurationMinutes } = req.body;
    if (dayOfWeek === undefined || !startTime || !endTime || !slotDurationMinutes) {
        return res.status(400).json({ message: 'Todos los campos son requeridos: día, hora inicio, hora fin, duración.' });
    }
    try {
        const [result] = await pool.query(
            'INSERT INTO ProfessionalAvailability (professionalUserId, dayOfWeek, startTime, endTime, slotDurationMinutes) VALUES (?, ?, ?, ?, ?)',
            [professionalUserId, dayOfWeek, startTime, endTime, slotDurationMinutes]
        );
        const newScheduleId = result.insertId;
        const [newSchedule] = await pool.query('SELECT * FROM ProfessionalAvailability WHERE id = ?', [newScheduleId]);
        res.status(201).json(newSchedule[0]);
    } catch (error) {
        console.error('Error en addRegularSchedule:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Ya existe un horario configurado para ese día y hora de inicio.' });
        }
        res.status(500).json({ message: 'Error del servidor al añadir horario regular' });
    }
};

export const removeRegularSchedule = async (req, res) => {
    const pool = req.dbPool;
    const professionalUserId = req.user.userId;
    const { scheduleId } = req.params;
    try {
        const [result] = await pool.query(
            'DELETE FROM ProfessionalAvailability WHERE id = ? AND professionalUserId = ?',
            [scheduleId, professionalUserId]
        );
        if (result.affectedRows > 0) {
            res.json({ message: 'Horario regular eliminado' });
        } else {
            res.status(404).json({ message: 'Horario no encontrado o no autorizado para eliminar' });
        }
    } catch (error) {
        console.error('Error en removeRegularSchedule:', error);
        res.status(500).json({ message: 'Error del servidor al eliminar horario regular' });
    }
};

export const getTimeBlocks = async (req, res) => {
    const pool = req.dbPool;
    const professionalUserId = req.user.userId;
    try {
        const [blocks] = await pool.query(
            'SELECT id, startDateTime, endDateTime, reason, isAllDay FROM ProfessionalTimeBlocks WHERE professionalUserId = ? ORDER BY startDateTime',
            [professionalUserId]
        );
        const formattedBlocks = blocks.map(block => ({
            ...block,
            start: block.startDateTime,
            end: block.endDateTime,
            title: `Bloqueo: ${block.reason || (block.isAllDay ? 'Día Completo' : '')}`,
            allDay: !!block.isAllDay
        }));
        res.json(formattedBlocks);
    } catch (error) {
        console.error('Error en getTimeBlocks:', error);
        res.status(500).json({ message: 'Error del servidor al obtener bloqueos de tiempo' });
    }
};

export const addTimeBlock = async (req, res) => {
    const pool = req.dbPool;
    const professionalUserId = req.user.userId;
    let { startDateTime, endDateTime, reason, isAllDay } = req.body;

    if (!startDateTime) {
        return res.status(400).json({ message: 'Fecha/hora de inicio es requerida.' });
    }
    if (!isAllDay && !endDateTime) {
        return res.status(400).json({ message: 'Fecha/hora de fin es requerida si no es todo el día.' });
    }

    let parsedStart = new Date(startDateTime);
    let parsedEnd = !isAllDay ? new Date(endDateTime) : null;

    if (isNaN(parsedStart.getTime())) return res.status(400).json({ message: 'Formato de fecha/hora de inicio inválido.' });
    if (!isAllDay && isNaN(parsedEnd.getTime())) return res.status(400).json({ message: 'Formato de fecha/hora de fin inválido.' });
    if (!isAllDay && parsedEnd <= parsedStart) return res.status(400).json({ message: 'La fecha/hora de fin debe ser posterior a la de inicio.' });

    let finalStartDateTimeForDB, finalEndDateTimeForDB;
    if (isAllDay) {
        parsedStart.setHours(0, 0, 0, 0);
        finalStartDateTimeForDB = parsedStart.toISOString().slice(0, 19).replace('T', ' ');
        const endOfDay = new Date(parsedStart);
        endOfDay.setHours(23, 59, 59, 999);
        finalEndDateTimeForDB = endOfDay.toISOString().slice(0, 19).replace('T', ' ');
    } else {
        finalStartDateTimeForDB = parsedStart.toISOString().slice(0, 19).replace('T', ' ');
        finalEndDateTimeForDB = parsedEnd.toISOString().slice(0, 19).replace('T', ' ');
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO ProfessionalTimeBlocks (professionalUserId, startDateTime, endDateTime, reason, isAllDay) VALUES (?, ?, ?, ?, ?)',
            [professionalUserId, finalStartDateTimeForDB, finalEndDateTimeForDB, reason || null, !!isAllDay]
        );
        const newBlockId = result.insertId;
        const [newBlock] = await pool.query('SELECT id, startDateTime, endDateTime, reason, isAllDay FROM ProfessionalTimeBlocks WHERE id = ?', [newBlockId]);

        res.status(201).json({
            ...newBlock[0],
            start: newBlock[0].startDateTime,
            end: newBlock[0].endDateTime,
            title: `Bloqueo: ${newBlock[0].reason || (newBlock[0].isAllDay ? 'Día Completo' : '')}`,
            allDay: !!newBlock[0].isAllDay
        });
    } catch (error) {
        console.error('Error en addTimeBlock:', error);
        res.status(500).json({ message: 'Error del servidor al añadir bloqueo de tiempo' });
    }
};

export const removeTimeBlock = async (req, res) => {
    const pool = req.dbPool;
    const professionalUserId = req.user.userId;
    const { blockId } = req.params;
    try {
        const [result] = await pool.query(
            'DELETE FROM ProfessionalTimeBlocks WHERE id = ? AND professionalUserId = ?',
            [blockId, professionalUserId]
        );
        if (result.affectedRows > 0) {
            res.json({ message: 'Bloqueo de tiempo eliminado' });
        } else {
            res.status(404).json({ message: 'Bloqueo no encontrado o no autorizado para eliminar' });
        }
    } catch (error) {
        console.error('Error en removeTimeBlock:', error);
        res.status(500).json({ message: 'Error del servidor al eliminar bloqueo de tiempo' });
    }
};

export const getAvailability = async (req, res) => {
    const pool = req.dbPool;
    const { date, professionalId } = req.query;

    if (!date || !professionalId) {
        return res.status(400).json({ message: "Se requiere fecha y ID del profesional." });
    }

    try {
        const requestedDate = parseISO(date);
        const dayOfWeek = requestedDate.getDay();

        const [schedules] = await pool.query(
            'SELECT startTime, endTime, slotDurationMinutes FROM ProfessionalAvailability WHERE professionalUserId = ? AND dayOfWeek = ?',
            [professionalId, dayOfWeek]
        );

        if (schedules.length === 0) {
            return res.json([]);
        }

        const [appointments] = await pool.query(
            'SELECT dateTime FROM Appointments WHERE professionalUserId = ? AND DATE(dateTime) = ? AND status NOT LIKE ?',
            [professionalId, date, 'CANCELED%']
        );
        const [blocks] = await pool.query(
            'SELECT startDateTime, endDateTime FROM ProfessionalTimeBlocks WHERE professionalUserId = ? AND DATE(startDateTime) <= ? AND DATE(endDateTime) >= ?',
            [professionalId, date, date]
        );

        const bookedSlots = new Set(appointments.map(a => format(new Date(a.dateTime), 'HH:mm')));
        const availableSlots = [];

        for (const schedule of schedules) {
            let currentTime = parseISO(`${date}T${schedule.startTime}`);
            const endTime = parseISO(`${date}T${schedule.endTime}`);
            
            while (isBefore(currentTime, endTime)) {
                const slotTime = format(currentTime, 'HH:mm');

                let isBlocked = false;
                for (const block of blocks) {
                    if (currentTime >= new Date(block.startDateTime) && currentTime < new Date(block.endDateTime)) {
                        isBlocked = true;
                        break;
                    }
                }
                
                if (!bookedSlots.has(slotTime) && !isBlocked && isBefore(new Date(), currentTime)) {
                    availableSlots.push(slotTime);
                }

                currentTime = addMinutes(currentTime, schedule.slotDurationMinutes);
            }
        }
        
        res.json(availableSlots);

    } catch (error) {
        console.error("Error en getAvailability:", error);
        res.status(500).json({ message: "Error del servidor al obtener la disponibilidad." });
    }
};