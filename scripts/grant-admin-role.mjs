import { readFile } from "node:fs/promises";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...valueParts] = arg.replace(/^--/, "").split("=");
    return [key, valueParts.join("=")];
  })
);

const serviceAccountPath = args.serviceAccount || process.env.GOOGLE_APPLICATION_CREDENTIALS;
const email = args.email;
const uidArg = args.uid;
const role = args.role || "admin";

if (!serviceAccountPath) {
  throw new Error("Missing --serviceAccount=/absolute/path/service-account.json");
}

if (!email && !uidArg) {
  throw new Error("Provide --email=user@example.com or --uid=firebaseUid");
}

if (!["admin", "manager"].includes(role)) {
  throw new Error('Role must be "admin" or "manager".');
}

const serviceAccount = JSON.parse(await readFile(serviceAccountPath, "utf8"));

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
}

const auth = getAuth();
const firestore = getFirestore(undefined, "ai-studio-590843c3-6656-4faa-a42c-fc98f2b5ecb1");

const user = uidArg ? await auth.getUser(uidArg) : await auth.getUserByEmail(email);
const userRef = firestore.collection("users").doc(user.uid);
const existing = await userRef.get();
const now = new Date().toISOString();

await userRef.set(
  {
    uid: user.uid,
    email: user.email || email || "",
    name: user.displayName || existing.data()?.name || user.email?.split("@")[0] || "Admin",
    role,
    updatedAt: now,
    createdAt: existing.data()?.createdAt || now
  },
  { merge: true }
);

console.log(`Granted ${role} access to ${user.email || user.uid}`);
console.log(`Firestore document: users/${user.uid}`);
