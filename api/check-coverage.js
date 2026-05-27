/**
 * api/check-coverage.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-side ZIP code coverage check.
 * No auth required — coverage info is public.
 *
 * POST { zip }
 * → { covered: bool, active: bool, city?, state?, zipCode? }
 *
 * Fails open (covered: true, reason: "skipped") when Firebase Admin is not
 * configured so it never hard-blocks the booking flow.
 */

import { getFirestore, sendJson, parseBody } from "./_recurring.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const { zip } = parseBody(req);
  const clean = String(zip || "").replace(/\D/g, "").slice(0, 5);

  if (clean.length !== 5) {
    return sendJson(res, 400, { error: "zip must be a 5-digit US zip code." });
  }

  const db = getFirestore();
  if (!db) {
    return sendJson(res, 200, {
      covered: true,
      active:  true,
      reason:  "check-skipped",
    });
  }

  try {
    const snap = await db
      .collection("coverage")
      .where("zipCode", "==", clean)
      .limit(1)
      .get();

    if (snap.empty) {
      // Check whether the coverage collection has ANY docs so we can distinguish
      // "truly not covered" vs "no coverage data configured yet"
      const anySnap = await db.collection("coverage").limit(1).get();
      return sendJson(res, 200, {
        covered: false,
        active:  false,
        zipCode: clean,
        reason:  anySnap.empty ? "no-coverage-data" : "not-in-area",
      });
    }

    const doc    = snap.docs[0].data();
    const active = doc.active === true;

    return sendJson(res, 200, {
      covered: active,
      active,
      zipCode: clean,
      city:    doc.city  || null,
      state:   doc.state || null,
    });
  } catch (err) {
    return sendJson(res, 200, {
      covered: true,
      active:  true,
      reason:  "check-error",
    });
  }
}
