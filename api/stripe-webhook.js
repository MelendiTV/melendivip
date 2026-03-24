import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const md = session.metadata || {};

    const mensaje = `
🔥 VIP PAYMENT CONFIRMED 🔥

Nombre: ${md.name || ''}
Teléfono: ${md.phone || ''}
Hotel: ${md.hotel || ''}
Club: ${md.club || ''}
Fecha: ${md.date || ''}
Hora: ${md.time || ''}
Hombres: ${md.men || ''}
Mujeres: ${md.women || ''}
Depósito: $${md.deposit || ''}

✅ Pago completado correctamente
`;

    const url = `https://api.callmebot.com/whatsapp.php?phone=17025424935&text=${encodeURIComponent(mensaje)}&apikey=4613267`;

    try {
      const waRes = await fetch(url);
      const waText = await waRes.text();

      if (!waRes.ok) {
        console.error('CallMeBot HTTP error:', waRes.status, waText);
        return res.status(500).json({ error: 'CallMeBot failed', detail: waText });
      }

      console.log('CallMeBot OK:', waText);
    } catch (e) {
      console.error('CallMeBot fetch error:', e);
      return res.status(500).json({ error: 'CallMeBot fetch failed' });
    }
  }

  return res.status(200).json({ received: true });
}
