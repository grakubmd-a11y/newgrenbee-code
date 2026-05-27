# Agent Task Registry — grenbee-firebase-web

> The live dashboard of tasks. Agents must check this before starting any work.
> Update status when you claim, complete, or block a task.

---

## Active Tasks

| ID | Name | Status | Agent | Priority |
|---|---|---|---|---|
| — | — | — | — | — |

*No active tasks. New tasks are added here by the Orchestrator.*

---

## Completed Tasks (for context)

| ID | Name | Completed By | Notes |
|---|---|---|---|
| TASK-001 | Server-side price validation | Claude Code | `api/_pricing.js` + rewrite of `api/create-payment-intent.js` |
| TASK-002 | Slot availability check | Claude Code | `api/availability.js` + BookingWizard Step 1 UI |
| TASK-003 | Same-day fee (+$35) and 2-tech fee (+$50) | Claude Code | Client compute + server verify + OrderSummary line items |
| TASK-004 | Terms & recurring consent checkboxes | Claude Code | BookingWizard Step 3, blocks payment if not accepted |
| TASK-005 | React Router v7 setup | Claude Code | `main.tsx` BrowserRouter, `App.tsx` routes, all page components |

---

## Task Specification Template

When the Orchestrator creates a new task, copy this block and fill it in:

```
### TASK-XXX — [Task Name]

**Status:** OPEN
**Priority:** HIGH | MEDIUM | LOW
**Agent:** unassigned
**Depends On:** [TASK-IDs that must be DONE first, or "none"]

**Description:**
[What needs to be built or changed, and why]

**Owned Files (BUILDER may only touch these):**
- `path/to/file.ts`
- `path/to/folder/` (entire folder)

**Out of Bounds (do not touch):**
- `api/_pricing.js` — only Orchestrator may authorize changes here
- `src/shared/firebase.ts` — auth/db config, coordinate before touching
- [other restricted files]

**Acceptance Criteria:**
- [ ] [specific, testable condition]
- [ ] [specific, testable condition]
- [ ] npx tsc --noEmit passes
- [ ] npm run build passes

**Notes for the Builder:**
[Patterns to follow, gotchas, related files to read first]
```

---

## File Ownership Map

This table shows which areas of the codebase belong to which domain.
Use it to design non-overlapping task assignments.

| Area | Path | Notes |
|---|---|---|
| Pricing engine | `api/_pricing.js` | Protected — Orchestrator must approve any change |
| Payment flow | `api/create-payment-intent.js`, `api/confirm-payment.js`, `api/stripe-webhook.js` | High risk — Reviewer required |
| Availability | `api/availability.js` | Standalone, safe to assign independently |
| Staff/job endpoints | `api/auto-assign-staff.js`, `api/staff-jobs.js`, `api/update-job-status.js`, `api/set-job-payout.js`, `api/save-job-photo.js`, `api/delete-job-photo.js` | Staff domain |
| Recurring plans | `api/create-recurring-plan.js`, `api/manage-recurring-plan.js`, `api/process-recurring-plans.js`, `api/_recurring.js` | Recurring domain |
| Notifications | `api/notify.js`, `api/_mailer.js` | Email domain |
| Customer UI | `src/public/components/` | UI domain |
| Admin panel | `src/admin/` | Admin domain |
| Staff portal | `src/staff/` | Staff UI domain |
| Static pages | `src/pages/` | Content domain — low risk |
| Shared types | `src/shared/types.ts` | Coordinate before touching — many consumers |
| Firebase config | `src/shared/firebase.ts` | Do not touch without Orchestrator approval |
| Routes | `src/App.tsx`, `src/main.tsx` | Low risk, easy to coordinate |

---

## Rules Reminder

- **OPEN** → safe to claim
- **IN_PROGRESS** → someone owns it — do not touch its files
- Two tasks may run in parallel only if their Owned Files do not overlap
- Always update status when you start (`IN_PROGRESS`) and when you finish (`REVIEW` or `DONE`)
- If blocked, set `BLOCKED` and explain why to the Orchestrator
