const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
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

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        // 🌟 CLAVE 1: Esto camufla la conexión para que WhatsApp no la bloquee de inmediato
        browser: ['Ubuntu', 'Chrome', '20.0.04'] 
    });

    sock.ev.on('creds.update', saveCreds);

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
            const codigoError = lastDisconnect?.error?.output?.statusCode;
            const razon = lastDisconnect?.error?.message || 'Desconocida';
            const debeReconectar = codigoError !== DisconnectReason.loggedOut;
            
            // 🌟 CLAVE 2: Imprime la razón exacta del cierre para saber qué pasa
            console.log(`❌ Conexión cerrada. Código: ${codigoError} | Razón: ${razon}`);
            
            if (debeReconectar) {
                console.log('🔄 Esperando 5 segundos para intentar reconectar de forma segura...');
                setTimeout(() => iniciarBot(), 5000); 
            }
        } else if (connection === 'open') {
            console.log('\n🎉 ¡CONEXIÓN EXITOSA! El bot de Saqsayki está listo. 🎉\n');
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
