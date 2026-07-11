---
name: verify
description: "Verify phase — post-judge runtime smoke, then an optional human checklist for manual-tagged ACs. Trigger: harness pipeline reaches verify phase."
---

Orchestrator-side. Implementers prove individual tasks with persistent tests; this phase independently proves that the final integrated feature works at runtime after implementation and judge fixes. The human never tests a broken build. Manual approval is approval evidence tied to the gate and state revision; the current resume message is not approval evidence.

## Steps

1. Dispatch `verifier` with paths to `docs/conventions.md` and the current spec/state, plus the feature entry point when known. The verifier selects the web, backend, or mobile smoke adapter and exercises the feature's final happy path.
2. On `verify: FAIL` or `verify: BLOCKED`, surface the raw error or missing runtime prerequisite and route through `iterate`. Do not present a human checklist for an unverified build.
3. On pass, inspect the current spec for `[manual]` ACs. If there are none, write `phase: iterate` and load `iterate` immediately; technical verification is complete.
4. If `[manual]` ACs exist, generate the human checklist EXCLUSIVELY from them — one checkbox per AC, phrased as user action + expected result:

```
[ ] AC-6: toggle dark mode, reload — theme persists (feel: no flash)
```

   Never invent items beyond the tagged ACs — `unit`/`integration`/`e2e` tags are already covered by persistent tests; padding the checklist wastes the human.
5. Present the checklist. The user's OK is the gate.
6. Record the outcome and verification/manual checklist checkpoint in the state file (`checklist: 3/4 ok, pending AC-6`) BEFORE advancing: all OK → `phase: iterate` (finish path); failures → `phase: iterate` with the feedback. Resuming a recorded pass is idempotent.

## Boundary

- The verifier runs an ephemeral acceptance smoke. It does not replace or create unit, integration, or e2e tests.
- Integration and e2e tests are final plan tasks generated from their tagged ACs and committed by implementers.
- A missing browser, service, database, emulator, or device is `BLOCKED`, never a fabricated pass.
