# Deployment Guide — grenbee-firebase-web

## Stack de Deploy

- **Un solo proyecto Vercel** (`grenbee-app`) sirviendo `grenbee.com`
- **Un solo proyecto Firebase** (`servicios-maps`) para Firestore + Auth
- **Funciones serverless** en `/api/` (raíz del repo) — Vercel las detecta automáticamente
- **No hay `apps/web`** — fue eliminado. Todo está en `apps/app`.

---

## 1. Firebase Projects

### Proyectos actuales
| Alias | Firebase Project | Propósito |
|---|---|---|
| `default` | `servicios-maps` | Desarrollo + producción (mismo proyecto por ahora) |

### Deploy de reglas de Firestore
```bash
firebase deploy --only firestore:rules
firebase deploy --only storage
firebase deploy --only firestore:indexes
```

---

## 2. Variables de Entorno

Configurar en **Vercel Dashboard → Project → Settings → Environment Variables**.

| Variable | Dev | Production |
|---|---|---|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | `pk_live_...` |
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | `whsec_...` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | service account JSON | service account JSON |
| `RESEND_API_KEY` | `re_...` | `re_...` |
| `NOTIFY_FROM` | `test@grenbee.com` | `hello@grenbee.com` |
| `CRON_SECRET` | cualquier hex 32 chars | único y secreto |
| `APP_URL` | `http://localhost:3000` | `https://grenbee.com` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | browser key | browser key |
| `GOOGLE_MAPS_API_KEY` | server key | server key |
| `NEXT_PUBLIC_FIREBASE_*` | config del cliente | config del cliente |

### Generar CRON_SECRET
```bash
openssl rand -hex 32
```

### IMPORTANTE — `stripe` y `resend` en package.json raíz
Estos paquetes DEBEN estar declarados en el `package.json` de la raíz (no solo en `apps/app`). Las Vercel Functions en `/api/` los necesitan. Sin esto, producción da 500 "Cannot find module 'stripe'".

---

## 3. Vercel Setup

### Proyecto único
| Proyecto | Root Directory | Dominio | Propósito |
|---|---|---|---|
| `grenbee-app` | `apps/app` | `grenbee.com` | Todo: marketing + booking + admin + staff |

### Subdominios (mismo proyecto)
- `staff.grenbee.com` → apunta al mismo deploy; middleware redirige a `/staff`
- `control-room.grenbee.com` → apunta al mismo deploy; middleware redirige a `/admin`
- `app.grenbee.com` → configurar redirect 308 en Vercel Dashboard → Domains → Edit → Redirect to `grenbee.com`

### Branch strategy
| Git Branch | Vercel Environment | Dominio |
|---|---|---|
| `main` | Production | `grenbee.com` |
| `feature/*` | Preview | auto-generated URL |

### Initial deploy
```bash
vercel --prod   # primera vez: seguir prompts, linkear al proyecto
```

---

## 4. Stripe Webhooks

### Registrar endpoints en Stripe Dashboard

**Production:** `https://grenbee.com/api/stripe-webhook`

Eventos a suscribir:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.amount_capturable_updated`
- `payment_intent.canceled`

Después de crear el webhook, copiar el **Signing Secret** (`whsec_...`) y agregarlo como `STRIPE_WEBHOOK_SECRET` en Vercel.

---

## 5. Firebase Admin Service Account

1. Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key" → descargar JSON
3. Copiar el contenido JSON completo (una línea) en `FIREBASE_SERVICE_ACCOUNT_JSON` env var en Vercel

**Importante:** Nunca commitear archivos de service account a git.

### Desarrollo local con ADC (alternativa)
```bash
gcloud auth application-default login
# Los scripts de seed usarán ADC automáticamente si no hay --serviceAccount flag
```

---

## 6. Resend (Email)

1. Agregar y verificar el sending domain en resend.com/domains
2. Crear API key con acceso "Sending access" (no full access)
3. Setear `NOTIFY_FROM` con una dirección del dominio verificado

---

## 7. Pre-launch Checklist

### Código
- [ ] `npm run build` pasa sin errores TS
- [ ] `npm run check:pricing` pasa (0 drift entre cliente/servidor)
- [ ] Todas las variables de env están seteadas en Vercel para production
- [ ] `STRIPE_SECRET_KEY` es la live key (`sk_live_...`)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` es la live key (`pk_live_...`)
- [ ] `STRIPE_WEBHOOK_SECRET` apunta al endpoint live

### Firebase
- [ ] Firestore rules deployed: `firebase deploy --only firestore:rules`
- [ ] Storage rules deployed: `firebase deploy --only storage`
- [ ] Firebase Auth → Authorized Domains incluye: `grenbee.com`, `staff.grenbee.com`, `control-room.grenbee.com`
- [ ] Firebase Auth → Google sign-in habilitado
- [ ] Firestore indexes construidos (verificar "Building" status en consola)

### Vercel / Dominios
- [ ] `grenbee.com` configurado como dominio principal
- [ ] `staff.grenbee.com` y `control-room.grenbee.com` agregados al proyecto
- [ ] `app.grenbee.com` configurado con redirect 308 → `grenbee.com`

### Stripe
- [ ] Webhook endpoint registrado para URL de producción
- [ ] Test payment flow end-to-end en live mode
- [ ] Capture method confirmado como `manual`

### Resend
- [ ] DNS records verificados (SPF, DKIM, DMARC)
- [ ] Test email send desde dirección de producción

### Security
- [ ] `CRON_SECRET` seteado y no trivial
- [ ] Google Maps API keys restringidas por dominio/IP

### Smoke tests después de deploy
- [ ] Home page carga
- [ ] Nav links funcionan (`/us/plans`, `/us/areas`, `/us/hosts`, etc.)
- [ ] Booking wizard completa (test mode payment)
- [ ] Staff portal login funciona
- [ ] Admin panel carga bookings
- [ ] City landing page carga (`/us/areas/mapleton`)
- [ ] Hosts page carga (`/us/hosts`)
- [ ] Recurring plan cron no da error (verificar Vercel Function logs)

---

## 8. Comandos comunes

```bash
# Desarrollo local
npm run dev

# Build + type check
npm run build
npx tsc --noEmit -p apps/app/tsconfig.json

# Verificar sincronía de precios
npm run check:pricing

# Deploy Vercel (producción)
vercel --prod

# Deploy Firebase rules
firebase deploy --only firestore:rules,storage

# Seed Firestore
node scripts/seed-services.mjs
node scripts/seed-area-content.mjs

# Logs de funciones en producción
vercel logs --prod --follow
```

---

## 9. Middleware de Subdominios

`apps/app/middleware.ts` maneja el routing por dominio:

- `staff.grenbee.com` → redirige a `/staff` (login gateado por rol staff)
- `control-room.grenbee.com` → redirige a `/admin` (login gateado por rol admin/manager)
- `app.grenbee.com` → NO redirige en código (se configura en Vercel Dashboard para evitar loops)

El middleware es solo una capa de UX/routing. Todos los endpoints de API y rutas admin/staff tienen sus propios server-side role checks.
