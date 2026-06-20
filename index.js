const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');

const app = express();
const PORT = process.env.PORT || 10000;

let qrCodeUrl = '';
let botStatus = 'Generando nuevo inicio de sesión...';
let sock = null;

// Endpoint para UptimeRobot (Evita que el bot se duerma)
app.get('/ping', (req, res) => res.status(200).send('pong'));

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="refresh" content="3">
            <title>Bot Saqsayki</title>
            <style>
                body { font-family: Arial; text-align: center; padding: 50px; background-color: #f4f4f9;}
                .qr { margin: 20px; border: 5px solid #25d366; border-radius: 10px; width: 300px; }
                h1 { color: #333; }
                p { font-size: 1.2em; color: #555; }
            </style>
        </head>
        <body>
            <h1>Bot Saqsayki - Estado</h1>
            <p><strong>${botStatus}</strong></p>
            ${qrCodeUrl ? `<img class="qr" src="${qrCodeUrl}" alt="Escanea este QR">` : '<p>Esperando conexión...</p>'}
        </body>
        </html>
    `);
});

async function iniciarBot() {
    // ⚠️ EL TRUCO ESTÁ AQUÍ: Al cambiar a 'sesion_nueva', ignoramos los errores del pasado y forzamos un QR nuevo.
    const { state, saveCreds } = await useMultiFileAuthState('sesion_nueva');

    sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }), // Oculta mensajes molestos en la consola
        printQRInTerminal: false,
        browser: ['Saqsayki Bot', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
            botStatus = '📱 Escanea el QR para conectar';
        }

        if (connection === 'open') {
            qrCodeUrl = '';
            botStatus = '✅ Conectado y Operativo';
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                botStatus = '🔄 Reconectando...';
                iniciarBot();
            } else {
                botStatus = '❌ Sesión cerrada desde el celular.';
            }
        }
    });

    // Tu lógica de mensajes básica
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg || !msg.message || msg.key.fromMe) return;
        const remite = msg.key.remoteJid;
        const texto = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim().toLowerCase();
        
        if (texto === 'menu') await sock.sendMessage(remite, { text: "Bienvenido a Saqsayki.\n1. Horarios\n2. Precios\n3. Paquetes\n4. Ubicación\n5. Carta" });
    });
}

iniciarBot();
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));
