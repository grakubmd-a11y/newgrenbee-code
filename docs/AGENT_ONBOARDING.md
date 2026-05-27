# Agent Onboarding — grenbee-firebase-web

> **Read this first. Every agent, every session, no exceptions.**
> Whether you are Claude Code, Codex, Copilot, or any other model — this is your entry point.

---

## What Is This Project

**Grenbee** is a home-services booking platform (cleaning, lawn mowing, TV installation, etc.) built for production.

Customers visit the site, configure a service, pick a date/time slot, pay via Stripe, and a technician is dispatched.

---

## Tech Stack (exact versions)

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 6, React Router 7 |
| Styling | Tailwind CSS v4 (brand tokens: `bg-brand`, `text-brand`, `bg-brand-light`, `bg-brand-hover`) |
| Icons | Lucide React |
| Animation | Motion (Framer Motion v12) |
| Database | Firebase Firestore (client SDK v12) |
| Auth | Firebase Auth — Google + email/password |
| Backend | Vercel Serverless Functions (`/api/*.js`, ES modules, `export default async function handler(req, res)`) |
| Server DB | Firebase Admin SDK (`FIREBASE_SERVICE_ACCOUNT_JSON` env var) |
| Payments | Stripe — PaymentIntents with `capture_method: "manual"` (authorize now, capture after service) |
| Email | Resend |
| AI | Google Gemini (`@google/genai`) |
| Deploy | Vercel |

---

## Project Structure

```
/
├── api/                    ← Vercel serverless endpoints
│   ├── _pricing.js         ← CANONICAL pricing engine (source of truth)
│   ├── _mailer.js          ← email helper
│   ├── _recurring.js       ← recurring plan helper
│   ├── availability.js     ← slot availability check
│   ├── create-payment-intent.js
│   ├── confirm-payment.js
│   ├── stripe-webhook.js
│   ├── auto-assign-staff.js
│   └── ...                 ← other job/staff/recurring endpoints
├── src/
│   ├── App.tsx             ← route definitions (React Router)
│   ├── main.tsx            ← entry point (BrowserRouter wrapper)
│   ├── public/             ← customer-facing UI
│   │   ├── PublicApp.tsx
│   │   └── components/     ← Navbar, BookingWizard, CostEstimator, StripePaymentPanel, etc.
│   ├── admin/              ← admin panel (protected route /admin/*)
│   ├── staff/              ← staff portal (protected route /staff/*)
│   ├── pages/              ← static pages (FAQ, Areas, Contact, legal)
│   └── shared/             ← types, Firebase client, shared services
└── docs/                   ← agent documentation (this folder)
```

---

## Critical Rules — Read Before Touching Anything

### Pricing (SECURITY)
- **NEVER** accept `amount` in cents from the client. The server recalculates everything.
- `api/_pricing.js` is the single source of truth for all prices. Edit it if prices change.
- `api/create-payment-intent.js` imports from `_pricing.js` and validates all modifiers.
- Any modifier not in `ALLOWED_MODIFIERS` throws a 400 — this is intentional anti-tamper.

### Stripe
- PaymentIntents use `capture_method: "manual"` — authorized at booking, captured after job completion.
- Do not change to `capture_method: "automatic"` without explicit user approval.
- `confirm-payment.js` handles capture + coupon usage recording.
- `stripe-webhook.js` handles async Stripe events.

### Firebase
- Client SDK: imported from `src/shared/firebase.ts`, exported as `db`, `auth`.
- Admin SDK: each `api/` file initializes its own instance via `getFirestore()` helper — check `admin.apps.length` before calling `initializeApp`.
- Firestore DB custom ID: `ai-studio-590843c3-6656-4faa-a42c-fc98f2b5ecb1`

### TypeScript
- Always run `npx tsc --noEmit` before reporting a task complete.
- Zero type errors is a hard requirement.

### Styling
- Use existing Tailwind brand tokens — do not hardcode hex colors that exist as tokens.
- Follow the card/panel pattern already in the codebase: `rounded-2xl border bg-white p-5 shadow-sm`.

---

## Current State of the Project

### Completed
- [x] Full booking wizard (3 steps: date/slot → details → payment)
- [x] Server-side price validation (`api/_pricing.js` + `api/create-payment-intent.js`)
- [x] Slot availability check (`api/availability.js`, max 3 concurrent per slot)
- [x] Same-day fee (+$35) and 2-technician fee (+$50) — computed client + verified server
- [x] Terms of Service + recurring consent checkboxes (Step 3 of wizard)
- [x] Stripe embedded checkout (PaymentElement, no redirect)
- [x] Coupon system (Firestore-validated, server-authoritative)
- [x] React Router v7 — all routes configured (`/admin`, `/staff`, `/areas`, `/faq`, `/contact`, legal pages)
- [x] Admin panel (`/admin/*`)
- [x] Staff portal (`/staff/*`)
- [x] Membership tiers (essential / preferred / premium discounts)
- [x] i18n — `Language = 'en' | 'es'`, localStorage-persisted

### In Progress / Pending
See `docs/AGENT_TASK_REGISTRY.md` for the active task list.

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
7. When done: run `npx tsc --noEmit`, report in the standard format, set status to `REVIEW`

### When you finish any task:
- If you discovered something non-obvious that would have saved you time → add it to `docs/AGENT_KNOWLEDGE.md`
- If an existing entry in `AGENT_KNOWLEDGE.md` is now wrong or outdated → fix or delete it
- One entry max per finding. No summaries of what you did — that belongs in the git commit.

---

## Where to Ask for Help

If something is unclear, blocked, or conflicts with another task — stop and report to the Orchestrator (the human or agent coordinating the session) before proceeding. Do not guess on security, pricing, or Stripe behavior.
