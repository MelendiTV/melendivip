import { Client, Environment } from 'square';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sourceId, verificationToken, reservation } = req.body;

    if (!sourceId) {
      return res.status(400).json({ error: 'Missing sourceId' });
    }

    if (!verificationToken) {
      return res.status(400).json({ error: 'Missing verificationToken' });
    }

    if (!reservation) {
      return res.status(400).json({ error: 'Missing reservation data' });
    }

    const men = Math.max(parseInt(reservation.men, 10) || 0, 0);

    if (men < 1) {
      return res.status(400).json({ error: 'Minimum 1 adult booking is required' });
    }

    const calculatedDeposit = men * 20;
    const amount = Math.round(calculatedDeposit * 100);

    if (amount <= 0) {
      return res.status(400).json({ error: 'Invalid payment amount' });
    }

    const client = new Client({
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
      environment: Environment.Production,
    });

    const { result } = await client.paymentsApi.createPayment({
      sourceId,
      verificationToken,
      idempotencyKey: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      amountMoney: {
        amount,
        currency: 'USD',
      },
    });

    return res.status(200).json({
      success: true,
      payment: result.payment,
      chargedAmount: calculatedDeposit,
    });
  } catch (error) {
    console.error('SQUARE ERROR:', error);

    const squareError =
      error?.body?.errors?.[0]?.detail ||
      error?.errors?.[0]?.detail ||
      error?.message ||
      'Payment failed';

    return res.status(500).json({
      success: false,
      error: squareError,
    });
  }
}
