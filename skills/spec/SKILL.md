---
name: spec
description: "Spec phase — write the lean spec with tagged Given/When/Then ACs from brainstorm decisions. Trigger: harness pipeline reaches spec phase."
---

Main thread. Converts brainstorm decisions into `docs/specs/<feature>.md` (format §2).

## Format

- Problem in ≤ 3 sentences. FRs as bullets. ZERO filler prose.
- ACs in FULL Given/When/Then — the one place precision beats brevity. Ambiguity here costs more than verbosity.
- Every AC gets exactly one tag. **Spec approval = test-budget approval**: tags ARE the test plan; no test will exist later without a tagged AC behind it.

## Tag criteria (baked in — auto-applied, no confirmation step)

Apply exactly one tag per AC directly from the criteria below. Do NOT ask the
user to confirm tags — the baked-in rules ARE the decision. The user reviews
tags only as part of the final spec-approval gate (see Exit).

| Tag | Use ONLY when |
| --- | --- |
| `e2e` | Critical user journey: money, auth, data loss |
| `integration` | A real boundary is crossed that mocks would hide: real DB, external API, cross-screen navigation |
| `manual` | UX/feel — a human must look at it |
| `unit` | Everything else (default) |

Default to `unit`. Never inflate tags: every `integration`/`e2e` tag is a
standing cost, so the criteria above are strict gates, not suggestions.

## Pattern exemplars

For each area of NOVEL code (no existing exemplar in the repo), resolve the
exemplar now WITHOUT asking the user: dispatch `explorer` to find the closest
existing file and take its result as the chosen exemplar. Record choices in the
spec (`pattern: <path>` notes); the planner copies them into task files. The
user reviews exemplar choices only at the final spec-approval gate (see Exit).

## Exit

**Human gate (REQUIRED — do not auto-proceed).** Present the full spec — ACs,
auto-applied tags, and auto-resolved exemplars — and wait for the user to
approve it explicitly. This is the one gate in this skill; tags and exemplars
are auto-resolved above, but the spec as a whole still needs human sign-off.
Only after explicit approval: write `phase: plan` to the state file, load the
`write-plan` skill.
