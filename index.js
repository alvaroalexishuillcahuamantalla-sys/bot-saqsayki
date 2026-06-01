const express = require('express');
const app = express();
app.use(express.json());

// El token que pondrás en el panel de Meta
const MI_TOKEN = 'SAQSAYKI_TOKEN_SECRETO_2026';

// Ruta para verificación de Webhook
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === MI_TOKEN) {
        console.log('Webhook verificado correctamente');
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// Ruta para recibir mensajes
app.post('/webhook', (req, res) => {
    const body = req.body;
    
    if (body.object === 'whatsapp_business_account') {
        console.log('Mensaje recibido:', JSON.stringify(body, null, 2));
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Bot corriendo en el puerto ${PORT}`);
});