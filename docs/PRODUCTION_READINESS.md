# Production Readiness — grenbee-firebase-web

> What's live, what's missing, and what the blockers are.
> Updated by the Orchestrator after each significant change.

---

## Core Booking Flow

| Feature | Status | Notes |
|---|---|---|
| Service selection + cost estimator | ✅ Done | `CostEstimator.tsx` |
| Date + time slot picker | ✅ Done | BookingWizard Step 1 |
| Slot availability check | ✅ Done | `api/availability.js`, max 3 concurrent |
| Customer details form | ✅ Done | BookingWizard Step 2 |
| Same-day fee (+$35) | ✅ Done | Client detect + server verify |
| 2-technician fee (+$50) | ✅ Done | Derived from factors server-side |
| Terms + recurring consent | ✅ Done | BookingWizard Step 3 |
| Stripe embedded checkout | ✅ Done | PaymentElement, no redirect |
| Server-side price validation | ✅ Done | `api/_pricing.js` is source of truth |
| Coupon system | ✅ Done | Firestore-validated, server-authoritative |
| Booking saved to Firestore | ✅ Done | After payment authorization |
| Membership discounts | ✅ Done | essential 5% / preferred 10% / premium 15% |

---

## Payments & Webhooks

| Feature | Status | Notes |
|---|---|---|
| PaymentIntent creation | ✅ Done | `capture_method: manual` |
| Payment confirmation + capture | ✅ Done | `api/confirm-payment.js` |
| Stripe webhook handler | ✅ Done | `api/stripe-webhook.js` |
| Coupon usage count recorded | ✅ Done | After payment confirmation |

---

## Staff & Operations

| Feature | Status | Notes |
|---|---|---|
| Staff portal | ✅ Done | `src/staff/` at `/staff/*` |
| Auto-assign staff to jobs | ✅ Done | `api/auto-assign-staff.js` |
| Job status updates | ✅ Done | `api/update-job-status.js` |
| Job photos | ✅ Done | `api/save-job-photo.js`, `api/delete-job-photo.js` |
| Staff payout tracking | ✅ Done | `api/set-job-payout.js` |
| Staff job list | ✅ Done | `api/staff-jobs.js` |

---

## Recurring Plans

| Feature | Status | Notes |
|---|---|---|
| Create recurring plan | ✅ Done | `api/create-recurring-plan.js` |
| Manage recurring plan | ✅ Done | `api/manage-recurring-plan.js` |
| Process recurring plans (cron) | ✅ Done | `api/process-recurring-plans.js` |

---

## Admin

| Feature | Status | Notes |
|---|---|---|
| Admin panel | ✅ Done | `src/admin/` at `/admin/*` |

---

## Customer Account

| Feature | Status | Notes |
|---|---|---|
| Auth (Google + email) | ✅ Done | Firebase Auth |
| Bookings tracker | ✅ Done | `BookingsTracker.tsx` |
| My Account | ✅ Done | `MyAccount.tsx` |

---

## Static Pages & Legal

| Page | Status | Route |
|---|---|---|
| FAQ | ✅ Done | `/faq` |
| Service Areas | ✅ Done | `/areas` |
| Contact | ✅ Done | `/contact` |
| Terms of Service | ✅ Done | `/terms` |
| Privacy Policy | ✅ Done | `/privacy` |
| Cancellation Policy | ✅ Done | `/cancellation` |
| Service Guarantee | ✅ Done | `/guarantee` |
| Payment Policy | ✅ Done | `/payment-policy` |
| 404 | ✅ Done | `/404` |

---

## Infrastructure

| Item | Status | Notes |
|---|---|---|
| Vercel deploy | ✅ Done | Auto-deploy on push to main |
| Firebase Firestore | ✅ Done | Custom DB ID configured |
| Stripe keys | ✅ Done | `STRIPE_SECRET_KEY` + `VITE_STRIPE_PUBLISHABLE_KEY` |
| Firebase Admin | ✅ Done | `FIREBASE_SERVICE_ACCOUNT_JSON` env var |
| Email (Resend) | ✅ Done | `api/notify.js` + `api/_mailer.js` |
| Coverage check | ✅ Done | `api/check-coverage.js` |
| Integrations endpoint | ✅ Done | `api/integrations/` |

---

## Known Gaps / Future Work

| Item | Priority | Notes |
|---|---|---|
| Firestore composite index for availability query | MEDIUM | `bookings` collection needs index on `[bookingDate, timeSlot, status]` for scale |
| "Today" option in date picker | LOW | `isSameDay` logic exists but date picker starts from tomorrow |
| Percent-based coupons | LOW | Server only handles flat `discountAmount`, not `%` coupons |

---

## Pre-Production Gates

Before going live with real payments:

- [ ] Stripe keys switched from test to live mode
- [ ] Stripe webhook secret configured and verified
- [ ] Firebase security rules reviewed (Firestore + Storage)
- [ ] All `REPLACE_ME` env vars replaced in Vercel
- [ ] Smoke test: full booking flow end-to-end in production environment
- [ ] Smoke test: recurring plan creation and processing
- [ ] Smoke test: staff job assignment and status update
