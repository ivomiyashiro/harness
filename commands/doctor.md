---
description: Validate Harness state, config, and safe consistency fixes
argument-hint: [--fix]
---

Run Harness doctor for this repo.

## Steps

1. Accept exactly no argument or the literal `--fix`; reject anything else.
2. With no argument, execute `node "__HARNESS_ROOT__/scripts/harness-doctor.js"` from the current repo root. With `--fix`, execute `node "__HARNESS_ROOT__/scripts/harness-doctor.js" --fix`.
3. Report the output compactly.
4. If it reports `FAIL`, surface the failing lines first.
5. If `--fix` was used and files changed, tell the user which files changed.

## Rules

- Default mode is read-only.
- `--fix` may apply only deterministic safe fixes: remove done features from `_active.md`, repair known invalid Harness model IDs, and create missing Harness docs directories.
- Do not dispatch agents. Do not inspect source code.
