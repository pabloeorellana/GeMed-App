// src/pages/ProfessionalDashboardPage/views/PatientsView.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import authFetch from '../../../utils/authFetch';
import {
    Box, Typography, Paper, TextField, List, ListItem, ListItemButton,
    ListItemText, Divider, Button, Grid, Dialog, DialogTitle,
    DialogContent, DialogActions, CircularProgress, IconButton, Avatar, Stack,
    ListItemIcon, Tooltip, Select, MenuItem,
    FormControl, InputLabel, Chip, DialogContentText, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditNoteIcon from '@mui/icons-material/EditNote';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// Mantener esto por ahora para la lógica de HC
const mockClinicalRecordsData = {
    'patient_123': [
        { id: 'cr_1', date: new Date(2024, 4, 10, 10, 30).toISOString(), updatedAt: new Date(2024, 4, 11, 9, 0).toISOString(), title: 'Control Anual', content: 'Paciente refiere sentirse bien. Se ajusta dieta levemente. Próximo control en 6 meses. Paciente refiere sentirse bien. Se ajusta dieta levemente. Próximo control en 6 meses. Paciente refiere sentirse bien. Se ajusta dieta levemente. Próximo control en 6 meses. Paciente refiere sentirse bien. Se ajusta dieta levemente. Próximo control en 6 meses.', professionalId: 'prof_default_01', pathology: 'Sobrepeso y Obesidad', attachmentName: 'estudios_ana.pdf' },
        { id: 'cr_2', date: new Date(2023, 10, 5, 11, 0).toISOString(), updatedAt: new Date(2023, 10, 5, 11, 0).toISOString(), title: 'Consulta por Alergia', content: 'Presenta síntomas de alergia primaveral. Se deriva a especialista.', professionalId: 'prof_default_01', pathology: '', attachmentName: '' },
    ],
    'patient_456': [
        { id: 'cr_3', date: new Date(2024, 3, 20, 15, 0).toISOString(), updatedAt: new Date(2024, 3, 20, 15, 0).toISOString(), title: 'Seguimiento Deportivo', content: 'Aumento de masa muscular según plan. Continuar con suplementación indicada.', professionalId: 'prof_default_01', pathology: 'Otros', attachmentName: '' },
    ],
};
const initialNewPatientState = { dni: '', lastName: '', firstName: '', email: '', phone: '', birthDate: null };
const initialClinicalRecordState = { id: null, title: '', content: '', pathology: '', attachment: null, attachmentName: '' };

const pathologiesList = [
    "Sobrepeso y Obesidad", "Diabetes Mellitus Tipo 2", "Enfermedades Cardiovasculares",
    "Hipertensión Arterial", "Caries Dental", "Anemia por deficiencia de hierro",
    "Deficiencia de Vitamina D", "Deficiencia de Yodo", "Anorexia Nerviosa",
    "Bulimia Nerviosa", "Otros"
];

const PatientsView = () => {
    const [patients, setPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [clinicalRecords, setClinicalRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [loadingRecords, setLoadingRecords] = useState(false);
    const [openRecordFormModal, setOpenRecordFormModal] = useState(false);
    const [currentRecordForm, setCurrentRecordForm] = useState(initialClinicalRecordState);
    const [isEditingRecordForm, setIsEditingRecordForm] = useState(false);
    const [openAddPatientModal, setOpenAddPatientModal] = useState(false);
    const [newPatientData, setNewPatientData] = useState(initialNewPatientState);
    const [newPatientErrors, setNewPatientErrors] = useState({});
    const [openEditPatientModal, setOpenEditPatientModal] = useState(false);
    const [editingPatientData, setEditingPatientData] = useState(null);
    const [editingPatientErrors, setEditingPatientErrors] = useState({});
    const [openViewRecordModal, setOpenViewRecordModal] = useState(false);
    const [recordToView, setRecordToView] = useState(null);
    const [openDeleteConfirmModal, setOpenDeleteConfirmModal] = useState(false);
    const [recordToDeleteId, setRecordToDeleteId] = useState(null);

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

    const fetchPatients = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await authFetch('http://localhost:3001/api/patients');
            const processedData = (data || []).map(p => ({
                ...p,
                firstName: p.firstName || '',
                lastName: p.lastName || '',
                fullName: p.fullName || `${p.firstName || ''} ${p.lastName || ''}`.trim(),
            }));
            setPatients(processedData);
        } catch (err) {
            console.error("Error cargando pacientes:", err);
            setError(err.message || "Error al cargar los pacientes.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPatients();
    }, [fetchPatients]);

    useEffect(() => {
        if (selectedPatient) {
            setLoadingRecords(true);
            setTimeout(() => {
                const records = mockClinicalRecordsData[selectedPatient.id] || [];
                setClinicalRecords(records.sort((a, b) => new Date(b.date) - new Date(a.date)));
                setLoadingRecords(false);
            }, 500);
        } else {
            setClinicalRecords([]);
        }
    }, [selectedPatient]);

    const filteredPatients = useMemo(() => {
        if (!searchTerm) return patients;
        return patients.filter(p =>
            p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.dni.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [patients, searchTerm]);

    const handleSelectPatient = (patient) => setSelectedPatient(patient);
    const handleBackToList = () => setSelectedPatient(null);

    const handleOpenRecordFormModal = (recordToEdit = null) => {
        if (recordToEdit) {
            setCurrentRecordForm({
                id: recordToEdit.id, title: recordToEdit.title || '', content: recordToEdit.content,
                pathology: recordToEdit.pathology || '', attachment: null,
                attachmentName: recordToEdit.attachmentName || ''
            });
            setIsEditingRecordForm(true);
        } else {
            setCurrentRecordForm(initialClinicalRecordState);
            setIsEditingRecordForm(false);
        }
        setOpenRecordFormModal(true);
    };

    const handleCloseRecordFormModal = () => {
        setOpenRecordFormModal(false);
        setCurrentRecordForm(initialClinicalRecordState);
        setIsEditingRecordForm(false);
    };
    const handleRecordInputChange = (event) => {
        const { name, value } = event.target;
        setCurrentRecordForm(prev => ({ ...prev, [name]: value }));
    };
    const handleAttachmentChange = (event) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            setCurrentRecordForm(prev => ({ ...prev, attachment: file, attachmentName: file.name }));
        }
    };
    const handleSaveRecord = () => {
        if (isEditingRecordForm) {
            setClinicalRecords(prev => prev.map(r => r.id === currentRecordForm.id ? {...r, ...currentRecordForm, updatedAt: new Date().toISOString(), attachment: null } : r)
                .sort((a,b) => new Date(b.date) - new Date(a.date))
            );
        } else {
            const newRecord = {
                id: `cr_${Date.now()}`, date: new Date().toISOString(), updatedAt: new Date().toISOString(),
                ...currentRecordForm, attachment: null, professionalId: 'prof_default_01'
            };
            setClinicalRecords(prev => [newRecord, ...prev].sort((a,b) => new Date(b.date) - new Date(a.date)));
        }
        handleCloseRecordFormModal();
    };

    const handleDeleteRecordRequest = (recordId) => {
        setRecordToDeleteId(recordId);
        setOpenDeleteConfirmModal(true);
    };
    const handleCloseDeleteConfirmModal = () => {
        setOpenDeleteConfirmModal(false);
        setRecordToDeleteId(null);
    };
    const handleConfirmDeleteRecord = () => {
        if (recordToDeleteId) {
            setClinicalRecords(prev => prev.filter(r => r.id !== recordToDeleteId));
        }
        handleCloseDeleteConfirmModal();
    };

    const handleOpenAddPatientModal = () => setOpenAddPatientModal(true);
    const handleCloseAddPatientModal = () => {
        setOpenAddPatientModal(false);
        setNewPatientData(initialNewPatientState);
        setNewPatientErrors({});
    };
    const handleNewPatientChange = (event) => {
        const { name, value } = event.target;
        setNewPatientData(prev => ({ ...prev, [name]: value }));
        if (newPatientErrors[name]) setNewPatientErrors(prev => ({...prev, [name]: null}));
    };
    const handleNewPatientDateChange = (newDate) => {
        setNewPatientData(prev => ({ ...prev, birthDate: newDate }));
    };
    const validateNewPatientForm = () => {
        const errors = {};
        if (!newPatientData.dni.trim()) errors.dni = 'DNI es requerido.';
        if (patients.some(p => p.dni === newPatientData.dni.trim())) errors.dni = 'Este DNI ya está registrado.';
        if (!newPatientData.lastName.trim()) errors.lastName = 'Apellido es requerido.';
        if (!newPatientData.firstName.trim()) errors.firstName = 'Nombre es requerido.';
        if (!newPatientData.email.trim()) errors.email = 'Email es requerido.';
        else if (!/\S+@\S+\.\S+/.test(newPatientData.email)) errors.email = 'Formato de email inválido.';
        setNewPatientErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const handleSaveNewPatient = async () => {
        if (!validateNewPatientForm()) return;
        try {
            const newPatientPayload = {
                ...newPatientData,
                birthDate: newPatientData.birthDate ? format(newPatientData.birthDate, 'yyyy-MM-dd') : null,
            };
            const savedPatient = await authFetch('http://localhost:3001/api/patients', {
                method: 'POST',
                body: JSON.stringify(newPatientPayload),
            });
            await fetchPatients();
            handleCloseAddPatientModal();
        } catch (err) {
            console.error("Error guardando nuevo paciente:", err);
            setNewPatientErrors(prev => ({ ...prev, form: err.message }));
        }
    };

    const handleOpenEditPatientModal = () => {
        if (selectedPatient) {
            setEditingPatientData({
                id: selectedPatient.id,
                dni: selectedPatient.dni,
                lastName: selectedPatient.lastName || '',
                firstName: selectedPatient.firstName || '',
                email: selectedPatient.email,
                phone: selectedPatient.phone || '',
                birthDate: selectedPatient.birthDate ? parseISO(selectedPatient.birthDate) : null,
            });
            setEditingPatientErrors({});
            setOpenEditPatientModal(true);
        }
    };
    const handleCloseEditPatientModal = () => {
        setOpenEditPatientModal(false); setEditingPatientData(null); setEditingPatientErrors({});
    };
    const handleEditingPatientChange = (event) => {
        const { name, value } = event.target;
        setEditingPatientData(prev => ({ ...prev, [name]: value }));
        if (editingPatientErrors[name]) setEditingPatientErrors(prev => ({...prev, [name]: null}));
    };
    const handleEditingPatientDateChange = (newDate) => {
        setEditingPatientData(prev => ({ ...prev, birthDate: newDate }));
    };
    const validateEditingPatientForm = () => {
        const errors = {};
        if (!editingPatientData.dni.trim()) errors.dni = 'DNI es requerido.';
        if (editingPatientData.dni.trim() !== selectedPatient.dni && patients.some(p => p.id !== editingPatientData.id && p.dni === editingPatientData.dni.trim())) {
            errors.dni = 'Este DNI ya está registrado para otro paciente.';
        }
        if (!editingPatientData.lastName.trim()) errors.lastName = 'Apellido es requerido.';
        if (!editingPatientData.firstName.trim()) errors.firstName = 'Nombre es requerido.';
        if (!editingPatientData.email.trim()) errors.email = 'Email es requerido.';
        else if (!/\S+@\S+\.\S+/.test(editingPatientData.email)) errors.email = 'Formato de email inválido.';
        setEditingPatientErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const handleSaveEditedPatient = async () => {
        if (!validateEditingPatientForm() || !editingPatientData) return;
        try {
            const updatedPatientPayload = {
                ...editingPatientData,
                birthDate: editingPatientData.birthDate ? format(editingPatientData.birthDate, 'yyyy-MM-dd') : null,
            };
            const updatedPatient = await authFetch(`http://localhost:3001/api/patients/${editingPatientData.id}`, {
                method: 'PUT',
                body: JSON.stringify(updatedPatientPayload),
            });
            const updatedPatientWithFullName = {
                ...updatedPatient,
                fullName: `${updatedPatient.firstName || ''} ${updatedPatient.lastName || ''}`.trim()
            };
            const updatedPatients = patients.map(p => p.id === updatedPatient.id ? updatedPatientWithFullName : p);
            setPatients(updatedPatients);
            setSelectedPatient(updatedPatientWithFullName);
            handleCloseEditPatientModal();
        } catch (err) {
            console.error("Error actualizando paciente:", err);
            setEditingPatientErrors(prev => ({ ...prev, form: err.message }));
        }
    };

    const handleOpenViewRecordModal = (record) => {
        setRecordToView(record);
        setOpenViewRecordModal(true);
    };
    const handleCloseViewRecordModal = () => {
        setOpenViewRecordModal(false);
        setRecordToView(null);
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
                <CircularProgress />
            </Box>
        );
    }
    if (error) {
        return <Alert severity="error" sx={{m: 2}}>{error}</Alert>
    }

    if (selectedPatient) {
        return (
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
                <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Button startIcon={<ArrowBackIcon />} onClick={handleBackToList}>Volver a la Lista</Button>
                        <Button variant="outlined" startIcon={<EditNoteIcon />} onClick={handleOpenEditPatientModal}>Editar Datos Paciente</Button>
                    </Stack>
                    <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, fontSize: '1.5rem' }}>{getInitials(selectedPatient.fullName)}</Avatar>
                        <Box>
                            <Typography variant="h5">{selectedPatient.fullName}</Typography>
                            <Typography variant="body1" color="text.secondary">DNI: {selectedPatient.dni}</Typography>
                            <Typography variant="caption" color="text.secondary">Email: {selectedPatient.email} | Tel: {selectedPatient.phone}</Typography>
                            {selectedPatient.birthDate && <Typography variant="caption" display="block" color="text.secondary">Nac.: {format(parseISO(selectedPatient.birthDate), "dd/MM/yyyy", { locale: es })}</Typography>}
                        </Box>
                    </Stack>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">Historia Clínica</Typography>
                        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenRecordFormModal()}>Nueva Entrada</Button>
                    </Box>
                    {loadingRecords ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>
                    ) : clinicalRecords.length === 0 ? (
                        <Typography color="text.secondary" sx={{textAlign: 'center', my: 3}}>No hay registros.</Typography>
                    ) : (
                        <List sx={{ width: '100%' }}>
                            {clinicalRecords.map(record => (
                                <React.Fragment key={record.id}>
                                    <ListItem alignItems="flex-start" disableGutters sx={{ display: 'block', py: 1.5 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', mb: 0.5 }}>
                                            <Typography variant="subtitle1" component="div" sx={{fontWeight: 'medium', flexGrow: 1, mr:1 }}>{record.title || "Entrada"}</Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                                <Tooltip title="Ver Detalles"><IconButton aria-label="view" onClick={() => handleOpenViewRecordModal(record)} size="small"><VisibilityIcon fontSize="inherit"/></IconButton></Tooltip>
                                                <Tooltip title="Editar entrada"><IconButton aria-label="edit" onClick={() => handleOpenRecordFormModal(record)} size="small"><EditIcon fontSize="inherit"/></IconButton></Tooltip>
                                                <Tooltip title="Eliminar entrada"><IconButton aria-label="delete" onClick={() => handleDeleteRecordRequest(record.id)} size="small"><DeleteIcon fontSize="inherit"/></IconButton></Tooltip>
                                            </Box>
                                        </Box>
                                        <Typography component="div" variant="caption" sx={{ color: 'text.secondary', mb: 0.5 }}>
                                            Creado: {format(parseISO(record.date), "dd/MM/yy HH:mm", { locale: es })}
                                            {record.updatedAt && record.date !== record.updatedAt && ` (Modif.: ${format(parseISO(record.updatedAt), "dd/MM/yy HH:mm", { locale: es })})`}
                                        </Typography>
                                        {record.pathology && (<Typography component="div" variant="caption" sx={{ color: 'info.main', mb: 0.5 }}>Patología: {record.pathology}</Typography>)}
                                        <Typography component="div" variant="body2" color="text.primary" sx={{ whiteSpace: 'pre-wrap', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', mb: record.attachmentName ? 0.5 : 0 }}>{record.content}</Typography>
                                        {record.attachmentName && (<Typography component="div" variant="caption" sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', mt: 0.5 }}><AttachFileIcon fontSize="inherit" sx={{mr:0.5}}/> Archivo adjunto: {record.attachmentName}</Typography>)}
                                    </ListItem>
                                    <Divider component="li" />
                                </React.Fragment>
                            ))}
                        </List>
                    )}
                    <Dialog open={openRecordFormModal} onClose={handleCloseRecordFormModal} maxWidth="md" fullWidth>
                        <DialogTitle>{isEditingRecordForm ? 'Editar Entrada de HC' : 'Nueva Entrada en Historia Clínica'}</DialogTitle>
                        <DialogContent>
                            <Grid container spacing={2} direction="column" sx={{pt:1}}>
                                <Grid item xs={12}>
                                    <TextField autoFocus margin="dense" name="title" label="Motivo de la consulta/Asunto" type="text" fullWidth variant="outlined" value={currentRecordForm.title} onChange={handleRecordInputChange}/>
                                </Grid>
                                <Grid item xs={12}>
                                    <FormControl fullWidth margin="dense">
                                        <InputLabel id="pathology-select-label">Patología Asociada (Opcional)</InputLabel>
                                        <Select labelId="pathology-select-label" name="pathology" value={currentRecordForm.pathology} label="Patología Asociada (Opcional)" onChange={handleRecordInputChange}>
                                            <MenuItem value=""><em>Ninguna</em></MenuItem>
                                            {pathologiesList.map((pathology) => (<MenuItem key={pathology} value={pathology}>{pathology}</MenuItem>))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField margin="dense" name="content" label="Detalles" type="text" fullWidth multiline rows={8} variant="outlined" value={currentRecordForm.content} onChange={handleRecordInputChange} required />
                                </Grid>
                                <Grid item xs={12}>
                                    <Button variant="outlined" component="label" startIcon={<AttachFileIcon />} fullWidth sx={{textTransform: 'none', mt:1}}>
                                        Adjuntar Archivo (PDF, Imagen)
                                        <input type="file" hidden onChange={handleAttachmentChange} accept="application/pdf,image/*"/>
                                    </Button>
                                    {currentRecordForm.attachmentName && (<Typography variant="caption" display="block" sx={{mt:1, textAlign: 'center'}}>Archivo seleccionado: {currentRecordForm.attachmentName}</Typography>)}
                                </Grid>
                            </Grid>
                        </DialogContent>
                        <DialogActions sx={{p: '16px 24px'}}>
                            <Button onClick={handleCloseRecordFormModal}>Cancelar</Button>
                            <Button onClick={handleSaveRecord} variant="contained" disabled={!currentRecordForm.content?.trim()}>{isEditingRecordForm ? 'Actualizar Entrada' : 'Guardar Entrada'}</Button>
                        </DialogActions>
                    </Dialog>
                    {recordToView && (
                        <Dialog open={openViewRecordModal} onClose={handleCloseViewRecordModal} maxWidth="md" fullWidth>
                            <DialogTitle>Detalle de Entrada de Historia Clínica</DialogTitle>
                            <DialogContent dividers>
                                <Typography variant="h6" gutterBottom>{recordToView.title || "Entrada sin título"}</Typography>
                                <Typography variant="caption" display="block" color="text.secondary">Creado: {format(parseISO(recordToView.date), "PPPPp", { locale: es })}</Typography>
                                {recordToView.updatedAt && recordToView.date !== recordToView.updatedAt && (<Typography variant="caption" display="block" color="text.secondary">Última Modificación: {format(parseISO(recordToView.updatedAt), "PPPPp", { locale: es })}</Typography>)}
                                {recordToView.pathology && (<Typography variant="subtitle1" sx={{mt:2, mb:1, color: 'info.main'}}>Patología Asociada: {recordToView.pathology}</Typography>)}
                                <Typography variant="body1" sx={{mt:2, whiteSpace: 'pre-wrap'}}>{recordToView.content}</Typography>
                                {recordToView.attachmentName && (<Box mt={2}><Typography variant="subtitle2" gutterBottom>Archivo Adjunto:</Typography><Chip icon={<AttachFileIcon />} label={recordToView.attachmentName} component="a" href="#" target="_blank" clickable variant="outlined"/></Box>)}
                            </DialogContent>
                            <DialogActions sx={{p: '16px 24px'}}><Button onClick={handleCloseViewRecordModal}>Cerrar</Button></DialogActions>
                        </Dialog>
                    )}
                    {editingPatientData && (
                        <Dialog open={openEditPatientModal} onClose={handleCloseEditPatientModal} maxWidth="xs" fullWidth>
                            <DialogTitle sx={{ textAlign: 'center', pb: 0 }}>Editar Datos del Paciente</DialogTitle>
                            <DialogContent sx={{ pt: 1 }}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                                    <Avatar sx={{ width: 80, height: 80, mb: 1, fontSize: '2rem', bgcolor: 'primary.light' }}>
                                        {editingPatientData.firstName || editingPatientData.lastName ? getInitials(`${editingPatientData.firstName} ${editingPatientData.lastName}`) : <PersonAddIcon fontSize="large" />}
                                    </Avatar>
                                </Box>
                                <Grid container spacing={2} direction="column">
                                    <Grid item xs={12}><TextField name="dni" label="DNI *" value={editingPatientData.dni} onChange={handleEditingPatientChange} fullWidth variant="outlined" error={!!editingPatientErrors.dni} helperText={editingPatientErrors.dni}/></Grid>
                                    <Grid item xs={12}><TextField autoFocus name="lastName" label="Apellido *" value={editingPatientData.lastName} onChange={handleEditingPatientChange} fullWidth error={!!editingPatientErrors.lastName} helperText={editingPatientErrors.lastName} variant="outlined"/></Grid>
                                    <Grid item xs={12}><TextField name="firstName" label="Nombre *" value={editingPatientData.firstName} onChange={handleEditingPatientChange} fullWidth error={!!editingPatientErrors.firstName} helperText={editingPatientErrors.firstName} variant="outlined"/></Grid>
                                    <Grid item xs={12}><TextField name="email" label="Correo Electrónico *" type="email" value={editingPatientData.email} onChange={handleEditingPatientChange} fullWidth error={!!editingPatientErrors.email} helperText={editingPatientErrors.email} variant="outlined"/></Grid>
                                    <Grid item xs={12}><TextField name="phone" label="Teléfono" value={editingPatientData.phone} onChange={handleEditingPatientChange} fullWidth variant="outlined"/></Grid>
                                    <Grid item xs={12}>
                                        <DatePicker
                                            label="Fecha de Nacimiento"
                                            value={editingPatientData.birthDate}
                                            onChange={handleEditingPatientDateChange}
                                            renderInput={(params) => <TextField {...params} fullWidth error={!!editingPatientErrors.birthDate} helperText={editingPatientErrors.birthDate} variant="outlined"/>}
                                            maxDate={new Date()}
                                            format="dd/MM/yyyy"
                                        />
                                    </Grid>
                                </Grid>
                            </DialogContent>
                            <DialogActions sx={{p: '16px 24px', justifyContent: 'space-between'}}>
                                <Button onClick={handleCloseEditPatientModal} color="inherit">Cancelar</Button>
                                <Button onClick={handleSaveEditedPatient} variant="contained">Guardar Cambios</Button>
                            </DialogActions>
                        </Dialog>
                    )}
                    <Dialog
                        open={openDeleteConfirmModal}
                        onClose={handleCloseDeleteConfirmModal}
                        aria-labelledby="alert-dialog-title"
                        aria-describedby="alert-dialog-description"
                    >
                        <DialogTitle id="alert-dialog-title">Confirmar Eliminación</DialogTitle>
                        <DialogContent>
                            <DialogContentText id="alert-dialog-description">
                                ¿Está seguro de que desea eliminar esta entrada de la historia clínica? Esta acción no se puede deshacer.
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleCloseDeleteConfirmModal}>Cancelar</Button>
                            <Button onClick={handleConfirmDeleteRecord} color="error" autoFocus>Eliminar</Button>
                        </DialogActions>
                    </Dialog>
                </Paper>
            </LocalizationProvider>
        );
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
            <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5" gutterBottom component="div" sx={{m:0}}>Mis Pacientes</Typography>
                    <Button variant="contained" startIcon={<PersonAddIcon />} onClick={handleOpenAddPatientModal}>Añadir Paciente</Button>
                </Box>
                <TextField fullWidth label="Buscar paciente por Nombre, Apellido, DNI o Email" variant="outlined" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ mb: 2 }}/>
                {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box> :
                 filteredPatients.length === 0 && !searchTerm ? <Typography color="text.secondary" sx={{textAlign: 'center', my: 3}}>Aún no tienes pacientes registrados.</Typography> :
                 filteredPatients.length === 0 && searchTerm ? <Typography color="text.secondary" sx={{textAlign: 'center', my: 3}}>No se encontraron pacientes con "{searchTerm}".</Typography> :
                <List>
                    {filteredPatients.map(patient => (
                        <React.Fragment key={patient.id}>
                            <ListItem disablePadding>
                                <ListItemButton onClick={() => handleSelectPatient(patient)}>
                                    <ListItemIcon sx={{minWidth: 40}}>
                                        <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32, fontSize: '0.875rem' }}>{getInitials(patient.fullName)}</Avatar>
                                    </ListItemIcon>
                                    <ListItemText primary={patient.fullName} secondary={`DNI: ${patient.dni} | Email: ${patient.email}`}/>
                                </ListItemButton>
                            </ListItem>
                            <Divider/>
                        </React.Fragment>
                    ))}
                </List>
                }
            </Paper>
            <Dialog open={openAddPatientModal} onClose={handleCloseAddPatientModal} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ textAlign: 'center', pb: 0 }}>Añadir Nuevo Paciente</DialogTitle>
                <DialogContent sx={{ pt: 1 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                        <Avatar sx={{ width: 80, height: 80, mb: 1, fontSize: '2rem', bgcolor: 'primary.light' }}>
                            {newPatientData.firstName || newPatientData.lastName ? getInitials(`${newPatientData.firstName} ${newPatientData.lastName}`) : <PersonAddIcon fontSize="large" />}
                        </Avatar>
                        <Typography variant="caption" color="text.secondary">(La foto de perfil se podrá añadir más adelante)</Typography>
                    </Box>
                    <Grid container spacing={2} direction="column">
                        <Grid item xs={12}><TextField autoFocus name="dni" label="DNI *" value={newPatientData.dni} onChange={handleNewPatientChange} fullWidth error={!!newPatientErrors.dni} helperText={newPatientErrors.dni} variant="outlined"/></Grid>
                        <Grid item xs={12}><TextField name="lastName" label="Apellido *" value={newPatientData.lastName} onChange={handleNewPatientChange} fullWidth error={!!newPatientErrors.lastName} helperText={newPatientErrors.lastName} variant="outlined"/></Grid>
                        <Grid item xs={12}><TextField name="firstName" label="Nombre *" value={newPatientData.firstName} onChange={handleNewPatientChange} fullWidth error={!!newPatientErrors.firstName} helperText={newPatientErrors.firstName} variant="outlined"/></Grid>
                        <Grid item xs={12}><TextField name="email" label="Correo Electrónico *" type="email" value={newPatientData.email} onChange={handleNewPatientChange} fullWidth error={!!newPatientErrors.email} helperText={newPatientErrors.email} variant="outlined"/></Grid>
                        <Grid item xs={12}><TextField name="phone" label="Teléfono" value={newPatientData.phone} onChange={handleNewPatientChange} fullWidth variant="outlined"/></Grid>
                        <Grid item xs={12}>
                             <DatePicker
                                label="Fecha de Nacimiento"
                                value={newPatientData.birthDate}
                                onChange={handleNewPatientDateChange}
                                renderInput={(params) => <TextField {...params} fullWidth error={!!newPatientErrors.birthDate} helperText={newPatientErrors.birthDate} variant="outlined"/>}
                                maxDate={new Date()}
                                format="dd/MM/yyyy"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{p: '16px 24px', justifyContent: 'space-between'}}>
                    <Button onClick={handleCloseAddPatientModal} color="inherit">Cancelar</Button>
                    <Button onClick={handleSaveNewPatient} variant="contained">Guardar Paciente</Button>
                </DialogActions>
            </Dialog>
        </LocalizationProvider>
    );
};

export default PatientsView;