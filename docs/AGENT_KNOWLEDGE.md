# Agent Knowledge Base — grenbee-firebase-web

> Shared learning for all agents. Read this before starting any task.
> Add to it when you discover something non-obvious. Keep it lean.

---

## Rules for Writing Here

**Write only if ALL of these are true:**
1. It's not obvious from reading the code
2. It would have saved you time if you'd known it before starting
3. It's likely to matter again in a future task

**Never write:**
- Things derivable by reading the code normally
- Temporary state or in-progress context
- Things already documented in AGENT_ONBOARDING.md
- Step-by-step summaries of what you did (that belongs in git commits)

**Format for new entries:**
```
- [WHAT]: one sentence. [WHY]: one sentence of reason or consequence.
```

**When to prune:** If an entry is no longer true (code was refactored, pattern changed), delete it or update it. A wrong entry is worse than no entry.

---

## Pricing & Business Logic

- `api/_pricing.js` is the single source of truth for all prices. If you change a price or add a factor, you must update BOTH `api/_pricing.js` AND `src/shared/data.ts` — they must stay in sync or the UI will show a different price than what Stripe charges.
- The server never trusts `twoTechFee` from the client — it re-derives it from `selectedFactors`. Same for `sameDayFee` — the server verifies `bookingDate === today`, ignoring the client flag.
- `ALLOWED_MODIFIERS` in `api/_pricing.js` is a security allowlist. Any modifier value not in it throws a 400. When adding a new factor option, add it here first or payments will break.

## Stripe

- `capture_method: "manual"` is intentional — do not change to `automatic`. Authorization happens at booking, capture happens after the technician completes the job in `api/confirm-payment.js`.
- The Stripe publishable key can come from two places: `VITE_STRIPE_PUBLISHABLE_KEY` env var OR Firestore `settings` doc. The Firestore one takes precedence at runtime. See `StripePaymentPanel.tsx`.

## Firebase Admin (api/ files)

- Every `api/` file that needs Firestore initializes its own instance using a local `getFirestore()` helper. Always check `admin.apps.length` before calling `initializeApp` or you'll get a "already exists" error.
- The Firestore DB uses a custom ID (`ai-studio-590843c3-6656-4faa-a42c-fc98f2b5ecb1`), not the default. This is already handled in the client config at `src/shared/firebase.ts`.
- When Firestore Admin is not configured (no env var), all api/ endpoints fail open — they return a safe default instead of crashing. This is intentional for local dev.

## Coupons

- Coupon documents are stored by a derived key, not the raw code. The key is: lowercase, trim, replace non-alphanumeric with `-`. A coupon with code `SAVE20` is stored as doc ID `save20`. See `couponDocId()` in `api/create-payment-intent.js`.
- The server validates the coupon independently of what the client sends. The client's `couponDiscount` value is ignored — the server looks it up in Firestore.

## Booking Wizard

- `bookingParams.totalCost` (from CostEstimator) does NOT include same-day or 2-tech fees — those are added inside BookingWizard because the date isn't known at estimator time. `OrderSummary` computes the display total by adding them.
- The date picker starts from tomorrow (`i=1`), so `isSameDay` is always false in the current UI. The logic exists and works — it just never triggers until "Today" is added as an option.

## Staff Assignment

- Two-tech bookings escriben `primaryStaffId` + `helperStaffId` pero también mantienen `assignedStaffId = primaryStaffId` por backward compatibility — muchas partes del sistema (admin panel, staff portal, webhooks) leen solo `assignedStaffId`. Si eliminas ese campo en dos-tech, esas partes quedan ciegas al técnico asignado.
- `needs_assignment` es un status válido de BookingStatus — se asigna cuando no hay suficiente staff disponible para el slot. El admin panel debe mostrarlo y permitir reasignación manual.
- El overlap check incluye travel buffer en ambos lados: `[existStart - buffer, existEnd + buffer]`. Dos jobs back-to-back con 30 min de buffer entre ellos se consideran en conflicto. Si el buffer es demasiado agresivo, ajustar `DEFAULT_TRAVEL_BUFFER` en `api/auto-assign-staff.js`.
- El scoring no penaliza overlap — lo excluye completamente. El score solo compara candidatos ya disponibles.

## i18n

- Language is `'en' | 'es'`, persisted in localStorage. Components read it via context or prop drilling — there is no i18n library, it's manual string switching.
