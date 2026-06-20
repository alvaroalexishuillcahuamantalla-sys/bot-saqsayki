const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 10000;

let qrCodeUrl = '';
let botStatus = 'Iniciando sistema de emergencia...';

app.get('/', (req, res) => {
    res.send(`
        <meta http-equiv="refresh" content="2">
        <h1 style="text-align:center; font-family:sans-serif;">ESTADO: ${botStatus}</h1>
        <div style="text-align:center;">
            ${qrCodeUrl ? `<img src="${qrCodeUrl}" style="width:350px; border: 5px solid #25d366; border-radius: 10px;">` : '<h3>Cargando QR... espera unos segundos</h3>'}
        </div>
    `);
});

async function iniciarBot() {
    // ESTO FUERZA UNA SESIÓN 100% NUEVA
    const { state, saveCreds } = await useMultiFileAuthState('sesion_URGENTE_123'); 
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true, 
        browser: ['Saqsayki URGENTE', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, qr } = update;
        
        if (qr) {
            qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
            botStatus = '📱 ESCANEA EL QR AHORA';
        }
        
        if (connection === 'open') {
            qrCodeUrl = '';
            botStatus = '✅ CONECTADO Y LISTO';
        }
        
        if (connection === 'close') {
            botStatus = 'Desconectado, reiniciando...';
            setTimeout(iniciarBot, 4000);
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
}

iniciarBot();
app.listen(PORT, () => console.log('Servidor activo en ' + PORT));
