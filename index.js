const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');
const axios = require('axios');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

// Variables globales
let qrCodeUrl = '';
let botStatus = 'Iniciando el bot...';
let sock = null;

// URL de la imagen
const CARTA_URL = 'https://raw.githubusercontent.com/alvaroalexishuillcahuamantalla-sys/bot-saqsayki/main/carta.jpeg';

const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================
// FUNCIONES DE MENSAJES (MANTENIDAS TAL CUAL)
// ============================================================
async function enviarCarta(remite) {
    try {
        const response = await axios.get(CARTA_URL, { responseType: 'arraybuffer', timeout: 10000 });
        await sock.sendMessage(remite, {
            image: Buffer.from(response.data),
            caption: `🍽️ *CARTA DEL RESTAURANTE SAQSAYKI*

Aquí está nuestra carta completa con todos nuestros platillos.

📌 *Nota:* Solo realizamos reservas para días festivos y eventos especiales.

¿Tienes alguna consulta? Escríbenos sin problema, estamos para ayudarte.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 Escriba *menu* para volver al inicio`
        });
        console.log('✅ Imagen de la carta enviada');
    } catch (error) {
        console.error('❌ Error al enviar la imagen:', error.message);
        await sock.sendMessage(remite, {
            text: `🍽️ *CARTA DEL RESTAURANTE SAQSAYKI*

📌 Lo sentimos, no pudimos cargar la imagen en este momento.

*Próximamente:* Estará disponible nuestra carta completa.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 Escriba *menu* para volver al inicio`
        });
    }
}

function obtenerSaludo() {
    const hora = new Date().getHours();
    if (hora >= 6 && hora < 12) return "🌅 Buenos días";
    if (hora >= 12 && hora < 19) return "🌤️ Buenas tardes";
    return "🌙 Buenas noches";
}

function obtenerRespuestaSaludo(textoUsuario) {
    const texto = textoUsuario.toLowerCase();
    if (texto.includes('buenos dias') || texto.includes('buen dia')) return "🌅 ¡Buenos días!";
    if (texto.includes('buenas tardes') || texto.includes('buena tarde')) return "🌤️ ¡Buenas tardes!";
    if (texto.includes('buenas noches') || texto.includes('buena noche')) return "🌙 ¡Buenas noches!";
    if (texto === 'hola') return "👋 ¡Hola!";
    if (texto === 'buenas') {
        const hora = new Date().getHours();
        return hora < 12 ? "🌅 ¡Buenos días!" : (hora < 19 ? "🌤️ ¡Buenas tardes!" : "🌙 ¡Buenas noches!");
    }
    return null;
}

async function enviarMenuTexto(remite, saludoPersonalizado = null) {
    const saludo = saludoPersonalizado || obtenerSaludo();
    const menuTexto = `${saludo} ✨

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

📍 *Saqsayki - Tu mejor experiencia*`;

    await sock.sendMessage(remite, { text: menuTexto });
}

async function enviarInformacion(remite, opcion) {
    await esperar(1000);
    let texto = '';
    switch(opcion) {
        case '1': texto = `🕒 *HORARIOS E INGRESO*\n\n📅 Lunes a domingo (incluyendo feriados)\n⏰ 9:30 a.m. a 5:30 p.m.\n\n🎟️ *Precios de ingreso:*\n• Adultos: S/ 7.00\n• Niños: S/ 4.00\n\n✅ *El ingreso incluye:*\n• Mano Gigante del Inca\n• Bosque Encantado de los Duendes\n• Mano de Choclo de Oro\n• Trilogía Andina\n• Diversos miradores turísticos\n\n💬 Escriba *menu* para volver al inicio`; break;
        case '2': texto = `💰 *PRECIOS UNITARIOS DE JUEGOS*\n\n🌊 *Juegos Acuáticos*\n• Caminata en línea — S/ 5.00\n• Puente acuático — S/ 5.00\n• Tirolesa acuática — S/ 8.00\n• Puente aéreo — S/ 8.00\n\n⛰️ *Juegos de Altura*\n• Columpio Extremo "Vuelo del Cóndor" — S/ 20.00\n• Circuito de 21 obstáculos extremos — S/ 20.00\n\n💬 Escriba *menu* para volver al inicio`; break;
        case '3': texto = `🎒 *PAQUETES PROMOCIONALES*\n\n💦 *Paquete Acuático* — S/ 25.00\n• Entrada al parque, Puente acuático, Caminata, Tirolesa, Puente aéreo\n\n🧗 *Paquete Aventurero* — S/ 35.00\n• Entrada, Columpio extremo, Circuito 21 obstáculos, Puente acuático\n\n🔥 *Paquete Full* — S/ 45.00\n• Todo incluido\n\n💬 Escriba *menu* para volver al inicio`; break;
        case '4': texto = `📍 *CÓMO LLEGAR A SAQSAYKI*\n\n🏃‍♂️‍➡️ Aproximadamente 30 min a pie desde Chicana Grande.\n🚕 15 min en taxi.\n\n🗺️ *Google Maps:* https://maps.app.goo.gl/xrwjZyXT2iBeMiUr9\n📞 *Taxis recomendados:* 926 050 769 | 991 972 382\n\n💬 Escriba *menu* para volver al inicio`; break;
        case '5': await enviarCarta(remite); return;
        default: texto = `❌ *Opción no válida*\n\nPor favor, seleccione una opción del 1 al 5.`;
    }
    await sock.sendMessage(remite, { text: texto });
}

// ============================================================
// LÓGICA DE CONEXIÓN ROBUSTA
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

        if (qr) {
            qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
            botStatus = '📱 Escanea el código QR';
        }

        if (connection === 'open') {
            qrCodeUrl = '';
            botStatus = '✅ Bot conectado';
            console.log('🎉 Bot online');
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('❌ Conexión cerrada. Reconectando...');
            if (shouldReconnect) {
                setTimeout(iniciarBot, 5000);
            } else {
                console.log('⚠️ Sesión cerrada. Debes eliminar la carpeta "sesion_whatsapp" y reiniciar.');
            }
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg || !msg.message || msg.key.fromMe) return;

        const remite = msg.key.remoteJid;
        if (remite.endsWith('@g.us')) return;

        const textoRecibido = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const opcion = textoRecibido.trim().toLowerCase();

        const saludoRespuesta = obtenerRespuestaSaludo(textoRecibido);

        if (['1','2','3','4','5'].includes(opcion)) await enviarInformacion(remite, opcion);
        else if (opcion === 'menu' || opcion === 'info') await enviarMenuTexto(remite);
        else if (saludoRespuesta) await enviarMenuTexto(remite, saludoRespuesta);
        else if (opcion.includes('horario')) await enviarInformacion(remite, '1');
        else if (opcion.includes('precio')) await enviarInformacion(remite, '2');
        else if (opcion.includes('paquete')) await enviarInformacion(remite, '3');
        else if (opcion.includes('llegar') || opcion.includes('ubicacion')) await enviarInformacion(remite, '4');
        else if (opcion.includes('restaurante') || opcion.includes('carta')) await enviarInformacion(remite, '5');
        else await enviarMenuTexto(remite);
    });
}

iniciarBot();

app.get('/', (req, res) => {
    res.send(`<html><head><meta http-equiv="refresh" content="5"></head><body><h1>Bot Saqsayki</h1><p>${botStatus}</p>${qrCodeUrl ? `<img src="${qrCodeUrl}">` : ''}</body></html>`);
});

app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));
