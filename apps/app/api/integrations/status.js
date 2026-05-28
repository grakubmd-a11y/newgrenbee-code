function sendJson(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function configured(value) {
  return typeof value === "string" &&
    value.trim().length > 0 &&
    !value.includes("REPLACE_ME");
}

function maskKey(value) {
  if (!configured(value)) return "";
  const trimmed = value.trim();
  if (trimmed.length <= 12) return `${trimmed.slice(0, 4)}...`;
  return `${trimmed.slice(0, 7)}...${trimmed.slice(-4)}`;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
  const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
  const googleMapsKey = process.env.GOOGLE_MAPS_API_KEY || "";
  const firebaseAdminJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_ADMIN_CREDENTIALS || "";

  return sendJson(res, 200, {
    stripe: {
      secretConfigured: configured(stripeSecretKey),
      webhookConfigured: configured(stripeWebhookSecret),
      publishableConfigured: configured(stripePublishableKey),
      publishableMasked: maskKey(stripePublishableKey),
      mode: stripeSecretKey.startsWith("sk_live_") ? "live" : stripeSecretKey.startsWith("sk_test_") ? "test" : "unknown"
    },
    google: {
      mapsServerKeyConfigured: configured(googleMapsKey),
      mapsServerKeyMasked: maskKey(googleMapsKey)
    },
    firebase: {
      adminConfigured: configured(firebaseAdminJson)
    }
  });
}
