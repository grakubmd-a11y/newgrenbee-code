import admin from "firebase-admin";

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

function getFirestore() {
  if (admin.apps.length) return admin.firestore();
  const json =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_ADMIN_CREDENTIALS;
  if (!json || json.includes("REPLACE_ME")) return null;
  try {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(json)) });
    return admin.firestore();
  } catch {
    return null;
  }
}

const MAX_CONCURRENT = 3;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const { date, timeSlot } = parseBody(req);
  if (!date || !timeSlot) {
    return sendJson(res, 400, { error: "date and timeSlot are required." });
  }

  const db = getFirestore();
  if (!db) {
    return sendJson(res, 200, {
      available: true,
      slotsRemaining: MAX_CONCURRENT,
      reason: "availability-check-skipped",
    });
  }

  try {
    const snap = await db
      .collection("bookings")
      .where("bookingDate", "==", date)
      .where("timeSlot", "==", timeSlot)
      .where("status", "in", ["scheduled", "confirmed"])
      .get();

    const count = snap.size;
    const slotsRemaining = Math.max(0, MAX_CONCURRENT - count);

    return sendJson(res, 200, {
      available: slotsRemaining > 0,
      slotsRemaining,
    });
  } catch {
    return sendJson(res, 200, {
      available: true,
      slotsRemaining: MAX_CONCURRENT,
      reason: "check-error",
    });
  }
}
