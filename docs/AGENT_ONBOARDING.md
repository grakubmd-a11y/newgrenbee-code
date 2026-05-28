# Agent Onboarding — grenbee-firebase-web

> **Read this first. Every agent, every session, no exceptions.**
> Whether you are Claude Code, Codex, Copilot, or any other model — this is your entry point.

---

## What Is This Project

**Grenbee** is a home-services booking platform (cleaning, lawn mowing, TV installation, etc.) built for production in Utah County.

Customers visit the marketing site, get a quote, book a cleaning via the app, pay via Stripe, and a technician is dispatched.

---

## Tech Stack (current)

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Next.js 15 (App Router) |
| Styling | Tailwind CSS v4 (brand tokens: `bg-brand`, `text-brand`, `bg-brand-light`, `bg-brand-hover`) |
| Icons | Lucide React |
| Animation | Motion (Framer Motion v12) |
| Database | Firebase Firestore (named DB: `ai-studio-590843c3-6656-4faa-a42c-fc98f2b5ecb1`) |
| Auth | Firebase Auth — Google Sign-In + email/password |
| Backend | Vercel Serverless Functions (`apps/app/api/*.js`, ES modules) |
| Server DB | Firebase Admin SDK (`FIREBASE_SERVICE_ACCOUNT_JSON` env var) |
| Payments | Stripe — `capture_method: "manual"` (authorize at booking, capture after job done) |
| Email | Resend (`RESEND_API_KEY`) |
| i18n | react-i18next — EN/ES, routing `/us/` and `/us/es/` |
| Monorepo | Turborepo (`turbo.json` at root) |
| Deploy | Vercel — two separate projects |

---

## Monorepo Structure

```
/
├── apps/
│   ├── web/                ← @grenbee/web — Marketing site (grenbee.com)
│   │   ├── app/            ← Next.js App Router pages
│   │   │   ├── [country]/(en)/   ← English routes (/us/*, /cl/*)
│   │   │   └── [country]/es/     ← Spanish routes (/us/es/*, /cl/es/*)
│   │   ├── components/
│   │   │   ├── views/      ← HomePage, AreasPage, FAQPage, ContactPage, PlansPage, legal pages
│   │   │   └── layout/     ← SiteNavbar, PageShell, LegalPage
│   │   └── index.css
│   │
│   └── app/                ← @grenbee/app — Booking/user/admin/staff app (app.grenbee.com / control-room.grenbee.com)
│       ├── app/            ← Next.js App Router pages
│       │   ├── (app)/      ← /book, /account, /bookings, /estimate
│       │   ├── admin/      ← /admin (AdminRoute — requires admin/manager role)
│       │   └── staff/      ← /staff (StaffRoute — requires staff role)
│       ├── components/
│       │   ├── PublicApp.tsx     ← main booking app shell
│       │   ├── Navbar.tsx
│       │   ├── BookingWizard.tsx
│       │   ├── StripePaymentPanel.tsx
│       │   ├── admin/      ← AdminRoute, AdminPanel, tabs
│       │   └── staff/      ← StaffRoute, StaffPortal
│       └── api/            ← Vercel Serverless Functions (Firebase Admin SDK)
│           ├── _pricing.js       ← CANONICAL pricing engine (source of truth)
│           ├── _mailer.js
│           ├── create-payment-intent.js
│           ├── confirm-payment.js
│           ├── stripe-webhook.js
│           └── ...
│
├── packages/
│   ├── types/              ← @grenbee/types — all TypeScript interfaces
│   ├── firebase/           ← @grenbee/firebase — Firebase client SDK + services + contexts
│   │   ├── index.ts        ← db, auth, storage exports
│   │   ├── services/       ← firebaseService, pricingService, recurringPlanService
│   │   └── contexts/       ← SiteSettingsContext
│   ├── i18n/               ← @grenbee/i18n — react-i18next config + EN/ES locales
│   │   └── locales/        ← en.json (351 keys), es.json (351 keys)
│   └── config/             ← @grenbee/config — static data (SERVICES_DATA, INITIAL_BOOKINGS, etc.)
│
├── docs/                   ← agent documentation (this folder)
├── scripts/                ← seed scripts, admin grant, firestore rules deploy
├── CLAUDE.md               ← project rules for AI agents (i18n, security, Stripe)
└── turbo.json
```

---

## Vercel Projects

| Project | Domain | Root Directory | Purpose |
|---|---|---|---|
| `grenbee-web` | grenbee.com | `apps/web` | Marketing site |
| `grenbee-app` | app.grenbee.com, control-room.grenbee.com | `apps/app` | Booking app + admin + staff |

---

## Shared Packages — Import Conventions

All apps import from packages using the `@grenbee/*` namespace:

```ts
import { Booking, Service } from "@grenbee/types";
import { db, auth } from "@grenbee/firebase";
import { fetchUserBookings, updateBookingInFirestore } from "@grenbee/firebase/services";
import { useSiteSettings } from "@grenbee/firebase/contexts";
import i18n from "@grenbee/i18n";
import { SERVICES_DATA } from "@grenbee/config";
```

Packages export TypeScript source directly — no build step. Consumed via `transpilePackages` in each app's `next.config.ts`.

**NEVER** use relative `../../src/shared/` imports — they no longer exist. Always use `@grenbee/*`.

---

## Critical Rules — Read Before Touching Anything

### i18n (MANDATORY)
- **NEVER** hardcode user-visible strings in JSX. Always use `t("key")` from `useTranslation()`.
- Add new keys to BOTH `packages/i18n/locales/en.json` AND `packages/i18n/locales/es.json`.
- Key convention: `pageName.section.label` (e.g. `home.hero.title`, `plans.basic.name`).
- Full rules in `CLAUDE.md`.

### Pricing (SECURITY)
- **NEVER** accept `amount` from the client. Server recalculates everything.
- `apps/app/api/_pricing.js` is the single source of truth for all prices.
- Any modifier not in `ALLOWED_MODIFIERS` throws 400 — intentional anti-tamper.

### Stripe
- `capture_method: "manual"` — authorized at booking, captured after job completion.
- **Do not change to `automatic`** without explicit user approval.
- `confirm-payment.js` handles capture + coupon usage recording.

### Firebase
- **Client SDK**: imported from `@grenbee/firebase` — exports `db`, `auth`, `storage`.
- **Admin SDK**: each `api/` file initializes its own instance — check `admin.apps.length` before `initializeApp`.
- **CRITICAL**: Named Firestore DB ID must always be passed: `getFirestore(app, "ai-studio-590843c3-6656-4faa-a42c-fc98f2b5ecb1")`. Omitting it silently targets the wrong (default) database.
- Never mix client SDK and Admin SDK imports in the same file.

### Environment Variables
- Client-side vars: `NEXT_PUBLIC_*` prefix (replaces old `VITE_*` from the Vite era).
- Server-side (api/): no prefix needed.
- **Never** use `import.meta.env.VITE_*` — the project is no longer on Vite.

### TypeScript
- Run `npx tsc --noEmit` from the app directory before reporting a task complete.
- Zero type errors is a hard requirement.
- `strictNullChecks: false` in both apps' tsconfig.json (intentional).

---

## Current State of the Project

### Completed
- [x] Turborepo monorepo — `apps/web` + `apps/app` + 4 shared packages
- [x] Vite → Next.js 15 App Router migration (complete)
- [x] i18n EN/ES — 351 keys, routing `/us/` + `/us/es/`
- [x] Full booking wizard (3 steps: date/slot → details → payment)
- [x] Server-side price validation (`api/_pricing.js` + `api/create-payment-intent.js`)
- [x] Slot availability check (`api/availability.js`, max 3 concurrent per slot)
- [x] Same-day fee (+$35) and 2-technician fee (+$50) — computed client + verified server
- [x] Stripe embedded checkout (PaymentElement, `capture_method: manual`)
- [x] Coupon system (Firestore-validated, server-authoritative)
- [x] Admin panel (`/admin`) — Google Sign-In, role check (admin/manager)
- [x] Staff portal (`/staff`) — role-gated
- [x] Membership tiers — Basic Care / Home Care / Premium Care (cleaning-focused, home-size pricing)
- [x] Vercel: `grenbee-web` → `apps/web`, `grenbee-app` → `apps/app`

### Pending / Known Issues
- [ ] Seed cleaning membership plans in Firestore: `node scripts/seed-cleaning-plans.mjs --serviceAccount="path/to/key.json"`
- [ ] `control-room.grenbee.com` needs to be added to Firebase Auth → Authorized Domains
- [ ] OAuth client "Grenbee" needs `control-room.grenbee.com` in authorized JS origins + redirect URIs
- See `docs/AGENT_TASK_REGISTRY.md` for active tasks.

---

## Dev Commands

```bash
npm run dev:web      # apps/web on port 3000
npm run dev:app      # apps/app on port 3001
npm run build        # build both apps via Turborepo
npm run typecheck    # tsc --noEmit on both apps
```

---

## Before You Start — Determine Your Role First

### Did you receive a raw request from the user (not a task from the registry)?
→ You are the **ORCHESTRATOR**. Read `docs/AGENT_SYSTEM.md` → ORCHESTRATOR section. Decompose the request into tasks, write them into `docs/AGENT_TASK_REGISTRY.md`, then coordinate execution.

### Did you receive a specific task ID (e.g. "work on TASK-007")?
→ Open `docs/AGENT_TASK_REGISTRY.md`, find the task, read the `Role` field. That is your role. Follow the rules for that role in `docs/AGENT_SYSTEM.md`.

### In all cases, before writing any code:
1. Read this file (done ✓)
2. Read `docs/AGENT_KNOWLEDGE.md` — accumulated learnings from all previous agents
3. Read `docs/AGENT_SYSTEM.md` — rules for your role
4. Read `docs/AGENT_TASK_REGISTRY.md` — active tasks and file ownership map
5. Confirm your file ownership area does not overlap with any `IN_PROGRESS` task
6. Set your task to `IN_PROGRESS` in the registry before writing any code
7. When done: run `npx tsc --noEmit` from the app directory, report in the standard format, set status to `REVIEW`

### When you finish any task:
- If you discovered something non-obvious that would have saved you time → add it to `docs/AGENT_KNOWLEDGE.md`
- If an existing entry in `AGENT_KNOWLEDGE.md` is now wrong or outdated → fix or delete it
- One entry max per finding. No summaries of what you did — that belongs in the git commit.

---

## Where to Ask for Help

If something is unclear, blocked, or conflicts with another task — stop and report to the Orchestrator before proceeding. Do not guess on security, pricing, or Stripe behavior.
