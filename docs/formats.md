# Harness Artifact Formats

Single source of truth for every artifact the pipeline reads or writes. Caveman = ultra-compact, no prose, no filler. Specs are the one exception: precision over brevity in ACs.

## 1. State file — `docs/state/<feature>.md`

Caveman fields, one per line. Written by the orchestrator BEFORE every phase transition.

```
mode: full
phase: implement
spec: docs/specs/dark-mode.md
plan: docs/plans/dark-mode/
tasks: done 1,2 / next 3 / total 5
judges: a 2 findings, b 3 findings, confirmed 2, fixed
checklist: 3/4 ok, pending AC-6
tokens: brainstorm 4k | plan 9k | implement 45k | judge 18k
```

Omit lines that do not apply yet. `phase` values: `triage | brainstorm | spec | plan | visual | implement | judge | manual-test | iterate | done`.

## 2. Spec — `docs/specs/<feature>.md`

Lean prose: problem in ≤ 3 sentences, FRs as bullets, zero filler. ACs in FULL Given/When/Then, each tagged `[unit|integration|e2e|manual]`. Spec approval = test-budget approval.

```
- AC-2: Given a logged-in user with dark mode on, when they reload, then the theme persists. [integration]
```

## 3. Plan task file — `docs/plans/<feature>/task-NN.md`

Caveman bullets. `pattern:` points to the codebase exemplar file the task must mirror (chosen at spec phase for novel code).

```
goal: theme toggle persists to localStorage
files: src/theme/store.ts, src/theme/store.test.ts
tests: AC-2 (integration), toggle unit
done-when: rtk vitest run green, AC-2 covered
pattern: src/settings/locale-store.ts
```

`plan.md` lists tasks in order + the file globs the plan will touch.

## 4. Caveman subagent report

≤ 3 lines, no code. Success: `task 3: 4 tests green, 2 files, committed abc123`. Failure: `task 3: FAIL — vitest: Cannot find module 'zod'` (raw error, one line).

## 5. Active registry — `docs/state/_active.md` (lives on main)

One line per active feature:

```
dark-mode | feat/dark-mode | src/theme/**, src/settings/theme*
```

Registered at plan approval, removed at finish. Checked at plan time for glob overlaps.

## 6. Learnings — `docs/learnings.md`

One caveman line per project gotcha. Agents read at start; orchestrator appends on surprises.

```
vitest needs --pool=forks here, workers crash
```

## 7. Epic state — `docs/state/epic-<name>.md`

Sub-spec list + dependency order, no detailed design:

```
name | depends-on | status
auth-base | - | done
profile-ui | auth-base | active
billing | auth-base | pending
```
