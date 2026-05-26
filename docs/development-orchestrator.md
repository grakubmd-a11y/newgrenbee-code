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

- Use `gpt-5.5` with high reasoning for complex or critical tasks:
  - architecture decisions that span `api/`, `src/`, auth/payments, or deployment;
  - Stripe/payment flow integrity, webhook semantics, coupon accounting;
  - security/privacy changes;
  - large refactors or hard-to-reproduce bugs.
- Use smaller models for cheaper work:
  - Explorer/Test: `gpt-5.4-mini` (low/medium)
  - Builder: `gpt-5.3-codex` (medium) or `gpt-5.4-mini` for simple edits
  - Reviewer: `gpt-5.4-mini` for normal diffs; escalate to `gpt-5.5` for critical review

Avoid `gpt-5.5` high for routine file lookup, basic tests, or narrow mechanical edits.

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
