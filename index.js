const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');

// Servidor HTTP para Render y Panel Web
const app = express();
const PORT = process.env.PORT || 10000;

// Variables globales para controlar el estado y el QR en la web
let qrCodeUrl = '';
let botStatus = 'Iniciando el bot, por favor espera...';

// Lógica principal del Bot
async function iniciarBot() {
    // Usamos tu carpeta de sesión: sesion_whatsapp
    const { state, saveCreds } = await useMultiFileAuthState('sesion_whatsapp');

    // Obtener dinámicamente la última versión de WhatsApp Web para evitar el error 405
    let version = [2, 3000, 1015901307]; // Versión de respaldo
    try {
        const checkVersion = await fetchLatestBaileysVersion();
        if (checkVersion && checkVersion.version) {
            version = checkVersion.version;
            console.log(`💻 Conectando con versión de WhatsApp Web: ${version.join('.')}`);
        }
    } catch (err) {
        console.log('⚠️ No se pudo obtener la última versión en línea, usando versión de respaldo.');
    }

    const sock = makeWASocket({
        auth: state,
        version: version, 
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, // Desactivado de consola para no deformar logs
        browser: ['Ubuntu', 'Chrome', '20.0.04'] 
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        // 🌟 CAPTURA EL QR PARA LA PÁGINA WEB
        if (qr) {
            qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
            botStatus = '¡Código QR listo! Escanéalo con tu teléfono en WhatsApp > Dispositivos Vinculados.';
            console.log('\n🔄 Nuevo código QR generado y expuesto en la web de Render.');
        }

        if (connection === 'close') {
            const codigoError = lastDisconnect?.error?.output?.statusCode;
            const razon = lastDisconnect?.error?.message || 'Desconocida';
            const debeReconectar = codigoError !== DisconnectReason.loggedOut;
            
            console.log(`❌ Conexión cerrada. Código: ${codigoError} | Razón: ${razon}`);
            qrCodeUrl = ''; // Limpiamos el QR al cerrarse
            
            if (debeReconectar) {
                botStatus = '🔄 Conexión interrumpida. Esperando 7 segundos para intentar reconectar...';
                setTimeout(() => iniciarBot(), 7000); 
            } else {
                botStatus = '❌ Sesión cerrada por el usuario. Elimina la carpeta "sesion_whatsapp" para volver a vincular.';
            }
        } else if (connection === 'open') {
            qrCodeUrl = ''; // Limpiamos el QR porque ya entramos con éxito
            botStatus = '🎉 ¡CONEXIÓN EXITOSA! El bot de Saqsayki está en línea y respondiendo.';
            console.log('\n🎉 ¡CONEXIÓN EXITOSA! El bot de Saqsayki está listo. 🎉\n');
        }
    });

    // Tu lógica exacta de respuestas e historial de mensajes
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.key.fromMe && m.type === 'notify') {
            const remite = msg.key.remoteJid;
            const textoRecibido = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            const opcion = textoRecibido.trim().toLowerCase();

            console.log(`💬 Mensaje recibido de [${remite}]: "${textoRecibido}"`);

            const menuPrincipal = `✨ *¡Bienvenido al Parque Temático Saqsayki!* ✨\n\n¿En qué te puedo ayudar hoy? Por favor, elige una opción enviando solo el *número* correspondiente:\n\n*1.* 🕒 Horarios y Política de Mascotas\n*3.* 🎁 Paquetes Promocionales\n*4.* 📍 Ubicación en Google Maps`;

            if (opcion === '1') {
                await sock.sendMessage(remite, { text: `🕒 *Horarios de Atención:*\nLunes a Domingo y Feriados de 9:00 AM a 5:30 PM.\n\n🐾 *Política de Mascotas:*\n¡Somos 100% Pet Friendly! Tus engreídos de cuatro patas son bienvenidos con correa.` });
            } else if (opcion === '3') {
                await sock.sendMessage(remite, { text: `🎁 *Paquetes Promocionales Saqsayki:*\n\n1️⃣ *Paquete Familiar:* Ingreso para 4 personas + almuerzos tradicionales.\n2️⃣ *Paquete Aventurero:* Ingreso general + guiado especializado.\n\n_Escríbenos cuántas personas son para cotizar._` });
            } else if (opcion === '4') {
                await sock.sendMessage(remite, { text: `📍 *Nuestra Ubicación:*\nHaz clic aquí para llegar con Google Maps:\n\nhttps://maps.google.com/?q=-16.4000,-71.5000` });
            } else {
                await sock.sendMessage(remite, { text: menuPrincipal });
            }
        }
    });
}

// Inicializar el bot de WhatsApp
iniciarBot();

// --- PANEL WEB (Reemplaza el texto plano por interfaz gráfica) ---
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
                // Auto-refresca el navegador cada 8 segundos para mostrar el código o el estado actualizado
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
                    <p>Si el bot dice que está en línea, puedes cerrar esta ventana con total tranquilidad.</p>
                `}
                
                <br>
                <a href="/" class="btn">Actualizar Estado</a>
                <div class="footer">Sincronizado con el sistema de Baileys.</div>
            </div>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor web escuchando en el puerto ${PORT}`);
});
