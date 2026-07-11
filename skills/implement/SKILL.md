---
name: implement
description: "Implement phase — dispatch one TDD implementer subagent per plan task. Trigger: harness pipeline reaches implement phase."
---

Orchestrator-side. You dispatch; you never write code. Enter only through the canonical `start-implement` transition.

## Loop (planned tasks)

1. Read `docs/state/<feature>.md` → next task number N.
   - For `hotfix`/`lite`, verify the plan exists and explicit plan approval evidence is present for the current revision before dispatch; a resume message alone is not approval.
   - For `full UI`, verify the visual gate approval checkpoint exists; otherwise implementation remains blocked until visual approval.
2. Read `docs/plans/<feature>/plan.md` only for task order and `parallel-safe:` groups.
3. Launch implementer agent(s). The prompt contains exactly these file PATHS (never content):
    - `docs/plans/<feature>/task-NN.md`
    - `full`: the spec path + which AC numbers this task covers
    - `hotfix`/`lite`: the state path + the one-line bug/change spec this task covers
    - `docs/conventions.md`
    - `docs/learnings.md` (if it exists)
4. Sequential case: launch ONE implementer for the next task.
5. Parallel-safe case: if `plan.md` marks a group as parallel-safe and none of those task numbers are done/blocked, use `scripts/harness-worktrees.js` to give each task a distinct task worktree, then launch all tasks in that group in ONE message with multiple Agent calls. If worktree isolation cannot be established, run the group sequentially in the feature worktree. Integrate successful task commits serially and persist integration progress; on conflict stop with the exact pending commit, preserving task branches and completed integrations for resume. Do this only for an explicit group from the plan; never infer parallelism yourself.
6. On caveman success report(s): update the state file (`tasks: done ...`) BEFORE dispatching the next task/group.
7. On any failure report: STOP. Surface the raw error to the user. No silent retries — the user decides (retry / adjust task / skip). If parallel agents returned mixed results, mark successful tasks done and the failed task blocked.
8. Repeat until tasks are exhausted → record the implementation checkpoint and write `phase: judge` to the state file. Resuming this completed transition is idempotent: do not re-run done tasks or discard completed work.

## Hotfix / lite

These modes still use `docs/plans/<feature>/plan.md` and `task-NN.md`, but the plan is short and derived from the state file's one-line bug/change spec instead of a formal spec file. Launch the implementer with the mode label (`hotfix` or `lite`) and the task file. Requirement: regression test reproducing the bug/change first, then fix.

## Rules

- One implementer at a time unless the plan explicitly marks a `parallel-safe:` group.
- Tasks run in plan order outside explicit parallel-safe groups.
- If the task file references a mock in `docs/mocks/`, include that path in the implementer prompt as the base component.
