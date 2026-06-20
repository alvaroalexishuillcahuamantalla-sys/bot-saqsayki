const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');

const app = express();
const PORT = process.env.PORT || 10000;

let qrCodeUrl = '';
let botStatus = 'Iniciando el sistema...';
let sock = null;

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
            ${qrCodeUrl ? `<img class="qr" src="${qrCodeUrl}" alt="QR">` : '<p>Esperando el código QR...</p>'}
        </body>
        </html>
    `);
});

async function iniciarBot() {
    try {
        // Carpeta totalmente nueva para evitar fantasmas del pasado
        const { state, saveCreds } = await useMultiFileAuthState('sesion_final_v1');

        sock = makeWASocket({
            auth: state,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            browser: ['Saqsayki Bot', 'Chrome', '1.0.0']
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
                botStatus = '📱 Escanea el QR con tu WhatsApp';
            }

            if (connection === 'open') {
                qrCodeUrl = '';
                botStatus = '✅ Conectado y Operativo';
            }

            if (connection === 'close') {
                qrCodeUrl = '';
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                
                if (shouldReconnect) {
                    botStatus = '🔄 Reconectando en 5 segundos...';
                    // EL FRENO DE EMERGENCIA: Espera 5 segundos antes de reintentar para no saturar Render
                    setTimeout(iniciarBot, 5000); 
                } else {
                    botStatus = '❌ Sesión cerrada desde el celular.';
                }
            }
        });

        sock.ev.on('messages.upsert', async (m) => {
            const msg = m.messages[0];
            if (!msg || !msg.message || msg.key.fromMe) return;
            const remite = msg.key.remoteJid;
            const texto = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim().toLowerCase();
            
            if (texto === 'menu') await sock.sendMessage(remite, { text: "Bienvenido a Saqsayki.\n1. Horarios\n2. Precios\n3. Paquetes\n4. Ubicación\n5. Carta" });
        });

    } catch (error) {
        console.log("Error crítico al iniciar:", error);
    }
}

iniciarBot();
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));
