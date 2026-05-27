import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import localConfig from "../../firebase-applet-config.json";

/**
 * Dynamic Firebase config:
 * - In AI Studio / local dev: uses firebase-applet-config.json (auto-managed)
 * - In Vercel staging/production: uses VITE_FIREBASE_* env vars
 *
 * CRITICAL: the named Firestore database ID must be passed to getFirestore()
 * or all Firestore reads/writes will silently target the wrong (default) database.
 */
const useEnvConfig = Boolean(import.meta.env.VITE_FIREBASE_API_KEY);

const firebaseConfig = useEnvConfig
  ? {
      apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId:             import.meta.env.VITE_FIREBASE_APP_ID,
    }
  : localConfig;

// Named database ID: VITE_FIREBASE_DATABASE_ID for staging/prod,
// firestoreDatabaseId from the local config file for AI Studio.
const databaseId: string | undefined = useEnvConfig
  ? (import.meta.env.VITE_FIREBASE_DATABASE_ID || undefined)
  : (localConfig as any).firestoreDatabaseId;

const app = initializeApp(firebaseConfig);

export const db      = getFirestore(app, databaseId); /* CRITICAL: pass databaseId or Firestore targets the wrong database */
export const auth    = getAuth(app);
export const storage = getStorage(app);
