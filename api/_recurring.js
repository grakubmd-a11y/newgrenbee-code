/**
 * _recurring.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared server-side helpers for recurring-plan API endpoints.
 * Mirrors the pure date logic from src/shared/services/recurringPlanService.ts.
 */

import admin from "firebase-admin";
import { getFirestore as _adminGetFs } from "firebase-admin/firestore";

// ── Firebase Admin ────────────────────────────────────────────────────────────

let _db = null;

export function getFirestore() {
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

/** Initialises Firebase Admin (if not already) and returns admin.auth(). */
export function getAdminAuth() {
  getFirestore(); // ensures initializeApp was called
  return admin.apps.length ? admin.auth() : null;
}

/**
 * Verify a Firebase ID token from an `Authorization: Bearer <token>` header.
 * Returns the decoded token (with uid, email, etc.) or null on failure.
 */
export async function verifyIdToken(authorizationHeader = "") {
  const token = authorizationHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const auth = getAdminAuth();
  if (!auth) return null;
  try {
    return await auth.verifyIdToken(token);
  } catch {
    return null;
  }
}

// ── Date math — matches WP plugin calculate_next_utc ─────────────────────────

const RECURRENCE_INTERVALS = {
  weekly:      (d) => { d.setUTCDate(d.getUTCDate() + 7);  return d; },
  "bi-weekly": (d) => { d.setUTCDate(d.getUTCDate() + 14); return d; },
  monthly:     (d) => { d.setUTCMonth(d.getUTCMonth() + 1); return d; },
};

/**
 * Returns today's date as "YYYY-MM-DD" in Mountain Time (America/Denver).
 *
 * Why not new Date().toISOString().split("T")[0]?
 * toISOString() returns UTC. For users/servers in MDT (UTC-6) or MST (UTC-7),
 * after 6pm / 5pm respectively, UTC is already "tomorrow". This causes
 * same-day fee false positives, wrong billing dates, etc.
 *
 * en-CA locale formats dates as YYYY-MM-DD natively — no manual padding needed.
 */
export function localDateMT() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver" }).format(new Date());
}

/**
 * Advance fromDateStr (YYYY-MM-DD) by one recurrence interval.
 * Returns a YYYY-MM-DD string, or null if inputs are invalid.
 */
export function calculateNextChargeDate(fromDateStr, recurrence) {
  const advance = RECURRENCE_INTERVALS[recurrence];
  if (!advance || !fromDateStr) return null;
  // Parse as noon UTC to avoid DST boundary issues
  const d = new Date(`${fromDateStr}T12:00:00Z`);
  if (isNaN(d.getTime())) return null;
  return advance(d).toISOString().split("T")[0];
}

// ── Shared response helper ────────────────────────────────────────────────────

export function sendJson(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

export function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}
