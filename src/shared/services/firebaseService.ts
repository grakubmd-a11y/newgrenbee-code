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
  GoogleAuthProvider, 
  signOut, 
  User as FirebaseUser,
  onAuthStateChanged
} from "firebase/auth";
import { db, auth } from "../firebase";
import { AdminActivityEvent, Booking, BookingStatus, CouponRule, Review, Service, Staff, Coverage, BusinessSettings } from "../types";

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
  name: string;
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
    
    const dataToSave = {
      uid,
      name: profile.name || existing?.name || "",
      email: profile.email || existing?.email || "",
      role: profile.role || existing?.role || "customer",
      phone: profile.phone || existing?.phone || "",
      address: profile.address || existing?.address || "",
      activeMembership: profile.activeMembership !== undefined ? profile.activeMembership : (existing?.activeMembership || null),
      petsStatus: profile.petsStatus || existing?.petsStatus || "none",
      keyPreferences: profile.keyPreferences || existing?.keyPreferences || "lockbox",
      lockboxCode: profile.lockboxCode || existing?.lockboxCode || "",
      specialNote: profile.specialNote || existing?.specialNote || "",
      cardName: profile.cardName || existing?.cardName || "",
      cardNumber: profile.cardNumber || existing?.cardNumber || "",
      cardExpiry: profile.cardExpiry || existing?.cardExpiry || "",
      cardProvider: profile.cardProvider || existing?.cardProvider || "visa",
      createdAt: existing?.createdAt || now,
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
    await setDoc(doc(db, "bookings", booking.id), booking);
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
    case "auth/popup-blocked":
      return "El navegador bloqueo la ventana de Google. Usa la opcion de redireccion.";
    case "auth/popup-closed-by-user":
      return "La ventana de Google se cerro antes de terminar el login.";
    case "auth/cancelled-popup-request":
      return "Ya habia una ventana de login abierta. Cierra la anterior e intenta otra vez.";
    case "auth/unauthorized-domain":
      return "Este dominio no esta autorizado en Firebase Authentication. Agrega localhost y el dominio publicado en Firebase > Authentication > Settings > Authorized domains.";
    case "auth/operation-not-allowed":
      return "Google Sign-In no esta habilitado en Firebase Authentication > Sign-in method.";
    case "auth/network-request-failed":
      return "Firebase no pudo conectarse. Revisa internet, bloqueadores o configuracion del proyecto.";
    case "auth/web-storage-unsupported":
      return "El navegador esta bloqueando almacenamiento necesario para Firebase Auth.";
    default:
      return err?.message || "No se pudo iniciar sesion con Google.";
  }
}

/**
 * Detects if running on mobile device
 */
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export async function signInWithGooglePopup(): Promise<FirebaseUser | null> {
  const provider = createGoogleProvider();
  
  console.log("[v0] signInWithGooglePopup called");
  console.log("[v0] Current domain:", window.location.hostname);
  console.log("[v0] isMobile:", isMobileDevice());
  
  // On mobile, use redirect flow as popup is often blocked or fails
  if (isMobileDevice()) {
    console.log("[v0] Mobile detected, using redirect flow for Google Sign-In");
    try {
      await signInWithRedirect(auth, provider);
    } catch (redirectError) {
      console.error("[v0] Redirect error:", redirectError);
      throw redirectError;
    }
    return null; // Will be handled by getRedirectResult on page load
  }
  
  try {
    console.log("[v0] Attempting popup sign-in...");
    const result = await signInWithPopup(auth, provider);
    console.log("[v0] Popup sign-in successful");
    return result.user;
  } catch (error) {
    const err = error as { code?: string; message?: string };
    console.error("[v0] Google Sign In Error code:", err?.code);
    console.error("[v0] Google Sign In Error message:", err?.message);
    console.error("[v0] Full error:", error);
    
    // If popup fails, fallback to redirect
    if (err?.code === 'auth/popup-blocked' || 
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request') {
      console.log("[v0] Popup failed, falling back to redirect flow");
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw error;
  }
}

export async function signInWithGoogleRedirect(): Promise<void> {
  const provider = createGoogleProvider();
  try {
    await signInWithRedirect(auth, provider);
  } catch (error) {
    console.error("Google Redirect Sign In Error:", error);
    throw error;
  }
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
