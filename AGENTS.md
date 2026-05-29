# Project Notes For Future Agents

## Integración de Pagos (Stripe)

- El flujo de Stripe usa `/api/create-payment-intent` y `/api/confirm-payment`.
- `capture_method: "manual"` — NO cambiar a `automatic`. El cargo se captura después de que el técnico completa el trabajo.
- El uso de cupones se registra SOLO en `/api/confirm-payment`, después de que Stripe reporta el PaymentIntent como `requires_capture`, `succeeded`, o `processing`.
- No incrementar `usedCount` durante validación de quote pública, form entry, checkout fallido o checkout abandonado.
- El incremento es server-side en el mismo flow de confianza que crea/confirma el booking (idealmente con una Firestore transaction).

## Funciones Serverless

- Las Vercel Functions están en `/api/` (raíz del repo). **`apps/app/api/` fue eliminado** — era una copia muerta.
- `api/_pricing.js` es la fuente de verdad de precios del servidor — independiente de los paquetes TypeScript para evitar riesgo de bundling en el payment path.
- `stripe` y `resend` deben estar en el `package.json` **raíz** (no en `apps/app`). Sin esto, las funciones dan 500 en producción.

## Guard de Precios

- Correr `npm run check:pricing` antes de cada deploy para verificar que `api/_pricing.js` y `packages/config/index.ts` están sincronizados.
- El script vive en `scripts/check-pricing-sync.ts` y se ejecuta con `tsx`.

## Multi-Agent Development

- Para trabajo multi-agente, seguir `docs/development-orchestrator.md`.
- El sistema de roles (Orchestrator / Builder / Reviewer / Explorer) está definido en `docs/AGENT_SYSTEM.md`.
- El registro de tareas activas está en `docs/AGENT_TASK_REGISTRY.md`.
- Los aprendizajes acumulados están en `docs/AGENT_KNOWLEDGE.md`.
