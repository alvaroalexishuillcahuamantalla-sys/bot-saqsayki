const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');
const axios = require('axios');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

let qrCodeUrl = '';
let botStatus = 'Iniciando...';
let sock = null;

// Endpoint para UptimeRobot
app.get('/ping', (req, res) => res.status(200).send('pong'));

// Interfaz Web Principal
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="refresh" content="3">
            <title>Bot Saqsayki</title>
            <style>
                body { font-family: Arial; text-align: center; padding: 50px; }
                .qr-container { margin-top: 30px; }
                img { border: 5px solid #25d366; border-radius: 10px; width: 300px; }
            </style>
        </head>
        <body>
            <h1>Bot Saqsayki - Estado</h1>
            <p><strong>${botStatus}</strong></p>
            ${qrCodeUrl ? `<div class="qr-container"><img src="${qrCodeUrl}" alt="Escanea este QR con WhatsApp"></div>` : '<p>Si no ves QR, el bot ya está conectado.</p>'}
        </body>
        </html>
    `);
});

async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('sesion_whatsapp');

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
                botStatus = '❌ Sesión cerrada.';
            }
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg || !msg.message || msg.key.fromMe) return;
        const remite = msg.key.remoteJid;
        const texto = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim().toLowerCase();
        
        if (texto === 'menu') await sock.sendMessage(remite, { text: "Bienvenido a Saqsayki.\n1. Horarios\n2. Precios\n3. Paquetes\n4. Ubicación\n5. Carta" });
        if (texto === '5') {
            // Aquí puedes añadir tu función de enviar carta de nuevo
            await sock.sendMessage(remite, { text: "Enviando carta..." });
        }
    });
}

iniciarBot();
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));
