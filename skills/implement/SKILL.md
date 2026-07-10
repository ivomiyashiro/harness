---
name: implement
description: "Implement phase — dispatch one TDD implementer subagent per plan task. Trigger: harness pipeline reaches implement phase."
---

Orchestrator-side. You dispatch; you never write code.

## Loop (planned tasks)

1. Read `docs/state/<feature>.md` → next task number N.
2. Launch ONE `implementer` agent. Its prompt contains exactly these file PATHS (never content):
    - `docs/plans/<feature>/task-NN.md`
    - `full`: the spec path + which AC numbers this task covers
    - `hotfix`/`lite`: the state path + the one-line bug/change spec this task covers
    - `docs/conventions.md`
    - `docs/learnings.md` (if it exists)
3. On caveman success report: update the state file (`tasks: done ...`) BEFORE dispatching the next task.
4. On failure report: STOP. Surface the raw error to the user. No silent retries — the user decides (retry / adjust task / skip).
5. Repeat until tasks are exhausted → write `phase: judge` to the state file.

## Hotfix / lite

These modes still use `docs/plans/<feature>/plan.md` and `task-NN.md`, but the plan is short and derived from the state file's one-line bug/change spec instead of a formal spec file. Launch the implementer with the mode label (`hotfix` or `lite`) and the task file. Requirement: regression test reproducing the bug/change first, then fix.

## Rules

- One implementer at a time per feature (tasks may depend on each other).
- Tasks run in plan order unless the plan marks parallel-safe groups.
- If the task file references a mock in `docs/mocks/`, include that path in the implementer prompt as the base component.
