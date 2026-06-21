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
            ${qrCodeUrl ? `<img src="${qrCodeUrl}" style="width:300px; border: 5px solid #25d366; border-radius: 10px;">` : '<h3>Sistema activo.</h3>'}
        </div>
    `);
});

async function iniciarBot() {
    try {
        const { version } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState('sesion_activa_bot'); 
        
        const sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            browser: ['Saqsayki Bot', 'Chrome', '1.0.0'],
            syncFullHistory: false, // 🔥 IGNORA HISTORIAL VIEJO (Crucial para Render)
            defaultQueryTimeoutMs: 60000, 
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 10000
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', (update) => {
            const { connection, qr, lastDisconnect } = update;
            
            if (qr) {
                qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
                botStatus = '📱 ESCANEA EL QR';
            }
            
            if (connection === 'open') {
                qrCodeUrl = '';
                botStatus = '✅ CONECTADO Y LISTO';
            }
            
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                if (statusCode !== DisconnectReason.loggedOut) {
                    setTimeout(iniciarBot, 3000);
                }
            }
        });

        sock.ev.on('messages.upsert', async (m) => {
            try {
                const msg = m.messages[0];
                if (!msg || !msg.message || msg.key.fromMe) return;
                
                const remite = msg.key.remoteJid;
                
                // BLOQUEO DE GRUPOS
                if (remite.endsWith('@g.us')) return; 
                
                const texto = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim().toLowerCase();

                // LÓGICA DE MENSAJES
                if (texto === 'menu' || texto === 'menú' || texto === 'hola' || texto === '1' || texto === '2' || texto === '3' || texto === '4' || texto === '5') {
                    
                    if (texto === 'menu' || texto === 'menú' || texto === 'hola') {
                        await sock.sendMessage(remite, { text: `¡Buenas noches! ✨\n\nBienvenido(a) al Parque Temático Saqsayki\n\nVive una experiencia única llena de aventura, diversión y naturaleza.\n\n📌 Seleccione una opción escribiendo el número:\n\n1️⃣ Horarios e ingreso\n2️⃣ Precios unitarios de juegos\n3️⃣ Paquetes promocionales\n4️⃣ Cómo llegar\n5️⃣ Restaurante 🍽️ (Ver carta completa)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Ingrese una de las opciones\n\n📌 Comandos: Escriba menu para ver este mensaje nuevamente\n\n📍 Saqsayki - Tu mejor experiencia` });
                    } 
                    else if (texto === '1') {
                        await sock.sendMessage(remite, { text: "🕒 HORARIOS E INGRESO\n\n📅 Lunes a domingo (incluyendo feriados)\n⏰ 9:30 a.m. a 5:30 p.m.\n\n🎟️ Precios de ingreso:\n* Adultos: S/ 7.00\n* Niños: S/ 4.00\n\n✅ El ingreso incluye:\n* Mano Gigante del Inca\n* Bosque Encantado de los Duendes\n* Mano de Choclo de Oro\n* Trilogía Andina\n* Diversos miradores turísticos\n\n\n💬 Escriba menu para volver al inicio" });
                    }
                    else if (texto === '2') {
                        await sock.sendMessage(remite, { text: "💰 PRECIOS UNITARIOS DE JUEGOS\n\n🌊 Juegos Acuáticos\n* Caminata en línea — S/ 5.00\n* Puente acuático — S/ 5.00\n* Tirolesa acuática — S/ 8.00\n* Puente aéreo — S/ 8.00\n\n⛰️ Juegos de Altura\n* Columpio Extremo \"Vuelo del Cóndor\" — S/ 20.00\n* Circuito de 21 obstáculos extremos — S/ 20.00\n\n\n💬 Escriba menu para volver al inicio" });
                    }
                    else if (texto === '3') {
                        await sock.sendMessage(remite, { text: "🎒 PAQUETES PROMOCIONALES\n\n💦 Paquete Acuático — S/ 25.00\n* Entrada al parque\n* Puente acuático\n* Caminata en línea\n* Tirolesa acuática\n* Puente aéreo\n\n🧗 Paquete Aventurero — S/ 35.00\n* Entrada al parque\n* Columpio extremo\n* Circuito de 21 obstáculos\n* Puente acuático\n\n🔥 Paquete Full — S/ 45.00\n* Entrada al parque\n* Columpio extremo\n* Circuito de 21 obstáculos\n* Tirolesa acuática\n* Caminata en línea\n* Puente aéreo\n* Puente acuático\n\n\n💬 Escriba menu para volver al inicio" });
                    }
                    else if (texto === '4') {
                        await sock.sendMessage(remite, { text: "📍 CÓMO LLEGAR A SAQSAYKI\n\n🏃‍♂️‍➡️ Nos encontramos aproximadamente a 30 minutos a pie desde la Chicana Grande.\n\n🚕 En taxi podrás llegar en aproximadamente 15 minutos desde Chicana Grande.\n\n🗺️ Google Maps:\nhttps://maps.app.goo.gl/xrwjZyXT2iBeMiUr9\n\n📞 Taxis recomendados:\n926 050 769\n991 972 382\n\n\n💬 Escriba menu para volver al inicio" });
                    }
                    else if (texto === '5') {
                        // 🔥 AQUÍ VA LA IMAGEN DEL RESTAURANTE
                        await sock.sendMessage(remite, { 
                            image: { url: '' }, 
                            caption: "🍽️ CARTA DEL RESTAURANTE SAQSAYKI\n\nAquí está nuestra carta completa con todos nuestros platillos.\n\n📌 Nota: Solo realizamos reservas para días festivos y eventos especiales.\n\n¿Tienes alguna consulta? Escríbenos sin problema, estamos para ayudarte.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💬 Escriba menu para volver al inicio" 
                        });
                    }
                }
            } catch (error) {
                console.log("Error:", error);
            }
        });

    } catch (error) {
        console.log("Error crítico:", error);
    }
}

process.on('uncaughtException', (err) => console.log('Error:', err));
process.on('unhandledRejection', (err) => console.log('Error:', err));

iniciarBot();
app.listen(PORT, () => console.log('Servidor activo'));
