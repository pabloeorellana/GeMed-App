import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles'; 
import CssBaseline from '@mui/material/CssBaseline';
import Typography from '@mui/material/Typography'; 
import { AuthProvider, useAuth } from './context/AuthContext.jsx';

import AppointmentBookingPage from './pages/AppointmentBookingPage/AppointmentBookingPage.jsx';
import ProfessionalLoginPage from './pages/ProfessionalLoginPage/ProfessionalLoginPage.jsx';
import ProfessionalDashboardLayout from './pages/ProfessionalDashboardPage/ProfessionalDashboardLayout.jsx';

const theme = createTheme({
    palette: {
        primary: {
            main: '#1976d2',
        },
        secondary: {
            main: '#4caf50',
        },
    },
});

const isAuthenticatedProfessional = () => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    return !!token;
};

const ProtectedProfessionalRoute = ({ children }) => {
    const { isAuthenticated, loadingAuth } = useAuth(); 
    if (loadingAuth) {
        return <Typography>Cargando...</Typography>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/profesional/login" replace />;
    }
    return children;
};

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <BrowserRouter>
                <AuthProvider> {}
                    <Routes>
                        <Route path="/" element={<AppointmentBookingPage />} />
                        <Route path="/profesional/login" element={<ProfessionalLoginPage />} />
                        <Route
                            path="/profesional/dashboard/*"
                            element={
                                <ProtectedProfessionalRoute>
                                    <ProfessionalDashboardLayout />
                                </ProtectedProfessionalRoute>
                            }
                        />
                        <Route path="*" element={<Typography>Página no encontrada (404)</Typography>} />
                    </Routes>
                </AuthProvider>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;