import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import localConfig from "../../firebase-applet-config.json";

/**
 * Dynamic Firebase config:
 * - Local dev: uses firebase-applet-config.json (auto-managed by AI Studio)
 * - Vercel staging/production: uses NEXT_PUBLIC_FIREBASE_* env vars
 *
 * CRITICAL: the named Firestore database ID must be passed to getFirestore()
 * or all Firestore reads/writes will silently target the wrong (default) database.
 *
 * Vercel env vars to set (rename from VITE_FIREBASE_* → NEXT_PUBLIC_FIREBASE_*):
 *   NEXT_PUBLIC_FIREBASE_API_KEY
 *   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID
 *   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
 *   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
 *   NEXT_PUBLIC_FIREBASE_APP_ID
 *   NEXT_PUBLIC_FIREBASE_DATABASE_ID
 */
const useEnvConfig = Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);

const firebaseConfig = useEnvConfig
  ? {
      apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    }
  : localConfig;

const databaseId: string | undefined = useEnvConfig
  ? (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || undefined)
  : (localConfig as any).firestoreDatabaseId;

// Guard against re-initialization in Next.js (hot reload)
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const db      = getFirestore(app, databaseId); /* CRITICAL: named database */
export const auth    = getAuth(app);
export const storage = getStorage(app);
