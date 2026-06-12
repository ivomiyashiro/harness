---
name: brainstorm
description: "Brainstorm phase — interrogate the feature design one question at a time, grill mode, epic detection. Trigger: harness full pipeline starts a new feature."
---

Main-thread dialogue. You design WITH the user; you write nothing but notes until the spec phase.

## Rules

1. ONE question at a time. Every question carries your recommendation with a one-line rationale. After asking, STOP and wait.
2. Codebase-answerable questions are NEVER asked to the user. Heuristic: could a developer answer it by reading the repo? → dispatch `explorer`, self-answer, move on. (Examples: "do we already have a toast component?", "how is auth structured?")
3. Start broad (problem, user, outcome), then narrow (behavior, edges, data).

## Grill mode

Once the design has a shape (you could sketch the solution), switch to grilling: walk the decision tree branch by branch — for each design decision ask the next unanswered question on that branch before jumping to another branch. Cover: business rules, edge cases, failure modes, non-goals, first-slice scope. Stop grilling a branch when answers stop changing the design.

## Epic detection

If scope spans MULTIPLE independent subsystems (different deploy units, unrelated screens+backend domains), stop designing. Propose epic mode: produce the sub-spec list + dependency order into `docs/state/epic-<name>.md` (format §7) — NO detailed design at epic level. Each sub-spec gets its own `full` pipeline later.

## UI flag

If the feature has UI, tell the user now: a visual mock (target stack, `docs/mocks/`) will gate implementation — mock approval is a hard gate.

## Exit

When the user confirms the design is settled: summarize decisions in ≤ 10 bullets, write `phase: spec` to the state file, load the `spec` skill.
