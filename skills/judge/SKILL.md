---
name: judge
description: "Judge phase — blind dual review of the diff against the spec, synthesis, fixer dispatch. Trigger: harness pipeline reaches judge phase."
---

Orchestrator-side. Judges catch SPEC drift — they never see the plan.

## Dual review (full mode)

1. Determine the diff range (feature branch base..HEAD).
2. Launch `judge-a` AND `judge-b` in PARALLEL (one message, two Agent calls), identical inputs: spec path, diff range, `docs/conventions.md` path. Never pass one judge's verdict to the other.
3. Synthesize the two caveman verdicts:

| Outcome | Action |
| --- | --- |
| Finding reported by BOTH (same issue, any wording) | → fixer queue |
| Finding reported by ONE only | → surface to the user verbatim; user decides fix/dismiss. NEVER resolve silently |
| Both `verdict: clean` | → write `phase: manual-test`, done |

4. Dispatch `fixer` with the confirmed list (+ user-approved singles). One fixer, one commit.
5. RE-JUDGE only the fixer's commit (`rtk git diff <fix-commit>^..<fix-commit>`) — both judges again, same rules. Loop until clean or the user stops it.
6. Update the state file `judges:` line at every step (verdicts → confirmed → fixed) BEFORE advancing.

## Lite mode

Single judge (`judge-a`), same inputs. Findings go straight to the user (no confirmation pair exists); user-approved ones → fixer.

## Drift memory

If a judge reports the same conventions-drift finding that already appeared in a previous judge round for this project, append one caveman line to `docs/learnings.md` (e.g. `agents keep using axios; conventions say fetch — watch it`).
