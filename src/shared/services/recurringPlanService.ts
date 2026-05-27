/**
 * recurringPlanService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Client-side service for recurring subscription plans.
 * Mirrors WP plugin RecurringPlanService + RecurringPlanRepository.
 *
 * Reads are done directly from Firestore (client SDK).
 * Mutations (pause / resume / cancel / skip) are delegated to the server API
 * so they are auth-validated and auditable.
 *
 * Server-side counterparts:
 *   api/create-recurring-plan.js  — plan creation after checkout
 *   api/manage-recurring-plan.js  — state mutations
 */

import { db, auth } from '../firebase';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import type { RecurringPlan, RecurringPlanAction } from '../types';

// ── Date math — mirrors api/_recurring.js calculateNextChargeDate ─────────────

/**
 * Advance a YYYY-MM-DD date by one recurrence interval.
 * Uses noon UTC to avoid DST boundary issues.
 * Returns '' on bad input.
 */
export function calculateNextChargeDate(
  fromDateStr: string,
  recurrence: 'weekly' | 'bi-weekly' | 'monthly'
): string {
  if (!fromDateStr) return '';
  const d = new Date(`${fromDateStr}T12:00:00Z`);
  if (isNaN(d.getTime())) return '';
  switch (recurrence) {
    case 'weekly':    d.setUTCDate(d.getUTCDate() + 7);   break;
    case 'bi-weekly': d.setUTCDate(d.getUTCDate() + 14);  break;
    case 'monthly':   d.setUTCMonth(d.getUTCMonth() + 1); break;
  }
  return d.toISOString().split('T')[0];
}

// ── Firestore reads ───────────────────────────────────────────────────────────

/** Fetch all plans owned by a user, newest first. */
export async function getUserRecurringPlans(userId: string): Promise<RecurringPlan[]> {
  const q = query(
    collection(db, 'recurringPlans'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RecurringPlan);
}

/** Fetch a single plan by Firestore document ID. */
export async function getRecurringPlan(planId: string): Promise<RecurringPlan | null> {
  const snap = await getDoc(doc(db, 'recurringPlans', planId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as RecurringPlan) : null;
}

// ── Server mutations ──────────────────────────────────────────────────────────

/**
 * Pause, resume, cancel, or skip a recurring plan.
 * Obtains a fresh Firebase ID token and calls `api/manage-recurring-plan`.
 * Throws on network error or API error.
 */
export async function managePlan(
  planId: string,
  action: RecurringPlanAction
): Promise<RecurringPlan> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('Must be signed in to manage a plan.');
  const idToken = await firebaseUser.getIdToken();

  const resp = await fetch('/api/manage-recurring-plan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ planId, action }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || `Could not ${action} plan.`);
  return data.plan as RecurringPlan;
}

/**
 * Create a recurring plan after a booking is saved.
 * Called from PublicApp.handleWizardSubmit() when frequency !== 'once'.
 * Fire-and-forget friendly — caller can catch & log without blocking the UX.
 */
export async function createRecurringPlanFromBooking(params: {
  bookingId: string;
  userId: string;
  serviceId: string;
  serviceName: string;
  units: number;
  selectedFactors: Record<string, { label: string; modifier: number }>;
  frequency: 'weekly' | 'bi-weekly' | 'monthly';
  bookingDate: string;
  timeSlot: string;
  address: string;
  notes: string;
  totalCost: number;
  stripePaymentIntentId?: string;
  customerName?: string;
  email?: string;
  phone?: string;
}): Promise<RecurringPlan> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('Must be signed in to create a plan.');
  const idToken = await firebaseUser.getIdToken();

  const resp = await fetch('/api/create-recurring-plan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(params),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || 'Could not create recurring plan.');
  return data.plan as RecurringPlan;
}

// ── Auto-assignment ───────────────────────────────────────────────────────────

/**
 * Ask the server to auto-assign the best available staff member to a booking.
 * Silently resolves when no eligible staff exists (non-fatal).
 * Throws only on auth or network failure.
 *
 * @param bookingId  Firestore booking document ID
 * @param force      Re-assign even if staff is already set (default false)
 */
export async function autoAssignStaff(
  bookingId: string,
  force = false
): Promise<{ ok: boolean; assignedStaffId?: string; assignedStaffName?: string; reason?: string }> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('Must be signed in to trigger auto-assignment.');
  const idToken = await firebaseUser.getIdToken();

  const resp = await fetch('/api/auto-assign-staff', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ bookingId, force }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || 'Auto-assign failed.');
  return data;
}

// ── Display helpers ───────────────────────────────────────────────────────────

export const RECURRENCE_LABELS: Record<string, string> = {
  'weekly':    'Weekly',
  'bi-weekly': 'Bi-Weekly',
  'monthly':   'Monthly',
};

export const STATUS_LABELS: Record<string, string> = {
  active:    'Active',
  paused:    'Paused',
  past_due:  'Past Due',
  cancelled: 'Cancelled',
};

export const STATUS_COLORS: Record<string, string> = {
  active:    'text-emerald-700 bg-emerald-50 border-emerald-200',
  paused:    'text-amber-700 bg-amber-50 border-amber-200',
  past_due:  'text-rose-700 bg-rose-50 border-rose-200',
  cancelled: 'text-gray-500 bg-gray-50 border-gray-200',
};
