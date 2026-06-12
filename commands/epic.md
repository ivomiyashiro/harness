---
description: Decompose an oversized initiative into sub-specs with dependency order
argument-hint: <name>
---

Epic decomposition for: $ARGUMENTS

An epic spans multiple independent subsystems. You decompose; you do NOT design.

## Steps

1. Run a SHORT decomposition brainstorm (one question at a time, recommendations included; dispatch `explorer` for codebase questions). Goal: identify the sub-features and what depends on what — NOT how each works.
2. Write `docs/state/epic-$ARGUMENTS.md` (format §7): `name | depends-on | status` per sub-spec. No detailed design at epic level — design happens inside each sub-spec's own pipeline.
3. User approves the decomposition.
4. For each sub-spec, in dependency order: instruct the user to run `/harness:go <sub-feature>` (full mode) in its OWN worktree + session. Sub-specs with no mutual dependency are parallel-safe — flag them so the user can open parallel sessions.
5. Delivery: one PR per sub-spec, chained in dependency order (each PR targets the previous one's branch; only the chain root targets main). Record PR order in the epic state file.

## Rules

- Update `status` in the epic state file as sub-specs progress (pending → active → done) — `/harness:status` reads it.
- A sub-spec that turns out to be epic-sized gets decomposed again, not designed bigger.
