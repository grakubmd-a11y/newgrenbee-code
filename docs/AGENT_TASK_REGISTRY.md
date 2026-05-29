# Agent Task Registry — grenbee-firebase-web

> El dashboard en vivo de tareas. Los agentes deben revisar esto antes de empezar cualquier trabajo.
> Actualizar el status cuando reclames, completes o bloquees una tarea.

---

## Active Tasks

| ID | Name | Status | Agent | Priority |
|---|---|---|---|---|
| — | — | — | — | — |

*No hay tareas activas. El Orchestrator agrega nuevas tareas aquí.*

---

## Completed Tasks (para contexto)

| ID | Name | Completed By | Notes |
|---|---|---|---|
| TASK-001 | Server-side price validation | Claude Code | `api/_pricing.js` + reescritura de `api/create-payment-intent.js` |
| TASK-002 | Slot availability check | Claude Code | `api/availability.js` + BookingWizard Step 1 UI |
| TASK-003 | Same-day fee (+$35) y 2-tech fee (+$50) | Claude Code | Compute cliente + verify servidor + OrderSummary line items |
| TASK-004 | Terms & recurring consent checkboxes | Claude Code | BookingWizard Step 3 |
| TASK-005 | Consolidación apps/web + apps/app → apps/app | Claude Code | Una sola app en `grenbee.com`; `apps/web` eliminado |
| TASK-006 | City landing pages (10 ciudades Utah) | Claude Code | SSG con `generateStaticParams`, `lib/launchAreas.ts`, server components |
| TASK-007 | Página "Grenbee for Hosts" | Claude Code | `lib/hostsCopy.ts`, `components/hosts/HostsLandingView.tsx`, SSG |
| TASK-008 | Eliminar sistema de membresía antiguo (discount club) | Claude Code | `AuthContext`, i18n keys, `MembershipPlans.tsx` viejos eliminados |
| TASK-009 | Servicio Vacation Rental Turnover | Claude Code | `packages/config`, `api/_pricing.js`, `CostEstimator` stepper fijo |
| TASK-010 | Guard de sincronía de precios | Claude Code | `scripts/check-pricing-sync.ts`, `npm run check:pricing` |
| TASK-011 | Eliminar `apps/app/api/` (directorio muerto) | Claude Code | Solo `/api/` raíz se despliega; `apps/app/api/` era copia muerta |
| TASK-012 | Fix nav links con prefijo `/{country}` | Claude Code | `SiteNavbar.tsx`, `PageShell.tsx` — todos los links de marketing ahora usan `base` prefix |
| TASK-013 | Fix footer con ciudades de Utah (antes Miami) | Claude Code | `PageShell.tsx` — Utah County + Wasatch Back cities |
| TASK-014 | Fix infinite spinner en PlansPage | Claude Code | `.finally()` + timeout 8s + empty state |
| TASK-015 | Sitemap + robots.txt | Claude Code | `apps/app/app/sitemap.ts` + `robots.ts` |

---

## Task Specification Template

Cuando el Orchestrator crea una nueva tarea, copiar este bloque y llenarlo:

```
### TASK-XXX — [Nombre de la Tarea]

**Status:** OPEN
**Priority:** HIGH | MEDIUM | LOW
**Agent:** unassigned
**Depends On:** [TASK-IDs que deben estar DONE primero, o "none"]

**Description:**
[Qué hay que construir o cambiar, y por qué]

**Owned Files (BUILDER solo puede tocar estos):**
- `path/to/file.ts`
- `path/to/folder/` (carpeta completa)

**Out of Bounds (no tocar):**
- `api/_pricing.js` — solo el Orchestrator puede autorizar cambios aquí
- `packages/firebase/index.ts` — coordinación antes de tocar
- [otros archivos restringidos]

**Acceptance Criteria:**
- [ ] [condición específica y testeable]
- [ ] [condición específica y testeable]
- [ ] npx tsc --noEmit pasa
- [ ] npm run build pasa

**Notes for the Builder:**
[Patrones a seguir, gotchas, archivos relacionados a leer primero]
```

---

## File Ownership Map

Esta tabla muestra qué áreas del codebase pertenecen a qué dominio.
Úsala para diseñar asignaciones de tareas sin solapamiento.

| Área | Path | Notes |
|---|---|---|
| Pricing engine (servidor) | `api/_pricing.js` | **Protegido** — el Orchestrator debe aprobar cualquier cambio |
| Payment flow | `api/create-payment-intent.js`, `api/confirm-payment.js`, `api/stripe-webhook.js` | Alto riesgo — se requiere Reviewer |
| Availability | `api/availability.js` | Standalone, seguro para asignar independientemente |
| Staff/job endpoints | `api/auto-assign-staff.js`, `api/staff-jobs.js`, `api/update-job-status.js`, `api/set-job-payout.js` | Dominio staff |
| Recurring plans | `api/create-recurring-plan.js`, `api/manage-recurring-plan.js`, `api/process-recurring-plans.js`, `api/_recurring.js` | Dominio recurring |
| Notifications | `api/notify.js`, `api/_mailer.js` | Dominio email |
| City landing pages | `apps/app/lib/launchAreas.ts`, `apps/app/lib/areaContent.server.ts`, `apps/app/components/areas/` | Dominio contenido |
| Hosts page | `apps/app/lib/hostsCopy.ts`, `apps/app/components/hosts/` | Dominio contenido |
| Booking UI | `apps/app/components/PublicApp.tsx`, `apps/app/components/BookingWizard.tsx` | Dominio UI booking |
| Marketing pages | `apps/app/components/views/` | Dominio contenido marketing |
| Layout/nav | `apps/app/components/layout/SiteNavbar.tsx`, `apps/app/components/layout/PageShell.tsx` | Coordinación antes de tocar |
| Admin panel | `apps/app/app/admin/`, `apps/app/components/admin/` | Dominio admin |
| Staff portal | `apps/app/app/staff/`, `apps/app/components/staff/` | Dominio staff UI |
| Shared types | `packages/types/` | Coordinación antes de tocar — muchos consumidores |
| Config / pricing client | `packages/config/index.ts` | Siempre sincronizar con `api/_pricing.js` |
| Firebase config | `packages/firebase/index.ts` | No tocar sin aprobación del Orchestrator |
| i18n locales | `packages/i18n/locales/en.json`, `es.json` | Agregar AMBOS idiomas al mismo tiempo |
| Middleware | `apps/app/middleware.ts` | Domain routing — revisar antes de cambiar |
| Scripts | `scripts/` | Seed scripts y guards — bajo riesgo |

---

## Rules Reminder

- **OPEN** → seguro para reclamar
- **IN_PROGRESS** → alguien lo tiene — no tocar sus archivos
- Dos tareas pueden correr en paralelo solo si sus Owned Files no se solapan
- Siempre actualizar el status al empezar (`IN_PROGRESS`) y al terminar (`REVIEW` o `DONE`)
- Si está bloqueado, poner `BLOCKED` y explicar al Orchestrator
