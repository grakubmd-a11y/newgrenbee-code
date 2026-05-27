import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where,
  orderBy,
  limit as queryLimit,
  increment,
  getDocFromServer,
  deleteDoc
} from "firebase/firestore";
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  sendPasswordResetEmail,
  signOut,
  User as FirebaseUser,
  onAuthStateChanged
} from "firebase/auth";
import { db, auth } from "../firebase";
import { AdminActivityEvent, Booking, BookingStatus, CouponRule, Review, Service, Staff, Coverage, BusinessSettings, RecurringPlan } from "../types";

// Operation types for the error reporter
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Handles Firestore security and permission errors conformant to the Firebase Integration Skill.
 */
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Validates connection to Firestore as requested by the skill.
 */
export async function validateFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration: Client is offline");
    }
    // Expected a permission-denied or similar since test/connection does not exist,
    // but if it is actually connected, it won't be a network offline error.
    return ! (error instanceof Error && error.message.includes('client is offline'));
  }
}

// ==========================================
// USER PROFILE METHODS
// ==========================================

export interface UserProfile {
  uid: string;
  name: string;        // kept for backward-compat; always mirrors `${firstName} ${lastName}`
  firstName?: string;
  lastName?: string;
  email: string;
  role?: "admin" | "manager" | "staff" | "customer";
  phone?: string;
  address?: string;
  activeMembership?: string | null;
  petsStatus?: string;
  keyPreferences?: string;
  lockboxCode?: string;
  specialNote?: string;
  cardName?: string;
  cardNumber?: string;
  cardExpiry?: string;
  cardProvider?: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const docSnap = await getDoc(doc(db, "users", uid));
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveUserProfile(uid: string, profile: Partial<UserProfile>): Promise<void> {
  const path = `users/${uid}`;
  try {
    const existing = await getUserProfile(uid);
    const now = new Date().toISOString();

    const pick = <T>(incoming: T | undefined, fallback: T): T =>
      incoming !== undefined ? incoming : fallback;

    // Derive the canonical display name from firstName/lastName when provided
    const incomingFirst = profile.firstName !== undefined ? profile.firstName : existing?.firstName;
    const incomingLast  = profile.lastName  !== undefined ? profile.lastName  : existing?.lastName;
    const derivedName   =
      incomingFirst || incomingLast
        ? [incomingFirst, incomingLast].filter(Boolean).join(" ")
        : undefined;

    const dataToSave = {
      uid,
      name: derivedName ?? pick(profile.name, existing?.name ?? ""),
      firstName: incomingFirst ?? "",
      lastName:  incomingLast  ?? "",
      email: pick(profile.email, existing?.email ?? ""),
      role: pick(profile.role, existing?.role ?? "customer"),
      phone: pick(profile.phone, existing?.phone ?? ""),
      address: pick(profile.address, existing?.address ?? ""),
      activeMembership: pick(profile.activeMembership, existing?.activeMembership ?? null),
      petsStatus: pick(profile.petsStatus, existing?.petsStatus ?? "none"),
      keyPreferences: pick(profile.keyPreferences, existing?.keyPreferences ?? "lockbox"),
      lockboxCode: pick(profile.lockboxCode, existing?.lockboxCode ?? ""),
      specialNote: pick(profile.specialNote, existing?.specialNote ?? ""),
      cardName: pick(profile.cardName, existing?.cardName ?? ""),
      cardNumber: pick(profile.cardNumber, existing?.cardNumber ?? ""),
      cardExpiry: pick(profile.cardExpiry, existing?.cardExpiry ?? ""),
      cardProvider: pick(profile.cardProvider, existing?.cardProvider ?? "visa"),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };

    await setDoc(doc(db, "users", uid), dataToSave);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ==========================================
// BOOKINGS METHODS
// ==========================================

export async function fetchUserBookings(email: string, uid?: string): Promise<Booking[]> {
  const path = "bookings";
  try {
    // If we have a user logged in, match by userId OR email
    let q;
    if (uid) {
      q = query(collection(db, "bookings"), where("userId", "==", uid));
    } else {
      q = query(collection(db, "bookings"), where("email", "==", email.toLowerCase()));
    }
    
    const querySnapshot = await getDocs(q);
    const bookings: Booking[] = [];
    querySnapshot.forEach((doc) => {
      bookings.push(doc.data() as Booking);
    });
    
    // Sort by createdAt descending
    return bookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchAllBookingsForAdmin(): Promise<Booking[]> {
  const path = "bookings";
  try {
    const querySnapshot = await getDocs(collection(db, "bookings"));
    const bookings: Booking[] = [];
    querySnapshot.forEach((doc) => {
      bookings.push(doc.data() as Booking);
    });

    return bookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createBookingInFirestore(booking: Booking): Promise<void> {
  const path = `bookings/${booking.id}`;
  try {
    // Race against a 10-second timeout so a Firestore connectivity issue
    // never freezes the UI — the booking is still saved locally and retried
    // by Firestore's offline queue once connectivity is restored.
    const writePromise = setDoc(doc(db, "bookings", booking.id), booking);
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Firestore write timed out after 10 s")), 10_000)
    );
    await Promise.race([writePromise, timeout]);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateBookingInFirestore(
  bookingId: string, 
  updates: Partial<Booking>
): Promise<void> {
  const path = `bookings/${bookingId}`;
  try {
    await updateDoc(doc(db, "bookings", bookingId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ==========================================
// REVIEWS METHODS
// ==========================================

export async function fetchReviewsFromFirestore(): Promise<Review[]> {
  const path = "reviews";
  try {
    const querySnapshot = await getDocs(collection(db, "reviews"));
    const reviews: Review[] = [];
    querySnapshot.forEach((doc) => {
      reviews.push(doc.data() as Review);
    });

    return reviews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createReviewInFirestore(review: Review): Promise<void> {
  const path = `reviews/${review.id}`;
  try {
    await setDoc(doc(db, "reviews", review.id), review);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function incrementReviewHelpfulCount(reviewId: string): Promise<void> {
  const path = `reviews/${reviewId}`;
  try {
    await updateDoc(doc(db, "reviews", reviewId), {
      helpfulCount: increment(1)
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteReviewFromFirestore(reviewId: string): Promise<void> {
  const path = `reviews/${reviewId}`;
  try {
    await deleteDoc(doc(db, "reviews", reviewId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// SERVICES METHODS
// ==========================================

export async function fetchServicesFromFirestore(): Promise<Service[]> {
  const path = "services";
  try {
    const querySnapshot = await getDocs(collection(db, "services"));
    const servicesList: Service[] = [];
    querySnapshot.forEach((docSnap) => {
      servicesList.push(docSnap.data() as Service);
    });

    return servicesList;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveServiceInFirestore(service: Service): Promise<void> {
  const path = `services/${service.id}`;
  try {
    await setDoc(doc(db, "services", service.id), service);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteServiceFromFirestore(serviceId: string): Promise<void> {
  const path = `services/${serviceId}`;
  try {
    await deleteDoc(doc(db, "services", serviceId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// STAFF METHODS
// ==========================================

export async function fetchStaffFromFirestore(): Promise<Staff[]> {
  const path = "staff";
  try {
    const querySnapshot = await getDocs(collection(db, "staff"));
    const staffList: Staff[] = [];
    querySnapshot.forEach((docSnap) => {
      staffList.push(docSnap.data() as Staff);
    });

    return staffList;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveStaffInFirestore(staff: Staff): Promise<void> {
  const path = `staff/${staff.id}`;
  try {
    await setDoc(doc(db, "staff", staff.id), staff);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteStaffFromFirestore(staffId: string): Promise<void> {
  const path = `staff/${staffId}`;
  try {
    await deleteDoc(doc(db, "staff", staffId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// COVERAGE METHODS
// ==========================================

export async function fetchCoverageFromFirestore(): Promise<Coverage[]> {
  const path = "coverage";
  try {
    const querySnapshot = await getDocs(collection(db, "coverage"));
    const coverageList: Coverage[] = [];
    querySnapshot.forEach((docSnap) => {
      coverageList.push(docSnap.data() as Coverage);
    });

    return coverageList;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveCoverageInFirestore(coverage: Coverage): Promise<void> {
  const path = `coverage/${coverage.zipCode}`;
  try {
    await setDoc(doc(db, "coverage", coverage.zipCode), {
      zipCode: coverage.zipCode,
      city: coverage.city,
      state: coverage.state,
      active: coverage.active
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCoverageFromFirestore(zipCode: string): Promise<void> {
  const path = `coverage/${zipCode}`;
  try {
    await deleteDoc(doc(db, "coverage", zipCode));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// SETTINGS METHODS
// ==========================================

export async function fetchPublicSettingsFromFirestore(): Promise<BusinessSettings | null> {
  const path = "settings/business";
  try {
    const docSnap = await getDoc(doc(db, "settings", "business"));
    if (!docSnap.exists()) {
      return null;
    }
    return docSnap.data() as BusinessSettings;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function fetchSettingsFromFirestore(): Promise<BusinessSettings> {
  const path = "settings/business";
  try {
    const docSnap = await getDoc(doc(db, "settings", "business"));
    if (docSnap.exists()) {
      return docSnap.data() as BusinessSettings;
    }

    const defaultBiz: BusinessSettings = {
      id: "business",
      name: "Greenbee Home Services Hub",
      phone: "(800) 555-GREE",
      email: "hola@greenbee.com",
      timezone: "Central Standard Time (CST)",
      bookingEnabled: true,
      stripeMode: "test",
      stripePublishableKey: "",
      googleMapsEnabled: false,
      googleMapsApiKey: "",
      googleMapsAutocompleteEnabled: true,
      googleAuthEnabled: true
    };

    console.log("Seeding business settings into Firestore...");
    await setDoc(doc(db, "settings", "business"), defaultBiz);
    return defaultBiz;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveSettingsInFirestore(settings: BusinessSettings): Promise<void> {
  const path = "settings/business";
  try {
    await setDoc(doc(db, "settings", "business"), {
      id: "business",
      name: settings.name,
      phone: settings.phone,
      email: settings.email,
      timezone: settings.timezone,
      bookingEnabled: settings.bookingEnabled,
      stripeMode: settings.stripeMode || "test",
      stripePublishableKey: settings.stripePublishableKey || "",
      googleMapsEnabled: settings.googleMapsEnabled || false,
      googleMapsApiKey: settings.googleMapsApiKey || "",
      googleMapsAutocompleteEnabled: settings.googleMapsAutocompleteEnabled !== false,
      googleAuthEnabled: settings.googleAuthEnabled !== false
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ==========================================
// ADMIN ACTIVITY METHODS
// ==========================================

export async function fetchActivityFromFirestore(maxItems = 80): Promise<AdminActivityEvent[]> {
  const path = "activity";
  try {
    const q = query(
      collection(db, "activity"),
      orderBy("createdAt", "desc"),
      queryLimit(maxItems)
    );
    const querySnapshot = await getDocs(q);
    const events: AdminActivityEvent[] = [];
    querySnapshot.forEach((docSnap) => {
      events.push(docSnap.data() as AdminActivityEvent);
    });
    return events;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function logAdminActivity(event: AdminActivityEvent): Promise<void> {
  const path = `activity/${event.id}`;
  try {
    await setDoc(doc(db, "activity", event.id), event);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ==========================================
// COUPON METHODS
// ==========================================

export async function fetchCouponsFromFirestore(): Promise<CouponRule[]> {
  const path = "coupons";
  try {
    const querySnapshot = await getDocs(collection(db, "coupons"));
    const coupons: CouponRule[] = [];
    querySnapshot.forEach((docSnap) => {
      coupons.push(docSnap.data() as CouponRule);
    });
    return coupons.sort((a, b) => a.code.localeCompare(b.code));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchPublicCouponByCode(code: string): Promise<CouponRule | null> {
  const normalizedCode = code.trim().toUpperCase();
  const couponId = normalizedCode.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "");
  const path = `coupons/${couponId}`;

  if (!couponId) {
    return null;
  }

  try {
    const docSnap = await getDoc(doc(db, "coupons", couponId));
    if (!docSnap.exists()) {
      return null;
    }

    const coupon = docSnap.data() as CouponRule;
    if (!coupon.enabled || coupon.code.trim().toUpperCase() !== normalizedCode) {
      return null;
    }

    return coupon;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveCouponInFirestore(coupon: CouponRule): Promise<void> {
  const normalizedCode = coupon.code.trim().toUpperCase();
  const path = `coupons/${coupon.id}`;
  try {
    await setDoc(doc(db, "coupons", coupon.id), {
      ...coupon,
      code: normalizedCode,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCouponFromFirestore(couponId: string): Promise<void> {
  const path = `coupons/${couponId}`;
  try {
    await deleteDoc(doc(db, "coupons", couponId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// AUTH UTILITIES
// ==========================================

function createGoogleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: "select_account"
  });
  return provider;
}

export function getFirebaseAuthErrorMessage(error: unknown): string {
  const err = error as { code?: string; message?: string };
  switch (err?.code) {
    // Google
    case "auth/popup-blocked":
      return "El navegador bloqueó la ventana de Google. Usa la opción de redirección.";
    case "auth/popup-closed-by-user":
      return "La ventana de Google se cerró antes de terminar el login.";
    case "auth/cancelled-popup-request":
      return "Ya había una ventana de login abierta. Cierra la anterior e intenta otra vez.";
    case "auth/unauthorized-domain":
      return "Este dominio no está autorizado en Firebase Authentication. Agrégalo en Firebase > Authentication > Settings > Authorized domains.";
    case "auth/operation-not-allowed":
      return "Este método de inicio de sesión no está habilitado en Firebase Authentication > Sign-in method.";
    case "auth/network-request-failed":
      return "Firebase no pudo conectarse. Revisa tu conexión a internet.";
    case "auth/web-storage-unsupported":
      return "El navegador está bloqueando el almacenamiento necesario para Firebase Auth.";
    // Email/contraseña
    case "auth/user-not-found":
    case "auth/invalid-credential":
      return "Correo o contraseña incorrectos.";
    case "auth/wrong-password":
      return "Contraseña incorrecta. Inténtalo de nuevo.";
    case "auth/email-already-in-use":
      return "Ya existe una cuenta con ese correo. Inicia sesión en su lugar.";
    case "auth/weak-password":
      return "La contraseña debe tener al menos 6 caracteres.";
    case "auth/invalid-email":
      return "El formato del correo no es válido.";
    case "auth/too-many-requests":
      return "Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.";
    default:
      return err?.message || "No se pudo iniciar sesión. Inténtalo de nuevo.";
  }
}

export async function signInWithEmail(email: string, password: string): Promise<FirebaseUser> {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    console.error("Email Sign In Error:", error);
    throw error;
  }
}

export async function signUpWithEmail(email: string, password: string): Promise<FirebaseUser> {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    console.error("Email Sign Up Error:", error);
    throw error;
  }
}

export async function signInWithGooglePopup(): Promise<FirebaseUser | null> {
  const provider = createGoogleProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signInWithGoogleRedirect(): Promise<void> {
  const provider = createGoogleProvider();
  await signInWithRedirect(auth, provider);
}

export async function getGoogleRedirectResult(): Promise<FirebaseUser | null> {
  try {
    const result = await getRedirectResult(auth);
    return result?.user || null;
  } catch (error) {
    console.error("Google Redirect Result Error:", error);
    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Sign Out Error:", error);
    throw error;
  }
}

export function subscribeToAuthChanges(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Returns true if the current user has an email/password provider linked.
 * Google-only users don't have a password to change.
 */
export function currentUserHasPasswordProvider(): boolean {
  return auth.currentUser?.providerData.some((p) => p.providerId === "password") ?? false;
}

/**
 * Updates the password for the currently signed-in email/password user.
 * Requires reauthentication (current password) because Firebase enforces it
 * for security-sensitive operations.
 */
export async function updateUserPassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("No hay sesión activa.");

  // Reauthenticate first so Firebase allows the sensitive change
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  try {
    await reauthenticateWithCredential(user, credential);
  } catch (err: any) {
    const code = err?.code ?? "";
    if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
      throw new Error("La contraseña actual es incorrecta.");
    }
    if (code === "auth/too-many-requests") {
      throw new Error("Demasiados intentos. Espera unos minutos.");
    }
    throw new Error("No se pudo verificar tu identidad. Inténtalo de nuevo.");
  }

  // Now update to the new password
  try {
    await updatePassword(user, newPassword);
  } catch (err: any) {
    const code = err?.code ?? "";
    if (code === "auth/weak-password") {
      throw new Error("La contraseña debe tener al menos 6 caracteres.");
    }
    throw new Error("No se pudo actualizar la contraseña. Inténtalo de nuevo.");
  }
}

/**
 * Sends a password-reset email via Firebase Auth.
 * Works for any email address registered with email/password provider.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (err: any) {
    const code = err?.code ?? "";
    if (code === "auth/user-not-found" || code === "auth/invalid-email") {
      // Don't reveal whether email exists — silently succeed for security
      return;
    }
    if (code === "auth/too-many-requests") {
      throw new Error("Demasiados intentos. Espera unos minutos e inténtalo de nuevo.");
    }
    throw new Error("No se pudo enviar el correo. Inténtalo de nuevo.");
  }
}

/** Fetch all recurring plans for admin analytics, newest first. */
export async function fetchRecurringPlansForAdmin(): Promise<RecurringPlan[]> {
  try {
    const snap = await getDocs(
      query(collection(db, "recurringPlans"), orderBy("createdAt", "desc"))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RecurringPlan);
  } catch {
    return [];
  }
}

/** Fetch all leads for admin view, newest first. */
export async function fetchLeadsForAdmin(): Promise<import("../types").Lead[]> {
  try {
    const snap = await getDocs(
      query(collection(db, "leads"), orderBy("createdAt", "desc"))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as import("../types").Lead);
  } catch {
    return [];
  }
}
