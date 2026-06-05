const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

// Variables globales para guardar el estado y la URL del QR
let qrCodeUrl = '';
let botStatus = 'Iniciando el bot, por favor espera...';

// Configuración del cliente de WhatsApp con los argumentos necesarios para Render
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

// Evento cuando se genera el código QR
client.on('qr', (qr) => {
    // Usamos la API gratuita de qrserver para convertir el texto en una imagen real
    qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
    botStatus = '¡Código QR listo! Escanéalo con tu teléfono en la sección de Dispositivos Vinculados.';
    console.log('Nuevo código QR generado y expuesto en la web.');
});

// Evento cuando el bot ya se conectó con éxito
client.on('ready', () => {
    qrCodeUrl = ''; // Limpiamos el QR ya que no se necesita
    botStatus = '🚀 ¡Bot Saqsayki conectado y funcionando activamente!';
    console.log('¡El cliente de WhatsApp está listo!');
});

client.on('authenticated', () => {
    console.log('Autenticación exitosa.');
});

client.on('auth_failure', (msg) => {
    botStatus = 'Error de autenticación, reiniciando...';
    console.error('Fallo en la autenticación:', msg);
});

// Inicializar el bot de WhatsApp
client.initialize();

// --- CONFIGURACIÓN DEL SERVIDOR WEB ---

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bot Saqsayki - Panel de Control</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; background-color: #f0f2f5; margin: 0; padding: 40px; color: #333; }
                .card { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); display: inline-block; max-width: 450px; width: 100%; }
                h1 { color: #075e54; margin-top: 0; }
                .status { font-size: 1.1em; margin: 20px 0; padding: 10px; background-color: #e3f2fd; border-radius: 8px; color: #0d47a1; font-weight: 500; }
                img { margin-top: 15px; border: 4px solid #fff; box-shadow: 0 2px 10px rgba(0,0,0,0.15); border-radius: 8px; }
                .footer { margin-top: 25px; font-size: 0.85em; color: #777; }
                .btn { display: inline-block; padding: 10px 20px; background-color: #25d366; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 15px; }
            </style>
            <script>
                // Auto-refresca la página cada 8 segundos para actualizar el estado del QR sin intervención del usuario
                setInterval(() => {
                    window.location.reload();
                }, 8000);
            </script>
        </head>
        <body>
            <div class="card">
                <h1>Bot Saqsayki 🤖</h1>
                <div class="status">${botStatus}</div>
                
                ${qrCodeUrl ? `
                    <p>Abre WhatsApp > Dispositivos vinculados > Vincular un dispositivo:</p>
                    <img src="${qrCodeUrl}" alt="Código QR de WhatsApp" />
                ` : `
                    <p>Si ya escaneaste el código, tu bot está en línea de forma segura. No cierres la aplicación en Render.</p>
                `}
                
                <br>
                <a href="/" class="btn">Forzar Actualización</a>
                <div class="footer">La página se actualiza automáticamente cada 8 segundos.</div>
            </div>
        </body>
        </html>
    `);
});

// Escuchar en el puerto que Render nos asigne
app.listen(port, () => {
    console.log(`Servidor web corriendo en el puerto ${port}`);
});
