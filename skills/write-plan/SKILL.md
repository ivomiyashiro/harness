---
name: write-plan
description: "Plan phase — dispatch the planner, run the overlap check, then proceed or wait before implement. Trigger: harness pipeline reaches plan phase."
---

Orchestrator-side.

## Resume shortcut

If mode is `hotfix`/`lite`, `docs/plans/<feature>/plan.md` already exists, and state says `next: waiting for user go-ahead to implement`, treat the user's current resume/approval as the go-ahead: write `phase: implement` to state and load `implement`. Do NOT re-dispatch `planner`.

## Steps

1. Dispatch `planner` with paths: spec or state one-line spec, `docs/conventions.md`, `docs/learnings.md`.
   - `full`: pass `docs/specs/<feature>.md`.
   - `hotfix`/`lite`: pass `docs/state/<feature>.md` and explicitly label the prompt `hotfix` or `lite`; the planner writes a short implementation plan from the bug/change line in state.
2. On its caveman report, run the **overlap check**:
   - Read `docs/state/_active.md` from main (`rtk git show main:docs/state/_active.md` when in a worktree; absent file = no active features).
   - Compare the plan's declared `globs:` against every active feature's globs.
   - Append/update this feature's line in `_active.md` on main using format §5 (`feature | mode | phase | branch | globs | next`) and commit it there.
3. `full`: write `phase: visual` (UI feature with no approved mock yet) or `phase: implement` to the state file. `hotfix`/`lite`: keep `phase: plan` until the user approves starting implementation.
4. `full`: **Auto-proceed** (routine boundary — see CLAUDE.md "Auto-proceder + objeción"): do NOT block for plan approval. In the SAME turn:
   - **Resumen** — state the planner's task list and each task's declared `globs:` in one terse block.
   - **Glob overlap** — if any glob overlaps another active feature, flag it PROMINENTLY at the top of the resumen (conflicting feature + the overlapping globs). This is a loud signal, not a gate — it does NOT stop the flow.
   - Declare **"procedo salvo que me detengas"** and load the `implement` skill in this same turn.
5. `hotfix`/`lite`: present the same resumen, write `phase: plan` and `next: waiting for user go-ahead to implement` to state, then STOP. Do not load `implement` until the user approves starting the work.
6. For UI features after visual approval, re-dispatch `planner` with the approved mock path and instruct it to preserve existing task numbers where possible; only UI task `pattern:`/`files:`/`read-files:` should change unless the mock reveals a real plan defect.

## Rules

- You never read the task files' content — only the planner's report and plan.md's task list.
- The overlap signal is informational: surface it loudly, then proceed. It is reversible via `git` / re-plan if the human objects.
- Plan approval is NOT a human gate for `full`. `hotfix`/`lite` are the exception: wait after showing the plan so the user knows what will happen before work starts.
- `hotfix`/`lite` still get `docs/plans/<feature>/plan.md` and `task-NN.md`; keep them brief and focused on the known bug/change.
