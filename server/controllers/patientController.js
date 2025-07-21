import { v4 as uuidv4 } from 'uuid'; // Si decides usar UUIDs para los IDs de pacientes también

// @desc    Obtener todos los pacientes asociados al profesional logueado
// @route   GET /api/patients
// @access  Privado (PROFESSIONAL, ADMIN)
export const getPatients = async (req, res) => {
    const pool = req.dbPool;
    const professionalUserId = req.user.userId; // Del token JWT

    try {
        // Unir ambas condiciones:
        // 1. Pacientes que el profesional creó.
        // 2. Pacientes que tienen un turno con el profesional (y que quizás no creó él).
        const query = `
            SELECT p.id, p.dni, p.fullName, p.firstName, p.lastName, p.email, p.phone, p.birthDate
            FROM Patients p
            LEFT JOIN Appointments a ON p.id = a.patientId
            WHERE a.professionalUserId = ? OR p.createdByProfessionalId = ?
            GROUP BY p.id
            ORDER BY p.fullName ASC
        `;
        const [patients] = await pool.query(query, [professionalUserId, professionalUserId]);
        
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
    console.log('--- INICIO: createPatient ---');
    let pool = req.dbPool;
    const createdByProfessionalId = req.user?.userId; // Obtener el ID del profesional logueado
    console.log('Datos recibidos en body:', req.body); // LOG 2
    console.log('ID del profesional que crea:', createdByProfessionalId); //LOG3
    if (!createdByProfessionalId) {
        console.error('Error: No se encontró el ID del profesional en el token.');
        return res.status(401).json({ message: 'No autorizado: token inválido o sin ID de usuario.' });
        }

    const { dni, firstName, lastName, email, phone, birthDate } = req.body;

    // Validación básica
    if (!dni || !firstName || !lastName || !email) {
        console.log('Validación fallida: Faltan campos requeridos.'); // LOG 4
        return res.status(400).json({ message: 'DNI, nombre, apellido y email son requeridos.' });
    }

    try {
        // Verificar si el DNI ya existe
        const [existing] = await pool.query('SELECT id FROM Patients WHERE dni = ?', [dni]);
        if (existing.length > 0) {
            console.log('Error: El DNI ya existe.'); // LOG 6
            return res.status(400).json({ message: `El paciente con DNI ${dni} ya existe.` });
        }

        const fullName = `${firstName} ${lastName}`;
        // Formatear birthDate si viene como un objeto Date o string ISO
        const formattedBirthDate = birthDate ? new Date(birthDate).toISOString().slice(0, 10) : null;

        console.log('Intentando INSERT en la base de datos...'); //LOG7 
        const [result] = await pool.query(
            'INSERT INTO Patients (dni, fullName, firstName, lastName, email, phone, birthDate, createdByProfessionalId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [dni, fullName, firstName, lastName, email, phone || null, formattedBirthDate, createdByProfessionalId]
        );
        
        const newPatientId = result.insertId;
        console.log('INSERT exitoso. Nuevo ID de paciente:', newPatientId); // LOG 8
        // Devolver el paciente recién creado
        const [newPatient] = await pool.query('SELECT * FROM Patients WHERE id = ?', [newPatientId]);
        console.log('Enviando respuesta 201 Created.'); // LOG 9
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

// @desc    Buscar un paciente por DNI para pre-rellenar datos (endpoint público)
// @route   GET /api/public/patients/lookup
// @access  Público
export const lookupPatientByDni = async (req, res) => {
    const pool = req.dbPool;
    const { dni } = req.query;

    if (!dni) {
        return res.status(400).json({ message: "Se requiere un DNI." });
    }

    try {
        const [patients] = await pool.query(
            'SELECT id, dni, firstName, lastName, fullName, email, phone, birthDate FROM Patients WHERE dni = ?',
            [dni.trim()]
        );

        if (patients.length > 0) {
            res.json(patients[0]);
        } else {
            res.status(404).json({ message: "Paciente no encontrado." });
        }
    } catch (error) {
        console.error('Error en lookupPatientByDni:', error);
        res.status(500).json({ message: "Error del servidor al buscar paciente." });
    }
};

// ... (y aquí podrías tener en el futuro los controladores de historias clínicas)
// TODO: Añadir funciones para historias clínicas (getClinicalRecords, addClinicalRecord, etc.) aquí.