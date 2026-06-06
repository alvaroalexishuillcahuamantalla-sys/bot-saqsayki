const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');
const axios = require('axios');

// Servidor HTTP
const app = express();
const PORT = process.env.PORT || 10000;

// Variables globales
let qrCodeUrl = '';
let botStatus = 'Iniciando el bot, por favor espera...';
let sock = null;
let botNumber = '';

// ============================================================
// CONFIGURACIÓN DE LA CARTA DEL RESTAURANTE
// ============================================================
// URL de la imagen de la carta (YA CONFIGURADA CON TU ENLACE)
const CARTA_URL = 'https://raw.githubusercontent.com/alvaroalexishuillcahuamantalla-sys/bot-saqsayki/main/carta.jpeg';

const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================
// FUNCIÓN PARA ENVIAR LA IMAGEN DE LA CARTA
// ============================================================
async function enviarCarta(remite) {
    try {
        const response = await axios.get(CARTA_URL, { 
            responseType: 'arraybuffer',
            timeout: 10000
        });
        
        await sock.sendMessage(remite, {
            image: Buffer.from(response.data),
            caption: `🍽️ *CARTA DEL RESTAURANTE SAQSAYKI*

Aquí está nuestra carta completa con todos nuestros platillos.

📌 *Nota:* Solo realizamos reservas para días festivos y eventos especiales.

¿Tienes alguna consulta? Escríbenos sin problema, estamos para ayudarte.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 Escriba *menu* para volver al inicio`
        });
        
        console.log('✅ Imagen de la carta enviada correctamente');
        
    } catch (error) {
        console.error('❌ Error al enviar la imagen:', error.message);
        
        await sock.sendMessage(remite, {
            text: `🍽️ *CARTA DEL RESTAURANTE SAQSAYKI*

📌 Lo sentimos, no pudimos cargar la imagen de la carta en este momento.

Por favor, inténtalo de nuevo más tarde o contáctanos directamente.

*Próximamente:* Estará disponible nuestra carta completa con todos los platillos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 Escriba *menu* para volver al inicio`
        });
    }
}

// ============================================================
// FUNCIÓN PARA OBTENER SALUDO SEGÚN LA HORA
// ============================================================
function obtenerSaludo() {
    const hora = new Date().getHours();
    
    if (hora >= 6 && hora < 12) {
        return "🌅 Buenos días";
    } else if (hora >= 12 && hora < 19) {
        return "🌤️ Buenas tardes";
    } else {
        return "🌙 Buenas noches";
    }
}

// ============================================================
// FUNCIÓN PARA OBTENER SALUDO SEGÚN LO QUE ESCRIBIÓ EL USUARIO
// ============================================================
function obtenerRespuestaSaludo(textoUsuario) {
    const texto = textoUsuario.toLowerCase();
    
    if (texto.includes('buenos dias') || texto.includes('buen dia') || texto === 'buenos dias' || texto === 'buen dia') {
        return "🌅 ¡Buenos días!";
    }
    else if (texto.includes('buenas tardes') || texto.includes('buena tarde') || texto === 'buenas tardes' || texto === 'buena tarde') {
        return "🌤️ ¡Buenas tardes!";
    }
    else if (texto.includes('buenas noches') || texto.includes('buena noche') || texto === 'buenas noches' || texto === 'buena noche') {
        return "🌙 ¡Buenas noches!";
    }
    else if (texto === 'hola') {
        return "👋 ¡Hola!";
    }
    else if (texto === 'buenas') {
        const hora = new Date().getHours();
        if (hora >= 6 && hora < 12) return "🌅 ¡Buenos días!";
        else if (hora >= 12 && hora < 19) return "🌤️ ¡Buenas tardes!";
        else return "🌙 ¡Buenas noches!";
    }
    
    return null;
}

// ============================================================
// MENÚ PRINCIPAL CON SALUDO PERSONALIZADO
// ============================================================
async function enviarMenuTexto(remite, saludoPersonalizado = null) {
    let saludo;
    
    if (saludoPersonalizado) {
        saludo = saludoPersonalizado;
    } else {
        saludo = obtenerSaludo();
    }
    
    const menuTexto = `
${saludo} ✨

*Bienvenido(a) al Parque Temático Saqsayki*

Vive una experiencia única llena de aventura, diversión y naturaleza.


📌 *Seleccione una opción escribiendo el número:*

1️⃣ *Horarios e ingreso*
2️⃣ *Precios unitarios de juegos*
3️⃣ *Paquetes promocionales*
4️⃣ *Cómo llegar*
5️⃣ *Restaurante* 🍽️ (Ver carta completa)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 *Ingrese una de las opciones*

📌 *Comandos:* Escriba *menu* para ver este mensaje nuevamente

📍 *Saqsayki - Tu mejor experiencia*
`;

    await sock.sendMessage(remite, { text: menuTexto });
    console.log('✅ Menú enviado con saludo:', saludo);
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


💬 Escriba *menu* para volver al inicio
`;
            break;
        case '4':
            texto = `
📍 *CÓMO LLEGAR A SAQSAYKI*

🏃‍♂️‍➡️ Nos encontramos aproximadamente a 30 minutos a pie desde la Chicana Grande.

🚕 En taxi podrás llegar en aproximadamente 15 minutos desde Chicana Grande.

🗺️ *Google Maps:*
https://maps.app.goo.gl/xrwjZyXT2iBeMiUr9

📞 *Taxis recomendados:*
926 050 769
991 972 382


💬 Escriba *menu* para volver al inicio
`;
            break;
        case '5':
            await enviarCarta(remite);
            return;
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
            
            // IGNORAR GRUPOS
            if (esGrupo) {
                return;
            }
            
            let textoRecibido = 
                msg.message.conversation ||
                msg.message.extendedTextMessage?.text ||
                '';
            
            const opcion = textoRecibido.trim().toLowerCase();
            
            console.log(`💬 Mensaje privado recibido: "${textoRecibido.substring(0, 50)}"`);
            
            const saludoRespuesta = obtenerRespuestaSaludo(textoRecibido);
            
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
            else if (opcion === 'menu' || opcion === 'info' || opcion === 'informacion') {
                await enviarMenuTexto(remite);
            }
            else if (saludoRespuesta) {
                await enviarMenuTexto(remite, saludoRespuesta);
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
            else if (opcion.includes('restaurante') || opcion.includes('comida') || opcion.includes('carta')) {
                await enviarInformacion(remite, '5');
            }
            else {
                await enviarMenuTexto(remite);
            }
            
        } catch (error) {
            console.error('❌ Error:', error);
        }
    });
}

// Iniciar bot
iniciarBot();

// ============================================================
// PANEL WEB
// ============================================================
app.get('/', (req, res) => {
    const autoReload = qrCodeUrl ? '<meta http-equiv="refresh" content="8">' : '';
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bot Saqsayki - Parque Temático</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; text-align: center; background: #f0f2f5; padding: 40px; margin: 0; }
                .card { background: white; padding: 30px; border-radius: 16px; max-width: 450px; margin: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                h1 { color: #075e54; margin-top: 0; font-size: 24px; }
                .status { background: #e3f2fd; padding: 12px; border-radius: 10px; margin: 20px 0; color: #0d47a1; font-weight: 500; }
                img { max-width: 100%; border-radius: 10px; margin-top: 10px; }
                .footer { margin-top: 25px; font-size: 12px; color: #777; }
                .btn { display: inline-block; padding: 10px 20px; background: #25d366; color: white; text-decoration: none; border-radius: 8px; margin-top: 15px; font-weight: bold; }
                .info { font-size: 13px; color: #555; margin-top: 15px; }
            </style>
            ${autoReload}
        </head>
        <body>
            <div class="card">
                <h1>🤖 Bot Saqsayki</h1>
                <div class="status">${botStatus}</div>
                ${qrCodeUrl ? `<img src="${qrCodeUrl}" alt="QR Code"><p>📱 Escanea con WhatsApp > Dispositivos vinculados</p>` : '<p>✅ Bot activo y funcionando</p>'}
                <div class="info">
                    📌 Opción 5: Envía la carta del restaurante con imagen<br>
                    🌅 Saludos personalizados según la hora
                </div>
                <a href="/" class="btn">🔄 Actualizar</a>
                <div class="footer">Parque Temático Saqsayki | Tu mejor experiencia</div>
            </div>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`🌐 Panel web disponible en: http://localhost:${PORT}`);
    console.log(`🚀 Bot iniciado y esperando conexión...`);
});
