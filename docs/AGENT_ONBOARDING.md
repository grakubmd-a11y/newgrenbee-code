# Agent Onboarding — grenbee-firebase-web

> **Lee esto primero. Cada agente, cada sesión, sin excepciones.**
> Sea Claude Code, Codex, Copilot u otro modelo — este es tu punto de entrada.

---

## Qué es este proyecto

**Grenbee** es una plataforma de booking de servicios para el hogar (limpieza, jardinería, vacation rentals, etc.) construida para Utah County.

Los clientes visitan el sitio, obtienen un presupuesto, reservan un servicio, pagan vía Stripe y se despacha un técnico. El sitio también tiene landing pages por ciudad para SEO.

---

## Tech Stack (actual)

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Next.js 15.5 (App Router) |
| Styling | Tailwind CSS v4 (tokens: `bg-brand`, `text-brand`, `bg-brand-light`) |
| Icons | Lucide React |
| Database | Firebase Firestore (named DB: `ai-studio-590843c3-6656-4faa-a42c-fc98f2b5ecb1`) |
| Auth | Firebase Auth — Google Sign-In + email/password |
| Backend | Vercel Serverless Functions (`/api/*.js` en la **raíz del repo**) |
| Server DB | Firebase Admin SDK (`FIREBASE_SERVICE_ACCOUNT_JSON` env var) |
| Payments | Stripe — `capture_method: "manual"` (autorizar al reservar, capturar al completar) |
| Email | Resend (`RESEND_API_KEY`) |
| i18n | react-i18next — EN/ES, routing `/us/` y `/us/es/` |
| Monorepo | Turborepo (`turbo.json` en raíz) |
| Deploy | Vercel — **un solo proyecto** (`grenbee-app`) sirviendo `grenbee.com` |

---

## Estructura del monorepo

```
/
├── api/                          ← Vercel Serverless Functions (desplegadas en producción)
│   ├── _pricing.js               ← FUENTE DE VERDAD de precios (server-authoritative)
│   ├── _mailer.js
│   ├── create-payment-intent.js
│   ├── confirm-payment.js
│   ├── stripe-webhook.js
│   └── ...
│
├── apps/
│   └── app/                      ← @grenbee/app — App completa (marketing + booking + admin + staff)
│       ├── app/                  ← Next.js App Router pages
│       │   ├── [country]/(en)/   ← Rutas marketing EN: /us/plans, /us/areas, /us/hosts, etc.
│       │   ├── [country]/es/     ← Rutas marketing ES: /us/es/plans, etc.
│       │   ├── (app)/            ← /book, /account, /bookings (sin prefijo de país)
│       │   ├── admin/            ← /admin (requiere rol admin/manager)
│       │   ├── staff/            ← /staff (requiere rol staff)
│       │   ├── sitemap.ts        ← Sitemap automático con city pages
│       │   └── robots.ts         ← robots.txt
│       ├── components/
│       │   ├── layout/           ← SiteNavbar, PageShell
│       │   ├── views/            ← PlansPage, FAQPage, ContactPage, legal pages
│       │   ├── areas/            ← AreaLandingView (SSG), AreasView (SSG), WaitlistForm
│       │   └── hosts/            ← HostsLandingView (SSG)
│       ├── lib/
│       │   ├── launchAreas.ts         ← Datos build-time para 10 ciudades de Utah
│       │   ├── areaContent.server.ts  ← Firestore Admin fetchers para SSG
│       │   ├── areaRender.tsx         ← Helpers render SSG: AreaPage, ServicePage
│       │   ├── areaCopy.ts            ← Diccionario estático EN/ES para area server components
│       │   └── hostsCopy.ts           ← Diccionario estático EN/ES para hosts page
│       └── middleware.ts         ← Domain routing: staff.grenbee.com → /staff, etc.
│
├── packages/
│   ├── types/       ← @grenbee/types — todas las interfaces TypeScript
│   ├── firebase/    ← @grenbee/firebase — Firebase client SDK + services + contexts
│   │   ├── index.ts
│   │   ├── services/ ← firebaseService, pricingService, recurringPlanService
│   │   └── contexts/ ← SiteSettingsContext
│   ├── i18n/        ← @grenbee/i18n — config react-i18next + locales EN/ES
│   │   └── locales/ ← en.json, es.json
│   └── config/      ← @grenbee/config — SERVICES_DATA, precios UI
│
├── scripts/
│   ├── seed-services.mjs          ← Seed Firestore con servicios
│   ├── seed-area-content.mjs      ← Seed Firestore con contenido de ciudades
│   └── check-pricing-sync.ts      ← Guard: verifica que precios cliente/servidor estén sincronizados
│
├── docs/            ← documentación para agentes (esta carpeta)
├── CLAUDE.md        ← reglas del proyecto para agentes IA
├── AGENTS.md        ← notas de integración backend y multi-agente
├── DEPLOY.md        ← guía de deploy y checklist pre-producción
└── turbo.json
```

> **NOTA IMPORTANTE**: `apps/web/` fue eliminado. Antes había dos apps separadas (`apps/web` para marketing, `apps/app` para booking). Ahora todo vive en `apps/app` y sirve desde `grenbee.com`.
>
> **NOTA IMPORTANTE**: `apps/app/api/` también fue eliminado. Era una copia muerta. Las funciones serverless viven SOLO en `/api/` (raíz del repo).

---

## Vercel Projects

| Proyecto | Dominio | Root Dir | Propósito |
|---|---|---|---|
| `grenbee-app` | grenbee.com | `apps/app` | App completa: marketing + booking + admin + staff |

### Subdominios (mismo proyecto, mismo deploy)
- `staff.grenbee.com` → `/staff` (gated por rol staff)
- `control-room.grenbee.com` → `/admin` (gated por rol admin/manager)
- `app.grenbee.com` → redirect a `grenbee.com` (configurado en Vercel Dashboard, no en código)

---

## Imports de paquetes compartidos

```ts
import { Booking, Service } from "@grenbee/types";
import { db, auth } from "@grenbee/firebase";
import { fetchUserBookings, updateBookingInFirestore } from "@grenbee/firebase/services";
import { useSiteSettings } from "@grenbee/firebase/contexts";
import i18n from "@grenbee/i18n";
import { SERVICES_DATA } from "@grenbee/config";
```

Los paquetes exportan TypeScript source directamente (sin build step). `transpilePackages` en `apps/app/next.config.ts` lo maneja.

**NUNCA** usar imports relativos `../../packages/...` — siempre usar `@grenbee/*`.

---

## Reglas Críticas — Lee Antes de Tocar Cualquier Cosa

### i18n (OBLIGATORIO)
- **NUNCA** hardcodees strings visibles al usuario en JSX.
- Componentes cliente: `t("key")` de `useTranslation()`.
- Server components: usar diccionarios estáticos en `lib/areaCopy.ts` / `lib/hostsCopy.ts` — react-i18next NO funciona en server components.
- Agregar claves a AMBOS `packages/i18n/locales/en.json` Y `es.json`.

### Routing con prefijo de país (OBLIGATORIO)
- TODOS los links de marketing deben ir a `/${country}/plans`, `/${country}/areas`, etc.
- Usar `useParams()` para obtener `country`, construir `const base = \`/${country ?? "us"}\``.
- Las rutas de app (`/book`, `/account`, `/bookings`) NO llevan prefijo de país.

### Precios (SEGURIDAD)
- **NUNCA** aceptar `amount` del cliente. El servidor recalcula todo.
- `/api/_pricing.js` (raíz) es la fuente de verdad del servidor.
- `packages/config/index.ts` (`SERVICES_DATA`) es la fuente de verdad del cliente/UI.
- Deben estar sincronizados: corre `npm run check:pricing`.
- `ALLOWED_MODIFIERS` en `api/_pricing.js` es un allowlist de seguridad anti-tamper.

### Stripe
- `capture_method: "manual"` — autorizar al booking, capturar después de completar el trabajo.
- **No cambiar a `automatic`** sin aprobación explícita del usuario.

### Firebase
- **Client SDK**: importar desde `@grenbee/firebase`.
- **Admin SDK**: cada archivo `api/*.js` inicializa su propia instancia — siempre verificar `admin.apps.length` antes de `initializeApp`.
- **CRÍTICO**: El ID de la DB de Firestore es personalizado, siempre pasarlo: `getFirestore(app, "ai-studio-590843c3-6656-4faa-a42c-fc98f2b5ecb1")`.
- Nunca mezclar client SDK y Admin SDK en el mismo archivo.

### Variables de entorno
- Client-side: prefijo `NEXT_PUBLIC_*` (reemplaza el viejo `VITE_*` de la era Vite).
- Server-side (api/): sin prefijo.
- **Nunca** usar `import.meta.env.VITE_*` — el proyecto ya no usa Vite.

### TypeScript
- Correr `npx tsc --noEmit -p apps/app/tsconfig.json` antes de reportar una tarea completa.
- Cero errores de tipo es un requisito.

### Dependencias
- `stripe` y `resend` DEBEN estar en el `package.json` raíz (no en `apps/app/package.json`). Son usadas por las Vercel Functions en `/api/`. Si no están ahí, producción da 500 "Cannot find module".

---

## Estado Actual del Proyecto

### Completado
- [x] Turborepo monorepo — `apps/app` + 4 paquetes compartidos (apps/web eliminado)
- [x] Next.js 15.5 App Router — SSG para city pages, ISR para contenido dinámico
- [x] i18n EN/ES — routing `/us/` + `/us/es/`
- [x] Full booking wizard (3 pasos: fecha/slot → detalles → pago)
- [x] Validación de precios server-side (`api/_pricing.js` + `api/create-payment-intent.js`)
- [x] Slot availability check (`api/availability.js`)
- [x] Same-day fee (+$35) y 2-technician fee (+$50)
- [x] Stripe embedded checkout (PaymentElement, `capture_method: manual`)
- [x] Sistema de cupones (validado server-side, Firestore-authoritative)
- [x] Admin panel (`/admin`)
- [x] Staff portal (`/staff`)
- [x] Planes de membresía (Firestore-based, visit-included — el antiguo "discount club" fue eliminado)
- [x] Servicio Vacation Rental Turnover + página "For Hosts" (`/us/hosts`)
- [x] City landing pages para 10 ciudades de Utah (SSG con `generateStaticParams`)
- [x] Hub de áreas (`/us/areas`) con WaitlistForm
- [x] Sitemap + robots.txt automáticos
- [x] Guard de sincronía de precios (`npm run check:pricing`)
- [x] Footer y navbar con links correctos (prefijo `/${country}`)
- [x] Dominio único `grenbee.com` (antes había dos apps separadas)

### Pendiente
- [ ] Redirect `app.grenbee.com` → `grenbee.com`: configurar en Vercel Dashboard → Domains → `app.grenbee.com` → Redirect, 308
- [ ] Stripe live mode: cambiar `STRIPE_SECRET_KEY` de `sk_test_...` a `sk_live_...` en Vercel env vars
- [ ] Smoke test del flujo completo de booking end-to-end
- [ ] Seed de planes de membresía en Firestore: `node scripts/seed-services.mjs`

---

## Comandos de desarrollo

```bash
npm run dev          # apps/app en puerto 3000/3001
npm run build        # build via Turborepo
npm run typecheck    # tsc --noEmit
npm run check:pricing # verifica sincronía de precios cliente/servidor
node scripts/seed-services.mjs        # seed servicios en Firestore
node scripts/seed-area-content.mjs    # seed contenido de ciudades en Firestore
```

---

## Antes de Empezar — Define tu Rol

### ¿Recibiste una petición directa del usuario?
→ Eres el **ORCHESTRATOR**. Lee `docs/AGENT_SYSTEM.md` → sección ORCHESTRATOR.

### ¿Recibiste un Task ID específico (ej. "trabaja en TASK-007")?
→ Abre `docs/AGENT_TASK_REGISTRY.md`, encuentra la tarea, lee el campo `Role`.

### En todos los casos, antes de escribir código:
1. Lee este archivo (✓ hecho)
2. Lee `docs/AGENT_KNOWLEDGE.md` — lecciones acumuladas
3. Lee `docs/AGENT_SYSTEM.md` — reglas para tu rol
4. Lee `docs/AGENT_TASK_REGISTRY.md` — tareas activas y ownership de archivos
5. Confirma que tu área no se solapa con ninguna tarea `IN_PROGRESS`
6. Cambia el estado de tu tarea a `IN_PROGRESS` antes de escribir código
7. Al terminar: corre `npx tsc --noEmit`, reporta en formato estándar, cambia status a `REVIEW`

### Al terminar cualquier tarea:
- Si descubriste algo no obvio que te hubiera ahorrado tiempo → agrégalo a `docs/AGENT_KNOWLEDGE.md`
- Si una entrada en `AGENT_KNOWLEDGE.md` ya no es verdad → corrígela o elimínala

---

## Dónde pedir ayuda

Si algo no está claro, está bloqueado, o conflicto con otra tarea — para y reporta al Orchestrator antes de continuar. No adivines en seguridad, pricing o comportamiento de Stripe.
