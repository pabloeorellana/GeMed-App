import React, { useState } from 'react';
import { Container, Typography, Box, CssBaseline, AppBar, Toolbar, Avatar } from '@mui/material';
import AvailabilityCalendar from '../../components/AvailabilityCalendar/AvailabilityCalendar.jsx';
import PatientForm from '../../components/PatientForm/PatientForm.jsx';
import AppointmentConfirmation from '../../components/AppointmentConfirmation/AppointmentConfirmation.jsx';
import MedicalInformationIcon from '@mui/icons-material/MedicalInformation';
import { CenterFocusStrong } from '@mui/icons-material';

const AppointmentBookingPage = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedDateTime, setSelectedDateTime] = useState(null);
    const [confirmedAppointment, setConfirmedAppointment] = useState(null);

    const handleSlotSelected = (dateTime) => {
        setSelectedDateTime(dateTime);
        setCurrentStep(2);
    };

    const handleFormSubmit = (patientDetails, appointmentDateTime) => {
        setConfirmedAppointment({ patient: patientDetails, dateTime: appointmentDateTime });
        setCurrentStep(3);
    };

    const handleCancelForm = () => {
        setSelectedDateTime(null);
        setCurrentStep(1);
    };

    const handleBookAnother = () => {
        setSelectedDateTime(null);
        setConfirmedAppointment(null);
        setCurrentStep(1);
    };
    const logoUrl = "https://www.unsta.edu.ar/wp-content/uploads/2018/09/LOGO-2-01.png";

    return (
        <>
            <CssBaseline />
            <AppBar position="static">
                <Toolbar>
                    {}
                    <Avatar
                        src={logoUrl}
                        alt="NutriSmart Logo"
                        sx={{
                            mr: 2,
                            width: 50,
                            height: 50,
                        }}
                    />

                    <Typography
                        variant="h6"
                        component="div"
                        sx={{
                            flexGrow: 1,
                            textAlign: 'center',
                        }}
                    >
                        NutriSmart - Solicitud de turnos
                    </Typography>
                    {

                    }
                </Toolbar>
            </AppBar>
            <Container
                maxWidth={false}
                sx={{
                    mt: 4,
                    mb: 4,
                    px: { xs: 2, sm: 3 },
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Box
                    sx={{
                        width: '100%',
                        maxWidth: { md: '1100px' }, 
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center', 
                        my: 2,
                    }}
                >
                    {currentStep === 1 && (
                        <>
                            <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
                                Bienvenidos!
                            </Typography>
                            {}
                            {}
                            <AvailabilityCalendar onSlotSelect={handleSlotSelected} />
                        </>
                    )}

                    {currentStep === 2 && selectedDateTime && (
                        <Box sx={{ width: '100%', maxWidth: {sm: '600px', md: '700px'} }}> {}
                             <PatientForm
                                selectedDateTime={selectedDateTime}
                                onSubmit={handleFormSubmit}
                                onCancel={handleCancelForm}
                            />
                        </Box>
                    )}

                    {currentStep === 3 && confirmedAppointment && (
                         <Box sx={{ width: '100%', maxWidth: {sm: '600px', md: '700px'} }}> {}
                            <AppointmentConfirmation
                                appointmentDetails={confirmedAppointment}
                                onBookAnother={handleBookAnother}
                            />
                        </Box>
                    )}
                </Box>
            </Container>
        </>
    );
};

export default AppointmentBookingPage;