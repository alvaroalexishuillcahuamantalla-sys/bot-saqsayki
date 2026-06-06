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
// Hace que el bot responda de forma más natural
const esperar = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

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
        if (msg.key.fromMe) return;

        const remite = msg.key.remoteJid;
        // Ignorar grupos completamente
        if (remite.endsWith('@g.us')) {
            return;
        }

        const textoRecibido =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            '';

        const opcion = textoRecibido.trim().toLowerCase();

        console.log(`📩 Mensaje privado recibido`);

        const menuPrincipal = `
✨ *¡Bienvenido(a) al Parque Temático Saqsayki!* ✨

🏞️ Vive una experiencia única llena de aventura, diversión y naturaleza.

Seleccione una opción:

1️⃣ Horarios e ingreso

2️⃣ Precios unitarios de juegos

3️⃣ Paquetes promocionales

4️⃣ Cómo llegar

5️⃣ Restaurante

📌 También puede escribir:

*menu*

para volver al menú principal.
`;

       if (
    opcion === 'hola' ||
    opcion === 'buenas' ||
    opcion === 'buenos dias' ||
    opcion === 'buenas tardes' ||
    opcion === 'buenas noches' ||
    opcion === 'info' ||
    opcion === 'informacion' ||
    opcion === 'menu' ||
    opcion.includes('horario') ||
    opcion.includes('precio') ||
    opcion.includes('paquete') ||
    opcion.includes('ubicacion') ||
    opcion.includes('ubicación') ||
    opcion.includes('donde') ||
    opcion.includes('dónde') ||
    opcion.includes('restaurante')
) {

    await esperar(1000);

    await sock.sendMessage(remite, {
        text: menuPrincipal
    });

}

        else if (opcion === '1') {

            await esperar(1000);

            await sock.sendMessage(remite, {
                text: `🕒 *HORARIOS E INGRESO*

📅 Lunes a domingo (incluyendo feriados)

⏰ 9:30 a.m. a 5:30 p.m.

🎟️ Ingreso:

👨 Adultos: S/ 7.00

👦 Niños: S/ 4.00

Incluye:

✅ Mano Gigante del Inca

✅ Bosque Encantado de los Duendes

✅ Mano de Choclo de Oro

✅ Trilogía Andina

✅ Diversos miradores turísticos`
            });

        }

        else if (opcion === '2') {

            await esperar(1000);

            await sock.sendMessage(remite, {
                text: `💰 *PRECIOS UNITARIOS DE JUEGOS*

🌊 Juegos Acuáticos

• Caminata en línea — S/ 5.00

• Puente acuático — S/ 5.00

• Tirolesa acuática — S/ 8.00

• Puente aéreo — S/ 8.00

━━━━━━━━━━━━━━━

⛰️ Juegos de Altura

• Columpio Extremo "Vuelo del Cóndor" — S/ 20.00

• Circuito de 21 obstáculos extremos — S/ 20.00`
            });

        }

        else if (opcion === '3') {

            await esperar(1000);

            await sock.sendMessage(remite, {
                text: `🎒 *PAQUETES PROMOCIONALES*

💦 *PAQUETE ACUÁTICO* — S/ 25.00

✅ Entrada al parque

✅ Puente acuático

✅ Caminata en línea

✅ Tirolesa acuática

✅ Puente aéreo

━━━━━━━━━━━━━━━

🧗 *PAQUETE AVENTURERO* — S/ 35.00

✅ Entrada al parque

✅ Columpio extremo

✅ Circuito de 21 obstáculos

✅ Puente acuático

━━━━━━━━━━━━━━━

🔥 *PAQUETE FULL* — S/ 45.00

✅ Entrada al parque

✅ Columpio extremo

✅ Circuito de 21 obstáculos

✅ Tirolesa acuática

✅ Caminata en línea

✅ Puente aéreo

✅ Puente acuático`
            });

        }

        else if (opcion === '4') {

            await esperar(1000);

            await sock.sendMessage(remite, {
                text: `📍 *¿CÓMO LLEGAR A SAQSAYKI?*

🚗 Nos encontramos aproximadamente a 30 minutos de Chicana Grande.

🚕 En taxi podrás llegar en aproximadamente 15 minutos desde Chicana Grande.

🗺️ Google Maps:

https://maps.google.com/?q=-16.4000,-71.5000

📞 Taxis recomendados:

926050769

991972382`
            });

        }

        else if (opcion === '5') {

            await esperar(1000);

            await sock.sendMessage(remite, {
                text: `🍽️ *Restaurante Saqsayki*

Muy pronto podrás visualizar nuestra carta completa.

📌 Solo realizamos reservas para días festivos.

Para más información comuníquese con nuestro equipo.`
            });

        }

        else {

            await esperar(1000);

            await sock.sendMessage(remite, {
                text: menuPrincipal
            });

        }

    } catch (error) {

        console.error('❌ Error interno procesando mensaje:', error);

    }

});

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
