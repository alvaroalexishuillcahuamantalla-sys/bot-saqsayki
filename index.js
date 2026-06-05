const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');

// Servidor HTTP para Render y Panel Web
const app = express();
const PORT = process.env.PORT || 10000;

// Variables globales para controlar el estado y el QR en la web
let qrCodeUrl = '';
let botStatus = 'Iniciando el bot, por favor espera...';
let sock = null; // Guardamos la instancia del socket globalmente

// Lógica principal del Bot
async function iniciarBot() {
    // Carpeta de sesión segura
    const { state, saveCreds } = await useMultiFileAuthState('sesion_whatsapp');

    // Obtener la última versión de WhatsApp Web para evitar errores de obsolescencia
    let version = [2, 3000, 1015901307]; 
    try {
        const checkVersion = await fetchLatestBaileysVersion();
        if (checkVersion && checkVersion.version) {
            version = checkVersion.version;
            console.log(`💻 Conectando con versión de WhatsApp Web: ${version.join('.')}`);
        }
    } catch (err) {
        console.log('⚠️ Usando versión de respaldo para WhatsApp Web.');
    }

    // Creamos la conexión
    sock = makeWASocket({
        auth: state,
        version: version, 
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, 
        browser: ['Ubuntu', 'Chrome', '20.0.04'] 
    });

    // Guardar credenciales cada vez que se actualicen (mantiene la sesión viva)
    sock.ev.on('creds.update', saveCreds);

    // Manejo de estados de la conexión
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
            botStatus = '¡Código QR listo! Escanéalo con tu teléfono en WhatsApp > Dispositivos Vinculados.';
            console.log('\n🔄 Nuevo código QR generado y expuesto en la web de Render.');
        }

        if (connection === 'close') {
            const codigoError = lastDisconnect?.error?.output?.statusCode;
            const razon = lastDisconnect?.error?.message || 'Desconocida';
            
            // Si el código NO es "loggedOut", significa que fue una caída de internet, reinicio del servidor, etc.
            const debeReconectar = codigoError !== DisconnectReason.loggedOut;
            
            console.log(`❌ Conexión cerrada. Código: ${codigoError} | Razón: ${razon}`);
            qrCodeUrl = ''; 
            
            if (debeReconectar) {
                botStatus = '🔄 Conexión interrumpida o teléfono sin internet. Intentando reconectar automáticamente...';
                console.log('🔄 Intentando reconectar en 7 segundos...');
                setTimeout(() => iniciarBot(), 7000); 
            } else {
                // Esto pasa si desvinculas el bot desde el celular o si pasan los 14 días de inactividad
                botStatus = '❌ Sesión expirada o cerrada por el usuario. Es necesario volver a escanear el código QR.';
                console.log('⚠️ La sesión se eliminó permanentemente. Requiere nueva vinculación.');
            }
        } else if (connection === 'open') {
            qrCodeUrl = ''; 
            botStatus = '🎉 ¡CONEXIÓN EXITOSA! El bot de Saqsayki está en línea y respondiendo.';
            console.log('\n🎉 ¡CONEXIÓN EXITOSA! El bot de Saqsayki está listo y activo. 🎉\n');
        }
    });

    // Escucha y respuesta automática de mensajes
    sock.ev.on('messages.upsert', async (m) => {
        try {
            const msg = m.messages[0];
            
            if (!msg || !msg.message) return;
            if (msg.key.fromMe) return; // Evita responderse a sí mismo

            const remite = msg.key.remoteJid;

            // Extracción de texto sin importar el formato de origen
            const textoRecibido = 
                msg.message.conversation || 
                msg.message.extendedTextMessage?.text || 
                msg.message.imageMessage?.caption || 
                '';

            const opcion = textoRecibido.trim().toLowerCase();
            console.log(`💬 Mensaje recibido de [${remite}]: "${textoRecibido}"`);

            // --- DISEÑO DE LOS MENSAJES AUTOMÁTICOS ---
            const menuPrincipal = `✨ *¡Bienvenido(a) al Parque Saqsayqui de Juegos Extremos!* ✨\n\nNos alegra recibir su mensaje. Somos un espacio dedicado a la diversión, la aventura y las experiencias inolvidables para toda la familia.\n\nPor favor, indíquenos cómo podemos ayudarle enviando solo el *número* de la opción:\n\n1️⃣ *HORARIOS Y INGRESO*\n2️⃣ *PRECIOS UNITARIOS DE JUEGOS*\n3️⃣ *PAQUETES PROMOCIONALES*\n4️⃣ *CÓMO LLEGAR*\n5️⃣ *PLATOS A LA CARTA*\n\n🐾 *Mascotas:* ¡Somos Pet Friendly! Trae a tus engreídos con correa.`;

            if (opcion === '1') {
                const msgHorarios = `🗓️ *Nuestro horario de atención:* \nLunes a domingo (incluyendo feriados)\n⏰ De *9:30 a.m. a 5:30 p.m.*\n\n🏞️ *COSTO DE INGRESO (Incluye miradores y puente acuático):*\n👉 Adultos: *S/ 7.00*\n👉 Niños: *S/ 4.00*\n\n📸 *Atractivos incluidos que podrás visitar:*\n* Mirador de la *mano gigante del Inca*\n* *Bosque encantado de los duendes*\n* Mirador de la *mano de choclo de oro*\n* *Trilogía andina*\n* ¡Y muchos más miradores hermosos!`;
                await sock.sendMessage(remite, { text: msgHorarios });

            } else if (opcion === '2') {
                const msgPrecios = `💰 *PRECIOS UNITARIOS DE JUEGOS*\n\n🌊 *JUEGOS ACUÁTICOS:*\n• *Caminata en línea* – S/ 5.00\n• *Puente acuático* – S/ 5.00\n• *Tirolesa acuática* – S/ 8.00\n• *Puente aéreo* – S/ 8.00\n\n⛰️ *JUEGOS DE ALTURA:*\n• *Columpio extremo “Vuelo del Cóndor”* (25 m) – S/ 20.00\n• *Circuito de 21 obstáculos extremos* – S/ 20.00`;
                await sock.sendMessage(remite, { text: msgPrecios });

            } else if (opcion === '3') {
                const msgPaquetes = `🎒 *PAQUETES PROMOCIONALES*\nPrecios por persona diseñados para disfrutar al máximo:\n\n🔹 *PAQUETE 1 – S/ 25.00*\n• Entrada al parque (miradores)\n• Puente acuático\n• Caminata en línea\n• Tirolesa acuática\n• Puente aéreo\n\n🔹 *PAQUETE 2 – S/ 35.00*\n• Entrada al parque (miradores)\n• Columpio extremo\n• Circuito de 21 obstáculos\n• Puente acuático\n\n🔹 *PAQUETE 3 – S/ 45.00 – EXPERIENCIA COMPLETA*\n• Entrada al parque (miradores)\n• Columpio extremo (25 m)\n• Circuito de 21 obstáculos\n• Tirolesa acuática\n• Caminata en línea\n• Puente aéreo\n• Puente acuático`;
                await sock.sendMessage(remite, { text: msgPaquetes });

            } else if (opcion === '4') {
                const msgLlegar = `📍 *CÓMO LLEGAR A SAQSAYKI*\n\nHaz clic en el siguiente enlace para ver nuestra ubicación exacta y trazar tu ruta en Google Maps:\n🗺️ https://maps.google.com/?q=-16.4000,-71.5000 \n\n🚕 *Servicio de Taxi de Confianza:*\nSi necesitas transporte seguro para visitarnos, puedes llamar a:\n📞 *926050769* o *991972382*`;
                await sock.sendMessage(remite, { text: msgLlegar });

            } else if (opcion === '5') {
                const msgComida = `🍽️ *PLATOS A LA CARTA (Nuestra Quinta Restaurante)*\n\n• Cuy al horno entero — S/ 60\n• Trucha frita — S/ 25\n• Chicharrón de cerdo — S/ 25\n• Chuleta de cerdo — S/ 25\n• Pollo al horno — S/ 25\n\n📝 *Información sobre Reservas:*\nSe realizan reservas anticipadas con los platos de comida. Para asegurar tus platos o solicitar más informes, contáctanos directamente aquí:\n📞 *983 838 681*`;
                await sock.sendMessage(remite, { text: msgComida });

            } else {
                // Si el usuario escribe cualquier otra cosa, se le envía el menú principal
                await sock.sendMessage(remite, { text: menuPrincipal });
            }
            
        } catch (error) {
            console.error('❌ Error interno procesando el mensaje recibido:', error);
        }
    });
}

// Inicializar el bot de WhatsApp por primera vez
iniciarBot();

// --- PANEL WEB INTERFAZ ---
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
                // Recarga automática cada 8 segundos solo si hay un QR visible para escanear
                ${qrCodeUrl ? `
                setInterval(() => {
                    window.location.reload();
                }, 8000);
                ` : ''}
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
                    <p>✅ El sistema está activo y protegiendo tu sesión de forma permanente.</p>
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
