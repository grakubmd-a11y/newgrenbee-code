# grenbee-firebase-web Development Orchestrator

This document defines how to use multiple Codex agents to build and change this repository. It is not runtime application code.

## Operating Model

```text
User task
  -> Orchestrator (this chat)
    -> Explorer: maps code and risks (read-only)
    -> Builder: implements a bounded change (disjoint write scope)
    -> Reviewer: audits the diff (read-only by default)
    -> Test agent: runs focused validation and reports failures
  -> Orchestrator integrates and verifies, commits/deploys only when requested
```

## Model Budgeting

- Usar modelos más capaces (Claude Opus) para tareas complejas o críticas:
  - Decisiones de arquitectura que abarcan `api/`, auth/payments, o deployment
  - Integridad del flujo Stripe/payment, semántica de webhooks, contabilidad de cupones
  - Cambios de seguridad/privacidad
  - Refactors grandes o bugs difíciles de reproducir
- Usar modelos más rápidos (Claude Haiku/Sonnet) para:
  - Explorer/Test: lecturas, búsquedas, grep, validaciones
  - Builder: ediciones mecánicas o bien acotadas
  - Reviewer: diffs normales (escalar a Opus para review crítico)

## Delegation Rules

- Only spawn sub-agents for concrete, well-scoped tasks.
- Give each Builder a disjoint file ownership area; no overlapping edits.
- Builders must not revert unrelated changes (other agents or user edits may exist).
- Reviewers are read-only unless explicitly asked to fix.
- Orchestrator is the only agent that merges decisions, summarizes, and performs commits/deploys.

## Prompt Templates

### Explorer (read-only)

```text
You are the Explorer for grenbee-firebase-web. Read-only.
Question: <one specific question>
Scope: <folders/files to inspect>
Return: files/lines, current behavior, risks/constraints. No edits.
```

### Builder (owned write scope)

```text
You are the Builder for grenbee-firebase-web.
Task: <specific change>
Owned files: <explicit list or folder>
Rules: keep scope tight; do not revert unrelated edits; add focused tests if needed.
Return: files changed, behavior change summary, validation run (or blocker).
```

### Reviewer (read-only by default)

```text
You are the Reviewer for grenbee-firebase-web. Default read-only.
Review: <diff/files>
Focus: bugs, regressions, missing tests, Stripe/payment/security/deploy risks.
Return: findings ordered by severity with file+line references.
```

### Test Agent (execution only)

```text
You are the Test Agent for grenbee-firebase-web.
Run: <commands> and report failures and likely cause.
Do not edit files unless explicitly asked.
```
