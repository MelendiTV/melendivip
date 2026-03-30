import { Client, Environment } from 'square';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sourceId, reservation } = req.body;

    if (!sourceId) {
      return res.status(400).json({ error: 'Missing sourceId' });
    }

    if (!reservation || !reservation.deposit) {
      return res.status(400).json({ error: 'Missing reservation deposit' });
    }

    const client = new Client({
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
      environment: Environment.Production,
    });

    const amount = Math.round(Number(reservation.deposit) * 100);

    const { result } = await client.paymentsApi.createPayment({
      sourceId,
      idempotencyKey: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      amountMoney: {
        amount,
        currency: 'USD',
      },
    });

    return res.status(200).json({
      success: true,
      payment: result.payment,
    });
  } catch (error) {
    console.error('SQUARE ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Payment failed',
    });
  }
}
