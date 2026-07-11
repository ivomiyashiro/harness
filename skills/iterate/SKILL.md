---
name: iterate
description: "Iterate phase — route user feedback to the phase that owns the defect, or finish the feature. Trigger: harness pipeline reaches iterate phase or user gives post-implementation feedback."
---

Orchestrator-side. Feedback goes to the phase that OWNS the defect — not blindly to implement. Every route follows the canonical transition contract.

## Routing table

| Feedback says | Defect owner | Action |
| --- | --- | --- |
| "that's not what I wanted" / missing or wrong requirement | spec | Re-open spec phase: amend `docs/specs/<feature>.md` IN-PLACE (user approves), replacing/updating the affected ACs so the file stays the single source of truth — NEVER create a parallel/second spec file and NEVER leave obsolete ACs that contradict the amendment. Then re-plan affected tasks |
| Structure/approach wrong, spec is right | plan | Re-dispatch planner with the feedback; affected tasks redone |
| Behavior bug, spec and plan are right | implement | New task file for the fix; implementer + re-judge touched code |
| "looks wrong" / visual mismatch | visual | Back to `visual-mock` — update mock first, then implement from it |

Ask the user ONE clarifying question only when the routing is genuinely ambiguous. Always write the state file (`phase: <target>`) BEFORE re-entering the phase.

## Invalidation

On any route back, reset affected downstream state only: tasks, judge results, verification results, and manual checklist entries. Preserve unaffected upstream approvals and their approval evidence. Examples: spec/plan changes reset affected tasks and all later judge/verification/checklist state; implement bugs reset only the fix task scope and later judge/verification/checklist state; visual changes reset the mock-derived UI tasks and later state.

## Finish (all gates passed: judges clean, runtime smoke passed, manual checklist OK when present)

1. Final commit on the feature branch (`rtk git add`, `rtk git commit`) if anything is pending; record the commit checkpoint.
2. Remove the feature's line from `docs/state/_active.md` through `node <harness>/scripts/harness-workflow.js update-registry --registry docs/state/_active.md --content-file <candidate-file> --expected-revision <revision>` and commit the successful atomic update on the resolved default branch; on `stale-revision`, reread and retry the removal. Record the registry checkpoint.
3. Run `/harness:doctor --fix` or `node <harness>/scripts/harness-doctor.js --fix` before final reporting. If it changes `_active.md`, include that in the final commit/update; record the cleanup checkpoint.
4. Only after verification passed and the commit, registry, and cleanup checkpoints succeed, write `phase: done`. If any checkpoint is incomplete, keep the finalization phase and resume from the first incomplete checkpoint.
5. Tell the user: branch ready for their next directed step. Do not create or recommend PRs unless the user explicitly asks.
