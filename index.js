const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('🤖 Bot de Saqsayki - Esperando código limpio.');
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor web activo en puerto ${PORT}`);
});

let yaSolicitoCodigo = false;

async function iniciarBot() {
    // 🌟 CLAVE: Cambiamos el nombre a 'sesion_saqsayki' para resetear los archivos corruptos
    const { state, saveCreds } = await useMultiFileAuthState('sesion_saqsayki');

    let version = [2, 3000, 1015901307];
    try {
        const checkVersion = await fetchLatestBaileysVersion();
        if (checkVersion && checkVersion.version) {
            version = checkVersion.version;
        }
    } catch (err) {
        console.log('⚠️ Usando versión de respaldo.');
    }

    const sock = makeWASocket({
        auth: state,
        version: version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ['Ubuntu', 'Chrome', '20.0.04'] 
    });

    if (!sock.authState.creds.registered && !yaSolicitoCodigo) {
        yaSolicitoCodigo = true;
        setTimeout(async () => {
            try {
                const numeroTelefono = "51983838681"; 
                const codigo = await sock.requestPairingCode(numeroTelefono);
                
                console.log('\n==================================================');
                console.log(`🔑 TU CÓDIGO DE VINCULACIÓN ACTIVO ES: ${codigo}`);
                console.log('==================================================');
                console.log('Escríbelo rápido en tu celular en Dispositivos Vinculados.');
                console.log('==================================================\n');
            } catch (error) {
                console.log('❌ Ocurrió un parpadeo al generar el código, reintentando...');
                yaSolicitoCodigo = false;
            }
        }, 10000); // Le damos 10 segundos completos para que se estabilice la nueva sesión
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const codigoError = lastDisconnect?.error?.output?.statusCode;
            console.log(`❌ Conexión pausada (Código: ${codigoError}).`);
            
            if (codigoError !== DisconnectReason.loggedOut) {
                yaSolicitoCodigo = false; 
                console.log('🔄 Reestabilizando sistema en 8 segundos...');
                setTimeout(() => iniciarBot(), 8000); 
            }
        } else if (connection === 'open') {
            console.log('\n🎉 ¡CONEXIÓN EXITOSA! El bot de Saqsayki está en línea. 🎉\n');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.key.fromMe && m.type === 'notify') {
            const remite = msg.key.remoteJid;
            const textoRecibido = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
            const opcion = textoRecibido.trim().toLowerCase();

            const menuPrincipal = `✨ *¡Bienvenido al Parque Temático Saqsayki!* ✨\n\n¿En qué te puedo ayudar hoy? Elige una opción enviando el *número*:\n\n*1.* 🕒 Horarios y Mascotas\n*3.* 🎁 Paquetes Promocionales\n*4.* 📍 Ubicación`;

            if (opcion === '1') {
                await sock.sendMessage(remite, { text: `🕒 *Horarios:*\nLunes a Domingo de 9:00 AM a 5:30 PM.\n\n🐾 *Mascotas:*\n¡Somos Pet Friendly! (Con correa).` });
            } else if (opcion === '3') {
                await sock.sendMessage(remite, { text: `🎁 *Paquetes:*\n1️⃣ Familiar (4 personas + almuerzo).\n2️⃣ Aventurero (Ingreso + guiado).` });
            } else if (opcion === '4') {
                await sock.sendMessage(remite, { text: `📍 *Ubicación:*\nhttps://maps.google.com/?q=-16.4000,-71.5000` });
            } else {
                await sock.sendMessage(remite, { text: menuPrincipal });
            }
        }
    });
}

iniciarBot();
