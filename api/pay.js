export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { cardNumber, expirationDate, amount } = req.body;

    const payload = {
      createTransactionRequest: {
        merchantAuthentication: {
          name: process.env.AUTHORIZE_API_LOGIN_ID,
          transactionKey: process.env.AUTHORIZE_TRANSACTION_KEY
        },
        transactionRequest: {
          transactionType: "authCaptureTransaction",
          amount: amount,
          payment: {
            creditCard: {
              cardNumber: cardNumber,
              expirationDate: expirationDate
            }
          }
        }
      }
    };

    const response = await fetch("https://api2.authorize.net/xml/v1/request.api", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
