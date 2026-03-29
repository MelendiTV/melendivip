function buildSmsMessage(reservation) {
  return `Melendi VIP Promotions: your reservation is confirmed. Venue: ${reservation.club}. Date: ${reservation.date}. Time: ${reservation.time}. Hotel: ${reservation.hotel}.`;
}

async function getMainLocationId() {
  const locationsResponse = await fetch("https://connect.squareup.com/v2/locations", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "Square-Version": "2025-03-19"
    }
  });

  const locationsData = await locationsResponse.json();

  if (!locationsResponse.ok) {
    throw new Error(
      locationsData?.errors?.[0]?.detail || "Could not fetch Square locations"
    );
  }

  const activeLocation =
    (locationsData.locations || []).find(loc => loc.status === "ACTIVE") ||
    (locationsData.locations || [])[0];

  if (!activeLocation?.id) {
    throw new Error("No active Square location found");
  }

  return activeLocation.id;
}

async function sendSms(phone, message) {
  if (!process.env.TEXTBELT_KEY || !phone) {
    return { skipped: true };
  }

  const smsResponse = await fetch("https://textbelt.com/text", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      phone,
      message,
      key: process.env.TEXTBELT_KEY
    }).toString()
  });

  return smsResponse.json();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!process.env.SQUARE_ACCESS_TOKEN) {
      return res.status(500).json({ error: "Missing SQUARE_ACCESS_TOKEN" });
    }

    const { sourceId, reservation } = req.body || {};

    if (!sourceId || !reservation) {
      return res.status(400).json({ error: "Missing sourceId or reservation" });
    }

    const deposit = Number(reservation.deposit || 0);
    if (!deposit || deposit < 20) {
      return res.status(400).json({ error: "Invalid reservation deposit" });
    }

    const locationId = await getMainLocationId();

    const paymentBody = {
      source_id: sourceId,
      idempotency_key:
        globalThis.crypto?.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      location_id: locationId,
      amount_money: {
        amount: Math.round(deposit * 100),
        currency: "USD"
      },
      autocomplete: true,
      buyer_phone_number: reservation.phone,
      note: `VIP Reservation | ${reservation.name} | ${reservation.club} | ${reservation.date} ${reservation.time}`,
      reference_id: `${reservation.club}-${reservation.date}-${reservation.time}`.slice(0, 40)
    };

    const paymentResponse = await fetch("https://connect.squareup.com/v2/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "Square-Version": "2025-03-19"
      },
      body: JSON.stringify(paymentBody)
    });

    const paymentData = await paymentResponse.json();

    if (!paymentResponse.ok) {
      return res.status(paymentResponse.status).json(paymentData);
    }

    let smsResult = null;
    try {
      smsResult = await sendSms(reservation.phone, buildSmsMessage(reservation));
    } catch (smsError) {
      smsResult = { success: false, error: smsError.message };
    }

    return res.status(200).json({
      payment: paymentData.payment,
      sms: smsResult
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Payment failed"
    });
  }
}
