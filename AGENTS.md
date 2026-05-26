# Project Notes For Future Agents

## Pending Backend Integration

- The embedded Stripe flow uses `/api/create-payment-intent` and `/api/confirm-payment`.
- Coupon usage is intentionally recorded only in `/api/confirm-payment`, after Stripe reports the PaymentIntent as `requires_capture`, `succeeded`, or `processing`.
- Configure `FIREBASE_SERVICE_ACCOUNT_JSON` in the server/Vercel environment if coupon usage updates should run in production.
- Do not increment `usedCount` during public quote validation, coupon lookup, form entry, failed checkout, or abandoned checkout.
- Prefer doing the increment server-side in the same trusted flow that creates/confirms the booking, ideally with a Firestore transaction or callable backend endpoint to avoid race conditions against `usageLimit`.

## Multi-Agent Development

- For multi-agent development work (Explorer/Builder/Reviewer/Test), follow `docs/development-orchestrator.md`.
