const express = require('express');
const app = express();
app.use(express.json());

// --- 1. TUS TOKENS DE META ---
const MI_TOKEN = 'SAQSAYKI_TOKEN_SECRETO_2026';
const TOKEN_DE_META = 'EAAYTIbPoim8BRoZCSlDSnSE9aDXUsKWpGwbtSys6UxV1IxygmZAFtoapJh4bLJC1LLpZC0miOTQqTB5TePXylvggGqXhR38ZCk8dJZAgfoBiXXt5RW090L9JWmeXqy0yHouv8cRxUkQg9NS0uhOdZBM3e4ad3XYOGcXoXdDeGy8Ot3LwoDLXDNjeqSQGP1xZA8hU6LbxokeDdPAK6ZB7sHfc4uf22PBD2aVUdP5TZCGLnQCgL2bw10hEEPAci72KHNZAFV631MEs6xCDxxewwdXZCl2'; 

// --- 2. TEXTOS DE LAS RESPUESTAS Y MENÚS ---

const menuPrincipal = `Bienvenido(a) al Parque Saqsayqui de Juegos Extremos!

Nos alegra recibir su mensaje. Somos un espacio dedicado a la diversión, la aventura y las experiencias inolvidables para toda la familia.

Será un placer atenderle y brindarle toda la información que necesite sobre nuestras actividades, horarios y servicios.

Por favor, indíquenos cómo podemos ayudarle y le responderemos a la brevedad. Seleccione una de las opciones:

1️⃣ HORARIOS
2️⃣ PRECIOS UNITARIOS
3️⃣ PAQUETES PROMOCIONALES
4️⃣ COMO LLEGAR 
5️⃣ PLATOS A LA CARTA`;

const respuestaHorarios = `☀️ *Nuestro horario de atención es:*
🗓️ Lunes a domingo (incluyendo feriados)
⏰ De 9:30 a.m. a 5:30 p.m.

🏞️ *LUGARES Y ATRACTIVOS A VISITAR*
El ingreso al parque temático, que incluye miradores y el puente acuático, tiene los siguientes costos:
👉 Adultos: *S/ 7.00*
👉 Niños: *S/ 4.00*

Podrás visitar miradores como:
* Mirador de la *mano gigante del Inca*
* *Bosque encantado de los duendes*
* Mirador de la *mano de choclo de oro*
* *Trilogía andina*
* Y *muchos más miradores*

🐾 *Política de mascotas:*
¡Sí, puedes venir con tus perritos! Solo te pedimos que traigas una bolsa para sus desechos.`;

const respuestaPrecios = `💰 *PRECIOS UNITARIOS DE JUEGOS*

🌊 *JUEGOS ACUÁTICOS:*
* *Caminata en línea* – S/ 5.00
* *Puente acuático* – S/ 5.00
* *Tirolesa acuática* – S/ 8.00
* *Puente aéreo* – S/ 8.00

⛰️ *JUEGOS DE ALTURA:*
* *Columpio extremo “Vuelo del Cóndor”* (25 m) – S/ 20.00
* *Circuito de 21 obstáculos extremos* – S/ 20.00`;

const respuestaPaquetes = `🎒 *PAQUETES PROMOCIONALES*
Nuestros paquetes son por persona y están diseñados para que disfrutes al máximo:

🔹 *PAQUETE 1 – S/ 25.00*
* Entrada al parque (miradores)
* Puente acuático
* Caminata en línea
* Tirolesa acuática
* Puente aéreo

🔹 *PAQUETE 2 – S/ 35.00*
* Entrada al parque (miradores)
* Columpio extremo
* Circuito de 21 obstáculos
* Puente acuático

🔹 *PAQUETE 3 – S/ 45.00 – EXPERIENCIA COMPLETA*
* Entrada al parque (miradores)
* Columpio extremo (25 m)
* Circuito de 21 obstáculos
* Tirolesa acuática
* Caminata en línea
* Puente aéreo
* Puente acuático`;

const respuestaComoLlegar = `🚕 *COMO LLEGAR A SAQSAYKI*

https://maps.app.goo.gl/xrwjZyXT2iBeMiUr9

🚖 *Servicio de taxi:*
Si necesitas un taxi seguro para llegar, puedes contactar al número: *926050769*.`;

const respuestaPlatos = `🍽️ *PLATOS A LA CARTA*
También ofrecemos deliciosos platos a la carta en nuestra quinta restaurante:

* Cuy al horno entero — S/ 60
* Trucha frita — S/ 25
* Chicharrón de cerdo — S/ 25
* Chuleta de cerdo — S/ 25
* Pollo al horno — S/ 25

⚠️ Se realizan reservas con los platos de comida.`;

// Texto final que se le sumará a las respuestas 1, 2, 3, 5 para incentivar el contacto
const textoContacto = `\n\n📲 *INFORMES Y RESERVAS:*
Para cualquier consulta o reserva, no dudes en contactarnos:
📞 *983 838 681*
📞 *974 362 000*

🔥 *¡Vive la aventura en SAQSAYKI!* 🥳`;


// --- 3. RUTA PARA VERIFICACIÓN DE WEBHOOK ---
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

// --- 4. RUTA PARA RECIBIR Y RESPONDER MENSAJES ---
app.post('/webhook', (req, res) => {
    const body = req.body;
    
    if (body.object === 'whatsapp_business_account') {
        if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
            
            const mensajeEntrante = body.entry[0].changes[0].value.messages[0];
            const numeroCliente = mensajeEntrante.from; 
            const idTelefonoNegocio = body.entry[0].changes[0].value.metadata.phone_number_id;

            if (mensajeEntrante.type === 'text') {
                const textoCliente = mensajeEntrante.text.body.trim();
                
                // Procesamos la respuesta correspondiente
                const respuesta = procesarRespuesta(textoCliente);
                
                // Enviamos la respuesta de vuelta a WhatsApp
                enviarMensaje(idTelefonoNegocio, numeroCliente, respuesta);
            }
        }
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

// --- 5. ENRUTADOR DE RESPUESTAS ---
function procesarRespuesta(textoEntrante) {
    switch (textoEntrante) {
        case "1": 
            return respuestaHorarios + textoContacto;
        case "2": 
            return respuestaPrecios + textoContacto;
        case "3": 
            return respuestaPaquetes + textoContacto;
        case "4": 
            return respuestaComoLlegar; // No lleva el texto de reservas directamente para mantenerlo limpio
        case "5": 
            return respuestaPlatos + textoContacto;
        default: 
            return menuPrincipal; // Cualquier palabra ("hola", "buenas", etc.) despliega el menú
    }
}

// --- 6. FUNCIÓN ENVIAR MENSAJE VIA API DE META ---
async function enviarMensaje(idTelefono, numeroDestino, texto) {
    try {
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
        console.log(`✅ Mensaje enviado a ${numeroDestino}`);
    } catch (error) {
        console.error('❌ Error al enviar mensaje:', error);
    }
}

// --- 7. INICIO DEL SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Bot corriendo perfectamente en el puerto ${PORT}`);
});
