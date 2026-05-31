Ignore everything inside the docs/ folder.

# Grenbee — Guía para Agentes de IA

Lee este archivo COMPLETO antes de tocar cualquier código.

---

## Stack

- React 19 + TypeScript + **Next.js 15.5 App Router** (SSG via `generateStaticParams`, ISR via `revalidate = 3600`)
- Firebase Firestore + Firebase Auth
- Stripe (`capture_method: "manual"` — NO cambiar a `automatic`)
- Vercel Serverless Functions (`/api/` en la **raíz del repo**, no dentro de `apps/`)
- react-i18next para internacionalización — **solo en componentes cliente**
- Tailwind CSS con clases custom: `brand`, `brand-hover`, `brand-light`
- Turborepo monorepo: `apps/app` + `packages/{types,firebase,config,i18n}`

---

## Estructura del monorepo

```
/
├── api/                        ← Vercel Serverless Functions (ESTA es la que se despliega)
│   ├── _pricing.js             ← Fuente de verdad de precios para el servidor
│   ├── create-payment-intent.js
│   ├── confirm-payment.js
│   └── ...
├── apps/
│   └── app/                    ← La única app Next.js (antes había apps/web — fue eliminada)
│       ├── app/
│       │   ├── [country]/(en)/ ← Rutas en inglés: /us/*, /cl/*
│       │   ├── [country]/es/   ← Rutas en español: /us/es/*, /cl/es/*
│       │   └── (app)/          ← /book, /account, /bookings (sin prefijo de país)
│       ├── components/
│       │   ├── layout/         ← SiteNavbar, PageShell
│       │   ├── views/          ← PlansPage, FAQPage, ContactPage, etc.
│       │   ├── areas/          ← AreaLandingView, AreasView, WaitlistForm
│       │   └── hosts/          ← HostsLandingView
│       └── lib/
│           ├── launchAreas.ts  ← Datos build-time para city landing pages
│           ├── areaContent.server.ts ← Fetchers Firebase Admin para SSG
│           ├── areaCopy.ts     ← Diccionario estático EN/ES para server components
│           └── hostsCopy.ts    ← Diccionario estático EN/ES para página hosts
├── packages/
│   ├── types/      ← @grenbee/types
│   ├── firebase/   ← @grenbee/firebase (client SDK + services + contexts)
│   ├── config/     ← @grenbee/config (SERVICES_DATA, precios cliente)
│   └── i18n/       ← @grenbee/i18n + locales/en.json + locales/es.json
└── scripts/        ← seed-services.mjs, seed-area-content.mjs, check-pricing-sync.ts
```

---

## Regla #1 — INTERNACIONALIZACIÓN (OBLIGATORIO)

**NUNCA escribas strings de texto visible al usuario directamente en JSX.**

El sitio es bilingüe (Inglés / Español). Todo texto visible DEBE usar `useTranslation()` **en componentes cliente**, o diccionarios estáticos en **server components**.

### ✅ Correcto — componente cliente
```tsx
"use client";
import { useTranslation } from "react-i18next";

export default function MiComponente() {
  const { t } = useTranslation();
  return <h1>{t("seccion.titulo")}</h1>;
}
```

### ✅ Correcto — server component (NO puede usar react-i18next)
```tsx
// sin "use client" — server component
import { AREA_COPY } from "@/lib/areaCopy";

export default function Page({ lang }: { lang: "en" | "es" }) {
  const copy = AREA_COPY[lang];
  return <h1>{copy.hero.title}</h1>;
}
```

### ❌ Incorrecto — nunca hagas esto
```tsx
return <h1>Book a Service</h1>;                         // ❌ hardcoded inglés
return <h1>Reservar Servicio</h1>;                       // ❌ hardcoded español
import { useTranslation } from "react-i18next";          // ❌ en un server component
```

### Archivos de traducción
- **Inglés:** `packages/i18n/locales/en.json`
- **Español:** `packages/i18n/locales/es.json`
- Estructura JSON anidada por sección: `"siteNav.getQuote"`, `"home.hero.title"`, etc.
- Arrays de datos: `t("faq.items", { returnObjects: true }) as FaqItem[]`

### react-i18next es CLIENT-ONLY
`react-i18next` usa `initReactI18next`, `localStorage` y hooks de React — es incompatible con Server Components. Las páginas SSG (areas, hosts) usan diccionarios planos en `lib/areaCopy.ts` y `lib/hostsCopy.ts`.

### Convención de claves por archivo
| Archivo / Página | Prefijo de clave |
|---|---|
| `SiteNavbar.tsx` | `siteNav.*` |
| `PageShell.tsx` | `home.footer.*` |
| `views/PlansPage.tsx` | `plans.*` |
| `views/FAQPage.tsx` | `faq.*` |
| `views/ContactPage.tsx` | `contact.*` |
| `PublicApp.tsx` + booking | `nav.*`, `hero.*`, `services.*`, `estimator.*` |
| Páginas legales | `legal.*` |

### Agregar claves nuevas
1. Agrega la clave en `packages/i18n/locales/en.json`
2. Agrega la traducción en `packages/i18n/locales/es.json`
3. Usa `t("clave")` en el componente cliente, o agrega al diccionario `.ts` para server components

---

## Regla #2 — ROUTING CON PREFIJO DE PAÍS

TODOS los links de marketing deben llevar el prefijo `/${country}`. Las rutas viven en:
- `/us/plans`, `/us/areas`, `/us/hosts`, `/us/faq`, `/us/contact`, etc.
- Las rutas de app (`/book`, `/account`, `/bookings`) NO llevan prefijo de país.

### Cómo obtener el prefijo en componentes cliente
```tsx
import { useParams } from "next/navigation";
const params = useParams();
const base = `/${(params?.country as string) ?? "us"}`;
// Usar: href={`${base}/plans`}
```

### Por qué
El segmento dinámico `[country]` envuelve TODAS las páginas de marketing. Un link hardcodeado a `/plans` lleva a una ruta 404; debe ser `/us/plans`.

---

## Regla #3 — SEGURIDAD DE PRECIOS

Los precios NUNCA se calculan en el cliente para fines de cobro. El servidor recalcula todo.

- **`/api/_pricing.js`** (raíz del repo) es la fuente de verdad del servidor
- **`packages/config/index.ts`** (`SERVICES_DATA`) es la fuente de verdad del cliente/UI
- Deben estar sincronizados: corre `npm run check:pricing` antes de cada deploy
- `ALLOWED_MODIFIERS` en `api/_pricing.js` es un allowlist de seguridad — cualquier valor fuera de él devuelve 400
- El servidor NUNCA acepta `amount` del cliente — lo recalcula completamente

---

## Regla #4 — STRIPE

`capture_method: "manual"` en todos los PaymentIntents. El cargo se captura solo cuando el trabajo está completado. **No cambiar a `automatic` bajo ninguna circunstancia.**

---

## Regla #5 — FIREBASE ADMIN

- Las funciones en `/api/` (raíz) usan Firebase Admin SDK
- El cliente usa el SDK web desde `@grenbee/firebase`
- Nunca mezcles imports entre los dos en el mismo archivo
- **CRÍTICO**: La DB de Firestore usa un ID personalizado. Siempre pasar `DB_ID` a `getFirestore(app, DB_ID)`
- `apps/app/api/` fue eliminado — no existe más. La carpeta de funciones es solo `/api/` en la raíz

---

## Regla #6 — SERVER COMPONENTS Y SSG

Las páginas de city landing y la página de hosts son Server Components con SSG:

```tsx
// Patrón correcto para páginas SSG
export const revalidate = 3600;
export async function generateStaticParams() { ... }
export async function generateMetadata({ params }) { ... }
export default async function Page({ params }) { ... }
```

- NO usar `"use client"` en páginas SSG
- NO usar `useTranslation()` en server components — usar diccionarios de `lib/areaCopy.ts`
- Usar `{ absolute: title }` en `generateMetadata` para evitar que el template del layout lo duplique

---

## Comandos de desarrollo

```bash
npm run dev          # apps/app en puerto 3000/3001
npm run build        # build via Turborepo
npm run typecheck    # tsc --noEmit
npm run check:pricing # verifica sincronía de precios cliente/servidor
```

## Antes de hacer commit

```bash
npx tsc --noEmit -p apps/app/tsconfig.json   # 0 errores TypeScript
npm run check:pricing                         # 0 drift de precios
```
