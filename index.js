const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

// Variables globales
let qrCodeUrl = '';
let botStatus = 'Iniciando el bot...';
let sock = null;

// URL de la imagen
const CARTA_URL = 'https://raw.githubusercontent.com/alvaroalexishuillcahuamantalla-sys/bot-saqsayki/main/carta.jpeg';

// ============================================================
// ENDPOINT PARA UPTIMEROBOT (MANTIENE EL BOT DESPIERTO)
// ============================================================
app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});

// ============================================================
// MENSAJES Y LÓGICA (MANTENIDA)
// ============================================================
async function enviarCarta(remite) {
    try {
        const response = await axios.get(CARTA_URL, { responseType: 'arraybuffer', timeout: 10000 });
        await sock.sendMessage(remite, {
            image: Buffer.from(response.data),
            caption: `🍽️ *CARTA DEL RESTAURANTE SAQSAYKI*\n\nAquí está nuestra carta completa.\n\n💬 Escriba *menu* para volver al inicio`
        });
    } catch (e) {
        await sock.sendMessage(remite, { text: "❌ Error cargando la carta. Intenta más tarde." });
    }
}

async function enviarMenuTexto(remite, saludo = "¡Hola! ✨") {
    const menu = `${saludo}\n\n*Bienvenido al Parque Saqsayki*\n\n1️⃣ Horarios\n2️⃣ Precios\n3️⃣ Paquetes\n4️⃣ Cómo llegar\n5️⃣ Restaurante\n\nEscriba *menu* para volver.`;
    await sock.sendMessage(remite, { text: menu });
}

async function enviarInformacion(remite, opcion) {
    let texto = '';
    switch(opcion) {
        case '1': texto = "🕒 *HORARIOS:* 9:30 a.m. a 5:30 p.m."; break;
        case '2': texto = "💰 *PRECIOS:* Consulta en nuestra web."; break;
        case '3': texto = "🎒 *PAQUETES:* Disponibles en punto de venta."; break;
        case '4': texto = "📍 *UBICACIÓN:* https://maps.app.goo.gl/xrwjZyXT2iBeMiUr9"; break;
        case '5': await enviarCarta(remite); return;
        default: texto = "❌ Opción no válida.";
    }
    await sock.sendMessage(remite, { text: texto });
}

// ============================================================
// CONEXIÓN WHATSAPP
// ============================================================
async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('sesion_whatsapp');

    sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ['Saqsayki Bot', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
        if (connection === 'open') { qrCodeUrl = ''; botStatus = '✅ Conectado'; }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) setTimeout(iniciarBot, 5000);
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg || !msg.message || msg.key.fromMe) return;
        const remite = msg.key.remoteJid;
        if (remite.endsWith('@g.us')) return;

        const texto = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim().toLowerCase();

        if (['1','2','3','4','5'].includes(texto)) await enviarInformacion(remite, texto);
        else if (texto === 'menu') await enviarMenuTexto(remite);
        else await enviarMenuTexto(remite);
    });
}

iniciarBot();

app.get('/', (req, res) => {
    res.send(`<h1>Bot Activo</h1><p>${botStatus}</p>${qrCodeUrl ? `<img src="${qrCodeUrl}">` : ''}`);
});

app.listen(PORT, () => console.log(`Servidor activo en ${PORT}`));
