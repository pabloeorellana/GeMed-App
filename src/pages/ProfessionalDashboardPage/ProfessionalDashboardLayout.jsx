import React, { useState } from 'react';
import { Routes, Route, Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    AppBar,
    Box,
    CssBaseline,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Typography,
    Divider,
    Tooltip,
    Avatar,
    Menu,
    MenuItem,
    Badge,
    Stack,
    Button 
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import EventIcon from '@mui/icons-material/Event';
import ScheduleSendIcon from '@mui/icons-material/ScheduleSend';
import PeopleIcon from '@mui/icons-material/People';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import AssessmentIcon from '@mui/icons-material/Assessment';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LockResetIcon from '@mui/icons-material/LockReset';

import AppointmentsView from './views/AppointmentsView.jsx';
import AvailabilityView from './views/AvailabilityView.jsx';
import PatientsView from './views/PatientsView.jsx';
import ProfileView from './views/ProfileView.jsx';
import StatisticsView from './views/StatisticsView.jsx';

const drawerWidth = 240;

const loggedInProfessional = {
    fullName: "NutriSmart Pro",
    avatarUrl: '',
};

const ProfessionalDashboardLayout = (props) => {
    const { window } = props;
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const navigate = useNavigate();
    const [anchorElUser, setAnchorElUser] = useState(null);
    const [notificationsCount, setNotificationsCount] = useState(5);
    const { authUser, logout } = useAuth();

    const handleOpenUserMenu = (event) => setAnchorElUser(event.currentTarget);
    const handleCloseUserMenu = () => setAnchorElUser(null);

    const handleDrawerToggle = () => {
        if (!isClosing) {
            setMobileOpen(!mobileOpen);
        }
    };

    const handleDrawerClose = () => {
        setIsClosing(true);
        setMobileOpen(false);
    };

    const handleDrawerTransitionEnd = () => {
        setIsClosing(false);
    };

    const handleLogout = () => {
        handleCloseUserMenu();
        logout();
    };

    const handleChangePassword = () => {
        handleCloseUserMenu();
        navigate('/profesional/dashboard/perfil');
        alert('Redirigiendo a cambiar contraseña (simulado)...');
    };

    const handleNotificationsClick = () => {
        alert(`Tienes ${notificationsCount} notificaciones (simulado).`);
        setNotificationsCount(0);
    };

    const menuItems = [
        { text: 'Agenda', icon: <EventIcon />, path: 'agenda' },
        { text: 'Disponibilidad', icon: <ScheduleSendIcon />, path: 'disponibilidad' },
        { text: 'Pacientes', icon: <PeopleIcon />, path: 'pacientes' },
        { text: 'Estadísticas', icon: <AssessmentIcon />, path: 'estadisticas' },
        { text: 'Mi Perfil', icon: <AccountCircleIcon />, path: 'perfil' },
    ];

    const getInitials = (name) => {
        if (!name) return '';
        const nameParts = name.split(' ');
        if (nameParts.length > 1) return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const drawer = (
        <div>
            <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <Typography
                    variant="h6"
                    noWrap
                    component={RouterLink}
                    to="/profesional/dashboard/agenda"
                    sx={{
                        color: 'inherit',
                        textDecoration: 'none',
                        fontWeight: 700,
                    }}
                >
                    NutriSmart Pro
                </Typography>
            </Toolbar>
            <Divider />
            <List>
                {menuItems.map((item) => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton
                            component={RouterLink}
                            to={`/profesional/dashboard/${item.path}`}
                            onClick={mobileOpen ? handleDrawerToggle : undefined}
                        >
                            <ListItemIcon>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
            <Divider sx={{ mt: 'auto' }} />
            <List>
                <ListItem disablePadding>
                    <ListItemButton onClick={handleLogout}>
                        <ListItemIcon><LogoutIcon /></ListItemIcon>
                        <ListItemText primary="Cerrar Sesión" />
                    </ListItemButton>
                </ListItem>
            </List>
        </div>
    );

    const container = window !== undefined ? () => window().document.body : undefined;
    const professionalName = authUser?.user?.fullName || "Profesional";
    const professionalAvatarUrl = authUser?.user?.avatarUrl;
    
    return (
        <Box sx={{ display: 'flex' }}>
            <CssBaseline />
            <AppBar
                position="fixed"
                sx={{
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                }}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { sm: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography
                        variant="h6"
                        noWrap
                        component={RouterLink}
                        to="/profesional/dashboard/agenda"
                        sx={{
                            display: { xs: 'none', sm: 'flex' },
                            fontWeight: 700,
                            letterSpacing: '.1rem',
                            color: 'inherit',
                            textDecoration: 'none',
                            alignItems: 'center'
                        }}
                    >
                        NutriSmart Pro
                    </Typography>
                     <Typography
                        variant="h6"
                        noWrap
                        component="div"
                        sx={{ flexGrow: 1, display: { xs: 'flex', sm: 'none' }, justifyContent: 'center' }}
                    >
                        Panel
                    </Typography>
                    <Box sx={{ flexGrow: {xs: 0, sm: 1} }} />
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Tooltip title="Notificaciones">
                            <IconButton color="inherit" onClick={handleNotificationsClick}>
                                <Badge badgeContent={notificationsCount} color="error">
                                    <NotificationsIcon />
                                </Badge>
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Opciones de Usuario">
                            <Button
                                onClick={handleOpenUserMenu}
                                sx={{ p: 0, color: 'inherit', textTransform: 'none', minWidth: 'auto' }}
                                startIcon={
                                    <Avatar
                                        alt={loggedInProfessional.fullName}
                                        src={loggedInProfessional.avatarUrl || undefined}
                                        sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}
                                    >
                                        {!loggedInProfessional.avatarUrl && getInitials(loggedInProfessional.fullName)}
                                    </Avatar>
                                }
                            >
                                <Typography sx={{ display: { xs: 'none', md: 'block' }, ml: 0.5 }}>
                                    {loggedInProfessional.fullName}
                                </Typography>
                            </Button>
                        </Tooltip>
                        <Menu
                            sx={{ mt: '45px' }}
                            id="menu-appbar"
                            anchorEl={anchorElUser}
                            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                            keepMounted
                            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                            open={Boolean(anchorElUser)}
                            onClose={handleCloseUserMenu}
                        >
                            <MenuItem onClick={handleChangePassword}>
                                <ListItemIcon><LockResetIcon fontSize="small" /></ListItemIcon>
                                <ListItemText>Cambiar Contraseña</ListItemText>
                            </MenuItem>
                            <MenuItem onClick={handleLogout}>
                                <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                                <ListItemText>Cerrar Sesión</ListItemText>
                            </MenuItem>
                        </Menu>
                    </Stack>
                </Toolbar>
            </AppBar>
            <Box
                component="nav"
                sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
                aria-label="mailbox folders"
            >
                <Drawer
                    container={container}
                    variant="temporary"
                    open={mobileOpen}
                    onTransitionEnd={handleDrawerTransitionEnd}
                    onClose={handleDrawerClose}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: 'block', sm: 'none' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                >
                    {drawer}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', sm: 'block' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>
            <Box
                component="main"
                sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}
            >
                <Toolbar />
                <Routes>
                        <Route path="/" element={<Navigate to="agenda" replace />} />
                        <Route path="agenda" element={<AppointmentsView />} />
                        <Route path="disponibilidad" element={<AvailabilityView />} />
                        <Route path="pacientes" element={<PatientsView />} />
                        <Route path="estadisticas" element={<StatisticsView />} />
                        <Route path="perfil" element={<ProfileView />} />
                </Routes>
            </Box>
        </Box>
    );
};

export default ProfessionalDashboardLayout;