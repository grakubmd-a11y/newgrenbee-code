/**
 * api/update-lead.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin updates a lead's status and/or notes.
 * Fires the CRM webhook on every status change if crmWebhookUrl is set.
 *
 * Auth: admin or manager.
 *
 * POST { leadId, status?, notes?, convertedBookingId? }
 * Response 200: { ok, lead }
 */

import { getFirestore, verifyIdToken, sendJson, parseBody } from "./_recurring.js";

const VALID_STATUSES = new Set(["new", "contacted", "recovered", "lost"]);

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
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const decoded = await verifyIdToken(req.headers.authorization || "");
  if (!decoded) return sendJson(res, 401, { error: "Valid Firebase ID token required." });

  const isAdmin   = decoded.admin === true;
  const isManager = decoded.role  === "manager";
  if (!isAdmin && !isManager) return sendJson(res, 403, { error: "Admin or manager role required." });

  const db = getFirestore();
  if (!db) return sendJson(res, 503, { error: "Firebase Admin not configured." });

  const { leadId, status, notes, convertedBookingId } = parseBody(req);

  if (!leadId) return sendJson(res, 400, { error: "leadId is required." });
  if (status && !VALID_STATUSES.has(status)) {
    return sendJson(res, 400, { error: `status must be one of: ${[...VALID_STATUSES].join(", ")}.` });
  }

  const ref  = db.collection("leads").doc(leadId);
  const snap = await ref.get();
  if (!snap.exists) return sendJson(res, 404, { error: "Lead not found." });

  const now    = new Date().toISOString();
  const update = { updatedAt: now };

  if (status)              update.status      = status;
  if (notes !== undefined) update.notes       = notes;
  if (convertedBookingId)  update.convertedBookingId = convertedBookingId;
  if (status === "contacted") update.lastContactedAt = now;
  if (status === "recovered" && convertedBookingId) update.convertedBookingId = convertedBookingId;

  await ref.update(update);

  const updated = { id: snap.id, ...snap.data(), ...update };

  // ── CRM webhook (fire-and-forget) ─────────────────────────────────────────
  if (status) {
    const settingsSnap = await db.collection("settings").doc("business").get().catch(() => null);
    const webhookUrl   = settingsSnap?.data()?.crmWebhookUrl;
    if (webhookUrl) {
      fireCrmWebhook(webhookUrl, `lead.${status}`, updated);
      await ref.update({ crmWebhookSentAt: now });
    }
  }

  return sendJson(res, 200, { ok: true, lead: updated });
}
