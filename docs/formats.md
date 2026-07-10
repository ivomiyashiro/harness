# Harness Formats

## 1. Feature State

Path: `docs/state/<feature>.md`

```text
feature: <slug>
mode: hotfix | lite | full | epic
phase: brainstorm | spec | plan | visual | implement | judge | manual-test | iterate | done
branch: <branch>
worktree: <path>
spec: docs/specs/<feature>.md
plan: docs/plans/<feature>/plan.md
tasks: pending 1,2,3 | done 1,2 | blocked <reason>
globs: <file globs touched by the approved plan, or none>
judges: not-run | judge-a clean, judge-b clean | confirmed <ids> | fixed <ids>
checklist: none | <done>/<total> ok, pending <AC ids>
next: <one-line next action>
```

`hotfix`/`lite` may use a one-line spec in this state file instead of a formal
`docs/specs/<feature>.md`, but they still generate `docs/plans/<feature>/plan.md`
and `task-NN.md` before implementation.

## 2. Spec

Path: `docs/specs/<feature>.md`

```text
feature: <slug>
summary: <one line>

FR-1: <functional requirement>
AC-1 [unit|integration|e2e|manual]: Given <context> When <action> Then <outcome>
```

## 3. Task

Path: `docs/plans/<feature>/task-NN.md`

```text
goal: <one work-unit goal>
files: <comma-separated paths>
tests: <AC ids and test intent>
done-when: <commands and observable result>
pattern: <exemplar path to mirror>
```

## 4. Plan

Path: `docs/plans/<feature>/plan.md`

```text
feature: <slug>
globs: <file globs touched by the plan>
tasks:
1. <one-line goal>
2. <one-line goal>
parallel-safe: <task groups or none>
```

## 5. Active Registry

Path: `docs/state/_active.md`

```text
feature | mode | phase | branch | globs | next
dark-mode | full | implement | feat/dark-mode | src/theme/**, src/app/** | task 3/5
```

## 6. Learnings

Path: `docs/learnings.md`

```text
<short caveman lesson> - <evidence path or phase>
```

## 7. Epic State

Path: `docs/state/epic-<name>.md`

```text
epic: <name>
phase: active | done
subspecs:
<sub-feature> | depends-on <sub-feature|none> | status pending|active|done | pr <branch-or-url|none>
next: <one-line next action>
```
