/**
 * membershipSubscriptionService.ts
 * Client-side service for membership plan subscriptions.
 * Reads come directly from Firestore (client SDK).
 * Mutations are delegated to server API (auth-validated).
 */

import { db, auth } from "@grenbee/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import type { MembershipSubscription, MembershipSubscriptionAction } from "@grenbee/types";

export async function getUserMembershipSubscriptions(userId: string): Promise<MembershipSubscription[]> {
  const q = query(
    collection(db, "membershipSubscriptions"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MembershipSubscription);
}

export async function manageMembershipSubscription(
  subscriptionId: string,
  action: MembershipSubscriptionAction
): Promise<MembershipSubscription> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error("Must be signed in to manage a subscription.");
  const idToken = await firebaseUser.getIdToken();

  const resp = await fetch("/api/manage-membership-subscription", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ subscriptionId, action }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || `Could not ${action} subscription.`);
  return data.subscription as MembershipSubscription;
}

export const MEMBERSHIP_STATUS_LABELS: Record<string, string> = {
  active:    "Active",
  paused:    "Paused",
  past_due:  "Past Due",
  cancelled: "Cancelled",
};

export const MEMBERSHIP_STATUS_COLORS: Record<string, string> = {
  active:    "text-emerald-700 bg-emerald-50 border-emerald-200",
  paused:    "text-amber-700 bg-amber-50 border-amber-200",
  past_due:  "text-rose-700 bg-rose-50 border-rose-200",
  cancelled: "text-gray-500 bg-gray-50 border-gray-200",
};

export const HOME_SIZE_LABELS: Record<string, string> = {
  small:  "Small",
  medium: "Medium",
  large:  "Large",
  xl:     "XL",
};
