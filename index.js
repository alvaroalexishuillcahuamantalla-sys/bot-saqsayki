const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

let qrCodeUrl = '';
let botStatus = 'Iniciando...';
let sock = null;

// ============================================================
// RESETEO SEGURO (Evita el error 503)
// ============================================================
app.get('/reset', async (req, res) => {
    try {
        botStatus = 'Reiniciando sesión...';
        
        // 1. Intentar cerrar el socket si existe
        if (sock) {
            try { await sock.logout(); } catch (e) { console.log("No se pudo cerrar socket"); }
            sock = null;
        }

        // 2. Borrar archivos de sesión
        if (fs.existsSync('sesion_whatsapp')) {
            fs.rmSync('sesion_whatsapp', { recursive: true, force: true });
        }

        res.send('<h1>Sesión borrada. El servidor se está reiniciando...</h1><p>Espera 30 segundos y recarga la página principal.</p>');
        
        // 3. Pequeña pausa antes de forzar el reinicio
        setTimeout(() => process.exit(1), 2000); 
    } catch (e) {
        res.status(500).send('Error al resetear: ' + e.message);
    }
});

app.get('/ping', (req, res) => res.status(200).send('pong'));

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta http-equiv="refresh" content="5">
            <title>Bot Saqsayki</title>
            <style>
                body { font-family: Arial; text-align: center; padding: 50px; }
                .qr { margin: 20px; border: 5px solid #25d366; border-radius: 10px; width: 300px; }
            </style>
        </head>
        <body>
            <h1>Bot Saqsayki - Estado</h1>
            <p><strong>${botStatus}</strong></p>
            ${qrCodeUrl ? `<img class="qr" src="${qrCodeUrl}" alt="QR">` : '<p>Si no ves QR, el bot se está conectando.</p>'}
            <br><a href="/reset">🔄 Forzar reinicio de sesión</a>
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
}

iniciarBot();
app.listen(PORT, () => console.log(`Servidor activo`));
