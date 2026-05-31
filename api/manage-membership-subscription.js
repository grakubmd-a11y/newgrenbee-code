/**
 * api/manage-membership-subscription.js
 * Pause, resume, or cancel a membership subscription.
 *
 * Auth: Firebase ID token in Authorization header.
 * Body: { subscriptionId, action: 'pause' | 'resume' | 'cancel' }
 */

import { getFirestore, verifyIdToken, sendJson, parseBody } from "./_recurring.js";

const VALID_ACTIONS = new Set(["pause", "resume", "cancel"]);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const decoded = await verifyIdToken(req.headers.authorization || "");
  if (!decoded) {
    return sendJson(res, 401, { error: "Valid Firebase ID token required." });
  }

  const db = getFirestore();
  if (!db) {
    return sendJson(res, 503, { error: "Firebase Admin credentials are not configured." });
  }

  const { subscriptionId, action } = parseBody(req);

  if (!subscriptionId || typeof subscriptionId !== "string") {
    return sendJson(res, 400, { error: "subscriptionId is required." });
  }
  if (!VALID_ACTIONS.has(action)) {
    return sendJson(res, 400, { error: `action must be one of: ${[...VALID_ACTIONS].join(", ")}.` });
  }

  const ref  = db.collection("membershipSubscriptions").doc(subscriptionId);
  const snap = await ref.get();

  if (!snap.exists) {
    return sendJson(res, 404, { error: "Subscription not found." });
  }

  const sub     = snap.data();
  const isOwner = sub.userId === decoded.uid;
  const isAdmin = decoded.admin === true;

  if (!isOwner && !isAdmin) {
    return sendJson(res, 403, { error: "You do not have permission to modify this subscription." });
  }

  const now = new Date().toISOString();
  let update = { updatedAt: now };

  switch (action) {
    case "pause":
      if (sub.status === "cancelled") {
        return sendJson(res, 409, { error: "Cannot pause a cancelled subscription." });
      }
      update = { ...update, status: "paused", pausedAt: now };
      break;

    case "resume":
      if (sub.status === "cancelled") {
        return sendJson(res, 409, { error: "Cannot resume a cancelled subscription." });
      }
      // If next billing date is in the past, advance it to one month from today
      let nextBilling = sub.nextBillingDate;
      if (nextBilling && nextBilling < now.split("T")[0]) {
        const d = new Date(`${now.split("T")[0]}T12:00:00Z`);
        d.setUTCMonth(d.getUTCMonth() + 1);
        nextBilling = d.toISOString().split("T")[0];
      }
      // Reset failureCount so a previously past_due / failed history doesn't
      // immediately re-trigger the past_due threshold after reactivation.
      update = { ...update, status: "active", pausedAt: null, nextBillingDate: nextBilling, failureCount: 0 };
      break;

    case "cancel":
      update = { ...update, status: "cancelled", cancelledAt: now, nextBillingDate: null };
      break;
  }

  await ref.update(update);
  const updated = { id: subscriptionId, ...sub, ...update };
  return sendJson(res, 200, { subscription: updated });
}
