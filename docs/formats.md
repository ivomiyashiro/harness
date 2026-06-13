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
tokens: <running notes>
next: <one-line next action>
```

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
<feature>: <mode>, <phase>, <branch>, next <action>
```

## 6. Learnings

Path: `docs/learnings.md`

```text
<short caveman lesson> - <evidence path or phase>
```
