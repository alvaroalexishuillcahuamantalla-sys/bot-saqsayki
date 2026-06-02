const express = require('express');
const app = express();
app.use(express.json());

// 1. TUS TOKENS DE META
// El token que usas para verificar el Webhook (El tuyo original)
const MI_TOKEN = 'SAQSAYKI_TOKEN_SECRETO_2026';
// El token de acceso temporal o permanente que te da Meta para enviar mensajes
const TOKEN_DE_META = 'EAAYTIbPoim8BRoO1RgIeAndKz6M8FwUZBZAllSbUpMcvmRZBRxt7b7MaSMHW8xsynfdrf4J0ZCZAhusEjXyRsTWWVvXPiaf6rcStwfjtDZBrC801gZBBQPNnFacvH9ZBSeOqvTxhVYf5Q5fUtfvGcADnPakKgdwP1eJXilXuZBDZCZBKOBGGZCLTSzO0czY008TAiER5FshTjrn05PqIx3fglwsMIjOVzRPnmbrfyaYNVMejel4srEZCZCmOgDY8LQm8FhSLZAcOaAulNeA24h3MqsqyRmVoTMB'; 

// 2. TU MENÚ PRINCIPAL
const menuPrincipal = `Bienvenido(a) al Parque Saqsayqui de Juegos Extremos!

Nos alegra recibir su mensaje. Somos un espacio dedicado a la diversión, la aventura y las experiencias inolvidables para toda la familia.

Será un placer atenderle y brindarle toda la información que necesite sobre nuestras actividades, horarios y servicios.

Por favor, indíquenos cómo podemos ayudarle y le responderemos a la brevedad. Seleccione una de las opciones:

1️⃣ HORARIOS
2️⃣ PRECIOS UNITARIOS
3️⃣ PAQUETES PROMOCIONALES
4️⃣ COMO LLEGAR 
5️⃣ PLATOS A LA CARTA`;

// 3. RUTA PARA VERIFICACIÓN DE WEBHOOK (Tu código intacto)
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

// 4. RUTA PARA RECIBIR Y RESPONDER MENSAJES (Mejorada)
app.post('/webhook', (req, res) => {
    const body = req.body;
    
    if (body.object === 'whatsapp_business_account') {
        // Navegamos por el JSON que envía Meta para encontrar el mensaje de texto
        if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
            
            const mensajeEntrante = body.entry[0].changes[0].value.messages[0];
            const numeroCliente = mensajeEntrante.from; // Número de quien escribe
            const idTelefonoNegocio = body.entry[0].changes[0].value.metadata.phone_number_id;

            // Solo respondemos si enviaron texto (ignoramos audios, imágenes por ahora)
            if (mensajeEntrante.type === 'text') {
                const textoCliente = mensajeEntrante.text.body.trim();
                
                // Procesamos la respuesta según lo que escribió
                const respuesta = procesarRespuesta(textoCliente);
                
                // Enviamos el mensaje de vuelta
                enviarMensaje(idTelefonoNegocio, numeroCliente, respuesta);
            }
        }
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

// 5. LÓGICA DE LAS OPCIONES
function procesarRespuesta(textoEntrante) {
    switch (textoEntrante) {
        case "1": return "Aquí irá la información de los HORARIOS.";
        case "2": return "Aquí irá la información de los PRECIOS UNITARIOS.";
        case "3": return "Aquí irá la información de los PAQUETES PROMOCIONALES.";
        case "4": return "Aquí irá la información de COMO LLEGAR.";
        case "5": return "Aquí irá la información de los PLATOS A LA CARTA.";
        default: return menuPrincipal; // Si envían "Hola" u otra cosa, mandamos el menú
    }
}

// 6. FUNCIÓN PARA ENVIAR EL MENSAJE VÍA META
async function enviarMensaje(idTelefono, numeroDestino, texto) {
    try {
        // Para Node.js 18+ fetch ya viene integrado. 
        const url = `https://graph.facebook.com/v17.0/${idTelefono}/messages`;
        
        await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN_DE_META}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to: numeroDestino,
                type: "text",
                text: { body: texto }
            })
        });
        console.log(`✅ Mensaje enviado exitosamente al número ${numeroDestino}`);
    } catch (error) {
        console.error('❌ Error al enviar mensaje:', error);
    }
}

// 7. INICIO DEL SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Bot corriendo perfectamente en el puerto ${PORT}`);
});
