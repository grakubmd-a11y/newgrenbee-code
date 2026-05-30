/**
 * api/release-hold.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Deletes a slot hold created by hold-slot.js.
 * Called when the user navigates back, closes the wizard, or completes checkout
 * (in which case the real booking replaces the hold).
 *
 * No auth required — holdId is a random Firestore ID that acts as a token.
 *
 * POST { holdId }
 * Response 200: { ok }
 */

import { getFirestore, sendJson, parseBody } from "./_recurring.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const { holdId } = parseBody(req);
  if (!holdId || typeof holdId !== "string") {
    return sendJson(res, 400, { error: "holdId is required." });
  }

  const db = getFirestore();
  if (!db) return sendJson(res, 200, { ok: true }); // fail-open

  try {
    await db.collection("slotHolds").doc(holdId).delete();
  } catch {
    // Hold may have already expired and been cleaned up — that's fine
  }

  return sendJson(res, 200, { ok: true });
}
