/**
 * api/send-reminders.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Vercel cron endpoint — runs daily at 10:00 AM UTC.
 *
 * Sends a 24-hour appointment reminder email to every customer whose booking
 * is scheduled for tomorrow, as long as:
 *   • booking.status is in ACTIVE_STATUSES
 *   • booking.email is present
 *   • booking.reminderSentAt is null / missing  (idempotency — never double-send)
 *
 * After sending, sets booking.reminderSentAt = now so the cron is idempotent.
 * Processes up to MAX_PER_RUN bookings per invocation to avoid timeouts.
 *
 * Env vars required
 * ─────────────────
 *   FIREBASE_SERVICE_ACCOUNT_JSON  — Firebase Admin credentials
 *   RESEND_API_KEY                 — Resend email API key
 *   CRON_SECRET                    — optional; bearer token to restrict access
 */

import { getFirestore, sendJson } from "./_recurring.js";
import { sendEmail, buildAppointmentReminderEmail } from "./_mailer.js";

const MAX_PER_RUN = 50;

const ACTIVE_STATUSES = [
  "scheduled",
  "confirmed",
  "needs_assignment",
  "dispatched",
];

// ── Handler ────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Vercel crons send GET; allow POST for manual triggers too
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  // Optional secret to prevent random callers from triggering sends
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && !cronSecret.includes("REPLACE_ME")) {
    const authHeader = req.headers["authorization"] || "";
    if (authHeader !== `Bearer ${cronSecret}`) {
      return sendJson(res, 401, { error: "Unauthorized." });
    }
  }

  const db = getFirestore();
  if (!db) {
    return sendJson(res, 503, {
      ok: false,
      message: "Firebase Admin not configured — skipping reminder run.",
    });
  }

  // ── Compute "tomorrow" in YYYY-MM-DD ─────────────────────────────────────
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  // ── Query bookings for tomorrow that haven't been reminded yet ───────────
  let snap;
  try {
    snap = await db
      .collection("bookings")
      .where("bookingDate", "==", tomorrowStr)
      .where("status", "in", ACTIVE_STATUSES)
      .limit(MAX_PER_RUN)
      .get();
  } catch (err) {
    return sendJson(res, 500, {
      ok: false,
      message: `Firestore query failed: ${err?.message}`,
    });
  }

  const results = { sent: 0, skipped: 0, failed: 0, total: snap.size, date: tomorrowStr };

  for (const doc of snap.docs) {
    const booking = { id: doc.id, ...doc.data() };

    // Skip if already reminded
    if (booking.reminderSentAt) {
      results.skipped++;
      continue;
    }

    // Skip if no email
    if (!booking.email) {
      results.skipped++;
      continue;
    }

    try {
      const { subject, html } = buildAppointmentReminderEmail(booking);
      const result = await sendEmail(booking.email, subject, html);

      if (result.sent) {
        // Mark as reminded so we never send twice
        await doc.ref.update({ reminderSentAt: new Date().toISOString() });
        results.sent++;
      } else {
        console.warn(`[send-reminders] Email not sent for booking ${doc.id}:`, result.reason);
        results.failed++;
      }
    } catch (err) {
      console.error(`[send-reminders] Error for booking ${doc.id}:`, err?.message);
      results.failed++;
    }
  }

  return sendJson(res, 200, { ok: true, ...results });
}
