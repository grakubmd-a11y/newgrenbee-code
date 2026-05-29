# Production Readiness — grenbee-firebase-web

> Qué está listo, qué falta, y cuáles son los blockers.
> Actualizar después de cada cambio significativo.

---

## Core Booking Flow

| Feature | Status | Notes |
|---|---|---|
| Service selection + cost estimator | ✅ Done | `CostEstimator.tsx` |
| Date + time slot picker | ✅ Done | BookingWizard Step 1 |
| Slot availability check | ✅ Done | `api/availability.js`, max 3 concurrent |
| Customer details form | ✅ Done | BookingWizard Step 2 |
| Same-day fee (+$35) | ✅ Done | Client detect + server verify |
| 2-technician fee (+$50) | ✅ Done | Derivado de factors server-side |
| Terms + recurring consent | ✅ Done | BookingWizard Step 3 |
| Stripe embedded checkout | ✅ Done | PaymentElement, sin redirect |
| Server-side price validation | ✅ Done | `api/_pricing.js` es fuente de verdad |
| Coupon system | ✅ Done | Firestore-validated, server-authoritative |
| Booking saved to Firestore | ✅ Done | Después de autorización de pago |
| Servicio Vacation Rental Turnover | ✅ Done | `packages/config` + `api/_pricing.js` |

---

## Payments & Webhooks

| Feature | Status | Notes |
|---|---|---|
| PaymentIntent creation | ✅ Done | `capture_method: manual` |
| Payment confirmation + capture | ✅ Done | `api/confirm-payment.js` |
| Stripe webhook handler | ✅ Done | `api/stripe-webhook.js` |
| Coupon usage count recorded | ✅ Done | Después de confirmar pago |
| Stripe live mode | ⚠️ Pendiente | Cambiar `STRIPE_SECRET_KEY` a `sk_live_...` en Vercel |

---

## Staff & Operations

| Feature | Status | Notes |
|---|---|---|
| Staff portal | ✅ Done | `/staff` en `apps/app` |
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
| Admin panel | ✅ Done | `/admin` en `apps/app`, gated por rol admin/manager |

---

## Customer Account

| Feature | Status | Notes |
|---|---|---|
| Auth (Google + email) | ✅ Done | Firebase Auth |
| Bookings tracker | ✅ Done | `BookingsTracker.tsx` |
| My Account | ✅ Done | `MyAccount.tsx` |

---

## Marketing & SEO

| Feature | Status | Notes |
|---|---|---|
| City landing pages (10 ciudades Utah) | ✅ Done | SSG, `lib/launchAreas.ts` |
| Hub de áreas (`/us/areas`) | ✅ Done | Server component con WaitlistForm |
| Páginas city+service (`/areas/mapleton/house-cleaning`) | ✅ Done | SSG |
| Página "Grenbee for Hosts" (`/us/hosts`) | ✅ Done | SSG, vacation rental turnover |
| Sitemap.xml | ✅ Done | `apps/app/app/sitemap.ts` |
| Robots.txt | ✅ Done | `apps/app/app/robots.ts` |
| Nav links con prefijo `/{country}` | ✅ Done | `SiteNavbar.tsx`, `PageShell.tsx` |
| Footer con ciudades de Utah | ✅ Done | Utah County + Wasatch Back |

---

## Static Pages & Legal

| Page | Status | Route |
|---|---|---|
| FAQ | ✅ Done | `/us/faq` |
| Service Areas (hub) | ✅ Done | `/us/areas` |
| Contact | ✅ Done | `/us/contact` |
| Membership Plans | ✅ Done | `/us/plans` (Firestore-based) |
| For Hosts | ✅ Done | `/us/hosts` |
| Terms of Service | ✅ Done | `/us/terms` |
| Privacy Policy | ✅ Done | `/us/privacy` |
| Cancellation Policy | ✅ Done | `/us/cancellation` |
| Service Guarantee | ✅ Done | `/us/guarantee` |
| 404 | ✅ Done | Handled by Next.js |

---

## Infrastructure

| Item | Status | Notes |
|---|---|---|
| Vercel deploy | ✅ Done | Auto-deploy en push a main |
| Firebase Firestore | ✅ Done | Custom DB ID configurado |
| Stripe keys | ⚠️ Test mode | `STRIPE_SECRET_KEY` = `sk_test_...` (cambiar a live cuando listo) |
| Firebase Admin | ✅ Done | `FIREBASE_SERVICE_ACCOUNT_JSON` env var |
| Email (Resend) | ✅ Done | `api/notify.js` + `api/_mailer.js` |
| `stripe` y `resend` en package.json raíz | ✅ Done | Crítico — sin esto producción da 500 |
| Coverage check | ✅ Done | `api/check-coverage.js` |
| Pricing sync guard | ✅ Done | `npm run check:pricing` |
| Un solo dominio (`grenbee.com`) | ✅ Done | `apps/web` eliminado, todo en `apps/app` |
| Redirect `app.grenbee.com` → `grenbee.com` | ⚠️ Pendiente | Configurar en Vercel Dashboard → Domains |

---

## Pre-Production Gates

Antes de ir live con pagos reales:

- [ ] `STRIPE_SECRET_KEY` cambiado a `sk_live_...` en Vercel env vars
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` cambiado a `pk_live_...`
- [ ] `STRIPE_WEBHOOK_SECRET` configurado para el endpoint de producción
- [ ] Smoke test: flujo completo de booking end-to-end con pago real
- [ ] Smoke test: recurring plan creation y processing
- [ ] Smoke test: staff job assignment y status update
- [ ] Firebase Auth → Authorized Domains incluye `grenbee.com`, `staff.grenbee.com`, `control-room.grenbee.com`
- [ ] Firestore security rules revisadas (Firestore + Storage)
- [ ] Redirect `app.grenbee.com` → `grenbee.com` configurado en Vercel Dashboard

---

## Known Gaps / Future Work

| Item | Priority | Notes |
|---|---|---|
| Firestore composite index para availability query | MEDIUM | `bookings` collection necesita index en `[bookingDate, timeSlot, status]` para escalar |
| Seed planes de membresía en Firestore | HIGH | Correr `node scripts/seed-services.mjs`; sin planes, `/us/plans` muestra empty state |
| "Today" en date picker | LOW | Lógica `isSameDay` existe pero el picker empieza desde mañana |
| Cupones con % descuento | LOW | El servidor solo maneja `discountAmount` flat, no porcentual |
