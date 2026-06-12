---
description: Report active harness features, phases, and pending items
argument-hint: [feature]
---

Read-only. No dispatching, no writes.

1. If a feature is given: read `docs/state/$ARGUMENTS.md` and report it.
2. Else: glob `docs/state/*.md` (skip `_active.md`, include `epic-*.md`), read each, and print a compact table:

```
feature    | mode | phase     | next
dark-mode  | full | implement | task 3/5
epic-shop  | epic | active    | profile-ui (2/3 sub-specs)
```

3. Append pending items per feature (judge disagreements awaiting user, unchecked manual checklist items, overlap warnings) — one line each.
4. If `docs/state/` is missing or empty: say so and point to `/harness:go <feature>`.
