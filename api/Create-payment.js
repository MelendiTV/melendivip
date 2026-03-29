export default async function handler(req, res) {
  try {
    const { sourceId } = req.body;

    const response = await fetch("https://connect.squareup.com/v2/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "Square-Version": "2025-03-19"
      },
      body: JSON.stringify({
        source_id: sourceId,
        amount_money: {
          amount: 2000, // $20.00
          currency: "USD"
        },
        idempotency_key: crypto.randomUUID()
      })
    });

    const data = await response.json();
    res.status(response.status).json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
