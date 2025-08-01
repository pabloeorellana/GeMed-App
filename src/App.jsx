import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles'; 
import CssBaseline from '@mui/material/CssBaseline';
import Typography from '@mui/material/Typography'; 
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import AdminDashboardLayout from './pages/AdminDashboardPage/AdminDashboardLayout.jsx';

import AppointmentBookingPage from './pages/AppointmentBookingPage/AppointmentBookingPage.jsx';
import ProfessionalLoginPage from './pages/ProfessionalLoginPage/ProfessionalLoginPage.jsx';
import ProfessionalDashboardLayout from './pages/ProfessionalDashboardPage/ProfessionalDashboardLayout.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import ProfessionalSelectionPage from './pages/ProfessionalSelectionPage/ProfessionalSelectionPage.jsx';


const theme = createTheme({
    palette: {
        primary: {
            main: '#00979e', // Tu color principal
            light: '#56c8cf', // Una versión más clara
            dark: '#006970',  // Una versión más oscura
            contrastText: '#ffffff',
        },
        secondary: { // Puedes mantener el verde o cambiarlo a otro color complementario
            main: '#f57c00', // Un naranja como ejemplo de color secundario
            contrastText: '#ffffff',
        },
        // Puedes ajustar otros colores si es necesario
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

const ProtectedAdminRoute = ({ children }) => {
    const { authUser, isAuthenticated, loadingAuth } = useAuth();
    if (loadingAuth) {
        return <Typography>Cargando...</Typography>;
    }
    if (!isAuthenticated || authUser.user.role !== 'ADMIN') {
        return <Navigate to="/profesional/login" replace />; // O a una página de "Acceso Denegado"
    }
    return children;
};

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <BrowserRouter>
            <NotificationProvider>
                <AuthProvider> {}
                    <Routes>
                        <Route path="/" element={<ProfessionalSelectionPage />} />
                        <Route path="/reservar/:professionalId" element={<AppointmentBookingPage />} />
                        <Route path="/profesional/login" element={<ProfessionalLoginPage />} />
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
                        <Route
                            path="/admin/dashboard/*"
                            element={
                                <ProtectedAdminRoute>
                                    <AdminDashboardLayout />
                                </ProtectedAdminRoute>
                                }
                            />
                            
                            <Route path="*" element={<Typography>Página no encontrada (404)</Typography>} />
                        <Route path="*" element={<Typography>Página no encontrada (404)</Typography>} />
                    </Routes>
                </AuthProvider>
                </NotificationProvider>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;