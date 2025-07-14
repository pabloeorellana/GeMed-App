import React, { useState, useEffect, useRef, useCallback } from 'react';
import authFetch from '../../../utils/authFetch';
import { useAuth } from '../../../context/AuthContext';
import {
    Box,
    Typography,
    Paper,
    Grid,
    TextField,
    Button,
    CircularProgress,
    Alert,
    Avatar,
    Stack
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import PhotoCamera from '@mui/icons-material/PhotoCamera';

const ProfileView = () => {
    const { authUser, loadingAuth } = useAuth();
    const [profileData, setProfileData] = useState({
        dni: '',
        fullName: '',
        email: '',
        phone: '',
        specialty: '',
        description: '',
        profileImageUrl: '',
        profileImageFile: null,
    });
    const [initialProfileData, setInitialProfileData] = useState({});
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const fileInputRef = useRef(null);

    console.log('PROFILE_VIEW: Estado inicial de authUser:', authUser, 'loadingAuth:', loadingAuth);

    const fetchProfile = useCallback(async () => {
        console.log('PROFILE_VIEW (fetchProfile): authUser:', authUser, 'loadingAuth:', loadingAuth);

        if (loadingAuth) {
            console.log('PROFILE_VIEW (fetchProfile): loadingAuth es true, retornando.');
            return;
        }

        if (!authUser?.user?.id) {
            console.log('PROFILE_VIEW (fetchProfile): No hay authUser.user.id. Seteando error.');
            setLoading(false);
            setError("Por favor, inicie sesión para ver su perfil.");
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');
        try {
            console.log('PROFILE_VIEW (fetchProfile): Intentando fetch de datos del perfil.');
            const userDataPromise = authFetch('http://localhost:3001/api/users/me');
            let professionalDataPromise;

            if (authUser.user.role === 'PROFESSIONAL') {
                console.log('PROFILE_VIEW (fetchProfile): Es profesional, intentando fetch de datos profesionales.');
                professionalDataPromise = authFetch('http://localhost:3001/api/users/professionals/me');
            } else {
                professionalDataPromise = Promise.resolve(null);
            }
            
            const [userData, professionalDataResponse] = await Promise.all([
                userDataPromise,
                professionalDataPromise
            ]);
            console.log('PROFILE_VIEW (fetchProfile): userData recibida:', userData);
            console.log('PROFILE_VIEW (fetchProfile): professionalDataResponse recibida:', professionalDataResponse);


            const professionalSpecificData = professionalDataResponse || {};

            const dataToSet = {
                dni: userData.dni || '',
                fullName: userData.fullName || '',
                email: userData.email || '',
                phone: userData.phone || '',
                specialty: professionalSpecificData.specialty || '',
                description: professionalSpecificData.description || userData.description || '',
                profileImageUrl: userData.profileImageUrl || '',
                profileImageFile: null,
            };
            console.log('PROFILE_VIEW (fetchProfile): Datos para setear en perfil:', dataToSet);
            setProfileData(dataToSet);
            setInitialProfileData(dataToSet);
        } catch (err) {
            console.error("PROFILE_VIEW (fetchProfile): Error cargando perfil:", err);
            setError(err.message || "Error al cargar el perfil.");
        } finally {
            console.log('PROFILE_VIEW (fetchProfile): setLoading(false) en finally.');
            setLoading(false);
        }
    }, [authUser, loadingAuth]);

    useEffect(() => {
        console.log('PROFILE_VIEW: useEffect[fetchProfile] - llamando a fetchProfile.');
        fetchProfile();
    }, [fetchProfile]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setProfileData(prev => ({ ...prev, [name]: value }));
        if (success) setSuccess('');
        if (error) setError('');
    };

    const handleImageChange = (event) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            setProfileData(prev => ({
                ...prev,
                profileImageFile: file,
                profileImageUrl: URL.createObjectURL(file)
            }));
            if (success) setSuccess('');
            if (error) setError('');
        }
    };

    const hasChanges = () => {
        return profileData.fullName !== initialProfileData.fullName ||
               profileData.email !== initialProfileData.email ||
               profileData.phone !== initialProfileData.phone ||
               profileData.specialty !== initialProfileData.specialty ||
               profileData.description !== initialProfileData.description ||
               profileData.profileImageFile !== null;
    };

    const handleToggleEdit = () => {
        if (isEditing && hasChanges()) {
            if (window.confirm("Tiene cambios sin guardar. ¿Desea descartarlos y salir del modo edición?")) {
                setProfileData(initialProfileData);
                setSuccess('');
                setError('');
                setIsEditing(false);
            }
        } else {
            setIsEditing(!isEditing);
            setError('');
            setSuccess('');
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!hasChanges()) {
            setIsEditing(false);
            return;
        }
        setLoading(true);
        setError('');
        setSuccess('');
        console.log('PROFILE_VIEW (handleSubmit): Guardando perfil (simulado):', profileData);

        try {
            const userDataToUpdate = {
                fullName: profileData.fullName,
                email: profileData.email,
                phone: profileData.phone,
            };
            const professionalDataToUpdate = {
                specialty: profileData.specialty,
                description: profileData.description,
            };
            
            console.log('PROFILE_VIEW (handleSubmit): userDataToUpdate:', userDataToUpdate);
            if (authUser?.user?.role === 'PROFESSIONAL') {
                 console.log('PROFILE_VIEW (handleSubmit): professionalDataToUpdate:', professionalDataToUpdate);
            }

            const updatedUser = await authFetch('http://localhost:3001/api/users/me', {
                method: 'PUT',
                body: JSON.stringify(userDataToUpdate),
            });
            console.log('PROFILE_VIEW (handleSubmit): updatedUser response:', updatedUser);


            if (authUser?.user?.role === 'PROFESSIONAL') {
                await authFetch('http://localhost:3001/api/users/professionals/me', {
                    method: 'PUT',
                    body: JSON.stringify(professionalDataToUpdate),
                });
                console.log('PROFILE_VIEW (handleSubmit): professional data updated.');
            }
            
            await fetchProfile();
            setSuccess('Perfil actualizado exitosamente.');
            setIsEditing(false);
             if (updatedUser && authUser && authUser.login) {
                console.log('PROFILE_VIEW (handleSubmit): Actualizando AuthContext user.');
                authUser.login({ token: authUser.token, user: { ...authUser.user, ...updatedUser } });
            }

        } catch (err) {
            setError(err.message || 'Error al actualizar el perfil. Intente nuevamente.');
            console.error("PROFILE_VIEW (handleSubmit): Error al guardar perfil:", err);
        } finally {
            setLoading(false);
            console.log('PROFILE_VIEW (handleSubmit): setLoading(false) en finally.');
        }
    };

    const getInitials = (name) => {
        if (!name) return '';
        const nameParts = name.split(' ');
        if (nameParts.length > 1) {
            return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    if (loadingAuth) {
        console.log('PROFILE_VIEW (render): loadingAuth es true, mostrando spinner de autenticación.');
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <CircularProgress />
                <Typography sx={{ml: 2}}>Verificando autenticación...</Typography>
            </Box>
        );
    }

    if (error) {
        console.log('PROFILE_VIEW (render): Hay un error, mostrando Alert:', error);
        return <Alert severity="warning" sx={{ m: 2 }}>{error}</Alert>;
    }
    
    if (loading && !initialProfileData.dni) { 
        console.log('PROFILE_VIEW (render): loading de perfil es true, mostrando spinner de perfil.');
         return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <CircularProgress />
                <Typography sx={{ml: 2}}>Cargando perfil...</Typography>
            </Box>
        );
    }
    
    if (!authUser && !loadingAuth) {
        console.log('PROFILE_VIEW (render): No hay authUser después de que loadingAuth es false.');
        return <Alert severity="error" sx={{ m: 2 }}>Error de autenticación. Por favor, intente iniciar sesión de nuevo.</Alert>;
    }

    return (
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: 700, margin: 'auto' }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 3, textAlign: 'center' }}>
                Mi Perfil Profesional
            </Typography>
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
            <Box component="form" onSubmit={handleSubmit} noValidate>
                <Grid container spacing={3} direction="column">
                    <Grid item xs={12} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Avatar
                            src={profileData.profileImageUrl || undefined}
                            alt={profileData.fullName}
                            sx={{ width: 120, height: 120, mb: 1, fontSize: '3rem' }}
                        >
                            {!profileData.profileImageUrl && getInitials(profileData.fullName)}
                        </Avatar>
                        {isEditing && (
                            <>
                                <input
                                    accept="image/*"
                                    type="file"
                                    onChange={handleImageChange}
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    id="profile-image-upload"
                                />
                                <label htmlFor="profile-image-upload">
                                    <Button
                                        variant="outlined"
                                        component="span"
                                        startIcon={<PhotoCamera />}
                                        size="small"
                                        disabled={loading}
                                    >
                                        Cambiar Foto
                                    </Button>
                                </label>
                            </>
                        )}
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="DNI"
                            value={profileData.dni}
                            fullWidth
                            InputProps={{ readOnly: true }}
                            variant="filled"
                            helperText="El DNI no puede ser modificado."
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            required
                            fullWidth
                            name="fullName"
                            label="Nombre Completo"
                            value={profileData.fullName}
                            onChange={handleChange}
                            disabled={!isEditing || loading}
                            variant={isEditing ? "outlined" : "filled"}
                            InputProps={{ readOnly: !isEditing }}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            required
                            fullWidth
                            name="email"
                            label="Correo Electrónico"
                            type="email"
                            value={profileData.email}
                            onChange={handleChange}
                            disabled={!isEditing || loading}
                            variant={isEditing ? "outlined" : "filled"}
                            InputProps={{ readOnly: !isEditing }}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            name="phone"
                            label="Teléfono"
                            value={profileData.phone}
                            onChange={handleChange}
                            disabled={!isEditing || loading}
                            variant={isEditing ? "outlined" : "filled"}
                            InputProps={{ readOnly: !isEditing }}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            name="specialty"
                            label="Especialidad"
                            value={profileData.specialty}
                            onChange={handleChange}
                            disabled={!isEditing || loading}
                            variant={isEditing ? "outlined" : "filled"}
                            InputProps={{ readOnly: !isEditing }}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            name="description"
                            label="Descripción Profesional"
                            multiline
                            rows={4}
                            value={profileData.description}
                            onChange={handleChange}
                            disabled={!isEditing || loading}
                            variant={isEditing ? "outlined" : "filled"}
                            InputProps={{ readOnly: !isEditing }}
                        />
                    </Grid>
                    <Grid item xs={12} sx={{ mt: 2 }}>
                        <Stack direction="row" spacing={2} justifyContent="flex-end">
                            <Button
                                variant={isEditing ? "outlined" : "contained"}
                                onClick={handleToggleEdit}
                                startIcon={isEditing ? null : <EditIcon />}
                                disabled={loading && isEditing}
                            >
                                {isEditing ? "Cancelar" : "Actualizar Datos"}
                            </Button>
                            {isEditing && (
                                <Button
                                    type="submit"
                                    variant="contained"
                                    color="primary"
                                    disabled={loading || !hasChanges()}
                                    startIcon={loading ? <CircularProgress size={20} color="inherit"/> : null}
                                >
                                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                                </Button>
                            )}
                        </Stack>
                    </Grid>
                </Grid>
            </Box>
        </Paper>
    );
};

export default ProfileView;