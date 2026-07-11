# Harness Formats

## 1. Feature State

Path: `docs/state/<feature>.md`

```text
state_version: 1
feature: <slug>
mode: hotfix | lite | full | epic
phase: brainstorm | spec | plan | visual | implement | judge | verify | iterate | done
branch: <branch>
worktree: <path>
spec: docs/specs/<feature>.md
plan: docs/plans/<feature>/plan.md
tasks: pending 1,2,3 | done 1,2 | blocked <reason>
globs: <file globs touched by the approved plan, or none>
approvals: none | <gate> rev <state-revision> by <human> at <iso-8601> evidence <message-or-artifact-id>
judges: not-run | judge-a clean, judge-b clean | confirmed <ids> | fixed <ids>
checklist: none | <done>/<total> ok, pending <AC ids>
checkpoints: spec <pending|done>, plan <pending|approved>, visual <not-required|pending|approved>, implement <pending|done>, judge <pending|done>, verify <pending|done>, commit <pending|done>, registry <pending|done>, cleanup <pending|done>
revision: <monotonic integer changed on each successful transition>
next: <one-line next action>
```

`hotfix`/`lite` may use a one-line spec in this state file instead of a formal
`docs/specs/<feature>.md`, but they still generate `docs/plans/<feature>/plan.md`
and `task-NN.md` before implementation.

### Canonical state contract

`state_version: 1` is the canonical persisted Harness state format. A transition
may only write a new phase after validating the current phase, mode, required
artifacts, approval evidence, stale downstream fields, and completion
checkpoints. Re-running an already completed transition is idempotent: it keeps
the same phase and completed checkpoints and must not duplicate registry rows or
discard completed work.

#### Legal phases

Legal phases are `brainstorm`, `spec`, `plan`, `visual`, `implement`, `judge`,
`verify`, `iterate`, and `done`. Any other phase is invalid. Rejection messages
name the unmet rule, such as missing artifact, missing approval, stale
downstream state, invalid phase for mode, or incomplete checkpoint.

#### Mode-specific transition table

| mode | from | to | rule |
| --- | --- | --- | --- |
| hotfix | plan | implement | plan and task files exist, and `approvals` contains explicit `plan` approval for the current `revision` |
| hotfix | implement | judge | implementation task commits/checkpoints are done |
| hotfix | judge | verify | all blocking findings are confirmed or rejected with evidence; confirmed findings are fixed |
| hotfix | verify | done | verify, commit, registry, and cleanup checkpoints are done |
| lite | plan | implement | plan and task files exist, and `approvals` contains explicit `plan` approval for the current `revision` |
| lite | implement | judge | implementation task commits/checkpoints are done |
| lite | judge | verify | all blocking findings are confirmed or rejected with evidence; confirmed findings are fixed |
| lite | verify | done | verify, commit, registry, and cleanup checkpoints are done |
| full | brainstorm | spec | brainstorm decisions are captured |
| full | spec | plan | spec exists and irreversible spec approval is recorded for the current `revision` |
| full | plan | visual | approved plan has UI work and `visual` checkpoint is `pending` |
| full | plan | implement | approved plan has no UI work and `visual` checkpoint is `not-required` |
| full | visual | implement | visual approval is recorded for the current `revision` |
| full | implement | judge | all planned implementation tasks are done |
| full | judge | verify | both required judge reviews over the cumulative approved-baseline diff are resolved |
| full | verify | iterate | user feedback requires changes after verification |
| full | verify | done | verify, commit, registry, and cleanup checkpoints are done |
| epic | plan | implement | the active sub-feature plan is approved and dependency state is satisfied |
| epic | implement | judge | active sub-feature implementation is done |
| epic | judge | verify | active sub-feature judge state is resolved |
| epic | verify | done | all sub-features and final checkpoints are done |

All modes may transition from `iterate` back to the phase that owns the accepted
feedback (`spec`, `plan`, `visual`, or `implement`) after applying the iteration
invalidation rules below. `done` has no outgoing transition.

#### Required artifacts

`feature`, `mode`, `phase`, `branch`, `worktree`, `plan`, `tasks`, `globs`,
`judges`, `checklist`, `checkpoints`, `revision`, and `next` are required in
versioned state. `spec` is required for `full` and for `epic` sub-features;
`hotfix` and `lite` may preserve their inline state-file specification instead.
Before implementation, every mode requires `docs/plans/<feature>/plan.md` and at
least one `docs/plans/<feature>/task-NN.md`. Before judging, implementation
commits/checkpoints for planned tasks are required. Before `done`, verification,
commit, active-registry update, and cleanup checkpoints are required.

#### Approval evidence

Approval evidence is explicit and gate-scoped:

```text
approvals: <gate> rev <state-revision> by <human> at <iso-8601> evidence <message-or-artifact-id>
```

Valid gates are `spec`, `plan`, and `visual`. The `rev` must equal the state
`revision` being approved. A resumed or unrelated user message is not approval.
Missing, stale, or gate-mismatched approval blocks the transition.

#### Checkpoint fields

`checkpoints` records resumable completion for `spec`, `plan`, `visual`,
`implement`, `judge`, `verify`, `commit`, `registry`, and `cleanup`. Each
checkpoint is `pending` or `done`, except `visual`, which may also be
`not-required`. Finalization may mark `done` only when `verify`, `commit`,
`registry`, and `cleanup` are all `done`; otherwise resume starts from the first
incomplete checkpoint.

#### Iteration invalidation rules

When iteration sends work back to an earlier owning phase, preserve unaffected
upstream approvals and reset affected downstream state. Returning to `spec`
resets plan approval, visual approval, tasks, judge results, verification, and
manual checklist entries. Returning to `plan` resets visual approval when UI
scope changes, tasks, judge results, verification, and checklist entries.
Returning to `visual` resets implementation, judge, verification, and checklist
entries. Returning to `implement` resets judge results, verification, and
checklist entries. Every invalidation increments `revision` so stale approvals
cannot authorize the new state.

#### Unversioned safe defaults

Existing state files with no `state_version` load as version `0` and keep all
documented values that are present. Missing canonical fields receive safe
defaults: `approvals: none`, `checkpoints` set to pending values derived from the
current phase, `revision: 0`, and `visual: not-required` unless an approved plan
with UI work requires visual review. No approval is inferred from old state or
from the resume message. The next successful transition writes `state_version: 1`.
Duplicate fields and legacy authority-bearing fields such as `approvals` are
rejected as ambiguous instead of being normalized. State and configuration
reject token telemetry, token budget, and analysis fields; Harness state does
not define or infer token behavior.

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
risk: low | medium | high — <one reason>
depends-on: task numbers or none
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

`globs:` should be broad enough for overlap detection, while each task's
`files:` stays precise about edit responsibility. It is not a read allowlist:
agents may inspect any repository file needed through minimal targeted reads.

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
