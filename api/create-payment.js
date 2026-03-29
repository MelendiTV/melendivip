import { Client, Environment } from 'square';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sourceId, reservation } = req.body;

    if (!sourceId || !reservation) {
      return res.status(400).json({ error: 'Missing data' });
    }

    const client = new Client({
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
      environment: Environment.Sandbox, // ⚠️ IMPORTANTE: sandbox por ahora
    });

    const amount = reservation.deposit * 100; // cents

    const response = await client.paymentsApi.createPayment({
      sourceId: sourceId,
      idempotencyKey: crypto.randomUUID(),
      amountMoney: {
        amount: amount,
        currency: 'USD',
      },
    });

    return res.status(200).json({
      payment: response.result.payment,
    });

  } catch (error) {
    console.error('❌ Square Error:', error);

    return res.status(500).json({
      error: error.message || 'Payment failed',
    });
  }
}
