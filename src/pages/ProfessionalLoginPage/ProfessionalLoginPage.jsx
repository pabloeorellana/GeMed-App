import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { useAuth } from '../../context/AuthContext';
import {
    Container, Box, Typography, TextField, Button, Checkbox,
    FormControlLabel, Paper, Alert
} from '@mui/material';

const logoUrl = "https://i1.sndcdn.com/avatars-cLEbOjWz2zZMiHzD-wIsmGQ-t240x240.jpg";

const ProfessionalLoginPage = () => {
    const [credentials, setCredentials] = useState({
        dni: '',
        password: '',
    });
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false); 
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleChange = (event) => {
        const { name, value } = event.target;
        setCredentials(prev => ({ ...prev, [name]: value }));
        if (error) setError('');
    };

    const handleRememberMeChange = (event) => {
        setRememberMe(event.target.checked);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('http://localhost:3001/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dni: credentials.dni, password: credentials.password }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || `Error ${response.status}: No se pudo iniciar sesión.`);
                return;
            }

            if (rememberMe) {
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('userData', JSON.stringify(data.user));
            } else {
                sessionStorage.setItem('authToken', data.token);
                sessionStorage.setItem('userData', JSON.stringify(data.user));
            }
            
            login(data);

            if (data.user.role === 'ADMIN') {
                navigate('/admin/dashboard/users');
            } else if (data.user.role === 'PROFESSIONAL') {
                navigate('/profesional/dashboard/agenda');
            } else {
                setError('Rol de usuario no autorizado para acceder a este sistema.');
                localStorage.removeItem('authToken');
                sessionStorage.removeItem('authToken');
                localStorage.removeItem('userData');
                sessionStorage.removeItem('userData');
            }

        } catch (err) {
            console.error('Error en el login:', err);
            setError('No se pudo conectar al servidor. Por favor, revise que esté funcionando e intente de nuevo.');
        } finally {
            setLoading(false);
        }
    };



    return (
        <Container
            component="main"
            maxWidth="xs"
            sx={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', minHeight: '100vh', py: 4,
            }}
        >
            <Paper
                elevation={6}
                sx={{
                    p: { xs: 3, sm: 4 }, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', width: '100%',
                }}
            >
                <Box component="img" src={logoUrl} alt="NutriSmart Logo" sx={{ height: 80, mb: 2, objectFit: 'contain' }} />
                <Typography component="h1" variant="h5" sx={{ mb: 1 }}>Gestion de Turnos y Pacientes</Typography>
                <Typography component="h2" variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>Bienvenido</Typography>

                {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}

                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: '100%' }}>
                    <TextField
                        margin="normal" required fullWidth id="dni" label="DNI" name="dni"
                        autoComplete="username" autoFocus value={credentials.dni} onChange={handleChange}
                        disabled={loading}
                    />
                    <TextField
                        margin="normal" required fullWidth name="password" label="Contraseña"
                        type="password" id="password" autoComplete="current-password"
                        value={credentials.password} onChange={handleChange}
                        disabled={loading}
                    />
                    <FormControlLabel
                        control={<Checkbox value="remember" color="primary" checked={rememberMe} onChange={handleRememberMeChange} disabled={loading} />}
                        label="Recordarme"
                        sx={{ mt: 1, mb: 0, display: 'flex', justifyContent: 'flex-start' }}
                    />
                    <Button
                        type="submit" fullWidth variant="contained"
                        sx={{ mt: 3, mb: 2, bgcolor: 'green', '&:hover': { bgcolor: 'darkgreen' } }}
                        disabled={loading}
                    >
                        {loading ? 'Ingresando...' : 'Iniciar Sesión'}
                    </Button>
                    <Button
                        fullWidth variant="contained"
                        sx={{ mt: 1, textTransform: 'none', bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
                        onClick={() => {
                            alert('Funcionalidad "Olvidó su contraseña" no implementada. Redirigiendo (simulado)...');
                        }}
                        disabled={loading}
                    >
                        ¿Olvidó su contraseña? Click aquí...
                    </Button>
                </Box>
            </Paper>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 5 }}>
                {'© '} NutriSmart {new Date().getFullYear()}{'.'}
            </Typography>
        </Container>
    );
};

export default ProfessionalLoginPage;