/**
 * Server-side area content fetchers.
 *
 * Strategy: Firestore (`areaContent`) is the editable override layer; the
 * LAUNCH_AREAS module is the always-available source of truth and build-time
 * fallback. This lets generateStaticParams run without credentials and keeps
 * pages rendering even if the Admin SDK is unavailable.
 *
 * NOTE: server-only — pulls in firebase-admin. Do not import from client code.
 */
import type { AreaContent } from "@grenbee/types";
import { getAdminDb } from "./firebaseAdmin";
import { LAUNCH_AREAS, LAUNCH_AREA_SLUGS } from "./launchAreas";

const DEFAULT_PHONE = "(385) 250-0000";

/** Fetch one area by slug — Firestore first, LAUNCH_AREAS fallback. */
export async function getAreaBySlug(slug: string): Promise<AreaContent | null> {
  const db = getAdminDb();
  if (db) {
    try {
      const snap = await db
        .collection("areaContent")
        .where("slug", "==", slug)
        .limit(1)
        .get();
      if (!snap.empty) {
        const d = snap.docs[0];
        return { id: d.id, ...d.data() } as AreaContent;
      }
    } catch {
      /* fall through to launch data */
    }
  }
  return LAUNCH_AREAS.find((a) => a.slug === slug) ?? null;
}

/** All active area slugs — union of Firestore actives and LAUNCH_AREAS. */
export async function getAllAreaSlugs(): Promise<string[]> {
  const slugs = new Set<string>(LAUNCH_AREA_SLUGS);
  const db = getAdminDb();
  if (db) {
    try {
      const snap = await db
        .collection("areaContent")
        .where("active", "==", true)
        .get();
      snap.docs.forEach((d) => {
        const s = (d.data() as AreaContent).slug;
        if (s) slugs.add(s);
      });
    } catch {
      /* fall through to launch slugs only */
    }
  }
  return Array.from(slugs);
}

/** All active areas (full content) — for the /areas directory hub. */
export async function getAllAreas(): Promise<AreaContent[]> {
  const db = getAdminDb();
  if (db) {
    try {
      const snap = await db
        .collection("areaContent")
        .where("active", "==", true)
        .get();
      if (!snap.empty) {
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AreaContent);
      }
    } catch {
      /* fall through */
    }
  }
  return LAUNCH_AREAS.filter((a) => a.active);
}

/** Business phone for CTAs — settings/business doc, with a safe fallback. */
export async function getBusinessPhone(): Promise<string> {
  const db = getAdminDb();
  if (db) {
    try {
      const doc = await db.collection("settings").doc("business").get();
      const phone = (doc.data()?.phone as string | undefined)?.trim();
      if (phone) return phone;
    } catch {
      /* fall through */
    }
  }
  return DEFAULT_PHONE;
}
