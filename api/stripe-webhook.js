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

function formatPhone(phone) {
  const raw = String(phone || '').trim();

  if (!raw) return '';

  const hasPlus = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');

  if (hasPlus) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  return `+${digits}`;
}

async function sendWhatsAppMessage(metadata) {
  const mensaje = `🔥 VIP PAYMENT CONFIRMED 🔥

Melendi VIP Promotions

Name: ${metadata.name || ''}
Phone: ${metadata.phone || ''}
Hotel: ${metadata.hotel || ''}
Club: ${metadata.club || ''}
Date: ${metadata.date || ''}
Time: ${metadata.time || ''}
Men: ${metadata.men || '0'}
Women: ${metadata.women || '0'}
Deposit: $${metadata.deposit || '0'}

✅ Payment completed successfully`;

  const url = `https://api.callmebot.com/whatsapp.php?phone=17025424935&text=${encodeURIComponent(mensaje)}&apikey=4613267`;

  const waRes = await fetch(url);
  const waText = await waRes.text();

  if (!waRes.ok) {
    throw new Error(`CallMeBot HTTP ${waRes.status}: ${waText}`);
  }

  console.log('CallMeBot OK:', waText);
}

async function sendSMS(metadata) {
  const formattedPhone = formatPhone(metadata.phone);

  if (!formattedPhone || formattedPhone.length < 12) {
    throw new Error(`Invalid phone number for SMS: ${metadata.phone || 'empty'}`);
  }

  const mensaje = `Melendi VIP Promotions:

VIP booking confirmed ✅

Club: ${metadata.club || ''}
Hotel pickup: ${metadata.hotel || ''}
Date: ${metadata.date || ''}
Time: ${metadata.time || ''}

Guests: ${metadata.men || '0'} men, ${metadata.women || '0'} women
Deposit received: $${metadata.deposit || '0'}

Your VIP host will contact you shortly.
Please be ready at your hotel.

Reply STOP to opt out.`;

  const smsRes = await fetch('https://textbelt.com/text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone: formattedPhone,
      message: mensaje,
      key: process.env.TEXTBELT_KEY,
      sender: 'Melendi VIP Promotions',
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

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).send('Missing STRIPE_SECRET_KEY');
  }

  if (!process.env.TEXTBELT_KEY) {
    return res.status(500).send('Missing TEXTBELT_KEY');
  }

  let event;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Stripe signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const metadata = session.metadata || {};

      if (session.payment_status !== 'paid') {
        console.log('Session not paid, skipping:', session.id);
        return res.status(200).json({ received: true, skipped: 'not_paid' });
      }

      if (session.mode !== 'payment') {
        console.log('Session mode is not payment, skipping:', session.id);
        return res.status(200).json({ received: true, skipped: 'wrong_mode' });
      }

      console.log('Processing paid checkout session:', session.id);

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
