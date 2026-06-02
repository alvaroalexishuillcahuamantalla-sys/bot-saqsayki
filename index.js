const express = require('express');
const axios = require('axios'); // Necesitarás instalar axios: npm install axios
const app = express();
app.use(express.json());

const MI_TOKEN = 'SAQSAYKI_TOKEN_SECRETO_2026';
// CAMBIA ESTO por tu TOKEN de API de WhatsApp de Meta (del panel)
const WHATSAPP_TOKEN = 'TU_TOKEN_DE_ACCESO_DE_META'; 
const NUMERO_ID = 'TU_ID_DE_NUMERO_DE_TELEFONO';

app.get('/webhook', (req, res) => {
    if (req.query['hub.verify_token'] === MI_TOKEN) res.send(req.query['hub.challenge']);
    else res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (message) {
        const from = message.from; // Número del usuario
        const msgBody = message.text?.body.toLowerCase();

        // Lógica del Menú
        let respuesta = "Hola, bienvenido. Escribe:\n1. Servicios\n2. Contacto";
        if (msgBody === '1') respuesta = "Nuestros servicios son:\n- Diseño Web\n- Marketing";
        if (msgBody === '2') respuesta = "Puedes contactarnos al +51 999 999 999";

        // Enviar respuesta a WhatsApp
        await axios({
            method: 'POST',
            url: `https://graph.facebook.com/v19.0/${NUMERO_ID}/messages`,
            headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` },
            data: {
                messaging_product: 'whatsapp',
                to: from,
                text: { body: respuesta }
            }
        });
    }
    res.sendStatus(200);
});

app.listen(process.env.PORT || 3000);
