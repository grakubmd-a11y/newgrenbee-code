/**
 * api/invite-staff.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Sends a staff portal invitation email to a technician.
 * Called by the admin panel right after creating or editing a staff member.
 *
 * Auth:   Firebase ID token with role=admin or role=manager.
 * Method: POST
 * Body:   { staffId: string }  — the /staff/{staffId} doc to invite
 *
 * Response 200: { ok: true, sent: boolean, email: string }
 */

import { getFirestore, verifyIdToken, sendJson } from "./_recurring.js";
import { buildStaffInviteEmail, sendEmail } from "./_mailer.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  // ── Auth: admin or manager only ───────────────────────────────────────────
  const decoded = await verifyIdToken(req.headers.authorization || "");
  if (!decoded) {
    return sendJson(res, 401, { error: "Valid Firebase ID token required." });
  }

  const db = getFirestore();
  if (!db) {
    return sendJson(res, 503, { error: "Firebase Admin not configured." });
  }

  // Check caller is admin or manager
  let callerRole = null;
  try {
    const callerDoc = await db.collection("users").doc(decoded.uid || decoded.user_id).get();
    callerRole = callerDoc.data()?.role || null;
  } catch (_) {}

  const isAdmin   = decoded.admin === true || callerRole === "admin";
  const isManager = callerRole === "manager";

  if (!isAdmin && !isManager) {
    return sendJson(res, 403, { error: "Admin or manager role required." });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch (_) {}

  const { staffId } = body || {};
  if (!staffId) {
    return sendJson(res, 400, { error: "staffId is required." });
  }

  // ── Load staff doc ────────────────────────────────────────────────────────
  const staffDoc = await db.collection("staff").doc(staffId).get();
  if (!staffDoc.exists) {
    return sendJson(res, 404, { error: "Staff member not found." });
  }

  const staff = { id: staffDoc.id, ...staffDoc.data() };

  if (!staff.email) {
    return sendJson(res, 400, { error: "Staff member has no email address." });
  }

  // ── Get caller name for the invitation ───────────────────────────────────
  let adminName = "Greenbee Admin";
  try {
    const callerDoc = await db.collection("users").doc(decoded.uid || decoded.user_id).get();
    adminName = callerDoc.data()?.name || adminName;
  } catch (_) {}

  // ── Send invitation email ─────────────────────────────────────────────────
  const portalUrl = process.env.STAFF_PORTAL_URL || "https://grenbee.com/staff";
  const { subject, html } = buildStaffInviteEmail(staff, { portalUrl, adminName });
  const result = await sendEmail(staff.email, subject, html);

  // ── Record activity ───────────────────────────────────────────────────────
  try {
    const actId = `staff-invite-${staffId}-${Date.now()}`;
    await db.collection("activity").doc(actId).set({
      id:          actId,
      type:        "staff_invited",
      entityType:  "staff",
      entityId:    staffId,
      title:       `Invitation sent to ${staff.name}`,
      detail:      `Portal access email sent to ${staff.email}. Delivered: ${result.sent}.`,
      actorName:   adminName,
      actorEmail:  decoded.email || "",
      severity:    result.sent ? "success" : "warning",
      createdAt:   new Date().toISOString(),
    });
  } catch (_) {}

  return sendJson(res, 200, {
    ok:    true,
    sent:  result.sent,
    email: staff.email,
    reason: result.reason || null,
  });
}
