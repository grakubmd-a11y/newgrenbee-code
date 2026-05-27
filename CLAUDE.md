# Greenbee — Guía para Agentes de IA

Lee este archivo COMPLETO antes de tocar cualquier código.

---

## Stack

- React 19 + TypeScript + Vite
- Firebase Firestore + Firebase Auth
- Stripe (capture_method: manual — NO cambiar a automatic)
- Vercel serverless functions (`api/`)
- react-i18next para internacionalización
- Tailwind CSS con clases custom: `brand`, `brand-hover`, `brand-light`

---

## Regla #1 — INTERNACIONALIZACIÓN (OBLIGATORIO)

**NUNCA escribas strings de texto visible al usuario directamente en JSX.**

El sitio es bilingüe (Inglés / Español) y se expandirá a Chile. Todo texto visible DEBE usar `useTranslation()`.

### ✅ Correcto
```tsx
import { useTranslation } from "react-i18next";

export default function MiComponente() {
  const { t } = useTranslation();
  return <h1>{t("seccion.titulo")}</h1>;
}
```

### ❌ Incorrecto — nunca hagas esto
```tsx
return <h1>Book a Service</h1>;          // ❌ hardcoded inglés
return <h1>Reservar Servicio</h1>;        // ❌ hardcoded español
return <h1>{lang === 'en' ? 'Book' : 'Reservar'}</h1>;  // ❌ ternario manual
```

### Archivos de traducción
- **Inglés:** `src/shared/locales/en.json`
- **Español:** `src/shared/locales/es.json`
- Estructura JSON anidada por sección: `"siteNav.getQuote"`, `"home.hero.title"`, etc.
- Arrays de datos: `t("faq.items", { returnObjects: true }) as FaqItem[]`

### Convención de claves por archivo
| Archivo / Página | Prefijo de clave |
|---|---|
| `HomePage.tsx` | `home.*` |
| `SiteNavbar.tsx` | `siteNav.*` |
| `AreasPage.tsx` | `areas.*` |
| `AreaLandingPage.tsx` | `areaPage.*` |
| `FAQPage.tsx` | `faq.*` |
| `ContactPage.tsx` | `contact.*` |
| `ServicesGrid.tsx` | `servicesGrid.*` |
| `PlansPage.tsx` | `plans.*` |
| `PublicApp.tsx` + componentes en `public/components/` | `nav.*`, `hero.*`, `features.*`, `services.*`, `cta.*`, `trust.*`, `testimonials.*` |
| Páginas legales | `legal.*` |

### Agregar claves nuevas
Cuando crees un componente nuevo con texto:
1. Agrega la clave en inglés a `src/shared/locales/en.json`
2. Agrega la traducción en español a `src/shared/locales/es.json`
3. Usa `t("clave")` en el componente

---

## Regla #2 — ROUTING I18N

Las rutas públicas usan prefijo de país/idioma:
- `/us/` → Inglés (default)
- `/us/es/` → Español
- `/cl/` → Chile (futuro)

`App.tsx` maneja esto con `LocaleLayout` + `useParams({ country })`.

El componente `SiteNavbar` y `Navbar` usan `useNavigate` + `useParams` para el toggle de idioma — NO llamar a `i18n.changeLanguage()` directamente desde un botón.

---

## Regla #3 — SEGURIDAD DE PRECIOS

Los precios NUNCA se calculan en el cliente para fines de cobro. El objeto `pricing` en Firestore es la fuente de verdad. Las funciones `api/` validan el precio server-side antes de crear el PaymentIntent de Stripe.

---

## Regla #4 — STRIPE

`capture_method: "manual"` en todos los PaymentIntents. El cargo se captura solo cuando el trabajo está completado (`status: "completed"`). **No cambiar a `automatic`.**

---

## Regla #5 — FIREBASE ADMIN

Las funciones en `api/` usan Firebase Admin SDK. El cliente usa el SDK web. Nunca mezcles imports entre los dos en el mismo archivo.

---

## Estructura de carpetas clave

```
src/
  pages/            # Páginas de marketing (HomePage, AreasPage, FAQPage, etc.)
  public/           # App para usuarios (PublicApp, Navbar, BookingWizard, etc.)
  admin/            # Portal admin (AdminRoute, dashboard)
  staff/            # Portal staff (StaffRoute, portal)
  shared/
    locales/        # en.json, es.json  ← AGREGAR CLAVES AQUÍ
    i18n.ts         # Configuración react-i18next
    types.ts        # Tipos TypeScript compartidos
    firebase.ts     # SDK cliente Firebase
    services/       # firebaseService.ts, recurringPlanService.ts
api/                # Vercel serverless functions (Node.js, Firebase Admin)
```

---

## Antes de hacer commit

```bash
npx tsc --noEmit   # Debe terminar con 0 errores
```

Si hay errores de TypeScript, corrígelos antes de commitear.

---

## Multi-agente

Si trabajas en paralelo con otro agente, consulta `docs/AGENT_TASK_REGISTRY.md` para evitar pisar el mismo archivo. Cada archivo tiene un único "owner" por tarea activa.
