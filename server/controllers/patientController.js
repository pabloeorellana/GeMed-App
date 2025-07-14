import { v4 as uuidv4 } from 'uuid'; // Si decides usar UUIDs para los IDs de pacientes también

// @desc    Obtener todos los pacientes asociados al profesional logueado
// @route   GET /api/patients
// @access  Privado (PROFESSIONAL, ADMIN)
export const getPatients = async (req, res) => {
    const pool = req.dbPool;
    const professionalUserId = req.user.userId; // Del token JWT

    try {
        // Obtenemos los IDs de los pacientes que tienen al menos un turno con este profesional
        // Usamos DISTINCT para no repetir pacientes
        const [patientIds] = await pool.query(
            'SELECT DISTINCT patientId FROM Appointments WHERE professionalUserId = ?',
            [professionalUserId]
        );

        if (patientIds.length === 0) {
            return res.json([]); // Devolver un array vacío si no hay pacientes
        }

        // Crear una lista de placeholders (?) para la cláusula IN
        const placeholders = patientIds.map(() => '?').join(',');
        const ids = patientIds.map(p => p.patientId);

        // Obtener los datos completos de esos pacientes
        const [patients] = await pool.query(
            `SELECT id, dni, fullName, email, phone, birthDate FROM Patients WHERE id IN (${placeholders}) ORDER BY fullName ASC`,
            ids
        );
        
        res.json(patients);
    } catch (error) {
        console.error('Error en getPatients:', error);
        res.status(500).json({ message: 'Error del servidor al obtener pacientes' });
    }
};

// @desc    Crear un nuevo paciente manualmente por el profesional
// @route   POST /api/patients
// @access  Privado (PROFESSIONAL, ADMIN)
export const createPatient = async (req, res) => {
    const pool = req.dbPool;
    const { dni, firstName, lastName, email, phone, birthDate } = req.body;

    // Validación básica
    if (!dni || !firstName || !lastName || !email) {
        return res.status(400).json({ message: 'DNI, nombre, apellido y email son requeridos.' });
    }

    try {
        // Verificar si el DNI ya existe
        const [existing] = await pool.query('SELECT id FROM Patients WHERE dni = ?', [dni]);
        if (existing.length > 0) {
            return res.status(400).json({ message: `El paciente con DNI ${dni} ya existe.` });
        }

        const fullName = `${firstName} ${lastName}`;
        // Formatear birthDate si viene como un objeto Date o string ISO
        const formattedBirthDate = birthDate ? new Date(birthDate).toISOString().slice(0, 10) : null;

        const [result] = await pool.query(
            'INSERT INTO Patients (dni, fullName, firstName, lastName, email, phone, birthDate) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [dni, fullName, firstName, lastName, email, phone || null, formattedBirthDate]
        );
        
        const newPatientId = result.insertId;

        // Devolver el paciente recién creado
        const [newPatient] = await pool.query('SELECT * FROM Patients WHERE id = ?', [newPatientId]);
        res.status(201).json(newPatient[0]);

    } catch (error) {
        console.error('Error en createPatient:', error);
        res.status(500).json({ message: 'Error del servidor al crear el paciente' });
    }
};


// @desc    Actualizar los datos de un paciente
// @route   PUT /api/patients/:id
// @access  Privado (PROFESSIONAL, ADMIN)
export const updatePatient = async (req, res) => {
    const pool = req.dbPool;
    const { id: patientId } = req.params;
    const { dni, firstName, lastName, email, phone, birthDate } = req.body;

    if (!dni || !firstName || !lastName || !email) {
        return res.status(400).json({ message: 'DNI, nombre, apellido y email son requeridos.' });
    }

    try {
        // Verificar que el nuevo DNI no esté en uso por OTRO paciente
        const [existingDni] = await pool.query(
            'SELECT id FROM Patients WHERE dni = ? AND id != ?',
            [dni, patientId]
        );
        if (existingDni.length > 0) {
            return res.status(400).json({ message: `El DNI ${dni} ya pertenece a otro paciente.` });
        }

        const fullName = `${firstName} ${lastName}`;
        const formattedBirthDate = birthDate ? new Date(birthDate).toISOString().slice(0, 10) : null;

        const [result] = await pool.query(
            'UPDATE Patients SET dni = ?, fullName = ?, firstName = ?, lastName = ?, email = ?, phone = ?, birthDate = ?, updatedAt = NOW() WHERE id = ?',
            [dni, fullName, firstName, lastName, email, phone || null, formattedBirthDate, patientId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Paciente no encontrado.' });
        }
        
        const [updatedPatient] = await pool.query('SELECT * FROM Patients WHERE id = ?', [patientId]);
        res.json(updatedPatient[0]);

    } catch (error) {
        console.error('Error en updatePatient:', error);
        res.status(500).json({ message: 'Error del servidor al actualizar el paciente' });
    }
};

// TODO: Añadir funciones para historias clínicas (getClinicalRecords, addClinicalRecord, etc.) aquí.