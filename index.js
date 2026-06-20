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
// BOTÓN DE RESETEO (Accede a /reset para limpiar la sesión)
// ============================================================
app.get('/reset', (req, res) => {
    if (fs.existsSync('sesion_whatsapp')) {
        fs.rmSync('sesion_whatsapp', { recursive: true, force: true });
        res.send('<h1>Sesión borrada. El bot se está reiniciando...</h1><p>Vuelve a <a href="/">inicio</a> en 5 segundos.</p>');
        setTimeout(() => process.exit(), 1000); // Esto reinicia el proceso en Render
    } else {
        res.send('No había archivos de sesión para borrar.');
    }
});

app.get('/ping', (req, res) => res.status(200).send('pong'));

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta http-equiv="refresh" content="3">
            <title>Bot Saqsayki</title>
            <style>
                body { font-family: Arial; text-align: center; padding: 50px; }
                .qr { margin: 20px; border: 5px solid #25d366; border-radius: 10px; width: 300px; }
            </style>
        </head>
        <body>
            <h1>Bot Saqsayki - Estado</h1>
            <p><strong>${botStatus}</strong></p>
            ${qrCodeUrl ? `<img class="qr" src="${qrCodeUrl}" alt="QR">` : '<p>Si no ves QR, el bot ya está conectado o reiniciando.</p>'}
            <br><a href="/reset">🔄 Forzar reinicio de sesión (si el bot no conecta)</a>
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
