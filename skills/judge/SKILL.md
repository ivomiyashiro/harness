---
name: judge
description: "Judge phase — blind dual review of the diff against the spec, synthesis, fixer dispatch. Trigger: harness pipeline reaches judge phase."
---

Orchestrator-side. Judges catch SPEC drift, 4R drift (Risk, Readability, Reliability, Resilience), universal code-law drift, and local conventions drift — they never see the plan.

## Dual review (full mode)

1. Determine the diff range (approved baseline..HEAD).
2. Launch `judge-a` AND `judge-b` in PARALLEL (one message, two Agent calls), identical inputs: the CURRENT spec path (re-read each cycle — source of truth, never a cached copy), diff range, `docs/conventions.md` path. Judges also have built-in `R1-R4` review criteria and `CORE-*` code laws, so `docs/conventions.md` may be sparse. Never pass one judge's verdict to the other.
3. Synthesize the two caveman verdicts — NO user gate, the orchestrator auto-proceeds:

| Outcome | Action |
| --- | --- |
| Blocking finding reported by BOTH (same issue, any wording) | → explicitly confirm with evidence, record it in the fixer queue, and dispatch AUTOMATICALLY (no approval gate) |
| Blocking finding reported by ONE only | → explicitly confirm or reject with evidence; it MUST NOT disappear solely because it was reported once |
| Warning reported by ONE only | → AUTO-DISMISS + log one caveman line to `docs/learnings.md`. NEVER surface to the user as a decision |
| Both `verdict: clean` | → write `phase: verify`, done |

4. Synthesis must account for every blocking finding from either judge: explicitly confirm or reject each one with evidence, store that evidence in judge state/checkpoints, then auto-dispatch `fixer` with the confirmed list. Pass the CURRENT spec path explicitly (same source-of-truth re-read as the judges). One fixer, one commit.
5. RE-JUDGE after fixes using the cumulative diff (`rtk git diff <approved-baseline>..<fixer-commit>`) — both judges again, same inputs incl. the current spec path, same rules. Cap at 2 re-judge cycles: if findings still do not converge to clean after 2 cycles, STOP and surface the unresolved findings to the user as a FAILURE (not a fix/dismiss decision).
6. Update the state file `judges:` line at every step (verdicts → evidence → confirmed/rejected → fixed → cycle count) BEFORE advancing.

> Amended-AC guard: if a finding contradicts an AC that was already amended in the current spec, do NOT revert the implementation. The current spec is authoritative — drop the finding. This is why judge/fixer dispatch ALWAYS receives the current spec path, never a stale copy.

## Lite mode

Single judge (`judge-a`), same inputs incl. the current spec path. Because there is no confirmation pair, use severity instead of auto-dismissing everything:

| Single-judge outcome | Action |
| --- | --- |
| `blocking` finding | → fixer queue, dispatched AUTOMATICALLY (no approval gate), then re-judge the fixer commit |
| `warning` finding only | → AUTO-DISMISS + log one caveman line to `docs/learnings.md`; never surface as a user decision |
| `verdict: clean` | → write `phase: verify`, done |

Same amended-AC guard applies. Cap at 2 re-judge cycles. If the same blocking finding persists after 2 attempts, SURFACE to the human as a FAILURE (category-3 gate). Auto-dismiss applies only to warnings, not blocking findings.

## Drift memory

If a judge reports the same conventions-drift finding that already appeared in a previous judge round for this project, append one caveman line to `docs/learnings.md` (e.g. `agents keep using axios; conventions say fetch — watch it`).
