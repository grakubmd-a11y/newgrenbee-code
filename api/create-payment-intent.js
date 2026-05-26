import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const hasStripeSecretKey = typeof stripeSecretKey === "string" &&
  stripeSecretKey.trim().length > 0 &&
  !stripeSecretKey.includes("REPLACE_ME");
const stripe = hasStripeSecretKey ? new Stripe(stripeSecretKey) : null;

function sendJson(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

function cleanMetadataValue(value) {
  if (value === undefined || value === null) return "";
  return String(value).slice(0, 500);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  if (!stripe) {
    return sendJson(res, 500, {
      error: "Stripe is not configured. Add STRIPE_SECRET_KEY on the server."
    });
  }

  const body = parseBody(req);
  const amount = Number(body.amount);
  const currency = (body.currency || "usd").toLowerCase();
  const booking = body.booking || {};

  if (!Number.isInteger(amount) || amount < 50 || amount > 9999999) {
    return sendJson(res, 400, {
      error: "Invalid amount. Amount must be sent in cents and be at least 50."
    });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      capture_method: "manual",
      payment_method_types: ["card"],
      description: cleanMetadataValue(`Grenbee booking for ${booking.serviceName || booking.serviceId || "service"}`),
      metadata: {
        serviceId: cleanMetadataValue(booking.serviceId),
        serviceName: cleanMetadataValue(booking.serviceName),
        bookingDate: cleanMetadataValue(booking.bookingDate),
        timeSlot: cleanMetadataValue(booking.timeSlot),
        frequency: cleanMetadataValue(booking.frequency),
        couponCode: cleanMetadataValue(booking.couponCode),
        couponDiscount: cleanMetadataValue(booking.couponDiscount),
        source: "grenbee-web"
      }
    });

    return sendJson(res, 200, {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      captureMethod: paymentIntent.capture_method
    });
  } catch (error) {
    return sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Could not create PaymentIntent."
    });
  }
}
