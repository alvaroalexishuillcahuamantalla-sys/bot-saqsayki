const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');

// Servidor HTTP
const app = express();
const PORT = process.env.PORT || 10000;

// Variables globales
let qrCodeUrl = '';
let botStatus = 'Iniciando el bot, por favor espera...';
let sock = null;
let botNumber = '';

const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================
// MENÚ PRINCIPAL - Formato limpio y profesional
// ============================================================
async function enviarMenuTexto(remite) {
    const menuTexto = `
✨ *PARQUE TEMÁTICO SAQSAYKI* ✨

Vive una experiencia única llena de aventura, diversión y naturaleza.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 *Seleccione una opción escribiendo el número:*

1️⃣ *Horarios e ingreso*
2️⃣ *Precios unitarios de juegos*
3️⃣ *Paquetes promocionales*
4️⃣ *Cómo llegar*
5️⃣ *Restaurante*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 *Ejemplo:* Escriba *1* para ver los horarios

📌 *Comandos:* Escriba *menu* para ver este mensaje nuevamente

📍 *Saqsayki - Tu mejor experiencia*
`;

    await sock.sendMessage(remite, { text: menuTexto });
    console.log('✅ Menú enviado');
}

// ============================================================
// INFORMACIÓN ESPECÍFICA
// ============================================================
async function enviarInformacion(remite, opcion) {
    await esperar(1000);
    
    let texto = '';
    
    switch(opcion) {
        case '1':
            texto = `
🕒 *HORARIOS E INGRESO*

📅 Lunes a domingo (incluyendo feriados)
⏰ 9:30 a.m. a 5:30 p.m.

🎟️ *Precios de ingreso:*
• Adultos: S/ 7.00
• Niños: S/ 4.00

✅ *El ingreso incluye:*
• Mano Gigante del Inca
• Bosque Encantado de los Duendes
• Mano de Choclo de Oro
• Trilogía Andina
• Diversos miradores turísticos

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 Escriba *menu* para volver al inicio
`;
            break;
        case '2':
            texto = `
💰 *PRECIOS UNITARIOS DE JUEGOS*

🌊 *Juegos Acuáticos*
• Caminata en línea — S/ 5.00
• Puente acuático — S/ 5.00
• Tirolesa acuática — S/ 8.00
• Puente aéreo — S/ 8.00

⛰️ *Juegos de Altura*
• Columpio Extremo "Vuelo del Cóndor" — S/ 20.00
• Circuito de 21 obstáculos extremos — S/ 20.00

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 Escriba *menu* para volver al inicio
`;
            break;
        case '3':
            texto = `
🎒 *PAQUETES PROMOCIONALES*

💦 *Paquete Acuático* — S/ 25.00
• Entrada al parque
• Puente acuático
• Caminata en línea
• Tirolesa acuática
• Puente aéreo

🧗 *Paquete Aventurero* — S/ 35.00
• Entrada al parque
• Columpio extremo
• Circuito de 21 obstáculos
• Puente acuático

🔥 *Paquete Full* — S/ 45.00
• Entrada al parque
• Columpio extremo
• Circuito de 21 obstáculos
• Tirolesa acuática
• Caminata en línea
• Puente aéreo
• Puente acuático

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 Escriba *menu* para volver al inicio
`;
            break;
        case '4':
            texto = `
📍 *CÓMO LLEGAR A SAQSAYKI*

🚗 Nos encontramos aproximadamente a 30 minutos de Chicana Grande.

🚕 En taxi podrás llegar en aproximadamente 15 minutos desde Chicana Grande.

🗺️ *Google Maps:*
https://maps.google.com/?q=-16.4000,-71.5000

📞 *Taxis recomendados:*
926 050 769
991 972 382

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 Escriba *menu* para volver al inicio
`;
            break;
        case '5':
            texto = `
🍽️ *RESTAURANTE SAQSAYKI*

Muy pronto podrás visualizar nuestra carta completa.

📌 Solo realizamos reservas para días festivos y eventos especiales.

Para más información comuníquese con nuestro equipo de atención al cliente.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 Escriba *menu* para volver al inicio
`;
            break;
        default:
            texto = `
❌ *Opción no válida*

Por favor, seleccione una opción del 1 al 5.

Escriba *menu* para ver las opciones disponibles.
`;
    }
    
    await sock.sendMessage(remite, { text: texto });
}

// ============================================================
// LÓGICA PRINCIPAL DEL BOT
// ============================================================
async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('sesion_whatsapp');

    let version = [2, 3000, 1015901307]; 
    try {
        const checkVersion = await fetchLatestBaileysVersion();
        if (checkVersion && checkVersion.version) {
            version = checkVersion.version;
            console.log(`💻 Conectando con versión: ${version.join('.')}`);
        }
    } catch (err) {
        console.log('⚠️ Usando versión de respaldo.');
    }

    sock = makeWASocket({
        auth: state,
        version: version, 
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, 
        browser: ['Ubuntu', 'Chrome', '20.0.04'] 
    });

    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
            botStatus = '📱 Escanea el código QR con WhatsApp';
            console.log('🔄 QR generado');
        }

        if (connection === 'open') {
            qrCodeUrl = '';
            botStatus = '✅ Bot conectado y funcionando correctamente';
            console.log('🎉 Bot conectado exitosamente');
            
            if (sock.user) {
                botNumber = sock.user.id;
                console.log(`🤖 Número del bot: ${botNumber}`);
            }
        }
        
        if (connection === 'close') {
            const codigoError = lastDisconnect?.error?.output?.statusCode;
            const debeReconectar = codigoError !== DisconnectReason.loggedOut;
            
            console.log(`❌ Conexión cerrada.`);
            qrCodeUrl = '';
            
            if (debeReconectar) {
                botStatus = '🔄 Reconectando...';
                setTimeout(() => iniciarBot(), 7000);
            } else {
                botStatus = '❌ Sesión expirada - Escanea el QR nuevamente';
            }
        }
    });

    // Procesar mensajes
    sock.ev.on('messages.upsert', async (m) => {
        try {
            const msg = m.messages[0];
            
            if (!msg || !msg.message) return;
            if (msg.key.fromMe) return;
            
            const remite = msg.key.remoteJid;
            const esGrupo = remite.endsWith('@g.us');
            
            // ============================================
            // IGNORAR COMPLETAMENTE LOS MENSAJES DE GRUPOS
            // ============================================
            if (esGrupo) {
                console.log(`⏭️ Mensaje de grupo IGNORADO - El bot no responde en grupos`);
                return; // Salimos sin procesar el mensaje
            }
            
            // ============================================
            // SOLO PROCESAR MENSAJES DE CHAT PRIVADO
            // ============================================
            
            // Obtener el texto del mensaje
            let textoRecibido = 
                msg.message.conversation ||
                msg.message.extendedTextMessage?.text ||
                '';
            
            const opcion = textoRecibido.trim().toLowerCase();
            
            console.log(`💬 Mensaje privado recibido - Opción: ${opcion}`);
            
            // Procesar según la opción
            if (opcion === '1') {
                await enviarInformacion(remite, '1');
            }
            else if (opcion === '2') {
                await enviarInformacion(remite, '2');
            }
            else if (opcion === '3') {
                await enviarInformacion(remite, '3');
            }
            else if (opcion === '4') {
                await enviarInformacion(remite, '4');
            }
            else if (opcion === '5') {
                await enviarInformacion(remite, '5');
            }
            else if (opcion === 'menu' || opcion === 'hola' || opcion === 'info' || opcion === 'informacion' || 
                     opcion === 'buenas' || opcion === 'buenos dias' || opcion === 'buenas tardes' || opcion === 'buenas noches') {
                await enviarMenuTexto(remite);
            }
            else if (opcion.includes('horario')) {
                await enviarInformacion(remite, '1');
            }
            else if (opcion.includes('precio')) {
                await enviarInformacion(remite, '2');
            }
            else if (opcion.includes('paquete')) {
                await enviarInformacion(remite, '3');
            }
            else if (opcion.includes('ubicacion') || opcion.includes('ubicación') || opcion.includes('donde') || opcion.includes('llegar')) {
                await enviarInformacion(remite, '4');
            }
            else if (opcion.includes('restaurante')) {
                await enviarInformacion(remite, '5');
            }
            else {
                // Si no reconoce el comando, muestra el menú
                await enviarMenuTexto(remite);
            }
            
        } catch (error) {
            console.error('❌ Error:', error);
        }
    });
}

// Iniciar bot
iniciarBot();

// Panel web
app.get('/', (req, res) => {
    const autoReload = qrCodeUrl ? '<meta http-equiv="refresh" content="8">' : '';
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bot Saqsayki</title>
            <style>
                body { font-family: Arial; text-align: center; background: #f0f2f5; padding: 40px; }
                .card { background: white; padding: 30px; border-radius: 12px; max-width: 400px; margin: auto; }
                h1 { color: #075e54; }
                .status { background: #e3f2fd; padding: 10px; border-radius: 8px; margin: 20px 0; }
                img { max-width: 100%; border-radius: 8px; }
                .footer { margin-top: 20px; font-size: 12px; color: #777; }
            </style>
            ${autoReload}
        </head>
        <body>
            <div class="card">
                <h1>🤖 Bot Saqsayki</h1>
                <div class="status">${botStatus}</div>
                ${qrCodeUrl ? `<img src="${qrCodeUrl}" alt="QR Code"><p>Escanea con WhatsApp</p>` : '<p>✅ Bot activo - Solo responde en chats privados</p>'}
                <div class="footer">El bot NO responde en grupos de WhatsApp</div>
            </div>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`🌐 Web: http://localhost:${PORT}`);
});
