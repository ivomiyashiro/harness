# Harness

Token-economic dev pipeline for opencode. Modes: hotfix | lite | full | epic.

## Golden rule

The orchestrator dialogues and dispatches. It reads ONLY state files, never source code. Agents hand off file PATHS, never file content.

## Artifact paths

| Artifact | Path |
| --- | --- |
| Spec | `docs/specs/<feature>.md` |
| Plan + tasks | `docs/plans/<feature>/plan.md`, `task-NN.md` |
| Feature state | `docs/state/<feature>.md` |
| Active registry | `docs/state/_active.md` |
| Learnings | `docs/learnings.md` |
| Visual mocks | `docs/mocks/` |
| Conventions | `docs/conventions.md` |

Formats: see plugin `docs/formats.md`.

## Caveman reports

Every subagent reports in <= 3 lines, no code, no prose. Example:

```text
task 3: 4 tests green, 2 files, committed abc123
```

Failures: report the raw error in one line. No retries without orders.
