# Grenbee Firebase Web

React + Tailwind + Firebase app for the new Grenbee website.

## For AI Agents — Start Here

If you are an AI agent (Claude Code, Codex, Copilot, or any other model), read these docs **before doing anything**:

| Document | Purpose |
|---|---|
| [`docs/AGENT_ONBOARDING.md`](docs/AGENT_ONBOARDING.md) | **Start here** — project overview, stack, rules, current state |
| [`docs/AGENT_SYSTEM.md`](docs/AGENT_SYSTEM.md) | Your role, what you can/cannot do, coordination protocol |
| [`docs/AGENT_TASK_REGISTRY.md`](docs/AGENT_TASK_REGISTRY.md) | Active tasks, file ownership, parallel work rules |
| [`docs/PRODUCTION_READINESS.md`](docs/PRODUCTION_READINESS.md) | What's built, what's missing, pre-production gates |

## Structure

```text
src/
  App.tsx                  # Route switch: public site or admin

  public/
    PublicApp.tsx          # Public customer-facing website
    components/            # Public UI: booking, estimator, account, reviews, etc.

  admin/
    AdminRoute.tsx         # Protected /admin entrypoint
    components/
      AdminPanel.tsx       # Admin dashboard UI

  shared/
    firebase.ts            # Firebase app/auth/firestore setup
    data.ts                # Seed/default data
    types.ts               # Shared TypeScript models
    services/
      firebaseService.ts   # Firestore/Auth data access
```

## Routes

```text
/        Public website
/admin   Protected admin dashboard
```

The admin route requires Firebase Auth plus one of:

```text
Firebase custom claim: admin=true
users/{uid}.role: "admin"
users/{uid}.role: "manager"
```

LocalStorage, demo users, and UI-only flags do not grant admin access.

## Admin Login Checklist

If `/admin` does not open with Google, check Firebase Console:

```text
Authentication > Sign-in method
  Google must be enabled.

Authentication > Settings > Authorized domains
  localhost
  servicios-maps.firebaseapp.com
  your production/staging domain
```

If login works but access is denied, give the user admin access with one of:

```text
users/{uid}.role = "admin"
users/{uid}.role = "manager"
Firebase custom claim admin=true
```

The admin screen has two Google options:

```text
Entrar con Google      # redirect flow, safest
Probar con popup       # popup fallback
```

## Firebase Collections

```text
users
bookings
reviews
services
staff
coverage
settings
```

Firestore security rules live in:

```text
firestore.rules
```

## Run Locally

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
http://localhost:3000/admin
```

## Validate

```bash
npm run lint
npm run build
```
