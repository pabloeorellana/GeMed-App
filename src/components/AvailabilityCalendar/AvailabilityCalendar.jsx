import React, { useState, useEffect } from 'react';
import { Grid, Paper, Typography, Button, CircularProgress, Alert, Box } from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import { es } from 'date-fns/locale';

// ---- INICIO DE CAMBIOS ----
// YA NO NECESITAMOS MOCK_AVAILABILITY
// const MOCK_AVAILABILITY = { ... };

// YA NO NECESITAMOS formatDateKey para este mock
// const formatDateKey = (date) => { ... };

// NUEVA FUNCIÓN PARA GENERAR TURNOS FIJOS
const generateFixedSlots = (date) => {
    const slots = [];
    if (!date) return slots; // Protección por si date es null/undefined
    const dayOfWeek = date.getDay(); // 0 (Domingo) a 6 (Sábado)

    // Lunes (1) a Viernes (5)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const startHour = 8;
        const endHour = 12; // Los turnos serán ANTES de las 12:00
        const slotDurationMinutes = 30; // Duración de cada turno

        for (let h = startHour; h < endHour; h++) {
            for (let m = 0; m < 60; m += slotDurationMinutes) {
                const hourString = String(h).padStart(2, '0');
                const minuteString = String(m).padStart(2, '0');
                slots.push(`${hourString}:${minuteString}`);
            }
        }
    }
    return slots;
};
// ---- FIN DE CAMBIOS ----

const AvailabilityCalendar = ({ onSlotSelect }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [availableSlots, setAvailableSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoadingSlots(true);
        setError(null);
        // ---- INICIO DE CAMBIOS ----
        // const dateKey = formatDateKey(selectedDate); // Ya no se usa

        setTimeout(() => {
            // const slotsForDate = MOCK_AVAILABILITY[dateKey] || []; // Ya no se usa
            const slotsForDate = generateFixedSlots(selectedDate); // USAMOS LA NUEVA FUNCIÓN
            setAvailableSlots(slotsForDate);
            setLoadingSlots(false);
        }, 300); // Reducido el delay para que sea más rápido al no ser una "API real"
        // ---- FIN DE CAMBIOS ----
    }, [selectedDate]);

    const handleDateChange = (newDate) => {
        setSelectedDate(newDate);
    };

    const handleSlotClick = (slot) => {
        const selectedDateTime = new Date(selectedDate);
        const [hours, minutes] = slot.split(':');
        selectedDateTime.setHours(parseInt(hours, 10));
        selectedDateTime.setMinutes(parseInt(minutes, 10));
        selectedDateTime.setSeconds(0);
        selectedDateTime.setMilliseconds(0);
        onSlotSelect(selectedDateTime);
    };

    // ---- INICIO DE CAMBIOS ----
    // Función para deshabilitar fines de semana
    const shouldDisableDate = (date) => {
        if (!date) return false;
        const day = date.getDay();
        return day === 0 || day === 6; // Deshabilita Domingo (0) y Sábado (6)
    };
    // ---- FIN DE CAMBIOS ----

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
            <Grid container spacing={3} alignItems="flex-start">
                <Grid item xs={12} md={6}>
                    <Paper elevation={3} sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom component="div" sx={{ textAlign: 'center', mb: 2 }}>
                            Seleccione una Fecha
                        </Typography>
                        <StaticDatePicker
                            displayStaticWrapperAs="desktop"
                            openTo="day"
                            value={selectedDate}
                            onChange={handleDateChange}
                            // ---- INICIO DE CAMBIOS ----
                            shouldDisableDate={shouldDisableDate} // Aplicamos la función para deshabilitar fechas
                            // ---- FIN DE CAMBIOS ----
                            minDate={new Date()}
                            sx={{
                                '& .MuiCalendarPicker-root': {
                                    width: '100%',
                                },
                            }}
                        />
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper elevation={3} sx={{ p: 2, minHeight: { md: '460px' } }}>
                        <Typography variant="h6" gutterBottom component="div" sx={{ textAlign: 'center', mb: 2 }}>
                            Horarios para {selectedDate ? selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Fecha no seleccionada'}
                        </Typography>
                        {loadingSlots && <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>}
                        {error && <Alert severity="error">{error}</Alert>}
                        {!loadingSlots && !error && (
                            <Grid container spacing={1.5}>
                                {availableSlots.length > 0 ? (
                                    availableSlots.map((slot) => (
                                        <Grid item xs={4} sm={3} key={slot}>
                                            <Button
                                                variant="outlined"
                                                fullWidth
                                                onClick={() => handleSlotClick(slot)}
                                                sx={{ py: 1.5 }}
                                            >
                                                {slot}
                                            </Button>
                                        </Grid>
                                    ))
                                ) : (
                                    // ---- INICIO DE CAMBIOS ----
                                    <Typography sx={{ p: 2, textAlign: 'center', width: '100%', mt: 4 }}>
                                        No hay horarios disponibles para esta fecha o es fin de semana.
                                    </Typography>
                                    // ---- FIN DE CAMBIOS ----
                                )}
                            </Grid>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </LocalizationProvider>
    );
};

export default AvailabilityCalendar;