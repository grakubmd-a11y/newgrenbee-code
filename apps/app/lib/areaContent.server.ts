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

// Default active service IDs — matches SiteSettingsContext defaults.
// Only used as fallback when Firestore settings/business is unavailable.
const DEFAULT_ACTIVE_SERVICE_IDS = [
  "house-cleaning",
  "lawn-mowing",
  "tv-installation",
  "vacation-rental-turnover",
];

/**
 * Fetch globally active service IDs from Firestore settings.
 * Used to filter city serviceBlocks at render time so that globally
 * deactivated services automatically disappear from all city pages.
 */
async function getActiveServiceIds(): Promise<string[]> {
  const db = getAdminDb();
  if (db) {
    try {
      const doc = await db.collection("settings").doc("business").get();
      const ids = doc.data()?.activeServiceIds;
      if (Array.isArray(ids) && ids.length > 0) return ids as string[];
    } catch { /* fall through */ }
  }
  return DEFAULT_ACTIVE_SERVICE_IDS;
}

/**
 * Filter an AreaContent's serviceBlocks to only include globally active services.
 * Per-city control: admin removes service blocks in AreaContentTab.
 * Global control: admin deactivates a service in Settings → disappears everywhere.
 */
function filterServiceBlocks(content: AreaContent, activeIds: string[]): AreaContent {
  return {
    ...content,
    serviceBlocks: content.serviceBlocks.filter((s) => activeIds.includes(s.serviceId)),
  };
}

/** Fetch one area by slug — Firestore first, LAUNCH_AREAS fallback. */
export async function getAreaBySlug(slug: string): Promise<AreaContent | null> {
  const [db, activeIds] = await Promise.all([
    Promise.resolve(getAdminDb()),
    getActiveServiceIds(),
  ]);

  let content: AreaContent | null = null;

  if (db) {
    try {
      const snap = await db
        .collection("areaContent")
        .where("slug", "==", slug)
        .limit(1)
        .get();
      if (!snap.empty) {
        const d = snap.docs[0];
        content = { id: d.id, ...d.data() } as AreaContent;
      }
    } catch { /* fall through to launch data */ }
  }

  if (!content) {
    content = LAUNCH_AREAS.find((a) => a.slug === slug) ?? null;
  }

  return content ? filterServiceBlocks(content, activeIds) : null;
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
    } catch { /* fall through to launch slugs only */ }
  }
  return Array.from(slugs);
}

/** All active areas (full content) — for the /areas directory hub. */
export async function getAllAreas(): Promise<AreaContent[]> {
  const [activeIds] = await Promise.all([getActiveServiceIds()]);
  const db = getAdminDb();
  if (db) {
    try {
      const snap = await db
        .collection("areaContent")
        .where("active", "==", true)
        .get();
      if (!snap.empty) {
        return snap.docs
          .map((d) => filterServiceBlocks({ id: d.id, ...d.data() } as AreaContent, activeIds));
      }
    } catch { /* fall through */ }
  }
  return LAUNCH_AREAS.filter((a) => a.active).map((a) => filterServiceBlocks(a, activeIds));
}

/** Business phone for CTAs — settings/business doc, with a safe fallback. */
export async function getBusinessPhone(): Promise<string> {
  const db = getAdminDb();
  if (db) {
    try {
      const doc = await db.collection("settings").doc("business").get();
      const phone = (doc.data()?.phone as string | undefined)?.trim();
      if (phone) return phone;
    } catch { /* fall through */ }
  }
  return DEFAULT_PHONE;
}
