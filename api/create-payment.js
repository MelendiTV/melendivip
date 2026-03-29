import { Client, Environment } from 'square';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sourceId, reservation } = req.body;

    const client = new Client({
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
      environment: Environment.Sandbox,
    });

    const amount = reservation.deposit * 100;

    const { result } = await client.paymentsApi.createPayment({
      sourceId,
      idempotencyKey: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      amountMoney: {
        amount: amount,
        currency: 'USD',
      },
    });

    return res.status(200).json({
      payment: result.payment,
    });

  } catch (error) {
    console.error("SQUARE ERROR:", error);
    return res.status(500).json({
      error: error.message || "Payment failed",
    });
  }
}
