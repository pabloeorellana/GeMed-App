import React from 'react';
import { Typography, Paper, Button, Box, Alert } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const AppointmentConfirmation = ({ appointmentDetails, onBookAnother }) => {
    if (!appointmentDetails) return null;

    const { patient, dateTime } = appointmentDetails;

    return (
        <Paper elevation={3} sx={{ p: 3, mt: 3, textAlign: 'center' }}>
            <CheckCircleOutlineIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h5" gutterBottom component="div">
                Turno Confirmado!
            </Typography>
            <Alert severity="success" sx={{mb: 2}}>
                Hemos recibido tu solicitud de turno.
            </Alert>
            <Typography variant="body1" sx={{ mb: 1 }}>
                Estimado/a **{patient.name}**,
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
                Tu turno ha sido programado para el:
            </Typography>
            <Typography variant="h6" color="primary" sx={{ mb: 2 }}>
                {dateTime.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                {' a las '}
                {dateTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
                Recibirás una confirmación por correo electrónico en **{patient.email}**.
            </Typography>
            {patient.whatsapp && (
                <Typography variant="body2" sx={{ mb: 2 }}>
                    Y un mensaje por WhatsApp al número: **{patient.whatsapp}**.
                </Typography>
            )}
            <Typography variant="caption" display="block" sx={{ mb: 2 }}>
                (Esto es una simulación. En una aplicación real, se enviarían notificaciones y se integraría con calendarios).
            </Typography>
            <Button variant="contained" onClick={onBookAnother}>
                Reservar Otro Turno
            </Button>
        </Paper>
    );
};

export default AppointmentConfirmation;