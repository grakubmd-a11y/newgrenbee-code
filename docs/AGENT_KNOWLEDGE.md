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

## Monorepo / Imports

- **Never use relative `../../src/shared/` imports** — that directory no longer exists. All shared code is in `packages/` and imported as `@grenbee/types`, `@grenbee/firebase`, `@grenbee/firebase/services`, `@grenbee/firebase/contexts`, `@grenbee/i18n`, `@grenbee/config`. [WHY]: The project migrated from a Vite monolith to a Turborepo monorepo; the old `src/` imports will cause build failures.
- **Packages export TypeScript source directly** — no build step needed. [WHY]: `transpilePackages` in each app's `next.config.ts` handles compilation; you don't need to run a separate build for packages after editing them.
- **TypeScript paths are defined per-app** in `apps/web/tsconfig.json` and `apps/app/tsconfig.json`. [WHY]: Each app resolves `@grenbee/*` to `../../packages/*/index.ts` — if you add a new export path, add it to both tsconfigs.

## Pricing & Business Logic

- `apps/app/api/_pricing.js` is the single source of truth for all prices. If you change a price or add a factor, you must update BOTH `apps/app/api/_pricing.js` AND `packages/config/index.ts` (SERVICES_DATA) — they must stay in sync or the UI will show a different price than what Stripe charges.
- The server never trusts `twoTechFee` from the client — it re-derives it from `selectedFactors`. Same for `sameDayFee` — the server verifies `bookingDate === today`, ignoring the client flag.
- `ALLOWED_MODIFIERS` in `apps/app/api/_pricing.js` is a security allowlist. Any modifier value not in it throws a 400. When adding a new factor option, add it here first or payments will break.

## Stripe

- `capture_method: "manual"` is intentional — do not change to `automatic`. Authorization happens at booking, capture happens after the technician completes the job in `apps/app/api/confirm-payment.js`.
- The Stripe publishable key is `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (replaces the old `VITE_STRIPE_PUBLISHABLE_KEY`). It can also be overridden at runtime from Firestore `settings` doc — the Firestore value takes precedence. See `apps/app/components/StripePaymentPanel.tsx`.

## Firebase Admin (api/ files)

- Every `api/` file that needs Firestore initializes its own instance using a local `getFirestore()` helper. Always check `admin.apps.length` before calling `initializeApp` or you'll get a "already exists" error.
- **CRITICAL**: The Firestore DB uses a custom ID (`ai-studio-590843c3-6656-4faa-a42c-fc98f2b5ecb1`), not the default. Always pass it to `getFirestore(app, DB_ID)`. Omitting it silently reads/writes the wrong (empty) database.
- When Firestore Admin is not configured (no env var), all api/ endpoints fail open — they return a safe default instead of crashing. This is intentional for local dev.

## Firebase Auth — Authorized Domains

- Any new domain (e.g. `control-room.grenbee.com`) must be added to **two places** before Google Sign-In works: (1) Firebase Console → Authentication → Settings → Authorized Domains, and (2) Google Cloud Console → OAuth Client "Grenbee" → Authorized JavaScript Origins + Redirect URIs. [WHY]: Missing either one silently blocks the popup from completing.

## Coupons

- Coupon documents are stored by a derived key, not the raw code. The key is: lowercase, trim, replace non-alphanumeric with `-`. A coupon with code `SAVE20` is stored as doc ID `save20`. See `couponDocId()` in `apps/app/api/create-payment-intent.js`.
- The server validates the coupon independently of what the client sends. The client's `couponDiscount` value is ignored — the server looks it up in Firestore.

## Booking Wizard

- `bookingParams.totalCost` (from CostEstimator) does NOT include same-day or 2-tech fees — those are added inside BookingWizard because the date isn't known at estimator time. `OrderSummary` computes the display total by adding them.
- The date picker starts from tomorrow (`i=1`), so `isSameDay` is always false in the current UI. The logic exists and works — it just never triggers until "Today" is added as an option.

## Staff Assignment

- Two-tech bookings write `primaryStaffId` + `helperStaffId` but also keep `assignedStaffId = primaryStaffId` for backward compatibility — admin panel, staff portal, and webhooks read only `assignedStaffId`. Removing it breaks those views.
- `needs_assignment` is a valid `BookingStatus` — set when no staff is available for the slot. The admin panel must show it and allow manual reassignment.
- The overlap check includes a travel buffer on both sides: `[existStart - buffer, existEnd + buffer]`. Adjust `DEFAULT_TRAVEL_BUFFER` in `apps/app/api/auto-assign-staff.js` if it's too aggressive.

## i18n

- react-i18next is the i18n library (not manual string switching). Language is `'en' | 'es'`, set via `i18n.changeLanguage()` in the locale layout components (`apps/web/app/[country]/(en)/layout.tsx` and `.../es/layout.tsx`). [WHY]: Language is driven by URL prefix (`/us/` = en, `/us/es/` = es) — do not call `i18n.changeLanguage()` directly from a button or component.
- Translation files live in `packages/i18n/locales/en.json` and `es.json` (351 keys each). Always add to both files when creating new UI text.

## Next.js / App Router

- Both apps use `"use client"` on all page and component files — there are no Server Components in use yet. [WHY]: Components use Firebase, React state, and browser APIs that are incompatible with SSR.
- `src/pages/` was the old Vite pages directory and no longer exists. Do not create a `pages/` directory inside either Next.js app — Next.js will treat it as a Pages Router and conflict with the App Router.
- `strictNullChecks: false` in both tsconfigs is intentional — the codebase predates strict null checks and enabling it causes hundreds of errors.
