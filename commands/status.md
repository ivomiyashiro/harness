---
description: Report active harness features, phases, and pending items
argument-hint: [feature]
---

Read-only. No dispatching, no writes.

Before any other action, pass the supplied argument, if any, as a single explicit argv value to `node scripts/harness-input.js status`. Stop on failure. Use only its returned `feature`; never place the raw command argument in shell text, a path, or command.

1. If a validated feature is returned: read `docs/state/<feature>.md` and report it.
2. Else: read `docs/state/_active.md` if it exists, then glob `docs/state/*.md` (skip `_active.md`, include `epic-*.md`) to fill any missing details. Print a compact table:

```
feature    | mode | phase     | branch          | next
dark-mode  | full | implement | feat/dark-mode  | task 3/5
epic-shop  | epic | active    | n/a             | profile-ui (2/3 sub-specs)
```

3. Append pending items per feature (judge disagreements awaiting user, unchecked manual checklist items, overlap warnings) — one line each.
4. If `docs/state/` is missing or empty: say so and point to `/harness:go <feature>`.
