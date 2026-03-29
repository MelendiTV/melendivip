export default async function handler(req, res) {
  try {
    if (!process.env.SQUARE_APPLICATION_ID || !process.env.SQUARE_ACCESS_TOKEN) {
      return res.status(500).json({
        error: "Missing Square environment variables"
      });
    }

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
      return res.status(locationsResponse.status).json(locationsData);
    }

    const activeLocation =
      (locationsData.locations || []).find(loc => loc.status === "ACTIVE") ||
      (locationsData.locations || [])[0];

    if (!activeLocation?.id) {
      return res.status(500).json({
        error: "No active Square location found"
      });
    }

    return res.status(200).json({
      applicationId: process.env.SQUARE_APPLICATION_ID,
      locationId: activeLocation.id
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Failed to load Square config"
    });
  }
}
