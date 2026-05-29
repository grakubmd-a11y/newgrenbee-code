# Agent Knowledge Base — grenbee-firebase-web

> Aprendizajes compartidos para todos los agentes. Lee esto antes de empezar cualquier tarea.
> Agrega entradas cuando descubras algo no obvio. Mantenlo compacto.

---

## Reglas para escribir aquí

**Escribe solo si TODO esto es verdad:**
1. No es obvio leyendo el código
2. Te hubiera ahorrado tiempo saberlo antes de empezar
3. Es probable que importe en una tarea futura

**Nunca escribas:**
- Cosas derivables leyendo el código normalmente
- Estado temporal o contexto de trabajo en progreso
- Cosas ya documentadas en AGENT_ONBOARDING.md
- Resúmenes de lo que hiciste (eso va en los commits de git)

**Formato para entradas nuevas:**
```
- [QUÉ]: una oración. [POR QUÉ]: una oración de razón o consecuencia.
```

**Cuándo eliminar:** Si una entrada ya no es verdad (el código fue refactorizado, el patrón cambió), elimínala o actualízala. Una entrada incorrecta es peor que ninguna.

---

## Monorepo / Imports

- **Nunca usar imports relativos `../../packages/`** — usar siempre `@grenbee/types`, `@grenbee/firebase`, `@grenbee/firebase/services`, `@grenbee/firebase/contexts`, `@grenbee/i18n`, `@grenbee/config`. [POR QUÉ]: El proyecto usa Turborepo; los imports relativos entre paquetes y apps no resuelven correctamente.
- **Los paquetes exportan TypeScript source directamente** — no necesitan build step. [POR QUÉ]: `transpilePackages` en `next.config.ts` maneja la compilación.
- **`apps/web/` fue eliminado** — todo el marketing y booking están en `apps/app`. [POR QUÉ]: Consolidación a una sola app. Cualquier referencia a `apps/web` en docs o comentarios de código está desactualizada.
- **`apps/app/api/` fue eliminado** — era una copia muerta sin deployar. [POR QUÉ]: Las Vercel Functions viven SOLO en `/api/` (raíz del repo). Si creas funciones serverless, van ahí.

## Pricing & Business Logic

- **`/api/_pricing.js` (raíz del repo)** es la fuente de verdad del servidor para precios. `packages/config/index.ts` (`SERVICES_DATA`) es la del cliente. Deben estar sincronizados — usar `npm run check:pricing` antes de deploy. [POR QUÉ]: Divergencia silenciosa entre ambas causaría que la UI muestre precios distintos a lo que cobra Stripe.
- **El servidor nunca acepta `twoTechFee` del cliente** — lo re-deriva de `selectedFactors`. Lo mismo para `sameDayFee` — el servidor verifica `bookingDate === hoy`, ignorando el flag del cliente.
- **`ALLOWED_MODIFIERS` en `api/_pricing.js`** es un allowlist de seguridad. Cualquier valor de modifier fuera de él da 400. Al agregar una nueva opción de factor, agrégala aquí primero o los pagos van a fallar.
- **El antiguo sistema de "discount club"** (Essential/Preferred/Premium a $29/$49/$79) fue eliminado. No hay `activeMembership` en `AuthContext`. Los planes actuales son Firestore-based (visit-included), en la colección `membershipPlans`.
- **Servicio Vacation Rental Turnover** (`vacation-rental-turnover`): precio base $89, unidad fija (no stepper), factores: bedrooms, bathrooms, restock, laundry, expressTurnover. Definido en `packages/config/index.ts` y `/api/_pricing.js`.

## Stripe

- **`capture_method: "manual"` es intencional** — no cambiar a `automatic`. Autorización al booking, captura después de que el técnico completa el trabajo en `api/confirm-payment.js`.
- **La Stripe publishable key es `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`** (reemplazó el viejo `VITE_STRIPE_PUBLISHABLE_KEY`). También puede sobreescribirse desde el doc `settings` de Firestore — el valor de Firestore tiene precedencia.

## Firebase Admin (archivos api/)

- **Cada archivo `api/` inicializa su propia instancia** de Firebase Admin — siempre verificar `admin.apps.length` antes de llamar `initializeApp` para evitar el error "already exists".
- **CRÍTICO**: La DB de Firestore usa un ID personalizado (`ai-studio-590843c3-6656-4faa-a42c-fc98f2b5ecb1`), no el default. Siempre pasarlo a `getFirestore(app, DB_ID)`. Omitirlo silenciosamente lee/escribe la base de datos incorrecta (vacía).

## Firebase Auth — Dominios Autorizados

- **Cualquier nuevo dominio** (ej. `control-room.grenbee.com`) debe agregarse en DOS lugares antes de que Google Sign-In funcione: (1) Firebase Console → Authentication → Settings → Authorized Domains, y (2) Google Cloud Console → OAuth Client → Authorized JavaScript Origins + Redirect URIs. [POR QUÉ]: Faltar cualquiera silenciosamente bloquea el popup.

## Dependencias críticas

- **`stripe` y `resend` DEBEN estar en el `package.json` raíz** (no en `apps/app/package.json`). [POR QUÉ]: Las Vercel Functions en `/api/` las importan, y Vercel resuelve dependencias desde el `package.json` más cercano a la función. Sin ellas en raíz, producción da 500 "Cannot find module 'stripe'".

## i18n — Regla crítica de Client vs Server

- **react-i18next es CLIENT-ONLY** — usa `initReactI18next`, localStorage, y hooks de React. Los Server Components no pueden llamar `t()`. [POR QUÉ]: Las páginas SSG (areas, hosts) son server components y usarlos causaría hydration errors o errores de build.
- **Solución para server components**: usar diccionarios planos en `lib/areaCopy.ts` y `lib/hostsCopy.ts` indexados por `lang: "en" | "es"`. Pasar `lang` como prop desde la page.

## Next.js / App Router

- **Server Components con SSG** se usan en city landing pages (`areas/[areaSlug]`), hosts page, y la hub de áreas. El patrón es: `export const revalidate = 3600` + `generateStaticParams` + `generateMetadata` + async page function.
- **`{ absolute: title }` en `generateMetadata`** evita que el template del root layout (`%s | Grenbee`) duplique el sufijo si el título ya lo incluye. [POR QUÉ]: Sin `absolute:`, el título puede quedar "Grenbee — Mapleton House Cleaning | Grenbee".
- **`[country]` envuelve TODAS las rutas de marketing** — links como `/plans` no funcionan; deben ser `/us/plans`. Usar `useParams()` para obtener `country` y construir el prefix. Ver `SiteNavbar.tsx` y `PageShell.tsx` para el patrón correcto.
- **`useSearchParams()` en páginas estáticas requiere Suspense boundary** y rompe las rutas. Para leer query params en componentes que pueden ser estáticos, usar `useEffect` + `window.location.search`. Ver `PublicApp.tsx`.
- **No crear directorio `pages/`** dentro de ninguna app Next.js — conflictuaría con el App Router.
- **`strictNullChecks: false`** en los tsconfigs es intencional — la codebase es anterior a strict null checks y habilitarlo causa cientos de errores.

## Cupones

- **Los documentos de cupones se almacenan por clave derivada**, no el código raw. La clave es: lowercase, trim, reemplazar no-alphanumeric con `-`. Un cupón `SAVE20` se almacena como doc ID `save20`. Ver `couponDocId()` en `api/create-payment-intent.js`.

## Booking Wizard

- **`bookingParams.totalCost` (de CostEstimator) NO incluye same-day ni 2-tech fees** — esos se agregan dentro de BookingWizard porque la fecha no se conoce en el estimator. `OrderSummary` calcula el total display sumándolos.

## Staff Assignment

- **Two-tech bookings** escriben `primaryStaffId` + `helperStaffId` pero también mantienen `assignedStaffId = primaryStaffId` para compatibilidad — el admin panel, staff portal y webhooks solo leen `assignedStaffId`.
- **`needs_assignment`** es un `BookingStatus` válido — se setea cuando no hay staff disponible para el slot.

## Datos de Ciudad (City Landing Pages)

- **`lib/launchAreas.ts`** es el source of truth build-time para las 10 ciudades de Utah. No requiere credenciales. Firestore es la fuente principal; `launchAreas.ts` es el fallback.
- **`lib/areaContent.server.ts`** usa Firebase Admin SDK para leer Firestore en SSG. Requiere `FIREBASE_SERVICE_ACCOUNT_JSON` o Application Default Credentials (`gcloud auth application-default login` para local).
- **Los scripts de seed** (`seed-services.mjs`, `seed-area-content.mjs`) soportan `--serviceAccount=path` o ADC (sin flags).
