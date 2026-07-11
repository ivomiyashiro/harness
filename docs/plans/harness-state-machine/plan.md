feature: harness-state-machine
globs: docs/formats.md, skills/write-plan/SKILL.md, skills/visual-mock/SKILL.md, skills/implement/SKILL.md, skills/judge/SKILL.md, skills/verify/SKILL.md, skills/iterate/SKILL.md, scripts/harness-state.js, scripts/harness-state.test.js, scripts/harness-doctor.js, scripts/harness-doctor.test.js, package.json
tasks:
1. Add canonical versioned state contract text to docs/formats.md with legal phases, mode transitions, artifacts, gates, checkpoints, migration defaults, and no token telemetry fields.
2. Add pure state-machine module + unit tests for legal transitions, prerequisites, approval evidence, idempotent resume, mode-specific visual/implement routing, hotfix/lite plan approval, iteration invalidation, finalization checkpoints, unversioned migration, and no token fields.
3. Wire write-plan/visual/implement/verify/iterate skills to the canonical transition contract and approval/checkpoint rules.
4. Wire judge skill to confirmed/rejected finding evidence and cumulative re-judge diff requirements.
5. Extend harness doctor to validate canonical state-machine errors and add unit coverage for validation without rewrites.
6. Add integration doctor test for AC-12 valid/invalid temporary repositories.
parallel-safe: tasks 3 and 4 are parallel-safe after task 1; task 5 depends on task 2; task 6 is final and depends on tasks 2 and 5
