/**
 * api/process-abandoned-leads.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Vercel cron job — runs every hour.
 * Finds leads that are still 'new' AND were created at least 30 minutes ago
 * AND haven't had a recovery email sent yet.
 *
 * For each qualifying lead:
 *   1. Sends a recovery email (fire-and-forget via Resend)
 *   2. POSTs to the CRM webhook URL (if configured)
 *   3. Marks recoveryEmailSentAt on the lead so it doesn't repeat
 *
 * Processes max 20 leads per run to stay within serverless limits.
 */

import { getFirestore, sendJson } from "./_recurring.js";
import { sendEmail, buildAbandonedCheckoutEmail } from "./_mailer.js";

const RECOVERY_DELAY_MS = 30 * 60 * 1000; // 30 minutes
const BATCH_LIMIT       = 20;

async function fireCrmWebhook(url, event, lead) {
  try {
    await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ event, lead, sentAt: new Date().toISOString() }),
      signal:  AbortSignal.timeout(8000),
    });
  } catch {/* non-fatal */}
}

export default async function handler(req, res) {
  // Allow both GET (Vercel cron) and POST (manual trigger)
  if (req.method !== "GET" && req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const db = getFirestore();
  if (!db) return sendJson(res, 503, { error: "Firebase Admin not configured." });

  // ── Load CRM webhook URL from settings ────────────────────────────────────
  const settingsSnap = await db.collection("settings").doc("business").get().catch(() => null);
  const crmWebhookUrl = settingsSnap?.data()?.crmWebhookUrl || null;
  const bookingUrl    = settingsSnap?.data()?.siteUrl || "https://grenbee.com/book?service=house-cleaning";

  // ── Query: new leads, older than 30 min, no recovery email yet ───────────
  const cutoff = new Date(Date.now() - RECOVERY_DELAY_MS).toISOString();

  const snap = await db
    .collection("leads")
    .where("status",               "==",   "new")
    .where("recoveryEmailSentAt",  "==",   null)
    .where("createdAt",            "<=",   cutoff)
    .limit(BATCH_LIMIT)
    .get()
    .catch(() => null);

  // Firestore can't query where field doesn't exist — fallback if needed
  const snap2 = snap ?? await db
    .collection("leads")
    .where("status",   "==", "new")
    .where("createdAt","<=", cutoff)
    .limit(BATCH_LIMIT)
    .get();

  const leads = snap2.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(l => !l.recoveryEmailSentAt);

  const now      = new Date().toISOString();
  let   sent     = 0;
  let   webhooks = 0;

  for (const lead of leads) {
    // 1. Mark immediately to prevent duplicates on concurrent runs
    await db.collection("leads").doc(lead.id).update({ recoveryEmailSentAt: now, updatedAt: now });

    // 2. Send recovery email (fire-and-forget)
    if (lead.email) {
      const { subject, html } = buildAbandonedCheckoutEmail(lead, { bookingUrl });
      sendEmail(lead.email, subject, html).catch(() => {});
      sent++;
    }

    // 3. CRM webhook (fire-and-forget)
    if (crmWebhookUrl) {
      fireCrmWebhook(crmWebhookUrl, "lead.recovery_email_sent", { ...lead, recoveryEmailSentAt: now });
      await db.collection("leads").doc(lead.id).update({ crmWebhookSentAt: now });
      webhooks++;
    }
  }

  return sendJson(res, 200, {
    ok: true,
    processed: leads.length,
    emailsSent: sent,
    webhooksFired: webhooks,
  });
}
