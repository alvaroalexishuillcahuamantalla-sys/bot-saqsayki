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
            ${qrCodeUrl ? `<img src="${qrCodeUrl}" style="width:300px; border: 5px solid #25d366; border-radius: 10px;">` : '<h3>Cargando... o el bot ya está conectado</h3>'}
        </div>
    `);
});

async function iniciarBot() {
    try {
        const { version } = await fetchLatestBaileysVersion();
        // Mantiene la sesión activa
        const { state, saveCreds } = await useMultiFileAuthState('sesion_activa_bot'); 
        
        const sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            browser: ['Saqsayki Bot', 'Chrome', '1.0.0'],
            syncFullHistory: false, 
            markOnlineOnConnect: true,
            defaultQueryTimeoutMs: 60000, 
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
                botStatus = '✅ CONECTADO Y LISTO. SESIÓN GUARDADA.';
            }
            
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                if (statusCode !== DisconnectReason.loggedOut) {
                    botStatus = 'Reconectando automáticamente...';
                    setTimeout(iniciarBot, 3000);
                } else {
                    botStatus = '❌ Sesión cerrada desde el celular.';
                }
            }
        });

        sock.ev.on('messages.upsert', async (m) => {
            try {
                const msg = m.messages[0];
                if (!msg || !msg.message || msg.key.fromMe) return;
                
                const remite = msg.key.remoteJid;

                // BLOQUEO DE GRUPOS: Si el ID termina en @g.us, ignoramos
                if (remite.endsWith('@g.us')) {
                    return; 
                }
                
                const texto = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim().toLowerCase();
                
                // FORMATO ORIGINAL SOLICITADO
                if (texto === 'menu' || texto === 'menú' || texto === 'hola') {
                    await sock.sendMessage(remite, { 
                        text: "Bienvenido a Saqsayki.\n1. Horarios\n2. Precios\n3. Paquetes\n4. Ubicación\n5. Carta" 
                    });
                }
            } catch (error) {
                console.log("Error al procesar mensaje:", error);
            }
        });

    } catch (error) {
        console.log("Error al iniciar:", error);
    }
}

process.on('uncaughtException', (err) => console.log('Error ignorado:', err));
process.on('unhandledRejection', (err) => console.log('Promesa ignorada:', err));

iniciarBot();
app.listen(PORT, () => console.log('Servidor activo en ' + PORT));
