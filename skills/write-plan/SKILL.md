---
name: write-plan
description: "Plan phase — dispatch the planner, run the overlap check, then proceed or wait before implement. Trigger: harness pipeline reaches plan phase."
---

Orchestrator-side. Follow the canonical state contract for every phase change; do not hand-edit a phase that the contract would reject.

## Resume shortcut

If mode is `hotfix`/`lite`, `docs/plans/<feature>/plan.md` already exists, and state says `next: waiting for user go-ahead to implement`, require explicit plan approval evidence tied to the gate and state revision before `start-implement`; the current resume message is not approval evidence. If the same approved transition resumes, treat it as idempotent: keep completed checkpoints, do not duplicate `_active.md`, and do NOT re-dispatch `planner`.

## Steps

1. Dispatch `planner` with paths: spec or state one-line spec, optional `docs/conventions.md` when present, and `docs/learnings.md`. The planner may discover repository context through minimal targeted reads; the supplied paths are not a read allowlist.
   - `full`: pass `docs/specs/<feature>.md`.
   - `hotfix`/`lite`: pass `docs/state/<feature>.md` and explicitly label the prompt `hotfix` or `lite`; the planner writes a short implementation plan from the bug/change line in state.
2. On its caveman report, run the **overlap check**:
   - Resolve the repository default branch with `scripts/harness-registry.js`; stop before writing with its actionable error when no unambiguous default exists. Read `docs/state/_active.md` from that branch (absent file = no active features).
   - Compare the plan's declared `globs:` against every active feature's globs.
   - Append/update this feature's line in `_active.md` using format §5 (`feature | mode | phase | branch | globs | next`) through `node <harness>/scripts/harness-workflow.js update-registry --registry docs/state/_active.md --content-file <candidate-file> --expected-revision <revision>`, supplying the revision that was read. Commit the successful atomic update on the resolved default branch; on `stale-revision`, reread and re-run the overlap check rather than overwriting the winner.
3. Run the canonical `complete-plan` transition and record its checkpoint. `full UI` work runs `complete-plan` and writes `phase: visual`; `full non-UI` work runs `complete-plan` and writes `phase: implement` with no visual gate. `hotfix`/`lite`: keep `phase: plan` until explicit plan approval is recorded for this revision.
4. `full`: **Auto-proceed** (routine boundary — see CLAUDE.md "Auto-proceder + objeción"): do NOT block for plan approval. In the SAME turn:
   - **Resumen** — state the planner's task list and each task's declared `globs:` in one terse block.
   - **Glob overlap** — if any glob overlaps another active feature, flag it PROMINENTLY at the top of the resumen (conflicting feature + the overlapping globs). This is a loud signal, not a gate — it does NOT stop the flow.
   - Declare **"procedo salvo que me detengas"** and load the `implement` skill in this same turn.
5. `hotfix`/`lite`: present the same resumen, write `phase: plan` and `next: waiting for user go-ahead to implement` to state, then STOP. Do not load `implement` until the user approves starting the work and that approval evidence is stored for the `plan` gate and current state revision.
6. For UI features after visual approval, re-dispatch `planner` with the approved mock path and instruct it to preserve existing task numbers where possible; only UI task `pattern:`/`files:` should change unless the mock reveals a real plan defect.

## Rules

- You never read the task files' content — only the planner's report and plan.md's task list.
- The overlap signal is informational: surface it loudly, then proceed. It is reversible via `git` / re-plan if the human objects.
- Plan approval is NOT a human gate for `full`. `hotfix`/`lite` are the exception: wait after showing the plan so the user knows what will happen before work starts.
- `hotfix`/`lite` still get `docs/plans/<feature>/plan.md` and `task-NN.md`; keep them brief and focused on the known bug/change.
- Checkpoints make plan completion resumable; rerunning a completed transition must preserve existing work and registry state.
