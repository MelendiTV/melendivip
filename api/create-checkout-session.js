import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
      notes
    } = req.body || {};

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      ui_mode: 'embedded',
      return_url: 'https://melendivip.vercel.app/reservation-success.html?session_id={CHECKOUT_SESSION_ID}',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `VIP Reservation Deposit - ${club || 'Melendi VIP'}`
            },
            unit_amount: Number(deposit || 20) * 100
          },
          quantity: 1
        }
      ],
      metadata: {
        name: name || '',
        phone: phone || '',
        hotel: hotel || '',
        club: club || '',
        date: date || '',
        time: time || '',
        men: String(men || ''),
        women: String(women || ''),
        guests: String(guests || ''),
        deposit: String(deposit || ''),
        notes: notes || ''
      }
    });

    return res.status(200).json({
      clientSecret: session.client_secret
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || 'Server error'
    });
  }
}
