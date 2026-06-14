---
name: judge
description: "Judge phase — blind dual review of the diff against the spec, synthesis, fixer dispatch. Trigger: harness pipeline reaches judge phase."
---

Orchestrator-side. Judges catch SPEC drift, universal code-law drift, and local conventions drift — they never see the plan.

## Dual review (full mode)

1. Determine the diff range (feature branch base..HEAD).
2. Launch `judge-a` AND `judge-b` in PARALLEL (one message, two Agent calls), identical inputs: the CURRENT spec path (re-read each cycle — source of truth, never a cached copy), diff range, `docs/conventions.md` path. Judges also have built-in `CORE-*` code laws, so `docs/conventions.md` may be sparse. Never pass one judge's verdict to the other.
3. Synthesize the two caveman verdicts — NO user gate, the orchestrator auto-proceeds:

| Outcome | Action |
| --- | --- |
| Finding reported by BOTH (same issue, any wording) | → fixer queue, dispatched AUTOMATICALLY (no approval gate) |
| Finding reported by ONE only | → AUTO-DISMISS + log one caveman line to `docs/learnings.md`. NEVER surface to the user as a decision |
| Both `verdict: clean` | → write `phase: manual-test`, done |

4. Auto-dispatch `fixer` with the both-confirmed list. Pass the CURRENT spec path explicitly (same source-of-truth re-read as the judges). One fixer, one commit.
5. RE-JUDGE only the fixer's commit (`rtk git diff <fix-commit>^..<fix-commit>`) — both judges again, same inputs incl. the current spec path, same rules. Cap at 2 re-judge cycles: if findings still do not converge to clean after 2 cycles, STOP and surface the unresolved findings to the user as a FAILURE (not a fix/dismiss decision).
6. Update the state file `judges:` line at every step (verdicts → confirmed → fixed → cycle count) BEFORE advancing.

> Amended-AC guard: if a finding contradicts an AC that was already amended in the current spec, do NOT revert the implementation. The current spec is authoritative — drop the finding. This is why judge/fixer dispatch ALWAYS receives the current spec path, never a stale copy.

## Lite mode

Single judge (`judge-a`), same inputs incl. the current spec path. No confirmation pair exists, so there is no both-confirmed set: findings are AUTO-DISMISSED + logged to `docs/learnings.md`, never surfaced as a user decision. Same 2-cycle re-judge cap and amended-AC guard apply.

## Drift memory

If a judge reports the same conventions-drift finding that already appeared in a previous judge round for this project, append one caveman line to `docs/learnings.md` (e.g. `agents keep using axios; conventions say fetch — watch it`).
