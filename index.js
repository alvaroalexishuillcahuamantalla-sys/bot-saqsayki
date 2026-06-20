const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');
const axios = require('axios');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

// Variables globales
let qrCodeUrl = '';
let botStatus = 'Iniciando el bot...';
let sock = null;

const CARTA_URL = 'https://raw.githubusercontent.com/alvaroalexishuillcahuamantalla-sys/bot-saqsayki/main/carta.jpeg';

// ============================================================
// ENDPOINTS PARA MONITOREO Y WEB
// ============================================================
app.get('/ping', (req, res) => res.status(200).send('pong'));

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Bot Saqsayki Control</title>
            <style>
                body { font-family: sans-serif; text-align: center; padding: 50px; }
                .status { font-weight: bold; color: ${qrCodeUrl ? '#d9534f' : '#5cb85c'}; }
                img { margin-top: 20px; border: 2px solid #ccc; }
            </style>
            ${qrCodeUrl ? '<meta http-equiv="refresh" content="5">' : ''}
        </head>
        <body>
            <h1>Bot Saqsayki</h1>
            <p class="status">Estado: ${botStatus}</p>
            ${qrCodeUrl ? `<img src="${qrCodeUrl}" alt="Escanea este QR">` : '✅ El bot está conectado y listo.'}
        </body>
        </html>
    `);
});

// ============================================================
// LÓGICA DE MENSAJES (TU ESTRUCTURA ORIGINAL)
// ============================================================
async function enviarCarta(remite) {
    try {
        const response = await axios.get(CARTA_URL, { responseType: 'arraybuffer' });
        await sock.sendMessage(remite, { image: Buffer.from(response.data), caption: "🍽️ *CARTA SAQSAYKI*\nAquí está nuestra carta." });
    } catch (e) {
        await sock.sendMessage(remite, { text: "❌ Error cargando la carta." });
    }
}

// ============================================================
// CONEXIÓN WHATSAPP
// ============================================================
async function iniciarBot() {
    // IMPORTANTE: Asegúrate de que la carpeta 'sesion_whatsapp' exista en tu repo o que Render la cree
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
            botStatus = '📱 Escanea el código QR en la pantalla';
        }

        if (connection === 'open') {
            qrCodeUrl = '';
            botStatus = '✅ Bot Conectado';
            console.log('Bot Online');
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) iniciarBot();
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg || !msg.message || msg.key.fromMe) return;
        const remite = msg.key.remoteJid;
        const texto = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim().toLowerCase();
        
        if (texto === 'menu') await sock.sendMessage(remite, { text: "Bienvenido a Saqsayki.\n1. Horarios\n2. Precios\n3. Paquetes\n4. Ubicación\n5. Carta" });
        if (texto === '5') await enviarCarta(remite);
    });
}

iniciarBot();

app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
