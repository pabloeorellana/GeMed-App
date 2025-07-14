import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box, Typography, Paper, Grid, Button, CircularProgress, Stack, Divider,
    TextField, Select, MenuItem, FormControl, InputLabel, Card, CardContent
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es as fnsEsLocale } from 'date-fns/locale';
import { subDays, format, startOfMonth, endOfMonth, isValid, isBefore } from 'date-fns';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

const statusDetails = {
    COMPLETED: { label: 'Completados', color: '#4caf50' },
    SCHEDULED: { label: 'Programados', color: '#2196f3' },
    CONFIRMED: { label: 'Confirmados', color: '#1976d2' },
    CANCELED_PROFESSIONAL: { label: 'Cancelado (Prof.)', color: '#d32f2f' },
    CANCELED_PATIENT: { label: 'Cancelado (Pac.)', color: '#f44336' },
    NO_SHOW: { label: 'No Asistió', color: '#9e9e9e' },
};

const GRAPH_COLORS = ['#4caf50', '#2196f3', '#1976d2', '#d32f2f', '#f44336', '#9e9e9e', '#ffc107'];

const mockStatisticsData = (startDate, endDate) => {
    const diffDays = Math.max(0, (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24)) + 1;
    const baseAppointments = 5 + Math.floor(diffDays * (Math.random() * 2 + 0.5));
    let remainingAppointments = baseAppointments;
    const generateValue = (percentageOfRemaining, capAtRemaining = true) => {
        let value = Math.floor(remainingAppointments * (Math.random() * (percentageOfRemaining * 0.8) + (percentageOfRemaining * 0.2)));
        if (capAtRemaining) { value = Math.min(value, remainingAppointments); }
        remainingAppointments -= value;
        return value;
    };
    const completed = generateValue(0.5);
    const scheduled = generateValue(0.4);
    const confirmed = generateValue(0.3);
    const canceled_professional = generateValue(0.2);
    const canceled_patient = generateValue(0.3);
    const noShow = Math.max(0, remainingAppointments);
    const allStatuses = [
        { name: statusDetails.COMPLETED.label, value: completed, key: 'COMPLETED' },
        { name: statusDetails.SCHEDULED.label, value: scheduled, key: 'SCHEDULED' },
        { name: statusDetails.CONFIRMED.label, value: confirmed, key: 'CONFIRMED' },
        { name: statusDetails.CANCELED_PROFESSIONAL.label, value: canceled_professional, key: 'CANCELED_PROFESSIONAL' },
        { name: statusDetails.CANCELED_PATIENT.label, value: canceled_patient, key: 'CANCELED_PATIENT' },
        { name: statusDetails.NO_SHOW.label, value: noShow, key: 'NO_SHOW' },
    ];
    return {
        period: { start: format(startDate, "yyyy-MM-dd"), end: format(endDate, "yyyy-MM-dd"), },
        totalAppointments: allStatuses.reduce((sum, s) => sum + s.value, 0),
        appointmentsByStatus: allStatuses,
        uniquePatients: Math.max(1, Math.floor(allStatuses.reduce((sum, s) => sum + s.value, 0) * (Math.random() * 0.2 + 0.5))),
    };
};

const StatisticsView = () => {
    const [startDate, setStartDate] = useState(startOfMonth(new Date()));
    const [endDate, setEndDate] = useState(endOfMonth(new Date()));
    const [statsData, setStatsData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [dateRangeKey, setDateRangeKey] = useState('thisMonth');

    const fetchStatistics = useCallback(() => {
        if (!startDate || !endDate || !isValid(startDate) || !isValid(endDate) || isBefore(endDate, startDate)) {
            setStatsData(null);
            alert("Por favor, seleccione un rango de fechas válido.");
            return;
        }
        setLoading(true);
        setTimeout(() => {
            setStatsData(mockStatisticsData(startDate, endDate));
            setLoading(false);
        }, 800);
    }, [startDate, endDate]);

    useEffect(() => {
        if (dateRangeKey !== 'custom') {
            fetchStatistics();
        } else if (!statsData && startDate && endDate && !isBefore(endDate, startDate)) {
             fetchStatistics();
        }
    }, [dateRangeKey, startDate, endDate, fetchStatistics]);

    const presetDateRanges = {
        'today': { label: "Hoy", values: () => ({ start: new Date(), end: new Date() }) },
        'last7days': { label: "Últimos 7 días", values: () => ({ start: subDays(new Date(), 6), end: new Date() }) },
        'thisMonth': { label: "Este Mes", values: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) },
        'lastMonth': { label: "Mes Pasado", values: () => ({ start: startOfMonth(subDays(startOfMonth(new Date()), 1)), end: endOfMonth(subDays(startOfMonth(new Date()), 1)) }) },
    };

    const handlePresetRangeChange = (event) => {
        const key = event.target.value;
        setDateRangeKey(key);
        if (presetDateRanges[key]) {
            const { start, end } = presetDateRanges[key].values();
            setStartDate(start);
            setEndDate(end);
        }
    };

    const handleApplyCustomDateFilter = () => {
        if (dateRangeKey === 'custom') {
            fetchStatistics();
        }
    };

    const summaryCardData = useMemo(() => {
        if (!statsData) return [];
        const cards = [
            { title: "Total de Turnos", value: statsData.totalAppointments, color: "primary.main" },
            { title: "Pacientes Únicos", value: statsData.uniquePatients, color: "secondary.main" },
        ];
        Object.keys(statusDetails).forEach(key => {
            const statusObjFromData = statsData.appointmentsByStatus.find(s => s.key === key);
            cards.push({
                title: statusDetails[key].label,
                value: statusObjFromData ? statusObjFromData.value : 0,
                color: statusDetails[key]?.color || GRAPH_COLORS[Object.keys(statusDetails).indexOf(key) % GRAPH_COLORS.length]
            });
        });
        return cards;
    }, [statsData]);

    const chartDataForDisplay = useMemo(() => {
        if (!statsData || !statsData.appointmentsByStatus) return [];
        return statsData.appointmentsByStatus.filter(s => s.value > 0);
    }, [statsData]);

    const renderCustomizedPieLabel = ({ percent }) => {
        if (percent * 100 < 3 && chartDataForDisplay.length > 3) return null;
        return `${(percent * 100).toFixed(0)}%`;
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fnsEsLocale}>
            <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
                    Estadísticas y Reportes
                </Typography>

                <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Rango Predefinido</InputLabel>
                            <Select value={dateRangeKey} label="Rango Predefinido" onChange={handlePresetRangeChange}>
                                {Object.entries(presetDateRanges).map(([key, { label }]) => (
                                    <MenuItem key={key} value={key}>{label}</MenuItem>
                                ))}
                                <MenuItem value="custom">Personalizado</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <DatePicker
                            label="Fecha Inicio"
                            value={startDate}
                            onChange={(newValue) => {setStartDate(newValue); setDateRangeKey('custom');}}
                            renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                            maxDate={endDate || new Date()}
                            format="dd/MM/yyyy"
                            disabled={dateRangeKey !== 'custom'}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <DatePicker
                            label="Fecha Fin"
                            value={endDate}
                            onChange={(newValue) => {setEndDate(newValue); setDateRangeKey('custom');}}
                            renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                            minDate={startDate}
                            maxDate={new Date()}
                            format="dd/MM/yyyy"
                            disabled={dateRangeKey !== 'custom'}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Button
                            variant="contained"
                            onClick={handleApplyCustomDateFilter}
                            disabled={dateRangeKey !== 'custom' || loading || !startDate || !endDate || isBefore(endDate, startDate)}
                            startIcon={<SearchIcon />}
                            fullWidth
                            size="medium"
                        >
                            Buscar
                        </Button>
                    </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress size={50} /></Box>
                )}

                {!loading && !statsData && dateRangeKey !== 'custom' && (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', my: 5 }}>
                        No hay datos para el rango seleccionado.
                    </Typography>
                )}
                 {!loading && !statsData && dateRangeKey === 'custom' && (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', my: 5 }}>
                        Seleccione un rango de fechas personalizado y presione "Buscar".
                    </Typography>
                )}

                {statsData && !loading && (
                    <>
                        <Grid container spacing={1.5} sx={{ mb: 3 }}>
                            {summaryCardData.map((item) => (
                                <Grid item xs={12} sm={6} md={4} lg={2} key={item.title}>
                                    <Card variant="outlined" sx={{ height: '100%'}}>
                                        <CardContent sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', p:1.5, '&:last-child': { pb: 1.5 } }}>
                                            <Typography variant="h5" component="div" sx={{ color: item.color || 'text.primary', fontWeight: 'bold' }}>
                                                {item.value}
                                            </Typography>
                                            <Typography color="text.secondary" variant="caption">
                                                {item.title}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>

                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <Paper variant="outlined" sx={{ p: 2, height: 420, display: 'flex', flexDirection: 'column' }}>
                                    <Typography variant="h6" gutterBottom align="center">Distribución por Estado</Typography>
                                    {chartDataForDisplay && chartDataForDisplay.length > 0 ? (
                                        <Box sx={{ flexGrow: 1, width: '100%', height: 'calc(100% - 40px)' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                                                    <Pie
                                                        data={chartDataForDisplay}
                                                        cx="50%" cy="45%"
                                                        labelLine={false}
                                                        outerRadius={110} 
                                                        innerRadius={50}
                                                        fill="#8884d8" dataKey="value"
                                                        label={renderCustomizedPieLabel}
                                                    >
                                                        {chartDataForDisplay.map((entry, index) => (
                                                            <Cell key={`cell-${entry.key}`} fill={statusDetails[entry.key]?.color || GRAPH_COLORS[index % GRAPH_COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(value, name) => [`${value} turnos (${name})`, "Cantidad"]}/>
                                                    <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{fontSize: "12px", lineHeight: "1.5", paddingLeft: "10px"}} iconSize={10} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </Box>
                                    ) : <Typography color="text.secondary" align="center" sx={{pt:5}}>No hay datos de turnos para graficar.</Typography>}
                                </Paper>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                 <Paper variant="outlined" sx={{ p: 2, height: 420, display: 'flex', flexDirection: 'column' }}>
                                    <Typography variant="h6" gutterBottom align="center">Cantidad de Turnos por Estado</Typography>
                                    {chartDataForDisplay && chartDataForDisplay.length > 0 ? (
                                        <Box sx={{ flexGrow: 1, width: '100%', height: 'calc(100% - 40px)' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={chartDataForDisplay} margin={{ top: 5, right: 30, left: 0, bottom: 70 }}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="name" angle={-35} textAnchor="end" height={70} interval={0} tick={{fontSize: 10}}/>
                                                    <YAxis allowDecimals={false} />
                                                    <Tooltip formatter={(value) => [`${value} turnos`, "Cantidad"]}/>
                                                    <Legend verticalAlign="bottom" wrapperStyle={{paddingTop: "20px", fontSize: "12px"}} iconSize={10}/>
                                                    <Bar dataKey="value" name="Cantidad de Turnos">
                                                        {chartDataForDisplay.map((entry, index) => (
                                                            <Cell key={`cell-bar-${entry.key}`} fill={statusDetails[entry.key]?.color || GRAPH_COLORS[index % GRAPH_COLORS.length]} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </Box>
                                    ) : <Typography color="text.secondary" align="center" sx={{pt:5}}>No hay datos de turnos para graficar.</Typography>}
                                </Paper>
                            </Grid>
                        </Grid>
                    </>
                )}
            </Paper>
        </LocalizationProvider>
    );
};

export default StatisticsView;