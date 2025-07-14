import React, { useState } from 'react';
import { TextField, Button, Grid, Typography, Paper, Box } from '@mui/material';
import { GoogleLoginButton } from 'react-social-login-buttons'; // Asegúrate de tenerlo instalado

const PatientForm = ({ selectedDateTime, onSubmit, onCancel }) => {
    const [patientDetails, setPatientDetails] = useState({
        name: '',
        email: '',
        whatsapp: '',
        motivo: '',
    });
    const [errors, setErrors] = useState({});

    const handleChange = (event) => {
        const { name, value } = event.target;
        setPatientDetails(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!patientDetails.name.trim()) newErrors.name = 'El nombre es requerido.';
        if (!patientDetails.email.trim()) {
            newErrors.email = 'El correo electrónico es requerido.';
        } else if (!/\S+@\S+\.\S+/.test(patientDetails.email)) {
            newErrors.email = 'El formato del correo no es válido.';
        }
        if (patientDetails.whatsapp.trim() && !/^\+?[0-9\s-]{7,15}$/.test(patientDetails.whatsapp)) {
             newErrors.whatsapp = 'El número de WhatsApp no es válido.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (validateForm()) {
            onSubmit(patientDetails, selectedDateTime);
        }
    };

    const handleGoogleLoginSuccess = (response) => {
        console.log("Login con Google exitoso (simulado):", response);
        setPatientDetails(prev => ({
            ...prev,
            name: "Usuario de Google (Simulado)",
            email: "usuario.google@example.com"
        }));
        // Considera limpiar errores si el login de Google llena campos validados
        setErrors(prev => ({ ...prev, name: null, email: null }));
    };

    const handleGoogleLoginFailure = (error) => {
        console.error("Error en login con Google (simulado):", error);
    };

    if (!selectedDateTime) return null;

    return (
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, mt: 3 }}>
            {/* ... Títulos y botón de Google como antes ... */}
            <Typography variant="h5" gutterBottom component="div" sx={{ textAlign: 'center' }}>
                Confirma tu Cita
            </Typography>
            <Typography variant="subtitle1" gutterBottom component="div" sx={{ textAlign: 'center', mb: 3 }}>
                Has seleccionado: {selectedDateTime.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} a las {selectedDateTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </Typography>

            <Box
                component="form"
                onSubmit={handleSubmit}
                noValidate
                sx={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Box sx={{ mb: 2, width: 'fit-content' }}>
                    <GoogleLoginButton
                        onClick={() => {
                            alert('Simulación: Iniciando sesión con Google...');
                            handleGoogleLoginSuccess({ profileObj: { name: 'Nombre Google', email: 'email.google@example.com' } });
                        }}
                        style={{ fontSize: '14px', margin: 0 }}
                    >
                        <span>Continuar con Google</span>
                    </GoogleLoginButton>
                </Box>

                <Typography variant="body2" sx={{ mb: 2 }}>
                    o completa tus datos:
                </Typography>

                {/* ========= SECCIÓN CLAVE PARA LA COLUMNA ÚNICA DE CAMPOS ========= */}
                <Box sx={{ width: '100%', maxWidth: '450px' }}> {/* Contenedor centrado con ancho máximo */}
                    <Grid container spacing={2}>
                        <Grid item xs={12}> {/* xs={12} asegura que ocupe toda la fila disponible */}
                            <TextField
                                required
                                fullWidth // El TextField llenará el ancho del Grid item
                                id="name"
                                label="Nombre Completo"
                                name="name"
                                value={patientDetails.name}
                                onChange={handleChange}
                                error={!!errors.name}
                                helperText={errors.name}
                            />
                        </Grid>
                        <Grid item xs={12}> {/* xs={12} asegura que ocupe toda la fila disponible */}
                            <TextField
                                required
                                fullWidth
                                id="email"
                                label="Correo Electrónico"
                                name="email"
                                type="email"
                                value={patientDetails.email}
                                onChange={handleChange}
                                error={!!errors.email}
                                helperText={errors.email}
                            />
                        </Grid>
                        <Grid item xs={12}> {/* xs={12} asegura que ocupe toda la fila disponible */}
                            <TextField
                                fullWidth
                                id="whatsapp"
                                label="Número de WhatsApp (Opcional)"
                                name="whatsapp"
                                value={patientDetails.whatsapp}
                                onChange={handleChange}
                                error={!!errors.whatsapp}
                                helperText={errors.whatsapp}
                            />
                        </Grid>
                        <Grid item xs={12}> {/* xs={12} asegura que ocupe toda la fila disponible */}
                            <TextField
                                fullWidth
                                id="motivo"
                                label="Motivo de la consulta (Opcional)"
                                name="motivo"
                                multiline
                                rows={3}
                                value={patientDetails.motivo}
                                onChange={handleChange}
                            />
                        </Grid>
                    </Grid>
                </Box>
                {/* ========= FIN DE LA SECCIÓN CLAVE ========= */}

                {/* Contenedor para los botones de acción */}
                <Box sx={{ width: '100%', maxWidth: '450px', mt: 3 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <Button
                                type="button"
                                fullWidth
                                variant="outlined"
                                onClick={onCancel}
                            >
                                Cancelar / Volver
                            </Button>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                            >
                                Confirmar Cita {/* Cambiado a Cita, como en la imagen */}
                            </Button>
                        </Grid>
                    </Grid>
                </Box>
            </Box>
        </Paper>
    );
};

export default PatientForm;