// src/pages/ProfessionalSelectionPage/ProfessionalSelectionPage.jsx (NUEVO)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, Grid, Card, CardContent, CardActions, Button, Avatar } from '@mui/material';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const ProfessionalSelectionPage = () => {
    const [professionals, setProfessionals] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProfessionals = async () => {
            try {
                const response = await fetch(`${API_URL}/api/public/professionals`);
                const data = await response.json();
                setProfessionals(data);
            } catch (error) {
                console.error("Error fetching professionals:", error);
            }
        };
        fetchProfessionals();
    }, []);

    const handleSelectProfessional = (professionalId) => {
        navigate(`/reservar/${professionalId}`); // Navegar a la página de reserva
    };

    return (
        <Container sx={{ py: 4 }}>
            <Typography variant="h4" align="center" gutterBottom>
                Seleccione un Profesional
            </Typography>
            <Grid container spacing={4} sx={{ mt: 2 }}>
                {professionals.map((prof) => (
                    <Grid item key={prof.id} xs={12} sm={6} md={4}>
                        <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                                <Avatar src={prof.profileImageUrl} sx={{ width: 80, height: 80, margin: 'auto', mb: 2 }} />
                                <Typography gutterBottom variant="h5" component="h2">{prof.fullName}</Typography>
                                <Typography color="primary">{prof.specialty}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{mt:1}}>{prof.description}</Typography>
                            </CardContent>
                            <CardActions sx={{ justifyContent: 'center' }}>
                                <Button size="small" variant="contained" onClick={() => handleSelectProfessional(prof.id)}>
                                    Ver Disponibilidad
                                </Button>
                            </CardActions>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Container>
    );
};
export default ProfessionalSelectionPage;