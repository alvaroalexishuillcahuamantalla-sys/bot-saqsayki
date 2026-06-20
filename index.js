const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 10000;

let qrCodeUrl = '';
let botStatus = 'Iniciando sistema...';

app.get('/', (req, res) => {
    res.send(`
        <meta http-equiv="refresh" content="2">
        <h1 style="text-align:center; font-family:sans-serif;">ESTADO: ${botStatus}</h1>
        <div style="text-align:center;">
            ${qrCodeUrl ? `<img src="${qrCodeUrl}" style="width:350px; border: 5px solid #25d366; border-radius: 10px;">` : '<h3>Cargando... espera unos segundos</h3>'}
        </div>
    `);
});

async function iniciarBot() {
    try {
        const { version } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState('sesion_FINAL_CLIENTE'); 
        
        const sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            browser: ['Saqsayki Bot', 'Chrome', '1.0.0'],
            syncFullHistory: false, // 🔥 LA SOLUCIÓN: No descargar historial viejo para evitar que colapse
            generateHighQualityLinkPreview: false // Ahorra memoria en Render
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', (update) => {
            const { connection, qr, lastDisconnect } = update;
            
            if (qr) {
                qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
                botStatus = '📱 ESCANEA EL QR AHORA';
            }
            
            if (connection === 'open') {
                qrCodeUrl = '';
                botStatus = '✅ CONECTADO Y LISTO';
            }
            
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                if (statusCode !== DisconnectReason.loggedOut) {
                    botStatus = 'Desconectado, reconectando rápido...';
                    setTimeout(iniciarBot, 2000);
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
            
            if (texto === 'menu') {
                await sock.sendMessage(remite, { text: "Bienvenido a Saqsayki.\n1. Horarios\n2. Precios\n3. Paquetes\n4. Ubicación\n5. Carta" });
            }
        });
    } catch (error) {
        console.log("Error al iniciar:", error);
    }
}

iniciarBot();
app.listen(PORT, () => console.log('Servidor activo en ' + PORT));
