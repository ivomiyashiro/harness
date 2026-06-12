---
name: spec
description: "Spec phase — write the lean spec with tagged Given/When/Then ACs from brainstorm decisions. Trigger: harness pipeline reaches spec phase."
---

Main thread. Converts brainstorm decisions into `docs/specs/<feature>.md` (format §2).

## Format

- Problem in ≤ 3 sentences. FRs as bullets. ZERO filler prose.
- ACs in FULL Given/When/Then — the one place precision beats brevity. Ambiguity here costs more than verbosity.
- Every AC gets exactly one tag. **Spec approval = test-budget approval**: tags ARE the test plan; no test will exist later without a tagged AC behind it.

## Tag criteria (baked in — recommend, user confirms)

| Tag | Use ONLY when |
| --- | --- |
| `e2e` | Critical user journey: money, auth, data loss |
| `integration` | A real boundary is crossed that mocks would hide: real DB, external API, cross-screen navigation |
| `manual` | UX/feel — a human must look at it |
| `unit` | Everything else (default) |

Push back on tag inflation: every `integration`/`e2e` tag is a standing cost.

## Pattern exemplars

For each area of NOVEL code (no existing exemplar in the repo), choose the exemplar now — dispatch `explorer` to find the closest existing file, or agree with the user on one to be created first. Record choices in the spec (`pattern: <path>` notes); the planner copies them into task files.

## Exit

User approves the spec (explicitly). Then: write `phase: plan` to the state file, load the `write-plan` skill.
