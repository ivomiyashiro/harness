---
description: Validate Harness state, config, and safe consistency fixes
argument-hint: [--fix]
---

Run Harness doctor for this repo.

## Steps

1. Execute `node "__HARNESS_ROOT__/scripts/harness-doctor.js" $ARGUMENTS` from the current repo root.
2. Report the output compactly.
3. If it reports `FAIL`, surface the failing lines first.
4. If `--fix` was used and files changed, tell the user which files changed.

## Rules

- Default mode is read-only.
- `--fix` may apply only deterministic safe fixes: remove done features from `_active.md`, repair known invalid Harness model IDs, and create missing Harness docs directories.
- Do not dispatch agents. Do not inspect source code.
