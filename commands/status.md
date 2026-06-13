---
description: Report active harness features, phases, and pending items
argument-hint: [feature]
---

Read-only. No dispatching, no writes.

1. If a feature is given: read `docs/state/$ARGUMENTS.md` and report it.
2. Else: read `docs/state/_active.md` if it exists, then glob `docs/state/*.md` (skip `_active.md`, include `epic-*.md`) to fill any missing details. Print a compact table:

```
feature    | mode | phase     | branch          | next
dark-mode  | full | implement | feat/dark-mode  | task 3/5
epic-shop  | epic | active    | n/a             | profile-ui (2/3 sub-specs)
```

3. Append pending items per feature (judge disagreements awaiting user, unchecked manual checklist items, overlap warnings) — one line each.
4. If `docs/state/` is missing or empty: say so and point to `/harness:go <feature>`.
