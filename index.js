const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 10000;

let qrCodeUrl = '';
let botStatus = 'Iniciando...';

app.get('/', (req, res) => {
    res.send(`
        <meta http-equiv="refresh" content="2">
        <h1 style="text-align:center; font-family:sans-serif;">ESTADO: ${botStatus}</h1>
        <div style="text-align:center;">
            ${qrCodeUrl ? `<img src="${qrCodeUrl}" style="width:300px; border: 5px solid #25d366; border-radius: 10px;">` : '<h3>Cargando...</h3>'}
        </div>
    `);
});

async function iniciarBot() {
    try {
        const { version } = await fetchLatestBaileysVersion();
        // Cambiamos el nombre una última vez para saltar el historial roto que se quedó a medias
        const { state, saveCreds } = await useMultiFileAuthState('sesion_ENTREGA_FINAL'); 
        
        const sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            browser: ['Saqsayki Bot', 'Chrome', '1.0.0'],
            syncFullHistory: false, 
            markOnlineOnConnect: true,
            defaultQueryTimeoutMs: 60000, // 🔥 Le damos mucho más tiempo para que no de "Timed Out"
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 10000
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
                console.log("=========================================");
                console.log("¡BOT COMPLETAMENTE CONECTADO Y LISTO!");
                console.log("=========================================");
            }
            
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                if (statusCode !== DisconnectReason.loggedOut) {
                    botStatus = 'Reconectando...';
                    setTimeout(iniciarBot, 3000);
                } else {
                    botStatus = '❌ Sesión cerrada.';
                }
            }
        });

        sock.ev.on('messages.upsert', async (m) => {
            try {
                const msg = m.messages[0];
                if (!msg || !msg.message || msg.key.fromMe) return;
                
                const remite = msg.key.remoteJid;
                const texto = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim().toLowerCase();
                
                console.log("📩 MENSAJE RECIBIDO DE", remite, ":", texto); // Esto te confirmará en Render si lee
                
                if (texto === 'menu') {
                    await sock.sendMessage(remite, { text: "Bienvenido a Saqsayki.\n1. Horarios\n2. Precios\n3. Paquetes\n4. Ubicación\n5. Carta" });
                    console.log("✅ Respuesta 'menu' enviada!");
                }
            } catch (error) {
                console.log("Error al procesar mensaje:", error);
            }
        });

    } catch (error) {
        console.log("Error al iniciar:", error);
    }
}

// 🔥 ESTUDO ANTI-CAÍDAS: Evita que Render se apague si hay un error de "Timed Out"
process.on('uncaughtException', (err) => console.log('Error ignorado:', err));
process.on('unhandledRejection', (err) => console.log('Promesa ignorada:', err));

iniciarBot();
app.listen(PORT, () => console.log('Servidor activo en ' + PORT));
