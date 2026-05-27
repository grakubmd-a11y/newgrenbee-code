# Agent System — grenbee-firebase-web

> Roles, rules, and coordination protocol for multi-agent work.
> Applies equally to Claude Code, Codex, Copilot, or any other model.

---

## How Roles Work

**You never need to assign roles manually.**

When the user gives you a request, the first agent to receive it becomes the **ORCHESTRATOR** for that request. The Orchestrator reads the request, breaks it into tasks, writes those tasks into `AGENT_TASK_REGISTRY.md` with a `Role` field, and coordinates execution.

Any agent that picks up a task from the registry reads the `Role` field and acts accordingly — no human assignment needed.

```
User says: "I want X"
    ↓
First agent receives it → becomes ORCHESTRATOR
    ↓
ORCHESTRATOR reads AGENT_ONBOARDING.md + AGENT_TASK_REGISTRY.md
    ↓
ORCHESTRATOR writes tasks into registry with Role assigned per task
    ↓
Agents pick up tasks → read Role field → act as BUILDER / REVIEWER / etc.
    ↓
ORCHESTRATOR integrates results → reports back to user
```

---

## Roles

### ORCHESTRATOR
**Purpose:** Receive the user's request, decompose it into tasks, coordinate agents, integrate results, report back.

**Triggered when:** You receive a raw user request that is not already a task in the registry.

**Must do:**
1. Read `docs/AGENT_ONBOARDING.md` to understand current project state
2. Read `docs/AGENT_TASK_REGISTRY.md` to see active tasks and file ownership
3. Decompose the request into atomic tasks (one task = one file scope = one agent)
4. Write each task into the registry using the standard template — including `Role`, `Owned Files`, `Depends On`, and `Acceptance Criteria`
5. Identify which tasks can run in parallel (no file overlap) and which must be sequential (dependencies)
6. Assign tasks to available agents or execute them yourself if you are the only agent
7. After all tasks reach `DONE`, integrate, run `npx tsc --noEmit` + `npm run build`, and report to the user

**Cannot:**
- Start writing code before decomposing the request
- Create tasks with overlapping file ownership
- Deploy or push without user approval

**Output format when starting:**
```
## ORCHESTRATOR Plan: [user request summary]

**Tasks Created:**
| ID | Name | Role | Owned Files | Depends On | Can run in parallel with |
|---|---|---|---|---|---|
| TASK-XXX | ... | BUILDER | ... | none | TASK-YYY |

**Execution order:**
1. [parallel] TASK-XXX + TASK-YYY
2. [sequential] TASK-ZZZ (after TASK-XXX)
3. [sequential] TASK-AAA REVIEWER (after all builders done)

Proceeding with execution.
```

**Output format when done:**
```
## ORCHESTRATOR Summary: [user request summary]

**Status:** ✅ COMPLETE | ⚠️ PARTIAL | ❌ BLOCKED

**What was built:**
[1-3 sentences]

**Tasks completed:** TASK-XXX, TASK-YYY
**Validation:** npx tsc --noEmit ✅ | npm run build ✅

**Pending decisions (if any):**
[anything that needs user input]
```

---

### BUILDER (owns a specific file scope)
**Purpose:** Implement one well-scoped task inside an assigned file ownership area.

**Triggered when:** You pick up a task from the registry with `Role: BUILDER`.

**Can:**
- Edit and create files within the assigned `Owned Files` only
- Run `npm run build`, `npx tsc --noEmit`, linters
- Install packages if required by the task (must document why)

**Cannot:**
- Edit files outside the assigned ownership area
- Revert or overwrite changes made by another agent
- Deploy or push to remote
- Make decisions outside scope — log findings and report to Orchestrator

**Rules:**
- One task = one ownership area = one Builder at a time
- If a needed change is outside your area, stop and report to Orchestrator
- Never silently fix something outside scope — log it as a finding instead

**Output format:**
```
## BUILDER Report: [task ID] — [task name]

Agent: [Claude Code / Codex / Copilot / other]
Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ BLOCKED

Files Changed:
- `path/to/file.ts` — [what changed]

Behavior Change:
[Before → After in 1-3 sentences]

Validation:
- [ ] npx tsc --noEmit — PASS / FAIL
- [ ] npm run build — PASS / FAIL

Out-of-scope findings (do not act on these):
- [file:line] — [what was noticed]

Blockers (if PARTIAL or BLOCKED):
[describe what is blocking and what decision is needed]
```

---

### REVIEWER (read-only by default)
**Purpose:** Audit a completed task for bugs, regressions, security issues, and correctness.

**Triggered when:** You pick up a task from the registry with `Role: REVIEWER`, or when a Builder sets a task to `REVIEW`.

**Can:**
- Read any file
- Run type checks and linters
- Write to files only if the task says `Reviewer can fix: YES`

**Focus areas (in order of priority):**
1. Security — pricing tamper, auth bypass, injections
2. Stripe / payment correctness — capture method, webhook idempotency
3. Regressions — does this break existing behavior
4. TypeScript errors
5. Code quality — clarity, missing edge cases

**Output format:**
```
## REVIEWER Report: [task ID]

Agent: [Claude Code / Codex / Copilot / other]
Verdict: ✅ APPROVED | ⚠️ APPROVED WITH NOTES | ❌ NEEDS REWORK

Findings (ordered by severity):
1. [CRITICAL/HIGH/MEDIUM/LOW] `file:line` — [description]

Approved for merge: YES / NO
```

---

### EXPLORER (read-only)
**Purpose:** Map the codebase, identify risks, answer questions about existing behavior before a Builder starts.

**Triggered when:** The Orchestrator needs to understand a part of the code before writing tasks, or a task has `Role: EXPLORER`.

**Can:**
- Read any file
- Run `grep`, `find`, `git log`, `git diff`, `npx tsc --noEmit`
- Report findings

**Cannot:**
- Write or edit any file
- Make decisions — only surface information

**Output format:**
```
## EXPLORER Report: [question]

Agent: [Claude Code / Codex / Copilot / other]
Files Inspected: [list]
Finding: [what is there now]
Risks / Constraints: [what to be careful about]
Recommendation: [what the Builder should know before touching this]
```

---

### TEST AGENT (execution only)
**Purpose:** Run commands and report output. Does not edit files.

**Triggered when:** The Orchestrator needs validation output, or a task has `Role: TEST`.

**Can:**
- Run any shell command specified in the task
- Report stdout, stderr, exit codes

**Cannot:**
- Edit files
- Decide what to fix

**Output format:**
```
## TEST AGENT Report: [commands run]

Agent: [Claude Code / Codex / Copilot / other]
Results:
- `[command]` — EXIT 0 ✅ / EXIT 1 ❌
  Output: [relevant lines]
```

---

## Coordination Protocol — How Agents Don't Step on Each Other

### The ownership rule
Every task in `AGENT_TASK_REGISTRY.md` has an `Owned Files` field. Two tasks with overlapping owned files **cannot run in parallel**. Check the registry before claiming any task.

### Task states
```
OPEN → IN_PROGRESS → REVIEW → DONE
                  ↘ BLOCKED
```

- `OPEN` — available, no agent is working on it
- `IN_PROGRESS` — an agent has claimed it, files are locked
- `REVIEW` — Builder finished, waiting for Reviewer
- `DONE` — Reviewer approved
- `BLOCKED` — waiting on a dependency or decision

### Before starting any task
1. Open `AGENT_TASK_REGISTRY.md`
2. Find your task, confirm status is `OPEN`
3. Confirm no `IN_PROGRESS` task owns overlapping files
4. Update status to `IN_PROGRESS` and write your agent identifier
5. Now you may write code

### Parallel work is safe when
- Task A owns `src/admin/` and Task B owns `api/`
- Task A owns `src/pages/legal/` and Task B owns `src/public/components/`
- Zero file overlap between tasks

### Parallel work is NOT safe when
- Both tasks touch `src/shared/types.ts`
- Both tasks touch the same component or endpoint
- One task depends on output from the other (check `Depends On` field)

### If you find a conflict mid-task
Stop. Report to Orchestrator: what you found, what you needed to change, why it's outside scope. Do not proceed. Do not guess.

---

## Communication Standards

### Identify yourself at the start of every report
```
Agent: Claude Code (claude-sonnet-4-6) | Codex | Copilot | [other]
Role: ORCHESTRATOR | BUILDER | REVIEWER | EXPLORER | TEST AGENT
Task: TASK-XXX | [user request if Orchestrator]
```

### Escalate, don't guess
If you are unsure about security, pricing logic, Stripe behavior, or a decision that affects multiple parts of the app — stop and escalate to the user. A wrong guess costs real money or real user data.
