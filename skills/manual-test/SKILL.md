---
name: manual-test
description: "Manual-test phase — verifier boot check, then the human checklist from manual-tagged ACs. Trigger: harness pipeline reaches manual-test phase."
---

Orchestrator-side. The human never tests a broken build.

## Steps

1. Dispatch `verifier` (paths: `docs/conventions.md`; mention the feature's entry point). On `boots: NO` → surface the raw error, route back to implement via the `iterate` skill. Do not show the user a checklist for a dead app.
2. On pass: generate the human checklist EXCLUSIVELY from the spec's ACs tagged `[manual]` — one checkbox per AC, phrased as user action + expected result:

```
[ ] AC-6: toggle dark mode, reload — theme persists (feel: no flash)
```

   Never invent items beyond the tagged ACs — `unit`/`integration`/`e2e` tags are already covered by tests; padding the checklist wastes the human.
3. Present the checklist. The user's OK is the gate.
4. Record the outcome in the state file (`checklist: 3/4 ok, pending AC-6`) BEFORE advancing: all OK → `phase: iterate` (finish path); failures → `phase: iterate` with the feedback.
