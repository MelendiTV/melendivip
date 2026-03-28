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

async function sendWhatsAppMessage(metadata) {
  const mensaje = `
🔥 VIP PAYMENT CONFIRMED 🔥

Nombre: ${metadata.name || ''}
Teléfono: ${metadata.phone || ''}
Hotel: ${metadata.hotel || ''}
Club: ${metadata.club || ''}
Fecha: ${metadata.date || ''}
Hora: ${metadata.time || ''}
Hombres: ${metadata.men || ''}
Mujeres: ${metadata.women || ''}
Depósito: $${metadata.deposit || ''}

✅ Pago completado correctamente
`;

  const url = `https://api.callmebot.com/whatsapp.php?phone=17025424935&text=${encodeURIComponent(mensaje)}&apikey=4613267`;

  const waRes = await fetch(url);
  const waText = await waRes.text();

  if (!waRes.ok) {
    throw new Error(`CallMeBot HTTP ${waRes.status}: ${waText}`);
  }

  console.log('CallMeBot OK:', waText);
}

async function sendSMS(metadata) {
  const rawPhone = String(metadata.phone || '').trim();

  const cleanedPhone = rawPhone
    .replace(/[^\d+]/g, '')
    .replace(/^\+/, '');

  const mensaje = `
🔥 MELENDI VIP CONFIRMATION 🔥

Your reservation is confirmed ✅

Club: ${metadata.club || ''}
Date: ${metadata.date || ''}
Time: ${metadata.time || ''}

Your VIP host will contact you shortly.
`;

  const smsRes = await fetch('https://textbelt.com/text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone: cleanedPhone,
      message: mensaje.trim(),
      key: process.env.TEXTBELT_KEY,
    }),
  });

  const smsData = await smsRes.json();
  console.log('SMS result:', smsData);

  if (!smsData.success) {
    throw new Error(`Textbelt failed: ${smsData.error || 'Unknown error'}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig) {
    return res.status(400).send('Missing Stripe signature');
  }

  if (!webhookSecret) {
    return res.status(500).send('Missing STRIPE_WEBHOOK_SECRET');
  }

  if (!process.env.TEXTBELT_KEY) {
    return res.status(500).send('Missing TEXTBELT_KEY');
  }

  let event;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const metadata = session.metadata || {};

      await sendWhatsAppMessage(metadata);
      await sendSMS(metadata);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return res.status(500).json({
      error: 'Webhook handler failed',
      detail: err.message,
    });
  }
}
