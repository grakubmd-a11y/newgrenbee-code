/**
 * Server-only Firebase Admin helper.
 *
 * Mirrors the inline init used across api/*.js (e.g. api/confirm-payment.js):
 * reads FIREBASE_SERVICE_ACCOUNT_JSON (or FIREBASE_ADMIN_CREDENTIALS) and the
 * named-database id FIREBASE_DATABASE_ID.
 *
 * Used by server components / route handlers to read content at build time
 * (generateStaticParams) and request time (ISR). NEVER import from a client
 * component — firebase-admin is Node-only and will break the browser bundle.
 */
import admin from "firebase-admin";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let _db: Firestore | null = null;

/** Returns the admin Firestore instance, or null when credentials are absent. */
export function getAdminDb(): Firestore | null {
  if (_db) return _db;

  const json =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_ADMIN_CREDENTIALS;
  if (!json || json.includes("REPLACE_ME")) return null;

  try {
    const app = admin.apps.length
      ? admin.apps[0]!
      : admin.initializeApp({
          credential: admin.credential.cert(JSON.parse(json)),
        });
    const dbId = process.env.FIREBASE_DATABASE_ID;
    _db = dbId ? getFirestore(app, dbId) : getFirestore(app);
    return _db;
  } catch {
    return null;
  }
}
