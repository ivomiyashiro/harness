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

## Skills and agents

Skills orchestrate pipeline phases: they update state, dispatch agents, and choose the next phase. Agents execute bounded work and return caveman reports; they never own pipeline transitions. For example, `implement` dispatches `implementer`, `judge` dispatches judges/fixer, and `verify` dispatches `verifier`.

`hotfix`/`lite` skip formal spec files, but still generate
`docs/plans/<feature>/plan.md` + `task-NN.md` and wait for user go-ahead before
implementation starts.

## Human gates

Stop for the human in exactly 3 categories — nothing else:

1. **Intención** — what to build / which feature. The human sets direction.
2. **Aprobación irreversible / pre-start** — acts hard to undo: spec final, merge final, anything destructive; plus `hotfix`/`lite` plan approval before implementation starts.
3. **Fallo** — implement/boot breaks, judge no converge, routing ambiguo. Surface, don't guess.

Every other phase boundary is routine: **auto-proceder + objeción**.

At routine boundaries: summarize what was done and what comes next, declare "procedo salvo que me detengas", and continue in the same turn. This is safe because the step is reversible through `git`, re-plan, or re-judge.

## Caveman reports

Every subagent reports in <= 3 lines, no code, no prose. Example:

```text
task 3: 4 tests green, 2 files, committed abc123
```

Failures: report the raw error in one line. No retries without orders.

## Command runner

Prefer `rtk <command>` for shell commands. If `rtk` is not in PATH, run the plain command instead and append one caveman line to `docs/learnings.md` so future agents do not fail for the same environment quirk.
