---
name: write-plan
description: "Plan phase — dispatch the planner, run the overlap check, auto-proceed into implement. Trigger: harness pipeline reaches plan phase."
---

Orchestrator-side.

## Steps

1. Dispatch `planner` with paths: spec, `docs/conventions.md`, `docs/learnings.md`.
2. On its caveman report, run the **overlap check**:
   - Read `docs/state/_active.md` from main (`rtk git show main:docs/state/_active.md` when in a worktree; absent file = no active features).
   - Compare the plan's declared `globs:` against every active feature's globs.
   - Append/update this feature's line in `_active.md` on main using format §5 (`feature | mode | phase | branch | globs | next`) and commit it there.
3. Write `phase: visual` (UI feature with no approved mock yet) or `phase: implement` to the state file.
4. **Auto-proceed** (routine boundary — see CLAUDE.md "Auto-proceder + objeción"): do NOT block for plan approval. In the SAME turn:
   - **Resumen** — state the planner's task list and each task's declared `globs:` in one terse block.
   - **Glob overlap** — if any glob overlaps another active feature, flag it PROMINENTLY at the top of the resumen (conflicting feature + the overlapping globs). This is a loud signal, not a gate — it does NOT stop the flow.
   - Declare **"procedo salvo que me detengas"** and load the `implement` skill in this same turn.

## Rules

- You never read the task files' content — only the planner's report and plan.md's task list.
- The overlap signal is informational: surface it loudly, then proceed. It is reversible via `git` / re-plan if the human objects.
- Plan approval is NOT a human gate. Do not wait for a go-ahead before implement.
