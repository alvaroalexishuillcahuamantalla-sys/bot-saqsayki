const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');

const app = express();
const PORT = process.env.PORT || 10000;

// Variables globales para controlar el flujo desde la web
let qrCodeUrl = '';
let botStatus = 'Iniciando el bot, por favor espera...';

async function iniciarBot() {
    // Usamos tu carpeta de sesión personalizada
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
        printQRInTerminal: false, // Desactivamos el QR de la consola para usar la web
        browser: ['Ubuntu', 'Chrome', '20.0.04'] 
    });

    sock.ev.on('creds.update', saveCreds);

    // Escuchamos el estado de la conexión y la generación de QR
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        // 🌟 CAPTURA EL QR: Si Baileys genera un QR, lo convertimos en imagen para la web
        if (qr) {
            qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
            botStatus = '¡Código QR listo! Escanéalo con tu teléfono en WhatsApp > Dispositivos Vinculados.';
            console.log('🔄 Nuevo código QR generado y expuesto en la web.');
        }

        if (connection === 'close') {
            const codigoError = lastDisconnect?.error?.output?.statusCode;
            console.log(`❌ Conexión pausada (Código: ${codigoError}).`);
            qrCodeUrl = ''; // Limpiamos el QR anterior si se cae
            
            if (codigoError !== DisconnectReason.loggedOut) {
                botStatus = '🔄 Conexión interrumpida. Reestabilizando sistema en 8 segundos...';
                setTimeout(() => iniciarBot(), 8000); 
            } else {
                botStatus = '❌ Sesión cerrada por completo. Elimina la carpeta "sesion_saqsayki" para reiniciar.';
            }
        } else if (connection === 'open') {
            qrCodeUrl = ''; // Limpiamos el QR porque ya entramos
            botStatus = '🎉 ¡CONEXIÓN EXITOSA! El bot de Saqsayki está en línea y respondiendo.';
            console.log('\n🎉 ¡CONEXIÓN EXITOSA! El bot de Saqsayki está en línea. 🎉\n');
        }
    });

    // Tu lógica exacta de respuestas del Parque Temático
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

// Inicializar el núcleo del bot de WhatsApp
iniciarBot();

// --- PANEL WEB EXPRESS ---
// Muestra el QR de forma dinámica y elegante sin tocar los logs de Render
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bot Saqsayki - Panel de Control</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; background-color: #f0f2f5; margin: 0; padding: 40px; color: #333; }
                .card { background: white; padding:
