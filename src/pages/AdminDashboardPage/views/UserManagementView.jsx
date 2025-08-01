// src/pages/AdminDashboardPage/views/UserManagementView.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Box, Typography, Button, Tooltip, IconButton, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField, FormControl, InputLabel,
    Select, MenuItem, Grid, Chip, Switch, FormControlLabel
} from '@mui/material';
import { MaterialReactTable } from 'material-react-table';
import { MRT_Localization_ES } from 'material-react-table/locales/es';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import authFetch from '../../../utils/authFetch';
import { useNotification } from '../../../context/NotificationContext';

const initialUserState = {
    dni: '', fullName: '', email: '', password: '',
    confirmPassword: '', role: 'PROFESSIONAL', specialty: '', isActive: true
};

const UserManagementView = () => {
    const { showNotification } = useNotification();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentUser, setCurrentUser] = useState(initialUserState);
    const [validationErrors, setValidationErrors] = useState({});

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await authFetch('http://localhost:3001/api/admin/users');
            setUsers(data || []);
        } catch (err) {
            setError(err.message || 'Error al cargar usuarios.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleOpenCreateModal = () => {
        setIsEditing(false);
        setCurrentUser(initialUserState);
        setValidationErrors({});
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (user) => {
        setIsEditing(true);
        setCurrentUser({ ...user, password: '', confirmPassword: '' });
        setValidationErrors({});
        setIsModalOpen(true);
    };
    
    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleUserChange = (event) => {
        const { name, value, type, checked } = event.target;
        const val = type === 'checkbox' ? checked : value;
        setCurrentUser(prev => ({ ...prev, [name]: val }));
        if (validationErrors[name]) setValidationErrors(prev => ({...prev, [name]: null}));
    };

    const validateForm = () => {
        const errors = {};
        if (!currentUser.dni?.trim()) errors.dni = 'DNI es requerido.';
        if (!currentUser.fullName?.trim()) errors.fullName = 'Nombre completo es requerido.';
        if (!currentUser.email?.trim()) {
            errors.email = 'Email es requerido.';
        } else if (!/\S+@\S+\.\S+/.test(currentUser.email)) {
            errors.email = 'Formato de email inválido.';
        }
        if (!isEditing) {
            if (!currentUser.password) errors.password = 'Contraseña es requerida.';
            if (currentUser.password.length < 6) errors.password = 'La contraseña debe tener al menos 6 caracteres.';
            if (currentUser.password !== currentUser.confirmPassword) errors.confirmPassword = 'Las contraseñas no coinciden.';
        }
        if (!currentUser.role) errors.role = 'Rol es requerido.';
        if (currentUser.role === 'PROFESSIONAL' && !currentUser.specialty?.trim()) {
            errors.specialty = 'Especialidad es requerida para un profesional.';
        }
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSaveUser = async () => {
        if (!validateForm()) return;
        const url = isEditing ? `http://localhost:3001/api/admin/users/${currentUser.id}` : 'http://localhost:3001/api/admin/users';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            await authFetch(url, {
                method: method,
                body: JSON.stringify(currentUser),
            });
            showNotification(`Usuario ${isEditing ? 'actualizado' : 'creado'} exitosamente.`, 'success');
            handleCloseModal();
            fetchUsers();
        } catch (err) {
            showNotification(err.message || `Error al ${isEditing ? 'actualizar' : 'crear'} el usuario.`, 'error');
        }
    };

    const handleDeleteUser = async (row) => {
        if (window.confirm(`¿Está seguro de que desea eliminar al usuario ${row.original.fullName}?`)) {
            try {
                await authFetch(`http://localhost:3001/api/admin/users/${row.original.id}`, {
                    method: 'DELETE',
                });
                showNotification('Usuario eliminado exitosamente.', 'success');
                fetchUsers();
            } catch (err) {
                showNotification(err.message || 'Error al eliminar el usuario.', 'error');
            }
        }
    };

    const columns = useMemo(() => [
        { accessorKey: 'fullName', header: 'Nombre Completo' },
        { accessorKey: 'dni', header: 'DNI' },
        { accessorKey: 'email', header: 'Correo Electrónico' },
        { accessorKey: 'role', header: 'Rol' },
        { accessorKey: 'isActive', header: 'Estado', Cell: ({ cell }) => (
            <Chip label={cell.getValue() ? 'Activo' : 'Inactivo'} color={cell.getValue() ? 'success' : 'error'} size="small" />
        )},
        { accessorKey: 'createdAt', header: 'Fecha de Creación', Cell: ({ cell }) => new Date(cell.getValue()).toLocaleDateString('es-ES'), },
    ], []);

    return (
        <Box>
            <Typography variant="h4" gutterBottom>Gestión de Usuarios</Typography>
            <MaterialReactTable
                columns={columns}
                data={users}
                localization={MRT_Localization_ES}
                state={{ isLoading: loading, showAlertBanner: !!error, showProgressBars: loading }}
                muiToolbarAlertBannerProps={error ? { color: 'error', children: error } : undefined}
                enableRowActions
                renderRowActions={({ row }) => (
                    <Box sx={{ display: 'flex', gap: '1rem' }}>
                        <Tooltip title="Editar"><IconButton onClick={() => handleOpenEditModal(row.original)}><EditIcon /></IconButton></Tooltip>
                        <Tooltip title="Eliminar"><IconButton color="error" onClick={() => handleDeleteUser(row)}><DeleteIcon /></IconButton></Tooltip>
                    </Box>
                )}
                renderTopToolbarCustomActions={() => (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateModal}>
                        Crear Nuevo Usuario
                    </Button>
                )}
            />

            <Dialog open={isModalOpen} onClose={handleCloseModal} maxWidth="xs" fullWidth>
                <DialogTitle>{isEditing ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} direction="column" sx={{ pt: 1 }}>
                        <Grid item xs={12}>
                            <TextField name="dni" label="DNI *" value={currentUser.dni || ''} onChange={handleUserChange} fullWidth error={!!validationErrors.dni} helperText={validationErrors.dni} disabled={isEditing} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField name="fullName" label="Nombre Completo *" value={currentUser.fullName || ''} onChange={handleUserChange} fullWidth error={!!validationErrors.fullName} helperText={validationErrors.fullName} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField name="email" label="Correo Electrónico *" type="email" value={currentUser.email || ''} onChange={handleUserChange} fullWidth error={!!validationErrors.email} helperText={validationErrors.email} />
                        </Grid>
                        {!isEditing && (
                            <>
                                <Grid item xs={12}>
                                    <TextField name="password" label="Contraseña *" type="password" value={currentUser.password || ''} onChange={handleUserChange} fullWidth error={!!validationErrors.password} helperText={validationErrors.password} />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField name="confirmPassword" label="Confirmar Contraseña *" type="password" value={currentUser.confirmPassword || ''} onChange={handleUserChange} fullWidth error={!!validationErrors.confirmPassword} helperText={validationErrors.confirmPassword} />
                                </Grid>
                            </>
                        )}
                        <Grid item xs={12}>
                            <FormControl fullWidth error={!!validationErrors.role}>
                                <InputLabel>Rol *</InputLabel>
                                <Select name="role" value={currentUser.role || ''} label="Rol *" onChange={handleUserChange}>
                                    <MenuItem value="PROFESSIONAL">Profesional</MenuItem>
                                    <MenuItem value="ADMIN">Administrador</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        {isEditing && (
                            <Grid item xs={12}>
                                <FormControlLabel control={<Switch name="isActive" checked={currentUser.isActive} onChange={handleUserChange} />} label="Usuario Activo" />
                            </Grid>
                        )}
                        {currentUser.role === 'PROFESSIONAL' && (
                            <Grid item xs={12}>
                                <TextField name="specialty" label="Especialidad (para Profesional)" value={currentUser.specialty || ''} onChange={handleUserChange} fullWidth error={!!validationErrors.specialty} helperText={validationErrors.specialty} />
                            </Grid>
                        )}
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseModal}>Cancelar</Button>
                    <Button onClick={handleSaveUser} variant="contained">{isEditing ? 'Guardar Cambios' : 'Crear Usuario'}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default UserManagementView;