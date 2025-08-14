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
        // Para bloques de día completo, almacenar como YYYY-MM-DD 00:00:00 y YYYY-MM-DD 23:59:59
        // Esto será interpretado en la zona horaria local de MySQL (que debería ser UTC por la configuración del pool).
        const dateOnly = format(parsedStart, 'yyyy-MM-dd');
        finalStartDateTimeForDB = `${dateOnly} 00:00:00`;
        finalEndDateTimeForDB = `${dateOnly} 23:59:59`;
    } else {
        // Para horas específicas, formatear a 'YYYY-MM-DD HH:MM:SS'.
        // Se asume que `parsedStart` y `parsedEnd` ya están en la zona horaria local
        // del servidor, al ser parseados de strings ISO sin Z desde el frontend.
        finalStartDateTimeForDB = format(parsedStart, 'yyyy-MM-dd HH:mm:ss');
        finalEndDateTimeForDB = format(parsedEnd, 'yyyy-MM-dd HH:mm:ss');
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
    const { date, professionalId } = req.query; // date en formato YYYY-MM-DD

    console.log(`[getAvailability] Petición recibida para profesionalId: ${professionalId}, fecha: ${date}`);

    if (!date || !professionalId) {
        return res.status(400).json({ message: "Se requiere fecha y ID del profesional." });
    }

    try {
        // 1. Determinar el día de la semana (Lunes, Martes, etc.) para la fecha solicitada.
        // Es importante que esto refleje el día local para los horarios regulares.
        // Creamos un objeto Date en la zona horaria local del servidor para `date`
        // y tomamos su día de la semana. Usamos '12:00:00' para evitar problemas de
        // cambio de horario de verano/invierno (DST) que podrían mover el día.
        const requestedDateMiddayLocal = new Date(`${date}T12:00:00`);
        const dayOfWeek = requestedDateMiddayLocal.getDay(); // 0 (Domingo) - 6 (Sábado)

        console.log(`[getAvailability] Fecha solicitada parseada (local): ${requestedDateMiddayLocal.toLocaleString()}`);
        console.log(`[getAvailability] Día de la semana (0=Dom, 1=Lun): ${dayOfWeek}`);

        // 2. Obtener los horarios regulares del profesional para ese día
        const [schedules] = await pool.query(
            'SELECT startTime, endTime, slotDurationMinutes FROM ProfessionalAvailability WHERE professionalUserId = ? AND dayOfWeek = ?',
            [professionalId, dayOfWeek]
        );

        console.log(`[getAvailability] Horarios regulares encontrados:`, schedules);

        if (schedules.length === 0) {
            console.log(`[getAvailability] No hay horarios regulares definidos para el día ${dayOfWeek}.`);
            return res.json([]); // No hay horarios regulares definidos para este día
        }

        // Se asume que `schedules[0].slotDurationMinutes` es representativo si hay múltiples horarios.
        const assumedSlotDuration = schedules[0].slotDurationMinutes;

        // 3. Obtener los turnos ya agendados y bloques de tiempo del profesional para la fecha solicitada.
        // Los DATETIME de MySQL se obtienen como strings 'YYYY-MM-DD HH:MM:SS'.
        // Al crear un objeto Date con `new Date(string)`, JavaScript lo interpretará
        // en la zona horaria local del servidor. Esta es la clave para la consistencia:
        // todas las fechas y horas se manejarán como objetos Date en la zona horaria local del servidor.
        const [appointments] = await pool.query(
            'SELECT dateTime FROM Appointments WHERE professionalUserId = ? AND DATE(dateTime) = ? AND status NOT LIKE ?',
            [professionalId, date, 'CANCELED%']
        );
        const [blocks] = await pool.query(
            'SELECT startDateTime, endDateTime FROM ProfessionalTimeBlocks WHERE professionalUserId = ? AND startDateTime <= ? AND endDateTime >= ?',
            [professionalId, `${date} 23:59:59`, `${date} 00:00:00`]
        );

        console.log(`[getAvailability] Turnos existentes para ${date}:`, appointments);
        console.log(`[getAvailability] Bloqueos existentes para ${date}:`, blocks);

        const bookedPeriods = appointments.map(a => {
            const start = new Date(a.dateTime); // Interpreta dateTime de MySQL en zona horaria local del servidor
            const end = addMinutes(start, assumedSlotDuration);
            console.log(`[getAvailability] Turno reservado: ${start.toLocaleString()} - ${end.toLocaleString()}`);
            return { start, end };
        });

        const blockedPeriods = blocks.map(b => {
            const start = new Date(b.startDateTime); // Interpreta startDateTime de MySQL en zona horaria local del servidor
            const end = new Date(b.endDateTime);     // Interpreta endDateTime de MySQL en zona horaria local del servidor
            console.log(`[getAvailability] Bloqueo: ${start.toLocaleString()} - ${end.toLocaleString()}`);
            return { start, end };
        });

        const availableSlots = [];
        const now = new Date(); // Hora actual en la zona horaria LOCAL del servidor
        console.log(`[getAvailability] Hora actual del servidor (LOCAL): ${now.toLocaleString()}`);

        // Iterar sobre cada horario regular encontrado para el día
        for (const schedule of schedules) {
            // Construir la fecha y hora de inicio del primer slot
            const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
            let currentSlotStart = new Date(requestedDateMiddayLocal.getFullYear(), requestedDateMiddayLocal.getMonth(), requestedDateMiddayLocal.getDate(), startHour, startMinute, 0, 0);

            // Construir la fecha y hora de fin del horario regular
            const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
            const scheduleEnd = new Date(requestedDateMiddayLocal.getFullYear(), requestedDateMiddayLocal.getMonth(), requestedDateMiddayLocal.getDate(), endHour, endMinute, 0, 0);

            console.log(`[getAvailability] Procesando horario: ${schedule.startTime}-${schedule.endTime}, duracion: ${schedule.slotDurationMinutes}min`);
            console.log(`[getAvailability] Inicio de generación de slots: ${currentSlotStart.toLocaleString()}`);
            console.log(`[getAvailability] Fin del horario: ${scheduleEnd.toLocaleString()}`);


            // Generar slots de tiempo de la duración definida por el profesional
            while (isBefore(currentSlotStart, scheduleEnd)) {
                const currentSlotEnd = addMinutes(currentSlotStart, schedule.slotDurationMinutes);

                console.log(`[getAvailability] Evaluando slot: ${currentSlotStart.toLocaleString()} - ${currentSlotEnd.toLocaleString()}`);

                // 1. Filtrar slots que ya pasaron (comparando con la hora actual del servidor).
                // Se compara el *final* del slot para asegurar que si un slot ya empezó, pero no ha terminado, se muestre,
                // o si un slot ya terminó, no se muestre.
                if (isBefore(currentSlotEnd, now)) {
                    console.log(`[getAvailability] Slot (${currentSlotStart.toLocaleTimeString()}) está en el pasado. Saltando.`);
                    currentSlotStart = currentSlotEnd; // Mover al siguiente slot
                    continue; // Saltar este slot (ya pasó)
                }

                let isOverlapping = false;

                // 2. Verificar solapamiento con turnos ya agendados
                for (const booked of bookedPeriods) {
                    // Un solapamiento ocurre si: (Inicio del slot actual < Fin del turno reservado) Y (Fin del slot actual > Inicio del turno reservado)
                    if (currentSlotStart < booked.end && currentSlotEnd > booked.start) {
                        isOverlapping = true;
                        console.log(`[getAvailability] Slot (${currentSlotStart.toLocaleTimeString()}) solapa con turno reservado: ${booked.start.toLocaleTimeString()}-${booked.end.toLocaleTimeString()}.`);
                        break;
                    }
                }
                if (isOverlapping) {
                    currentSlotStart = currentSlotEnd;
                    continue;
                }

                // 3. Verificar solapamiento con bloques de tiempo definidos por el profesional
                for (const blocked of blockedPeriods) {
                    // Si el slot actual se solapa con un bloque de tiempo
                    if (currentSlotStart < blocked.end && currentSlotEnd > blocked.start) {
                        isOverlapping = true;
                        console.log(`[getAvailability] Slot (${currentSlotStart.toLocaleTimeString()}) solapa con bloqueo: ${blocked.start.toLocaleTimeString()}-${blocked.end.toLocaleTimeString()}.`);
                        break;
                    }
                }
                if (isOverlapping) {
                    currentSlotStart = currentSlotEnd;
                    continue;
                }

                // Si el slot está disponible (no en el pasado y no solapa), añadirlo al formato HH:mm
                availableSlots.push(format(currentSlotStart, 'HH:mm'));
                console.log(`[getAvailability] Slot (${currentSlotStart.toLocaleTimeString()}) AÑADIDO.`);

                currentSlotStart = currentSlotEnd; // Mover al inicio del siguiente slot
            }
        }

        console.log(`[getAvailability] Slots disponibles finales:`, availableSlots);
        res.json(availableSlots);

    } catch (error) {
        console.error("Error en getAvailability:", error);
        res.status(500).json({ message: "Error del servidor al obtener la disponibilidad." });
    }
};