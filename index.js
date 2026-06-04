const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const express = require('express');
const pino = require('pino');

// 1. Servidor HTTP básico para que Render mantenga el servicio activo
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('🤖 Bot de Saqsayki en línea y funcionando de forma óptima.');
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor web escuchando en el puerto ${PORT}`);
});

// 2. Lógica principal del Bot de WhatsApp
async function iniciarBot() {
    // Guarda la sesión localmente en una carpeta temporal
    const { state, saveCreds } = await useMultiFileAuthState('sesion_whatsapp');

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }), // Apaga los logs innecesarios para mantener la pantalla limpia
        printQRInTerminal: false // Lo imprimiremos manualmente de forma optimizada
    });

    // Guardar credenciales cada vez que se actualicen
    sock.ev.on('creds.update', saveCreds);

    // Monitorear el estado de la conexión (QR y conexión exitosa)
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n==================================================');
            console.log('▲ ESCANEA ESTE CÓDIGO QR DESDE TU WHATSAPP ▲\n');
            qrcode.generate(qr, { small: true });
            console.log('\nPasos: Ve a WhatsApp > Dispositivos vinculados > Vincular un dispositivo.');
            console.log('==================================================\n');
        }

        if (connection === 'close') {
            const debeReconectar = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`🔄 Conexión cerrada. ¿Reconectando?: ${debeReconectar}`);
            if (debeReconectar) {
                iniciarBot();
            }
        } else if (connection === 'open') {
            console.log('\n🎉 ¡CONEXIÓN EXITOSA! El bot de Saqsayki está listo para responder mensajes. 🎉\n');
        }
    });

    // Escuchar y responder mensajes entrantes
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        
        // Evitar responderse a sí mismo o a mensajes del sistema/grupos
        if (!msg.key.fromMe && m.type === 'notify') {
            const remite = msg.key.remoteJid;
            
            // Extraer el texto enviado por el cliente
            const textoRecibido = msg.message?.conversation || 
                                 msg.message?.extendedTextMessage?.text || '';
            const opcion = textoRecibido.trim().toLowerCase();

            console.log(`💬 Mensaje recibido de [${remite}]: "${textoRecibido}"`);

            // Menú Principal
            const menuPrincipal = `✨ *¡Bienvenido al Parque Temático Saqsayki!* ✨\n\n¿En qué te puedo ayudar hoy? Por favor, elige una opción enviando solo el *número* correspondiente:\n\n*1.* 🕒 Horarios y Política de Mascotas\n*3.* 🎁 Paquetes Promocionales\n*4.* 📍 Ubicación en Google Maps`;

            // Respuestas automáticas según la opción
            if (opcion === '1') {
                const respuestaHorarios = `🕒 *Horarios de Atención:*\nLunes a Domingo y Feriados de 9:00 AM a 5:30 PM.\n\n🐾 *Política de Mascotas:*\n¡Somos 100% Pet Friendly! Tus engreídos de cuatro patas son bienvenidos, solo te pedimos que lleven correa por seguridad de todos los visitantes.`;
                await sock.sendMessage(remite, { text: respuestaHorarios });
            } 
            else if (opcion === '3') {
                const respuestaPaquetes = `🎁 *Paquetes Promocionales Saqsayki:*\n\n1️⃣ *Paquete Familiar:* Ingreso para 4 personas + almuerzos tradicionales incluidos.\n2️⃣ *Paquete Aventurero:* Ingreso general + guiado especializado por nuestras zonas místicas y naturales.\n\n_Escríbenos detallando cuántas personas te acompañan para darte una cotización exacta._`;
                await sock.sendMessage(remite, { text: respuestaPaquetes });
            } 
            else if (opcion === '4') {
                const respuestaUbicacion = `📍 *Nuestra Ubicación:*\nPara llegar sin perderte, haz clic directamente en el siguiente enlace de Google Maps:\n\nhttps://maps.google.com/?q=-16.4000,-71.5000nn¡Te esperamos!`;
                await sock.sendMessage(remite, { text: respuestaUbicacion });
            } 
            else {
                // Cualquier otra palabra o saludo devuelve el menú principal
                await sock.sendMessage(remite, { text: menuPrincipal });
            }
        }
    });
}

// Arrancar el bot
iniciarBot();
