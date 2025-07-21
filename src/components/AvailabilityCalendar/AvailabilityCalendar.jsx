// src/components/AvailabilityCalendar/AvailabilityCalendar.jsx
import React, { useState, useEffect } from 'react';
import { Grid, Paper, Typography, Button, CircularProgress, Alert, Box } from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';

const AvailabilityCalendar = ({ onSlotSelect, professionalId }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [availableSlots, setAvailableSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!selectedDate || !professionalId) return;

        setLoadingSlots(true);
        setError(null);
        setAvailableSlots([]);

        const dateKey = format(selectedDate, 'yyyy-MM-dd');

        fetch(`http://localhost:3001/api/public/availability?date=${dateKey}&professionalId=${professionalId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error ${response.status} del servidor al obtener horarios.`);
                }
                return response.json();
            })
            .then(data => {
                setAvailableSlots(data || []);
            })
            .catch(err => {
                console.error("Error al obtener horarios:", err);
                setError('No se pudieron cargar los horarios. Intente más tarde.');
            })
            .finally(() => {
                setLoadingSlots(false);
            });

    }, [selectedDate, professionalId]);

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

    const shouldDisableDate = (date) => {
        if (!date) return false;
        const day = date.getDay();
        return day === 0 || day === 6; // Deshabilita visualmente Domingo y Sábado
    };

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
                            shouldDisableDate={shouldDisableDate}
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
                                    <Typography sx={{ p: 2, textAlign: 'center', width: '100%', mt: 4 }}>
                                        No hay horarios disponibles para esta fecha.
                                    </Typography>
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