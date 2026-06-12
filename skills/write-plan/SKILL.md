---
name: write-plan
description: "Plan phase — dispatch the planner, run the overlap check, get user approval. Trigger: harness pipeline reaches plan phase."
---

Orchestrator-side.

## Steps

1. Dispatch `planner` with paths: spec, `docs/conventions.md`, `docs/learnings.md`.
2. On its caveman report, run the **overlap check**:
   - Read `docs/state/_active.md` from main (`rtk git show main:docs/state/_active.md` when in a worktree; absent file = no active features).
   - Compare the plan's declared `globs:` against every active feature's globs.
   - **Overlap** → warn the user: conflicting feature + the overlapping globs. Ask: sequence (wait for the other feature) or proceed (accept merge risk)? This happens BEFORE implement, always.
   - No overlap (or user proceeds) → append this feature's line to `_active.md` on main (`<feature> | <branch> | <globs>`, format §5) and commit it there.
3. Present plan.md (path + the planner's task list) to the user for approval. If the user wants changes, re-dispatch the planner with the feedback — do not edit task files yourself.
4. On approval: write `phase: visual` (UI feature with no approved mock yet) or `phase: implement` to the state file.

## Rules

- You never read the task files' content — only the planner's report and plan.md's task list.
- The overlap decision is the user's, never yours.
