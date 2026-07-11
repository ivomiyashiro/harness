---
description: Decompose an oversized initiative into sub-specs with dependency order
argument-hint: <name>
---

Before any other action, execute `node "__HARNESS_ROOT__/scripts/harness-input.js" epic "$1"`. The command template positional `$1` supplies one argv value without raw shell interpolation. Stop on failure and use only the returned `feature`.
Use only the returned `feature` value as `<epic>` below; never place the raw command argument in shell text, a path, ref, prompt, or command.

Epic decomposition for the validated `<epic>`.

An epic spans multiple independent subsystems. You decompose; you do NOT design.

## Steps

1. Run a SHORT decomposition brainstorm (one question at a time, recommendations included; dispatch `explorer` for codebase questions). Goal: identify the sub-features and what depends on what — NOT how each works.
2. Write `docs/state/epic-<epic>.md` (format §7): one line per sub-spec with dependency, status, and branch. No detailed design at epic level — design happens inside each sub-spec's own pipeline.
3. User approves the decomposition.
4. For each sub-spec, in dependency order: instruct the user to run `/harness:go <sub-feature>` (full mode) in its OWN worktree + session. Sub-specs with no mutual dependency are parallel-safe — flag them so the user can open parallel sessions.
5. Delivery: one branch per sub-spec, merged in dependency order when the user directs it. Do not create or recommend PRs unless the user explicitly asks.

## Rules

- Update `status` in the epic state file as sub-specs progress (pending → active → done) — `/harness:status` reads it.
- A sub-spec that turns out to be epic-sized gets decomposed again, not designed bigger.
