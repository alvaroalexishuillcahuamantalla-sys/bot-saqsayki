const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');

// Servidor HTTP para Render y Panel Web
const app = express();
const PORT = process.env.PORT || 10000;

// Variables globales para controlar el estado y el QR en la web
let qrCodeUrl = '';
let botStatus = 'Iniciando el bot, por favor espera...';
let sock = null;

// Número del bot (se actualizará cuando conecte)
let botNumber = '';

// Hace que el bot responda de forma más natural
const esperar = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

// Función para enviar mensaje con botones interactivos
async function enviarMenuConBotones(remite, esGrupo = false) {
    const menuTexto = `✨ *PARQUE TEMÁTICO SAQSAYKI* ✨\n\n🏞️ Vive una experiencia única llena de aventura, diversión y naturaleza.\n\nSeleccione una opción:`;

    const botones = [
        { buttonId: 'opcion_1', buttonText: { displayText: '🕒 Horarios e ingreso' }, type: 1 },
        { buttonId: 'opcion_2', buttonText: { displayText: '💰 Precios unitarios' }, type: 1 },
        { buttonId: 'opcion_3', buttonText: { displayText: '🎒 Paquetes promocionales' }, type: 1 },
        { buttonId: 'opcion_4', buttonText: { displayText: '📍 Cómo llegar' }, type: 1 },
        { buttonId: 'opcion_5', buttonText: { displayText: '🍽️ Restaurante' }, type: 1 }
    ];

    await sock.sendMessage(remite, {
        text: menuTexto,
        buttons: botones,
        headerType: 1
    });
}

// Función para enviar información específica según opción
async function enviarInformacion(remite, opcion) {
    await esperar(1000);
    
    let texto = '';
    
    switch(opcion) {
        case '1':
            texto = `🕒 *HORARIOS E INGRESO*\n\n📅 Lunes a domingo (incluyendo feriados)\n\n⏰ 9:30 a.m. a 5:30 p.m.\n\n🎟️ Ingreso:\n\n👨 Adultos: S/ 7.00\n👦 Niños: S/ 4.00\n\nIncluye:\n✅ Mano Gigante del Inca\n✅ Bosque Encantado de los Duendes\n✅ Mano de Choclo de Oro\n✅ Trilogía Andina\n✅ Diversos miradores turísticos`;
            break;
        case '2':
            texto = `💰 *PRECIOS UNITARIOS DE JUEGOS*\n\n🌊 Juegos Acuáticos\n• Caminata en línea — S/ 5.00\n• Puente acuático — S/ 5.00\n• Tirolesa acuática — S/ 8.00\n• Puente aéreo — S/ 8.00\n\n━━━━━━━━━━━━━━━\n\n⛰️ Juegos de Altura\n• Columpio Extremo "Vuelo del Cóndor" — S/ 20.00\n• Circuito de 21 obstáculos extremos — S/ 20.00`;
            break;
        case '3':
            texto = `🎒 *PAQUETES PROMOCIONALES*\n\n💦 *PAQUETE ACUÁTICO* — S/ 25.00\n✅ Entrada al parque\n✅ Puente acuático\n✅ Caminata en línea\n✅ Tirolesa acuática\n✅ Puente aéreo\n\n━━━━━━━━━━━━━━━\n\n🧗 *PAQUETE AVENTURERO* — S/ 35.00\n✅ Entrada al parque\n✅ Columpio extremo\n✅ Circuito de 21 obstáculos\n✅ Puente acuático\n\n━━━━━━━━━━━━━━━\n\n🔥 *PAQUETE FULL* — S/ 45.00\n✅ Entrada al parque\n✅ Columpio extremo\n✅ Circuito de 21 obstáculos\n✅ Tirolesa acuática\n✅ Caminata en línea\n✅ Puente aéreo\n✅ Puente acuático`;
            break;
        case '4':
            texto = `📍 *¿CÓMO LLEGAR A SAQSAYKI?*\n\n🚗 Nos encontramos aproximadamente a 30 minutos de Chicana Grande.\n\n🚕 En taxi podrás llegar en aproximadamente 15 minutos desde Chicana Grande.\n\n🗺️ Google Maps:\nhttps://maps.google.com/?q=-16.4000,-71.5000\n\n📞 Taxis recomendados:\n926050769\n991972382`;
            break;
        case '5':
            texto = `🍽️ *Restaurante Saqsayki*\n\nMuy pronto podrás visualizar nuestra carta completa.\n\n📌 Solo realizamos reservas para días festivos.\n\nPara más información comuníquese con nuestro equipo.`;
            break;
        default:
            texto = `✨ *Bienvenido(a) al Parque Temático Saqsayki!* ✨\n\nEscribe *menu* para ver todas las opciones disponibles.`;
    }
    
    await sock.sendMessage(remite, { text: texto });
}

// Lógica principal del Bot
async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('sesion_whatsapp');

    let version = [2, 3000, 1015901307]; 
    try {
        const checkVersion = await fetchLatestBaileysVersion();
        if (checkVersion && checkVersion.version) {
            version = checkVersion.version;
            console.log(`💻 Conectando con versión de WhatsApp Web: ${version.join('.')}`);
        }
    } catch (err) {
        console.log('⚠️ Usando versión de respaldo para WhatsApp Web.');
    }

    sock = makeWASocket({
        auth: state,
        version: version, 
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, 
        browser: ['Ubuntu', 'Chrome', '20.0.04'] 
    });

    // Guardar credenciales
    sock.ev.on('creds.update', saveCreds);
    
    // Obtener el número del bot cuando esté autenticado
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (connection === 'open') {
            // Obtener el número del bot
            const authInfo = sock.authState.creds;
            if (authInfo && authInfo.me) {
                botNumber = authInfo.me.id;
                console.log(`🤖 Número del bot: ${botNumber}`);
            }
        }
    });

    // Manejo de estados de la conexión
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
            botStatus = '¡Código QR listo! Escanéalo con tu teléfono en WhatsApp > Dispositivos Vinculados.';
            console.log('\n🔄 Nuevo código QR generado y expuesto en la web de Render.');
        }

        if (connection === 'close') {
            const codigoError = lastDisconnect?.error?.output?.statusCode;
            const razon = lastDisconnect?.error?.message || 'Desconocida';
            
            const debeReconectar = codigoError !== DisconnectReason.loggedOut;
            
            console.log(`❌ Conexión cerrada. Código: ${codigoError} | Razón: ${razon}`);
            qrCodeUrl = ''; 
            
            if (debeReconectar) {
                botStatus = '🔄 Conexión interrumpida. Intentando reconectar automáticamente...';
                console.log('🔄 Intentando reconectar en 7 segundos...');
                setTimeout(() => iniciarBot(), 7000); 
            } else {
                botStatus = '❌ Sesión expirada o cerrada por el usuario. Escanea el código QR nuevamente.';
                console.log('⚠️ La sesión se eliminó permanentemente.');
            }
        } else if (connection === 'open') {
            qrCodeUrl = ''; 
            botStatus = '🎉 ¡CONEXIÓN EXITOSA! El bot de Saqsayki está en línea.';
            console.log('\n🎉 ¡CONEXIÓN EXITOSA! El bot está listo. 🎉\n');
        }
    });

    // Escucha y respuesta automática de mensajes
    sock.ev.on('messages.upsert', async (m) => {
        try {
            const msg = m.messages[0];
            
            if (!msg || !msg.message) return;
            if (msg.key.fromMe) return;
            
            const remite = msg.key.remoteJid;
            const esGrupo = remite.endsWith('@g.us');
            
            // Obtener el texto del mensaje
            let textoRecibido = 
                msg.message.conversation ||
                msg.message.extendedTextMessage?.text ||
                msg.message.buttonsResponseMessage?.selectedButtonId ||
                msg.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
                '';
            
            // Obtener el ID del botón presionado (si viene de un botón)
            let opcion = '';
            
            // Si es respuesta de botón
            if (msg.message.buttonsResponseMessage) {
                opcion = msg.message.buttonsResponseMessage.selectedButtonId || '';
            } else {
                opcion = textoRecibido.trim().toLowerCase();
            }
            
            console.log(`📩 Mensaje recibido - Grupo: ${esGrupo} - Contenido: ${opcion || textoRecibido.substring(0, 30)}`);
            
            // Verificar si el mensaje menciona al bot (para grupos)
            let mencionaBot = false;
            if (esGrupo) {
                // Verificar si el mensaje tiene menciones
                const mentionedJid = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                mencionaBot = mentionedJid.includes(botNumber);
                
                // También verificar si el texto contiene @ o el nombre del bot
                const textoLower = textoRecibido.toLowerCase();
                if (textoLower.includes('@') || textoLower.includes('bot') || textoLower.includes('saqsayki')) {
                    mencionaBot = true;
                }
            }
            
            // === MANEJO DE GRUPOS ===
            if (esGrupo) {
                // Solo responder en grupos si:
                // 1. El mensaje menciona al bot, O
                // 2. El usuario escribe comandos específicos (menu, hola, etc)
                
                const comandosGrupo = ['menu', 'hola', 'info', 'horario', 'precio', 'paquete', 'ubicacion', '1', '2', '3', '4', '5'];
                const esComando = comandosGrupo.includes(opcion);
                
                if (mencionaBot || esComando) {
                    console.log(`📢 Respondiendo en grupo - Menciona: ${mencionaBot}, Comando: ${esComando}`);
                    
                    if (opcion === 'menu' || opcion === 'hola' || opcion === 'info') {
                        await enviarMenuConBotones(remite, true);
                    } else if (opcion === '1' || opcion === 'opcion_1') {
                        await enviarInformacion(remite, '1');
                    } else if (opcion === '2' || opcion === 'opcion_2') {
                        await enviarInformacion(remite, '2');
                    } else if (opcion === '3' || opcion === 'opcion_3') {
                        await enviarInformacion(remite, '3');
                    } else if (opcion === '4' || opcion === 'opcion_4') {
                        await enviarInformacion(remite, '4');
                    } else if (opcion === '5' || opcion === 'opcion_5') {
                        await enviarInformacion(remite, '5');
                    } else if (opcion.includes('horario')) {
                        await enviarInformacion(remite, '1');
                    } else if (opcion.includes('precio')) {
                        await enviarInformacion(remite, '2');
                    } else if (opcion.includes('paquete')) {
                        await enviarInformacion(remite, '3');
                    } else if (opcion.includes('ubicacion') || opcion.includes('donde') || opcion.includes('llegar')) {
                        await enviarInformacion(remite, '4');
                    } else if (opcion.includes('restaurante')) {
                        await enviarInformacion(remite, '5');
                    }
                } else {
                    // No responder en grupos si no mencionan al bot
                    console.log(`⏭️ Ignorando mensaje de grupo (sin mención al bot)`);
                }
                return;
            }
            
            // === MANEJO DE CHAT PRIVADO ===
            // Responder a cualquier mensaje en privado
            
            // Respuesta para botones
            if (opcion === 'opcion_1') {
                await enviarInformacion(remite, '1');
            } else if (opcion === 'opcion_2') {
                await enviarInformacion(remite, '2');
            } else if (opcion === 'opcion_3') {
                await enviarInformacion(remite, '3');
            } else if (opcion === 'opcion_4') {
                await enviarInformacion(remite, '4');
            } else if (opcion === 'opcion_5') {
                await enviarInformacion(remite, '5');
            }
            // Respuesta para comandos de texto
            else if (opcion === '1') {
                await enviarInformacion(remite, '1');
            } else if (opcion === '2') {
                await enviarInformacion(remite, '2');
            } else if (opcion === '3') {
                await enviarInformacion(remite, '3');
            } else if (opcion === '4') {
                await enviarInformacion(remite, '4');
            } else if (opcion === '5') {
                await enviarInformacion(remite, '5');
            } 
            else if (
                opcion === 'hola' ||
                opcion === 'buenas' ||
                opcion === 'buenos dias' ||
                opcion === 'buenas tardes' ||
                opcion === 'buenas noches' ||
                opcion === 'info' ||
                opcion === 'informacion' ||
                opcion === 'menu'
            ) {
                await enviarMenuConBotones(remite, false);
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
            else if (opcion.includes('ubicacion') || opcion.includes('ubicación') || opcion.includes('donde') || opcion.includes('dónde') || opcion.includes('llegar')) {
                await enviarInformacion(remite, '4');
            }
            else if (opcion.includes('restaurante')) {
                await enviarInformacion(remite, '5');
            }
            else {
                // Mensaje no reconocido: mostrar menú
                await enviarMenuConBotones(remite, false);
            }
            
        } catch (error) {
            console.error('❌ Error interno procesando mensaje:', error);
        }
    });
}

// Inicializar el bot
iniciarBot();

// --- PANEL WEB INTERFAZ ---
app.get('/', (req, res) => {
    const autoReloadScript = qrCodeUrl ? `
        <script>
            setInterval(function() {
                window.location.reload();
            }, 8000);
        </script>
    ` : '';
    
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bot Saqsayki - Panel de Control</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; background-color: #f0f2f5; margin: 0; padding: 40px; color: #333; }
                .card { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); display: inline-block; max-width: 450px; width: 100%; }
                h1 { color: #075e54; margin-top: 0; }
                .status { font-size: 1.1em; margin: 20px 0; padding: 10px; background-color: #e3f2fd; border-radius: 8px; color: #0d47a1; font-weight: 500; }
                img { margin-top: 15px; border: 4px solid #fff; box-shadow: 0 2px 10px rgba(0,0,0,0.15); border-radius: 8px; max-width: 100%; }
                .footer { margin-top: 25px; font-size: 0.85em; color: #777; }
                .btn { display: inline-block; padding: 10px 20px; background-color: #25d366; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 15px; }
                .info { background-color: #e8f5e9; padding: 10px; border-radius: 8px; margin: 15px 0; font-size: 0.9em; }
            </style>
            ${autoReloadScript}
        </head>
        <body>
            <div class="card">
                <h1>Bot Saqsayki 🤖</h1>
                <div class="status">${botStatus}</div>
                
                ${qrCodeUrl ? `
                    <p>Abre WhatsApp > Dispositivos vinculados > Vincular un dispositivo:</p>
                    <img src="${qrCodeUrl}" alt="Código QR de WhatsApp" />
                ` : `
                    <div class="info">
                        ✅ Bot conectado y funcionando correctamente.<br>
                        📱 Escanea el código QR si ves la pantalla de reconexión.
                    </div>
                `}
                
                <br>
                <a href="/" class="btn">Actualizar Estado</a>
                <div class="footer">Bot con botones interactivos | Saqsayki</div>
            </div>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor web escuchando en el puerto ${PORT}`);
});
