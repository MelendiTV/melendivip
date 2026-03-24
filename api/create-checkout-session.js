import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, phone, club, guests, date, notes } = req.body;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      ui_mode: 'embedded',
      return_url: 'https://melendivip.com/reservation-success.html?session_id={CHECKOUT_SESSION_ID}',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `VIP Reservation Deposit - ${club || 'Melendi VIP'}`
            },
            unit_amount: 2000
          },
          quantity: 1
        }
      ],
      metadata: {
        name: name || '',
        phone: phone || '',
        club: club || '',
        guests: guests || '',
        date: date || '',
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
