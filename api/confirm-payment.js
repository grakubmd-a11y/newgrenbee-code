import admin from "firebase-admin";
import { getFirestore as _adminGetFs } from "firebase-admin/firestore";
import Stripe from "stripe";
import { sendEmail, buildBookingConfirmationEmail } from "./_mailer.js";

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

function couponIdFromCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/^-+|-+$/g, "");
}

let _db = null;
function getFirestore() {
  if (_db) return _db;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_ADMIN_CREDENTIALS;
  if (!json || json.includes("REPLACE_ME")) return null;
  try {
    const app = admin.apps.length
      ? admin.apps[0]
      : admin.initializeApp({ credential: admin.credential.cert(JSON.parse(json)) });
    const dbId = process.env.FIREBASE_DATABASE_ID;
    _db = dbId ? _adminGetFs(app, dbId) : _adminGetFs(app);
    return _db;
  } catch {
    return null;
  }
}

async function recordCouponUsage(couponCode) {
  const couponId = couponIdFromCode(couponCode);
  if (!couponId) {
    return { recorded: false, reason: "No coupon code supplied." };
  }

  const db = getFirestore();
  if (!db) {
    return { recorded: false, reason: "Firebase admin credentials are not configured." };
  }

  const couponRef = db.collection("coupons").doc(couponId);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(couponRef);
    if (!snapshot.exists) {
      return;
    }

    const coupon = snapshot.data() || {};
    const usedCount = Number(coupon.usedCount || 0);
    const usageLimit = Number(coupon.usageLimit || 0);
    if (usageLimit > 0 && usedCount >= usageLimit) {
      return;
    }

    transaction.update(couponRef, {
      usedCount: usedCount + 1,
      updatedAt: new Date().toISOString()
    });
  });

  return { recorded: true };
}

/**
 * Minimal server-side validation of the booking payload.
 * We trust the pricing because it was authorised by create-payment-intent;
 * we only need the shape to be safe to write.
 */
function isBookingPayloadValid(booking) {
  if (!booking || typeof booking !== "object") return false;
  const required = [
    "id", "serviceId", "serviceName", "bookingDate", "timeSlot",
    "customerName", "email", "phone", "address",
  ];
  return (
    required.every(
      (f) => typeof booking[f] === "string" && booking[f].length > 0
    ) &&
    typeof booking.units === "number" &&
    typeof booking.totalCost === "number"
  );
}

/**
 * Save the booking document to Firestore using the Admin SDK.
 * Bypasses client-side security rules — payment has already been verified.
 * Returns { saved: true } or { saved: false, reason: string }.
 */
async function saveBookingToFirestore(booking, paymentIntentId) {
  const db = getFirestore();
  if (!db) return { saved: false, reason: "Firebase Admin not configured." };
  if (!isBookingPayloadValid(booking)) {
    return { saved: false, reason: "Booking payload failed validation." };
  }

  // Always force the authoritative status fields server-side
  const safeBooking = {
    ...booking,
    status:    "scheduled",
    createdAt: booking.createdAt || new Date().toISOString(),
    // Ensure the PI that was verified is stored
    stripePaymentIntentId: paymentIntentId,
  };

  try {
    await db.collection("bookings").doc(safeBooking.id).set(safeBooking);
    return { saved: true };
  } catch (err) {
    return { saved: false, reason: err instanceof Error ? err.message : "Firestore write failed." };
  }
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
  const paymentIntentId = String(body.paymentIntentId || "");
  if (!paymentIntentId.startsWith("pi_")) {
    return sendJson(res, 400, { error: "Invalid PaymentIntent id." });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const confirmedStatuses = ["requires_capture", "succeeded", "processing"];
    if (!confirmedStatuses.includes(paymentIntent.status)) {
      return sendJson(res, 409, {
        error: `PaymentIntent is not confirmed. Current status: ${paymentIntent.status}`,
        paymentIntentStatus: paymentIntent.status
      });
    }

    const couponUsage = body.couponCode
      ? await recordCouponUsage(body.couponCode)
      : { recorded: false, reason: "No coupon code supplied." };

    // ── Server-side Firestore booking save (bypasses client auth) ─────────
    const bookingResult = body.booking
      ? await saveBookingToFirestore(body.booking, paymentIntent.id)
      : { saved: false, reason: "No booking data supplied." };

    // ── Confirmation email (fire-and-forget — never blocks the response) ──
    if (bookingResult.saved && body.booking?.email) {
      const { subject, html } = buildBookingConfirmationEmail(body.booking);
      sendEmail(body.booking.email, subject, html).catch(() => {/* non-fatal */});
    }

    return sendJson(res, 200, {
      ok: true,
      paymentIntentId: paymentIntent.id,
      paymentIntentStatus: paymentIntent.status,
      couponUsage,
      firestoreSaved:       bookingResult.saved,
      firestoreSaveReason:  bookingResult.reason ?? null,
    });
  } catch (error) {
    return sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Could not verify payment."
    });
  }
}
