import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // Opcional, pero recomendable para fijar la versión usada por tu backend.
  // Si tu proyecto ya fija la versión por otro lado, puedes quitar esto.
  apiVersion: '2026-03-25.dahlia',
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://melendivip.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      name,
      phone,
      hotel,
      club,
      date,
      time,
      men,
      women,
      guests,
      deposit,
      notes,
    } = req.body || {};

    // Validación mínima
    const depositAmount = Number(deposit);
    if (!Number.isFinite(depositAmount) || depositAmount <= 0) {
      return res.status(400).json({ error: 'Invalid deposit amount' });
    }

    const safeClub = (club || 'Melendi VIP Promotions').slice(0, 120);
    const safeName = (name || '').slice(0, 500);
    const safePhone = (phone || '').slice(0, 50);
    const safeHotel = (hotel || '').slice(0, 200);
    const safeDate = (date || '').slice(0, 50);
    const safeTime = (time || '').slice(0, 50);
    const safeNotes = (notes || '').slice(0, 500);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      ui_mode: 'embedded_page',
      return_url:
        'https://melendivip.com/success.html?session_id={CHECKOUT_SESSION_ID}',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `VIP Reservation Deposit - ${safeClub}`,
            },
            unit_amount: Math.round(depositAmount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        name: safeName,
        phone: safePhone,
        hotel: safeHotel,
        club: safeClub,
        date: safeDate,
        time: safeTime,
        men: String(men || ''),
        women: String(women || ''),
        guests: String(guests || ''),
        deposit: String(depositAmount),
        notes: safeNotes,
      },
    });

    return res.status(200).json({
      clientSecret: session.client_secret,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Stripe checkout session error:', error);

    return res.status(500).json({
      error: error?.message || 'Server error',
    });
  }
}
