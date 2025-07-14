// src/pages/ProfessionalDashboardPage/views/AppointmentsView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import authFetch from '../../../utils/authFetch';
import {
    Typography, Paper, Modal, Box, Button, Chip, Grid, TextField,
    Select, MenuItem, FormControl, InputLabel, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, Link as MuiLink,
    Avatar, Tooltip, Stack
} from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import esLocale from '@fullcalendar/core/locales/es';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import { format, parseISO, setMinutes, setSeconds, setMilliseconds } from 'date-fns';
import { es as fnsEsLocale } from 'date-fns/locale';
import { LocalizationProvider, DateTimePicker, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const mockAppointments = [
    {
        id: 'appt_1', title: 'Ana Pérez', start: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().replace(/T.*$/, '') + 'T10:00:00',
        end: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().replace(/T.*$/, '') + 'T10:30:00',
        extendedProps: { patientId: 'patient_123', patientDni: '12345678A', patientEmail: 'ana.perez@example.com', patientPhone: '+549111234567', reasonForVisit: 'Control anual y ajuste de dieta.', status: 'SCHEDULED', professionalNotes: 'Revisar últimos análisis.' },
        backgroundColor: '#3f51b5', borderColor: '#3f51b5'
    },
    {
        id: 'appt_2', title: 'Carlos López', start: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString().replace(/T.*$/, '') + 'T14:30:00',
        end: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString().replace(/T.*$/, '') + 'T15:00:00',
        extendedProps: { patientId: 'patient_456', patientDni: '87654321B', patientEmail: 'carlos.lopez@example.com', patientPhone: '+549117654321', reasonForVisit: 'Seguimiento rendimiento deportivo.', status: 'COMPLETED', professionalNotes: 'Excelente progreso.' },
        backgroundColor: '#4caf50', borderColor: '#4caf50'
    },
];

const mockExistingPatientsDataForInitialState = [
    { id: 'patient_123', dni: '12345678A', firstName: 'Ana', lastName: 'Pérez', fullName: 'Ana Pérez', email: 'ana.perez@example.com', phone: '+549111234567', birthDate: '1990-05-15' },
    { id: 'patient_456', dni: '87654321B', firstName: 'Carlos', lastName: 'López', fullName: 'Carlos López', email: 'carlos.lopez@example.com', phone: '+549117654321', birthDate: '1985-11-20' },
    { id: 'patient_789', dni: '11223344C', firstName: 'Laura', lastName: 'Gómez', fullName: 'Laura Gómez', email: 'laura.gomez@example.com', phone: '+549118877665', birthDate: '1995-02-10' },
];

const statusColors = {
    SCHEDULED: { backgroundColor: '#3f51b5', color: 'white', label: 'Programado' },
    CONFIRMED: { backgroundColor: '#1976d2', color: 'white', label: 'Confirmado' },
    COMPLETED: { backgroundColor: '#4caf50', color: 'white', label: 'Completado' },
    CANCELED_PATIENT: { backgroundColor: '#f44336', color: 'white', label: 'Cancelado (Paciente)' },
    CANCELED_PROFESSIONAL: { backgroundColor: '#d32f2f', color: 'white', label: 'Cancelado (Profesional)' },
    NO_SHOW: { backgroundColor: '#757575', color: 'white', label: 'No Asistió' },
};
const availableStatuses = Object.keys(statusColors);
const modalStyle = {
    position: 'absolute', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)', width: { xs: '90%', sm: 500, md: 600 },
    bgcolor: 'background.paper', border: '2px solid #000', boxShadow: 24, p: 4,
    maxHeight: '90vh', overflowY: 'auto'
};
const initialNewAppointmentState = { patient: null, dateTime: null, reasonForVisit: '', };
const initialNewPatientFormDataState = { dni: '', lastName: '', firstName: '', email: '', phone: '', birthDate: null };

const AppointmentsView = () => {
    const [existingPatients, setExistingPatients] = useState(mockExistingPatientsDataForInitialState);
    const [allEvents, setAllEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [openDetailModal, setOpenDetailModal] = useState(false);
    const [openNewAppointmentModal, setOpenNewAppointmentModal] = useState(false);
    const [newAppointmentData, setNewAppointmentData] = useState(initialNewAppointmentState);
    const [newAppointmentErrors, setNewAppointmentErrors] = useState({});
    const [openCreatePatientSubModal, setOpenCreatePatientSubModal] = useState(false);
    const [newPatientFormData, setNewPatientFormData] = useState(initialNewPatientFormDataState);
    const [newPatientFormErrors, setNewPatientFormErrors] = useState({});
    const [isReprogramming, setIsReprogramming] = useState(false);
    const [newDateTimeForReprogram, setNewDateTimeForReprogram] = useState(null);
    const [openDeleteAppointmentConfirmModal, setOpenDeleteAppointmentConfirmModal] = useState(false);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [professionalNotesModal, setProfessionalNotesModal] = useState('');
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [apiError, setApiError] = useState(null);


    const getInitials = (name) => {
        if (!name || typeof name !== 'string') return '';
        const nameParts = name.trim().split(' ');
        if (nameParts.length === 1 && nameParts[0] === '') return '';
        if (nameParts.length > 1) {
            const firstInitial = nameParts[0]?.[0] || '';
            const lastInitial = nameParts[nameParts.length - 1]?.[0] || '';
            return `${firstInitial}${lastInitial}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    useEffect(() => {
        const fetchAppointments = async () => {
            setLoadingEvents(true);
            setApiError(null);
            try {
                // const data = await authFetch('http://localhost:3001/api/professional/appointments');
                const data = { events: mockAppointments }; // Simulación

                if (data) {
                    const appointmentsData = Array.isArray(data) ? data : (data.events || []);
                    const formattedEvents = appointmentsData.map(appt => ({
                        id: appt.id,
                        title: appt.title,
                        start: appt.start,
                        end: appt.end,
                        extendedProps: { ...appt.extendedProps, professionalNotes: appt.extendedProps.professionalNotes || '' },
                        backgroundColor: statusColors[appt.extendedProps.status]?.backgroundColor || '#757575',
                        borderColor: statusColors[appt.extendedProps.status]?.borderColor || '#757575',
                    }));
                    setAllEvents(formattedEvents);
                }
            } catch (error) {
                console.error("Error cargando turnos:", error.message);
                setApiError(error.message);
            } finally {
                setLoadingEvents(false);
            }
        };
        fetchAppointments();
    }, []);

    useEffect(() => {
        let eventsToDisplay = allEvents;
        if (statusFilter && statusFilter !== 'ALL') {
            eventsToDisplay = eventsToDisplay.filter(event => event.extendedProps.status === statusFilter);
        }
        setFilteredEvents(eventsToDisplay);
    }, [allEvents, statusFilter]);

    const handleEventClick = useCallback((clickInfo) => {
        const eventData = {
            id: clickInfo.event.id, title: clickInfo.event.title,
            start: clickInfo.event.startStr, end: clickInfo.event.endStr,
            ...clickInfo.event.extendedProps,
        };
        setSelectedEvent(eventData);
        setProfessionalNotesModal(eventData.professionalNotes || '');
        setIsReprogramming(false);
        setNewDateTimeForReprogram(null);
        setOpenDetailModal(true);
    }, []);

    const handleCloseDetailModal = () => {
        setOpenDetailModal(false); setSelectedEvent(null); setIsReprogramming(false); setNewDateTimeForReprogram(null);
    };

    const handleChangeStatus = async (event) => {
        const newStatus = event.target.value;
        if (selectedEvent) {
            try {
                await authFetch(`http://localhost:3001/api/appointments/${selectedEvent.id}/status`, {
                    method: 'PUT',
                    body: JSON.stringify({ status: newStatus }),
                });
                const updatedEvents = allEvents.map(e =>
                    e.id === selectedEvent.id
                        ? { ...e, extendedProps: { ...e.extendedProps, status: newStatus }, backgroundColor: statusColors[newStatus]?.backgroundColor, borderColor: statusColors[newStatus]?.borderColor }
                        : e
                );
                setAllEvents(updatedEvents);
                setSelectedEvent(prev => ({...prev, status: newStatus}));
            } catch (error) {
                console.error("Error cambiando estado:", error.message);
                alert(`Error cambiando estado: ${error.message}`);
            }
        }
    };
    
    const handleSaveProfessionalNotes = async () => {
        if (selectedEvent) {
            setLoadingEvents(true);
            setApiError(null);
            try {
                await authFetch(`http://localhost:3001/api/appointments/${selectedEvent.id}/notes`, {
                    method: 'PUT',
                    body: JSON.stringify({ professionalNotes: professionalNotesModal }),
                });
                const updatedEvents = allEvents.map(e =>
                    e.id === selectedEvent.id
                        ? { ...e, extendedProps: { ...e.extendedProps, professionalNotes: professionalNotesModal } }
                        : e
                );
                setAllEvents(updatedEvents);
                setSelectedEvent(prev => ({...prev, professionalNotes: professionalNotesModal}));
                alert("Notas guardadas exitosamente.");
            } catch (error) {
                console.error("Error guardando notas:", error.message);
                alert(`Error guardando notas: ${error.message}`);
                setApiError(error.message);
            } finally {
                setLoadingEvents(false);
            }
        }
    };

    const handleOpenNewAppointmentModal = () => setOpenNewAppointmentModal(true);
    const handleCloseNewAppointmentModal = () => {
        setOpenNewAppointmentModal(false); setNewAppointmentData(initialNewAppointmentState); setNewAppointmentErrors({});
    };
    const handleNewAppointmentChange = (event) => {
        const { name, value } = event.target;
        setNewAppointmentData(prev => ({ ...prev, [name]: value }));
    };
    const handleNewAppointmentDateChange = (newValue) => {
        if (newValue) {
            const minutes = newValue.getMinutes();
            if (minutes % 30 !== 0) {
                alert("Por favor, seleccione horarios en incrementos de 30 minutos (ej. 09:00, 09:30).");
                const roundedMinutes = Math.floor(minutes / 30) * 30;
                newValue = setMilliseconds(setSeconds(setMinutes(newValue, roundedMinutes),0),0);
            }
            const hour = newValue.getHours();
            if (hour < 7 || (hour === 21 && minutes > 30) || hour >= 22) {
                alert("Los turnos solo pueden programarse entre las 07:00 y las 21:30.");
                return;
            }
        }
        setNewAppointmentData(prev => ({ ...prev, dateTime: newValue }));
    };
    const handleNewAppointmentPatientChange = (event, newValue) => {
        setNewAppointmentData(prev => ({ ...prev, patient: newValue }));
    };
    const validateNewAppointmentForm = () => {
        const errors = {};
        if (!newAppointmentData.patient) errors.patient = 'Seleccione un paciente.';
        if (!newAppointmentData.dateTime) errors.dateTime = 'Seleccione fecha y hora.';
        setNewAppointmentErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const handleSaveNewAppointment = async () => {
        if (!validateNewAppointmentForm()) return;
        
        const newAppointmentPayload = {
            patientId: newAppointmentData.patient.id,
            dateTime: newAppointmentData.dateTime.toISOString(),
            reasonForVisit: newAppointmentData.reasonForVisit,
            // El backend debería asignar el professionalId basado en el token
        };

        try {
            // const savedAppointment = await authFetch('http://localhost:3001/api/appointments/manual', {
            //     method: 'POST',
            //     body: JSON.stringify(newAppointmentPayload),
            // });
            // Simulación
            const savedAppointment = {
                id: `appt_manual_${Date.now()}`,
                title: newAppointmentData.patient.fullName,
                start: newAppointmentData.dateTime.toISOString(),
                end: new Date(newAppointmentData.dateTime.getTime() + 30 * 60000).toISOString(),
                extendedProps: {
                    patientId: newAppointmentData.patient.id,
                    patientDni: newAppointmentData.patient.dni,
                    patientEmail: newAppointmentData.patient.email,
                    patientPhone: newAppointmentData.patient.phone,
                    reasonForVisit: newAppointmentData.reasonForVisit,
                    status: 'SCHEDULED', professionalNotes: ''
                },
                backgroundColor: statusColors['SCHEDULED']?.backgroundColor,
                borderColor: statusColors['SCHEDULED']?.borderColor,
            };
            if (savedAppointment) {
                 setAllEvents(prev => [...prev, savedAppointment]);
            }
            handleCloseNewAppointmentModal();
        } catch (error) {
            console.error("Error guardando nuevo turno:", error.message);
            setNewAppointmentErrors(prev => ({...prev, form: error.message}));
        }
    };

    const handleOpenCreatePatientSubModal = () => {
        setNewPatientFormData(initialNewPatientFormDataState); setNewPatientFormErrors({}); setOpenCreatePatientSubModal(true);
    };
    const handleCloseCreatePatientSubModal = () => setOpenCreatePatientSubModal(false);
    const handleNewPatientFormChange = (event) => {
        const { name, value } = event.target;
        setNewPatientFormData(prev => ({ ...prev, [name]: value }));
        if (newPatientFormErrors[name]) setNewPatientFormErrors(prev => ({...prev, [name]: null}));
    };
    const handleNewPatientFormDateChange = (newDate) => {
        setNewPatientFormData(prev => ({ ...prev, birthDate: newDate }));
    };
    const validateNewPatientSubForm = () => {
        const errors = {};
        if (!newPatientFormData.dni.trim()) errors.dni = 'DNI es requerido.';
        if (existingPatients.some(p => p.dni === newPatientFormData.dni.trim())) errors.dni = 'Este DNI ya está registrado.';
        if (!newPatientFormData.lastName.trim()) errors.lastName = 'Apellido es requerido.';
        if (!newPatientFormData.firstName.trim()) errors.firstName = 'Nombre es requerido.';
        if (!newPatientFormData.email.trim()) errors.email = 'Email es requerido.';
        else if (!/\S+@\S+\.\S+/.test(newPatientFormData.email)) errors.email = 'Formato de email inválido.';
        setNewPatientFormErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const handleSaveNewPatientFromSubModal = async () => {
        if (!validateNewPatientSubForm()) return;
        const newPatientPayload = {
            dni: newPatientFormData.dni,
            lastName: newPatientFormData.lastName,
            firstName: newPatientFormData.firstName,
            email: newPatientFormData.email,
            phone: newPatientFormData.phone,
            birthDate: newPatientFormData.birthDate ? format(newPatientFormData.birthDate, 'yyyy-MM-dd') : null,
        };
        try {
            // const savedPatient = await authFetch('http://localhost:3001/api/patients', {
            //     method: 'POST',
            //     body: JSON.stringify(newPatientPayload),
            // });
             // Simulación
            const savedPatient = {
                id: `patient_${Date.now()}`,
                ...newPatientPayload,
                fullName: `${newPatientPayload.firstName} ${newPatientPayload.lastName}`,
            };

            if(savedPatient){
                setExistingPatients(prev => [...prev, savedPatient]);
                setNewAppointmentData(prev => ({ ...prev, patient: savedPatient }));
            }
            handleCloseCreatePatientSubModal();
        } catch (error) {
            console.error("Error guardando nuevo paciente (submodal):", error.message);
            setNewPatientFormErrors(prev => ({...prev, form: error.message}));
        }
    };

    const handleDateSelect = (selectInfo) => {
        setNewAppointmentData({ ...initialNewAppointmentState, dateTime: selectInfo.start, });
        setOpenNewAppointmentModal(true);
        let calendarApi = selectInfo.view.calendar;
        calendarApi.unselect();
    };

    const handleOpenDeleteAppointmentModal = () => { setOpenDeleteAppointmentConfirmModal(true); };
    const handleCloseDeleteAppointmentModal = () => { setOpenDeleteAppointmentConfirmModal(false); };
    const handleConfirmDeleteAppointment = async () => {
        if (selectedEvent) {
            try {
                // await authFetch(`http://localhost:3001/api/appointments/${selectedEvent.id}`, { method: 'DELETE' });
                setAllEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
                handleCloseDeleteAppointmentModal();
                handleCloseDetailModal();
            } catch (error) {
                console.error("Error eliminando turno:", error.message);
                alert(`Error eliminando turno: ${error.message}`);
            }
        }
    };

    const handleToggleReprogramming = () => {
        setIsReprogramming(!isReprogramming);
        if (!isReprogramming && selectedEvent) {
            setNewDateTimeForReprogram(parseISO(selectedEvent.start));
        } else { setNewDateTimeForReprogram(null); }
    };

    const handleConfirmReprogramming = async () => {
        if (selectedEvent && newDateTimeForReprogram) {
            if (newDateTimeForReprogram) {
                const minutes = newDateTimeForReprogram.getMinutes();
                if (minutes % 30 !== 0) {
                    alert("Por favor, seleccione horarios para reprogramar en incrementos de 30 minutos (ej. 09:00, 09:30).");
                    return;
                }
                const hour = newDateTimeForReprogram.getHours();
                if (hour < 7 || (hour === 21 && minutes > 30) || hour >= 22) {
                    alert("Los turnos solo pueden reprogramarse entre las 07:00 y las 21:30.");
                    return;
                }
            }

            const duration = parseISO(selectedEvent.end).getTime() - parseISO(selectedEvent.start).getTime();
            const newEndDate = new Date(newDateTimeForReprogram.getTime() + duration);

            try {
                // await authFetch(`http://localhost:3001/api/appointments/${selectedEvent.id}/reprogram`, {
                //     method: 'PUT',
                //     body: JSON.stringify({ newDateTime: newDateTimeForReprogram.toISOString() }),
                // });
                setAllEvents(prevEvents =>
                    prevEvents.map(event =>
                        event.id === selectedEvent.id
                            ? { ...event, start: newDateTimeForReprogram.toISOString(), end: newEndDate.toISOString() }
                            : event
                    )
                );
                handleCloseDetailModal();
            } catch (error) {
                 console.error("Error reprogramando turno:", error.message);
                alert(`Error reprogramando turno: ${error.message}`);
            }
        }
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fnsEsLocale}>
            <Paper elevation={3} sx={{ p: {xs: 1, sm: 2, md: 3} }}>
                <Stack direction={{xs: 'column', sm: 'row'}} justifyContent="space-between" alignItems="center" spacing={2} mb={2}>
                    <Typography variant="h5" gutterBottom component="div" sx={{m:0}}>Mi Agenda de Turnos</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <FormControl size="small" sx={{minWidth: 180}}>
                            <InputLabel id="status-filter-label">Filtrar por Estado</InputLabel>
                            <Select
                                labelId="status-filter-label"
                                value={statusFilter}
                                label="Filtrar por Estado"
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <MenuItem value="ALL">Todos los turnos</MenuItem>
                                {availableStatuses.map(statusKey => (
                                    <MenuItem key={statusKey} value={statusKey}>{statusColors[statusKey]?.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Button variant="contained" startIcon={<AddCircleOutlineIcon />} onClick={handleOpenNewAppointmentModal}>Añadir Turno</Button>
                    </Stack>
                </Stack>
                {apiError && <Alert severity="error" sx={{mb:2}}>{apiError}</Alert>}
                {loadingEvents && <Box sx={{display:'flex', justifyContent:'center', my:2}}><CircularProgress/></Box>}
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                    headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' }}
                    initialView="timeGridWeek"
                    locale={esLocale}
                    weekends={true}
                    events={filteredEvents}
                    eventClick={handleEventClick}
                    editable={false}
                    selectable={true}
                    selectMirror={true}
                    dayMaxEvents={true}
                    select={handleDateSelect}
                    contentHeight="auto"
                    allDaySlot={false}
                    slotMinTime="07:00:00"
                    slotMaxTime="22:00:00"
                    slotDuration="00:30:00"
                    snapDuration="00:15:00"
                    slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                    eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                    nowIndicator={true}
                />

                {selectedEvent && (
                    <Modal open={openDetailModal} onClose={handleCloseDetailModal}>
                        <Box sx={modalStyle}>
                            <Typography variant="h6" component="h2" gutterBottom>Detalles del Turno</Typography>
                            <Chip label={statusColors[selectedEvent.status]?.label || selectedEvent.status} style={{ backgroundColor: statusColors[selectedEvent.status]?.backgroundColor, color: statusColors[selectedEvent.status]?.color, marginBottom: 16 }}/>
                            <Grid container spacing={1.5} direction="column" sx={{ mt: 1 }}>
                                <Grid item><Typography><strong>Paciente:</strong> {selectedEvent.title}</Typography></Grid>
                                <Grid item><Typography><strong>DNI:</strong> {selectedEvent.patientDni}</Typography></Grid>
                                <Grid item><Typography><strong>Fecha:</strong> {format(parseISO(selectedEvent.start), "P", { locale: fnsEsLocale })}</Typography></Grid>
                                <Grid item><Typography><strong>Hora:</strong> {format(parseISO(selectedEvent.start), "HH:mm", { locale: fnsEsLocale })} - {format(parseISO(selectedEvent.end), "HH:mm", { locale: fnsEsLocale })}</Typography></Grid>
                                <Grid item><Typography><strong>Email:</strong> {selectedEvent.patientEmail}</Typography></Grid>
                                <Grid item><Typography><strong>Teléfono:</strong> {selectedEvent.patientPhone}</Typography></Grid>
                                <Grid item>
                                    <Typography><strong>Motivo:</strong></Typography>
                                    <Typography paragraph sx={{ pl:1, fontStyle: 'italic', color: 'text.secondary', mb:1 }}>{selectedEvent.reasonForVisit || 'No especificado'}</Typography>
                                </Grid>
                                <Grid item>
                                    <TextField label="Notas del Profesional sobre el Turno" multiline rows={3} fullWidth variant="outlined" value={professionalNotesModal} onChange={(e) => setProfessionalNotesModal(e.target.value)} sx={{ my: 1 }}/>
                                    <Button onClick={handleSaveProfessionalNotes} size="small" variant="text" sx={{display:'block', ml:'auto'}}>Guardar Notas</Button>
                                </Grid>
                                <Grid item sx={{mt:1}}>
                                    <FormControl fullWidth>
                                        <InputLabel id="status-select-label-modal">Cambiar Estado</InputLabel>
                                        <Select labelId="status-select-label-modal" value={selectedEvent.status} label="Cambiar Estado" onChange={handleChangeStatus}>
                                            {availableStatuses.map(statusKey => (<MenuItem key={statusKey} value={statusKey}>{statusColors[statusKey]?.label}</MenuItem>))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                {isReprogramming && (
                                    <Grid item sx={{mt:2}}>
                                        <DateTimePicker
                                            label="Nueva Fecha y Hora para el Turno"
                                            value={newDateTimeForReprogram}
                                            onChange={(newValue) => setNewDateTimeForReprogram(newValue)}
                                            renderInput={(params) => <TextField {...params} fullWidth />}
                                            ampm={false}
                                            minDateTime={new Date()}
                                        />
                                    </Grid>
                                )}
                            </Grid>
                            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                                <Box>
                                    <Button variant="outlined" color={isReprogramming ? "primary" : "secondary"} onClick={handleToggleReprogramming} startIcon={<EditCalendarIcon />} sx={{ mr: 1, mb: {xs:1, sm:0} }}>{isReprogramming ? "Cancelar Reprogramación" : "Reprogramar"}</Button>
                                    {isReprogramming && (<Button variant="contained" onClick={handleConfirmReprogramming} disabled={!newDateTimeForReprogram} sx={{mb: {xs:1, sm:0}}}>Confirmar Reprog.</Button>)}
                                </Box>
                                <Box sx={{display: 'flex', gap:1}}>
                                    <Button onClick={handleOpenDeleteAppointmentModal} color="error" startIcon={<DeleteForeverIcon />}>Eliminar</Button>
                                    <Button onClick={handleCloseDetailModal} variant="outlined">Cerrar</Button>
                                </Box>
                            </Box>
                        </Box>
                    </Modal>
                )}

                <Dialog open={openNewAppointmentModal} onClose={handleCloseNewAppointmentModal} maxWidth="sm" fullWidth>
                    <DialogTitle>Añadir Turno Manualmente</DialogTitle>
                    <DialogContent>
                        <Grid container spacing={2} direction="column" sx={{pt:1}}>
                            <Grid item xs={12}>
                                <Autocomplete
                                    options={existingPatients}
                                    getOptionLabel={(option) => `${option.fullName} (DNI: ${option.dni})`}
                                    isOptionEqualToValue={(option, value) => option.id === value.id}
                                    onChange={handleNewAppointmentPatientChange}
                                    value={newAppointmentData.patient}
                                    renderInput={(params) => (<TextField {...params} label="Buscar Paciente *" error={!!newAppointmentErrors.patient} helperText={newAppointmentErrors.patient} />)}
                                />
                                {!newAppointmentData.patient && (<Button size="small" startIcon={<PersonAddIcon />} onClick={handleOpenCreatePatientSubModal} sx={{ mt: 1 }}>Añadir Nuevo Paciente</Button>)}
                            </Grid>
                            <Grid item xs={12}>
                                <DateTimePicker
                                    label="Fecha y Hora del Turno *"
                                    value={newAppointmentData.dateTime}
                                    onChange={handleNewAppointmentDateChange}
                                    renderInput={(params) => <TextField {...params} fullWidth error={!!newAppointmentErrors.dateTime} helperText={newAppointmentErrors.dateTime} />}
                                    ampm={false}
                                    minDateTime={new Date()}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField name="reasonForVisit" label="Motivo de la Consulta (Opcional)" value={newAppointmentData.reasonForVisit} onChange={handleNewAppointmentChange} fullWidth multiline rows={3}/>
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{p: '16px 24px'}}>
                        <Button onClick={handleCloseNewAppointmentModal}>Cancelar</Button>
                        <Button onClick={handleSaveNewAppointment} variant="contained">Guardar Turno</Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={openCreatePatientSubModal} onClose={handleCloseCreatePatientSubModal} maxWidth="xs" fullWidth>
                    <DialogTitle sx={{ textAlign: 'center', pb: 0 }}>Añadir Nuevo Paciente</DialogTitle>
                    <DialogContent sx={{ pt: 1 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                            <Avatar sx={{ width: 80, height: 80, mb: 1, fontSize: '2rem', bgcolor: 'primary.light' }}>
                                {newPatientFormData.firstName || newPatientFormData.lastName ? getInitials(`${newPatientFormData.firstName} ${newPatientFormData.lastName}`) : <PersonAddIcon fontSize="large" />}
                            </Avatar>
                        </Box>
                        <Grid container spacing={2} direction="column">
                            <Grid item xs={12}><TextField autoFocus name="dni" label="DNI *" value={newPatientFormData.dni} onChange={handleNewPatientFormChange} fullWidth error={!!newPatientFormErrors.dni} helperText={newPatientFormErrors.dni} variant="outlined"/></Grid>
                            <Grid item xs={12}><TextField name="lastName" label="Apellido *" value={newPatientFormData.lastName} onChange={handleNewPatientFormChange} fullWidth error={!!newPatientFormErrors.lastName} helperText={newPatientFormErrors.lastName} variant="outlined"/></Grid>
                            <Grid item xs={12}><TextField name="firstName" label="Nombre *" value={newPatientFormData.firstName} onChange={handleNewPatientFormChange} fullWidth error={!!newPatientFormErrors.firstName} helperText={newPatientFormErrors.firstName} variant="outlined"/></Grid>
                            <Grid item xs={12}><TextField name="email" label="Correo Electrónico *" type="email" value={newPatientFormData.email} onChange={handleNewPatientFormChange} fullWidth error={!!newPatientFormErrors.email} helperText={newPatientFormErrors.email} variant="outlined"/></Grid>
                            <Grid item xs={12}><TextField name="phone" label="Teléfono" value={newPatientFormData.phone} onChange={handleNewPatientFormChange} fullWidth variant="outlined"/></Grid>
                            <Grid item xs={12}>
                                 <DatePicker
                                    label="Fecha de Nacimiento"
                                    value={newPatientFormData.birthDate}
                                    onChange={handleNewPatientFormDateChange}
                                    renderInput={(params) => <TextField {...params} fullWidth error={!!newPatientFormErrors.birthDate} helperText={newPatientFormErrors.birthDate} variant="outlined"/>}
                                    maxDate={new Date()}
                                    format="dd/MM/yyyy"
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{p: '16px 24px', justifyContent: 'space-between'}}>
                        <Button onClick={handleCloseCreatePatientSubModal} color="inherit">Cancelar</Button>
                        <Button onClick={handleSaveNewPatientFromSubModal} variant="contained">Guardar Paciente</Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={openDeleteAppointmentConfirmModal} onClose={handleCloseDeleteAppointmentModal}>
                    <DialogTitle>Confirmar Eliminación de Turno</DialogTitle>
                    <DialogContent>
                        <Typography>
                            ¿Está seguro de que desea eliminar el turno para <strong>{selectedEvent?.title}</strong> el día <strong>{selectedEvent ? format(parseISO(selectedEvent.start), "dd/MM/yyyy 'a las' HH:mm", { locale: fnsEsLocale }) : ''}</strong>? Esta acción no se puede deshacer.
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDeleteAppointmentModal}>Cancelar</Button>
                        <Button onClick={handleConfirmDeleteAppointment} color="error" autoFocus>Eliminar</Button>
                    </DialogActions>
                </Dialog>
            </Paper>
        </LocalizationProvider>
    );
};

export default AppointmentsView;