import Stripe from "stripe";
import admin from "firebase-admin";
import { getFirestore as _adminGetFs } from "firebase-admin/firestore";
import { calculatePrice, requiresTwoTechs } from "./_pricing.js";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const hasStripeSecretKey =
  typeof stripeSecretKey === "string" &&
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
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

function cleanMeta(v) {
  if (v === undefined || v === null) return "";
  return String(v).slice(0, 500);
}

function couponDocId(code) {
  return String(code || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/^-+|-+$/g, "");
}

let _db = null;
function getFirestore() {
  if (_db) return _db;
  const json =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_ADMIN_CREDENTIALS;
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

/**
 * Returns an existing Stripe Customer ID for the user, or creates a new one.
 * Stores the stripeCustomerId on the Firestore user document for future lookups.
 * Never throws — returns null on any error so the PI creation isn't blocked.
 */
async function getOrCreateStripeCustomer({ userId, email, name, db, stripe }) {
  if (!userId || !db || !stripe) return null;
  try {
    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();
    if (userSnap.exists) {
      const userData = userSnap.data() || {};
      if (userData.stripeCustomerId) return userData.stripeCustomerId;
    }
    // Create a new Stripe Customer
    const customer = await stripe.customers.create({
      ...(email ? { email } : {}),
      ...(name  ? { name  } : {}),
      metadata: { userId, source: "grenbee-web" },
    });
    // Persist so future recurring PIs reuse the same customer
    const now = new Date().toISOString();
    await userRef.set({ stripeCustomerId: customer.id, updatedAt: now }, { merge: true });
    return customer.id;
  } catch {
    return null;
  }
}

async function resolveServerCouponDiscount(couponCode) {
  const docId = couponDocId(couponCode);
  if (!docId) return 0;
  const db = getFirestore();
  if (!db) return 0;
  try {
    const snap = await db.collection("coupons").doc(docId).get();
    if (!snap.exists) return 0;
    const c = snap.data() || {};
    if (c.active === false) return 0;
    if (c.expiresAt && new Date(c.expiresAt) < new Date()) return 0;
    if (Number(c.usageLimit) > 0 && Number(c.usedCount || 0) >= Number(c.usageLimit)) return 0;
    return Number(c.discountAmount || 0);
  } catch {
    return 0;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  if (!stripe) {
    return sendJson(res, 500, {
      error: "Stripe is not configured. Add STRIPE_SECRET_KEY on the server.",
    });
  }

  const body = parseBody(req);
  const {
    serviceId,
    units,
    selectedFactors = {},
    frequency = "once",
    membership = null,
    couponCode = "",
    sameDayFee: clientSameDay = false,
    booking = {},
    userId = "",
  } = body;

  if (!serviceId || units === undefined) {
    return sendJson(res, 400, { error: "serviceId and units are required." });
  }

  try {
    // Server-authoritative: re-derive 2-tech requirement from factors (never trust client)
    const twoTechFee = requiresTwoTechs(serviceId, selectedFactors);

    // Server-authoritative: only apply same-day fee when the booking date is actually today
    const today = new Date().toISOString().split("T")[0];
    const sameDayFee = Boolean(clientSameDay) && booking.bookingDate === today;

    // Validate coupon against Firestore to get the authoritative discount
    const couponDiscount = couponCode
      ? await resolveServerCouponDiscount(couponCode)
      : 0;

    // Canonical price calculation — throws on unknown service or tampered modifier
    const { totalCents, breakdown } = calculatePrice({
      serviceId,
      units,
      selectedFactors,
      frequency,
      membership,
      couponDiscount,
      sameDayFee,
      twoTechFee,
    });

    if (totalCents < 50) {
      return sendJson(res, 400, { error: "Order total must be at least $0.50." });
    }

    // For recurring plans, create/retrieve a Stripe Customer and save the PM for future off-session charges
    const isRecurring = frequency !== "once";
    let stripeCustomerId = null;
    if (isRecurring && userId) {
      stripeCustomerId = await getOrCreateStripeCustomer({
        userId,
        email:  booking.email        || "",
        name:   booking.customerName || "",
        db:     getFirestore(),
        stripe,
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: "usd",
      capture_method: "manual",
      payment_method_types: ["card"],
      ...(stripeCustomerId
        ? { customer: stripeCustomerId, setup_future_usage: "off_session" }
        : {}),
      description: cleanMeta(`Grenbee — ${booking.serviceName || serviceId}`),
      metadata: {
        serviceId:      cleanMeta(serviceId),
        serviceName:    cleanMeta(booking.serviceName || serviceId),
        bookingDate:    cleanMeta(booking.bookingDate),
        timeSlot:       cleanMeta(booking.timeSlot),
        frequency:      cleanMeta(frequency),
        couponCode:     cleanMeta(couponCode),
        couponDiscount: String(couponDiscount),
        sameDayFee:     String(sameDayFee),
        twoTechFee:     String(twoTechFee),
        userId:         cleanMeta(userId),
        source:         "grenbee-web",
      },
    });

    return sendJson(res, 200, {
      clientSecret:     paymentIntent.client_secret,
      paymentIntentId:  paymentIntent.id,
      totalCents,
      breakdown,
      currency:         paymentIntent.currency,
      captureMethod:    paymentIntent.capture_method,
      stripeCustomerId: stripeCustomerId || null,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Could not create PaymentIntent.";
    const status = /unknown service|tampered|invalid units/i.test(msg) ? 400 : 500;
    return sendJson(res, status, { error: msg });
  }
}
