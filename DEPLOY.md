# Deployment Guide — grenbee-firebase-web

## Prerequisites

- Node.js 18+
- Firebase CLI: `npm install -g firebase-tools`
- Vercel CLI: `npm install -g vercel`
- Access to:
  - Firebase Console (servicios-maps project)
  - Vercel Dashboard
  - Stripe Dashboard (test + live)
  - Resend Dashboard

---

## 1. Firebase Projects

### Current projects
| Alias       | Firebase Project   | Purpose              |
|-------------|-------------------|----------------------|
| `default`   | `servicios-maps`  | Development / current |
| `staging`   | `grenbee-staging` | Pre-production QA     |
| `production`| `servicios-maps`  | Production (same project for now) |

### Create staging project (one-time)
```bash
# Create grenbee-staging in Firebase Console, then:
firebase use --add   # select grenbee-staging, alias: staging
```

### Deploy Firestore rules
```bash
firebase use staging
firebase deploy --only firestore:rules

firebase use production
firebase deploy --only firestore:rules
```

### Deploy Storage rules
```bash
firebase deploy --only storage
```

### Deploy Firestore indexes (if any new composite indexes)
```bash
firebase deploy --only firestore:indexes
```

---

## 2. Environment Variables

Copy `.env.example` → `.env.local` for local dev (never commit).

### Required variables (set in Vercel Dashboard per environment)

| Variable | Dev | Staging | Production |
|---|---|---|---|
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | `pk_test_...` | `pk_live_...` |
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_test_...` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | `whsec_...` | `whsec_...` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | staging SA | staging SA | prod SA |
| `RESEND_API_KEY` | `re_...` | `re_...` | `re_...` |
| `NOTIFY_FROM` | `test@grenbee.com` | `test@grenbee.com` | `hello@grenbee.com` |
| `CRON_SECRET` | any 32-char hex | unique secret | unique secret |
| `APP_URL` | `http://localhost:5173` | `https://staging.grenbee.com` | `https://grenbee.com` |
| `VITE_GOOGLE_MAPS_API_KEY` | browser key | browser key | browser key |
| `GOOGLE_MAPS_API_KEY` | server key | server key | server key |

### Generate CRON_SECRET
```bash
openssl rand -hex 32
```

---

## 3. Vercel Setup

### Initial deploy
```bash
vercel --prod   # first time: follow prompts, link to project
```

### Branch strategy
| Git Branch | Vercel Environment | Domain |
|---|---|---|
| `main` | Production | `grenbee.com` |
| `develop` | Preview | `staging.grenbee.com` |
| `feature/*` | Preview | auto-generated URL |

### Custom domains
1. `grenbee.com` → main branch (production)
2. `staging.grenbee.com` → develop branch
3. `staff.grenbee.com` → same project, same `main` branch
   - No code changes needed — all routes are handled by the SPA

In Vercel Dashboard → Domains → Add domain for each.

---

## 4. Stripe Webhooks

### Register webhook endpoints in Stripe Dashboard

**Production:** `https://grenbee.com/api/stripe-webhook`
**Staging:** `https://staging.grenbee.com/api/stripe-webhook`

Events to subscribe:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.amount_capturable_updated`
- `payment_intent.canceled`

After creating the webhook, copy the **Signing Secret** (`whsec_...`) and add it as `STRIPE_WEBHOOK_SECRET` in Vercel.

---

## 5. Firebase Admin Service Account

1. Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key" → download JSON
3. Copy the entire JSON content (one line) into `FIREBASE_SERVICE_ACCOUNT_JSON` env var in Vercel
4. Create a **separate** service account for staging

**Important:** Never commit service account files to git.

---

## 6. Resend (Email)

1. Add and verify your sending domain at https://resend.com/domains
2. Create an API key with "Sending access" (not full access)
3. Set `NOTIFY_FROM` to match a verified sender address

---

## 7. Pre-launch Checklist

### Code
- [ ] `npm run build` passes with no TS errors
- [ ] All `.env.example` variables are set in Vercel for production environment
- [ ] `STRIPE_SECRET_KEY` is set to live key (`sk_live_...`)
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` is set to live key (`pk_live_...`)
- [ ] `STRIPE_WEBHOOK_SECRET` points to the live webhook endpoint

### Firebase
- [ ] Firestore rules deployed: `firebase deploy --only firestore:rules`
- [ ] Storage rules deployed: `firebase deploy --only storage`
- [ ] Firebase Auth → Authorized domains includes `grenbee.com` and `staff.grenbee.com`
- [ ] Firebase Auth → Google sign-in enabled (if using Google login)
- [ ] Firestore indexes built (check console for "Building" status)

### Stripe
- [ ] Webhook endpoint registered for production URL
- [ ] Test payment flow end-to-end in live mode (use real card, cancel quickly)
- [ ] Capture method confirmed as `manual` (admin must capture within 7 days)

### Resend
- [ ] Domain DNS records verified (SPF, DKIM, DMARC)
- [ ] Test email send from production `NOTIFY_FROM` address

### Security
- [ ] Firebase service account has minimum required roles:
  - `Cloud Datastore User` (Firestore read/write)
  - `Firebase Authentication Admin`
  - `Storage Object Admin` (for photo operations)
- [ ] `CRON_SECRET` is set and non-trivial (not "test" or "secret")
- [ ] Google Maps API keys are restricted by domain/IP

### Smoke tests after deploy
- [ ] Home page loads
- [ ] Booking wizard completes (test mode payment)
- [ ] Staff portal login works
- [ ] Admin panel loads bookings
- [ ] Recurring plan cron doesn't error (check Vercel Function logs)

---

## 8. Common Commands

```bash
# Local development
npm run dev

# Production build + preview
npm run build && npx vite preview

# Deploy to Vercel (production)
vercel --prod

# Deploy Firebase rules only
firebase deploy --only firestore:rules,storage

# Switch Firebase project
firebase use staging
firebase use production

# Tail Vercel function logs (requires vercel login)
vercel logs --prod --follow
```

---

## 9. Staff Subdomain (staff.grenbee.com)

The staff portal lives at `/staff` in the same Vite SPA. To expose it at `staff.grenbee.com`:

1. In Vercel Dashboard → your project → Domains → Add `staff.grenbee.com`
2. In your DNS provider: add `CNAME staff → cname.vercel-dns.com`
3. No code changes needed — Vercel serves the same `index.html` for all paths

Staff login is gated by Firebase Auth custom claims (`role: "staff"` or `admin: true`).
Set claims via Firebase Admin SDK or from the Admin Panel → Staff tab.
