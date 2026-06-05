const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');

// 1. Servidor HTTP básico para Render
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('🤖 Bot de Saqsayki activo.');
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor web escuchando en el puerto ${PORT}`);
});

// 2. Lógica principal del Bot
async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('sesion_whatsapp');

    let version = [2, 3000, 1015901307];
    try {
        const checkVersion = await fetchLatestBaileysVersion();
        if (checkVersion && checkVersion.version) {
            version = checkVersion.version;
        }
    } catch (err) {
        console.log('⚠️ Usando versión de respaldo.');
    }

    const sock = makeWASocket({
        auth: state,
        version: version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, // 🌟 Apagamos el QR roto para siempre
        browser: ['Ubuntu', 'Chrome', '20.0.04'] 
    });

    // 🌟 NUEVO MÉTODO: Código de vinculación por texto
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                // Configurado con tu número de la captura previa: código 51 + número
                const numeroTelefono = "51983838681"; 
                const codigo = await sock.requestPairingCode(numeroTelefono);
                
                console.log('\n==================================================');
                console.log(`🔑 TU CÓDIGO DE VINCULACIÓN ES: ${codigo}`);
                console.log('==================================================');
                console.log('Pasos en tu celular:');
                console.log('1. Ve a WhatsApp > Dispositivos vinculados > Vincular un dispositivo.');
                console.log('2. En la pantalla donde se abre la cámara, abajo dale clic a:');
                console.log('   "Vincular con el número de teléfono".');
                console.log(`3. Escribe este código que ves aquí arriba: ${codigo}\n`);
            } catch (error) {
                console.log('❌ Error al generar el código de texto:', error);
            }
        }, 6000); // Espera 6 segundos a que conecte bien antes de pedir el código
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const codigoError = lastDisconnect?.error?.output?.statusCode;
            const debeReconectar = codigoError !== DisconnectReason.loggedOut;
            
            console.log(`❌ Conexión cerrada. Código: ${codigoError}`);
            if (debeReconectar) {
                setTimeout(() => iniciarBot(), 7000); 
            }
        } else if (connection === 'open') {
            console.log('\n🎉 ¡CONEXIÓN EXITOSA! El bot de Saqsayki está listo para responder. 🎉\n');
        }
    });

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

iniciarBot();
