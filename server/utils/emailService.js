// server/utils/emailService.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv'; // Importa dotenv para asegurar que las variables de entorno estén cargadas aquí también

// Cargar variables de entorno si este módulo se importa de forma independiente
// Aunque server.js ya lo hace, es buena práctica si el módulo pudiera ser importado sin pasar por server.js
dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT == 465, // true for 465 (SSL/TLS), false for other ports (STARTTLS)
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

export const sendAppointmentConfirmationEmail = async (patientEmail, patientName, professionalName, dateTime, reasonForVisit) => {
    // Validar configuración de email
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD || !process.env.SENDER_EMAIL) {
        console.error('Error: Las variables de entorno para el envío de correos no están configuradas correctamente.');
        return; // Detener la ejecución si la configuración es incompleta
    }

    const dateObj = new Date(dateTime);
    const formattedDate = dateObj.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const formattedTime = dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #00979e; text-align: center;">Confirmación de Turno NutriSmart</h2>
                <p>Estimado/a <strong>${patientName}</strong>,</p>
                <p>Tu turno ha sido programado exitosamente con <strong>${professionalName}</strong>.</p>
                <p><strong>Detalles del Turno:</strong></p>
                <ul>
                    <li><strong>Profesional:</strong> ${professionalName}</li>
                    <li><strong>Fecha:</strong> ${formattedDate}</li>
                    <li><strong>Hora:</strong> ${formattedTime}</li>
                    <li><strong>Motivo de la consulta:</strong> ${reasonForVisit || 'No especificado'}</li>
                </ul>
                <p style="text-align: center; font-size: 0.9em; color: #777;">Este es un mensaje automático, por favor no respondas a este correo.</p>
                <p style="text-align: center; margin-top: 20px;"><a href="${process.env.FRONTEND_URL}" style="background-color: #00979e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Visitar NutriSmart</a></p>
            </div>
        </div>
    `;

    const mailOptions = {
        from: process.env.SENDER_EMAIL,
        to: patientEmail,
        subject: 'Confirmación de Turno - NutriSmart',
        html: htmlContent,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email de confirmación enviado a ${patientEmail}`);
    } catch (error) {
        console.error(`Error al enviar email a ${patientEmail}:`, error);
        // NOTA: No lanzamos el error aquí para no bloquear la respuesta al usuario,
        // pero sí lo logueamos para fines de depuración.
    }
};