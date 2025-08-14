// src/pages/AppointmentBookingPage/AppointmentBookingPage.jsx
import React, { useState, useEffect } from 'react';
import {
    Container, Typography, Box, CssBaseline, AppBar, Toolbar, Alert, TextField,
    Button, CircularProgress, Paper, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { API_BASE_URL } from '../../config';
import AvailabilityCalendar from '../../components/AvailabilityCalendar/AvailabilityCalendar.jsx';
import PatientForm from '../../components/PatientForm/PatientForm.jsx';
import AppointmentConfirmation from '../../components/AppointmentConfirmation/AppointmentConfirmation.jsx';
import MedicalInformationIcon from '@mui/icons-material/MedicalInformation';
import SearchIcon from '@mui/icons-material/Search';

// NUEVA IMPORTACIÓN para el paso de selección de profesional
import ProfessionalSelectionStep from '../../components/ProfessionalSelectionStep/ProfessionalSelectionStep.jsx';

// Definimos los pasos para claridad
const STEPS = {
    WELCOME_DNI: 0, // El modal de bienvenida/DNI es el "paso 0" lógico
    PROFESSIONAL_SELECTION: 1,
    CALENDAR_SELECTION: 2,
    PATIENT_FORM: 3,
    CONFIRMATION: 4,
};

const AppointmentBookingPage = () => {
    const { professionalId: paramProfessionalId } = useParams(); // ID si viene de /reservar/:professionalId

    // Estados para controlar el flujo
    const [currentStep, setCurrentStep] = useState(STEPS.PROFESSIONAL_SELECTION); // Empezamos en selección de profesional
    const [welcomeModalOpen, setWelcomeModalOpen] = useState(true); // El modal de bienvenida sigue abriéndose primero

    // Estados para los datos del flujo
    const [selectedProfessionalId, setSelectedProfessionalId] = useState(null);
    const [selectedProfessionalName, setSelectedProfessionalName] = useState(''); // Para mostrar en el título
    const [selectedDateTime, setSelectedDateTime] = useState(null);
    const [confirmedAppointment, setConfirmedAppointment] = useState(null);

    // Estados para el DNI lookup
    const [dniInput, setDniInput] = useState('');
    const [recognizedPatient, setRecognizedPatient] = useState(null);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [lookupError, setLookupError] = useState('');
    const [dniLookupPerformed, setDniLookupPerformed] = useState(false);

    // Estados de envío del formulario
    const [submissionError, setSubmissionError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // useEffect para manejar el ID de profesional de la URL
    useEffect(() => {
        if (paramProfessionalId) {
            setSelectedProfessionalId(paramProfessionalId);
            // Si el ID viene de la URL, asumimos que el paciente ya seleccionó
            // y podemos saltar el paso de selección de profesional
            setCurrentStep(STEPS.CALENDAR_SELECTION);
            // Intentar obtener el nombre del profesional para mostrarlo
            const fetchProfessionalName = async () => {
                try {
                    const response = await fetch(`${API_BASE_URL}/api/public/professionals`);
                    const data = await response.json();
                    const prof = data.find(p => p.id === paramProfessionalId);
                    if (prof) {
                        setSelectedProfessionalName(prof.fullName);
                    }
                } catch (err) {
                    console.error("Error fetching professional name:", err);
                }
            };
            fetchProfessionalName();
        } else {
            // Si no hay professionalId en la URL, el paso de selección de profesional se encargará
            setCurrentStep(STEPS.PROFESSIONAL_SELECTION);
        }
    }, [paramProfessionalId]);

    const handleDniLookup = async () => {
        if (!dniInput.trim()) {
            setLookupError("Por favor, ingrese un DNI válido para buscar.");
            return;
        }
        setLookupLoading(true);
        setLookupError('');
        setRecognizedPatient(null);
        setDniLookupPerformed(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/public/patients/lookup?dni=${dniInput.trim()}`);
            if (response.status === 404) {
                setRecognizedPatient({ dni: dniInput.trim() }); // Paciente no encontrado, pero conservamos el DNI
                throw new Error("DNI no encontrado. Por favor, complete sus datos.");
            }
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || "Error del servidor al buscar el DNI.");
            }
            const patientData = await response.json();
            setRecognizedPatient(patientData);
        } catch (error) {
            setLookupError(error.message);
            if (!recognizedPatient) {
                setRecognizedPatient({ dni: dniInput.trim() });
            }
        } finally {
            setLookupLoading(false);
        }
    };

    const handleCloseWelcomeModal = () => {
        setWelcomeModalOpen(false);
        // Si no hay professionalId en la URL, forzamos el paso de selección de profesional.
        // Si ya hay un paramProfessionalId, la lógica del useEffect ya lo habrá seteado al calendario.
        if (!paramProfessionalId) {
            setCurrentStep(STEPS.PROFESSIONAL_SELECTION);
        }
    };

    const handleSelectProfessional = (profId, profName) => {
        setSelectedProfessionalId(profId);
        setSelectedProfessionalName(profName);
        setCurrentStep(STEPS.CALENDAR_SELECTION);
    };

    const handleSlotSelected = (dateTime) => {
        setSelectedDateTime(dateTime);
        setCurrentStep(STEPS.PATIENT_FORM);
    };

    const handleFormSubmit = async (patientDetails, appointmentDateTime) => {
        setIsSubmitting(true);
        setSubmissionError('');
        try {
            const payload = {
                professionalId: selectedProfessionalId, // Usamos el profesional seleccionado
                dateTime: appointmentDateTime.toISOString(),
                patientDetails: patientDetails
            };

            const response = await fetch(`${API_BASE_URL}/api/public/appointments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "No se pudo confirmar el turno.");
            }

            setConfirmedAppointment({
                patient: patientDetails,
                dateTime: appointmentDateTime,
                appointmentDetails: data
            });
            setCurrentStep(STEPS.CONFIRMATION);
        } catch (error) {
            console.error("Error al confirmar el turno:", error);
            setSubmissionError(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelForm = () => {
        // Lógica para retroceder un paso o reiniciar
        if (currentStep === STEPS.CALENDAR_SELECTION) {
             // Si volvemos desde el calendario y no vinimos de una URL con ID específico,
             // volvemos a la selección de profesional.
            if (!paramProfessionalId) {
                setCurrentStep(STEPS.PROFESSIONAL_SELECTION);
                setSelectedProfessionalId(null);
                setSelectedProfessionalName('');
            } else {
                // Si vinimos con un ID, simplemente reiniciamos la fecha seleccionada en el calendario
                setSelectedDateTime(null);
            }
        } else if (currentStep === STEPS.PATIENT_FORM) {
            setCurrentStep(STEPS.CALENDAR_SELECTION);
        }
        // No hay un "atrás" para la confirmación, se ofrece "reservar otro"
    };

    const handleBookAnother = () => {
        // Reiniciar todo para una nueva reserva
        setCurrentStep(STEPS.PROFESSIONAL_SELECTION); // Vuelve al inicio del flujo
        setWelcomeModalOpen(true); // Reabre el modal de bienvenida
        setSelectedProfessionalId(null);
        setSelectedProfessionalName('');
        setSelectedDateTime(null);
        setConfirmedAppointment(null);
        setDniInput('');
        setRecognizedPatient(null);
        setLookupError('');
        setDniLookupPerformed(false);
        setSubmissionError('');
        setIsSubmitting(false);
    };

    return (
        <>
            <CssBaseline />
            <AppBar position="static" color="primary">
                <Toolbar>
                    <MedicalInformationIcon sx={{ mr: 2 }} />
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        NutriSmart - Solicitud de turnos
                    </Typography>
                </Toolbar>
            </AppBar>
            <Dialog open={welcomeModalOpen} disableEscapeKeyDown aria-labelledby="welcome-dialog-title" maxWidth="sm" fullWidth>
                <DialogTitle id="welcome-dialog-title" sx={{ textAlign: 'center', pt: 3 }}>Bienvenido a NutriSmart</DialogTitle>
                <DialogContent>
                    <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                        <Typography variant="h6" gutterBottom>¿Ya eres paciente?</Typography>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            Ingresa tu DNI para una reserva más rápida. Si es tu primera vez, ingresa tu DNI y presiona "Buscar" para continuar.
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <TextField
                                label="Ingresar DNI" variant="outlined" size="small"
                                value={dniInput}
                                onChange={(e) => { setDniInput(e.target.value); setDniLookupPerformed(false); }}
                                sx={{ flexGrow: 1 }}
                                onKeyPress={(e) => e.key === 'Enter' && handleDniLookup()}
                            />
                            <Button
                                variant="contained" onClick={handleDniLookup} disabled={lookupLoading}
                                startIcon={lookupLoading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                            >
                                Buscar
                            </Button>
                        </Box>
                        {lookupError && <Alert severity="warning" sx={{ mt: 2 }}>{lookupError}</Alert>}
                        {recognizedPatient && recognizedPatient.id && (
                            <Alert severity="success" sx={{ mt: 2 }}>
                                ¡Hola, {recognizedPatient.fullName}! Tus datos se completarán automáticamente.
                            </Alert>
                        )}
                    </Paper>
                    <Alert severity="info" icon={false} sx={{ bgcolor: 'grey.100' }}>
                        <Typography variant="h6" component="div" gutterBottom>ATENCIÓN:</Typography>
                        <Typography variant="body2">El turno solicitado es un compromiso.</Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                            Si no asistirá al turno solicitado, rogamos que cancele el mismo para liberar el horario y
                            pueda ser usado por otro paciente. Agradecemos su compromiso y comprensión.
                        </Typography>
                    </Alert>
                </DialogContent>
                <DialogActions sx={{ p: '16px 24px' }}>
                    <Button
                        onClick={handleCloseWelcomeModal}
                        variant="contained"
                        fullWidth
                        disabled={lookupLoading} // Habilitado si no está cargando. Puede continuar aunque no haya encontrado DNI.
                    >
                        Acepto, Continuar
                    </Button>
                </DialogActions>
            </Dialog>

            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {currentStep === STEPS.PROFESSIONAL_SELECTION && (
                        <ProfessionalSelectionStep
                            onSelectProfessional={handleSelectProfessional}
                            preSelectedProfessionalId={paramProfessionalId} // Pasa el ID de la URL si existe
                        />
                    )}

                    {currentStep === STEPS.CALENDAR_SELECTION && (
                        <>
                            <Typography variant="h4" component="h1" gutterBottom>
                                Agendar turno con {selectedProfessionalName || 'el profesional'}
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, textAlign: 'center', maxWidth: '700px' }}>
                                Haga clic sobre un horario disponible para comenzar su reserva.
                            </Typography>
                            {selectedProfessionalId ? (
                                <AvailabilityCalendar
                                    onSlotSelect={handleSlotSelected}
                                    professionalId={selectedProfessionalId}
                                />
                            ) : (
                                <Alert severity="error">No se ha especificado un profesional válido para mostrar la disponibilidad.</Alert>
                            )}
                            <Box sx={{ mt: 3 }}>
                                <Button variant="outlined" onClick={handleCancelForm}>
                                    Volver a Selección de Profesional
                                </Button>
                            </Box>
                        </>
                    )}

                    {currentStep === STEPS.PATIENT_FORM && (
                        <Box sx={{ width: '100%', maxWidth: '700px' }}>
                            <PatientForm
                                selectedDateTime={selectedDateTime}
                                onSubmit={handleFormSubmit}
                                onCancel={handleCancelForm}
                                prefilledData={recognizedPatient}
                                submissionError={submissionError}
                                isSubmitting={isSubmitting}
                            />
                        </Box>
                    )}

                    {currentStep === STEPS.CONFIRMATION && (
                         <Box sx={{ width: '100%', maxWidth: '700px' }}>
                            <AppointmentConfirmation appointmentDetails={confirmedAppointment} onBookAnother={handleBookAnother} />
                        </Box>
                    )}
                </Box>
            </Container>
        </>
    );
};

export default AppointmentBookingPage;