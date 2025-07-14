import appointmentRoutes from './routes/appointmentRoutes.js';

app.post('/api/auth/login', async (req, res) => { });
app.use('/api/users', userRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/appointments', appointmentRoutes); 
