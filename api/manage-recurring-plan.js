/**
 * api/manage-recurring-plan.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Mutates a recurring plan's state: pause / resume / cancel / skip.
 * Mirrors RecurringPlanService::pause_plan / resume_plan / cancel_plan /
 * skip_next_occurrence from the WP plugin.
 *
 * Auth: Firebase ID token in `Authorization: Bearer <token>` header.
 *       Only the owner (plan.userId) or an admin can mutate the plan.
 *
 * Body:
 *   planId   string           Firestore document ID in `recurringPlans`
 *   action   'pause' | 'resume' | 'cancel' | 'skip'
 */

import {
  getFirestore,
  verifyIdToken,
  calculateNextChargeDate,
  sendJson,
  parseBody,
} from "./_recurring.js";

const VALID_ACTIONS = new Set(["pause", "resume", "cancel", "skip"]);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const decoded = await verifyIdToken(req.headers.authorization || "");
  if (!decoded) {
    return sendJson(res, 401, { error: "Valid Firebase ID token required." });
  }

  const db = getFirestore();
  if (!db) {
    return sendJson(res, 503, {
      error: "Firebase Admin credentials are not configured on this server.",
    });
  }

  // ── Validate input ────────────────────────────────────────────────────────
  const { planId, action } = parseBody(req);

  if (!planId || typeof planId !== "string") {
    return sendJson(res, 400, { error: "planId is required." });
  }
  if (!VALID_ACTIONS.has(action)) {
    return sendJson(res, 400, { error: `action must be one of: ${[...VALID_ACTIONS].join(", ")}.` });
  }

  // ── Load & authorise plan ─────────────────────────────────────────────────
  const ref  = db.collection("recurringPlans").doc(planId);
  const snap = await ref.get();

  if (!snap.exists) {
    return sendJson(res, 404, { error: "Recurring plan not found." });
  }

  const plan = snap.data();
  const isOwner = plan.userId === decoded.uid;
  const isAdmin = decoded.admin === true;

  if (!isOwner && !isAdmin) {
    return sendJson(res, 403, { error: "You do not have permission to modify this plan." });
  }

  const now = new Date().toISOString();
  let update = { updatedAt: now };

  // ── Apply action ──────────────────────────────────────────────────────────
  switch (action) {
    case "pause":
      if (plan.status === "cancelled") {
        return sendJson(res, 409, { error: "Cannot pause a cancelled plan." });
      }
      update = { ...update, status: "paused", pausedAt: now };
      break;

    case "resume":
      if (plan.status === "cancelled") {
        return sendJson(res, 409, { error: "Cannot resume a cancelled plan." });
      }
      // If nextChargeAt is missing or already in the past, recalculate from today
      const baseDate = plan.nextChargeAt && new Date(plan.nextChargeAt) > new Date()
        ? plan.nextChargeAt
        : new Date().toISOString().split("T")[0];
      const newNext = calculateNextChargeDate(baseDate, plan.recurrence) || baseDate;
      update = {
        ...update,
        status:      "active",
        pausedAt:    null,
        nextChargeAt: newNext,
      };
      break;

    case "cancel":
      update = {
        ...update,
        status:       "cancelled",
        cancelledAt:  now,
        nextChargeAt: null,
      };
      break;

    case "skip": {
      if (plan.status !== "active") {
        return sendJson(res, 409, { error: "Only active plans can have an occurrence skipped." });
      }
      const currentNext = plan.nextChargeAt || new Date().toISOString().split("T")[0];
      const skippedNext = calculateNextChargeDate(currentNext, plan.recurrence);
      if (!skippedNext) {
        return sendJson(res, 400, { error: "Could not compute next occurrence date." });
      }
      update = { ...update, nextChargeAt: skippedNext };
      break;
    }

    default:
      return sendJson(res, 400, { error: "Unknown action." });
  }

  // ── Persist ───────────────────────────────────────────────────────────────
  try {
    await ref.update(update);
    const updated = (await ref.get()).data();
    return sendJson(res, 200, {
      ok:   true,
      plan: { id: planId, ...updated },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not update plan.";
    return sendJson(res, 500, { error: msg });
  }
}
