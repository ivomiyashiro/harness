---
name: iterate
description: "Iterate phase — route user feedback to the phase that owns the defect, or finish the feature. Trigger: harness pipeline reaches iterate phase or user gives post-implementation feedback."
---

Orchestrator-side. Feedback goes to the phase that OWNS the defect — not blindly to implement.

## Routing table

| Feedback says | Defect owner | Action |
| --- | --- | --- |
| "that's not what I wanted" / missing or wrong requirement | spec | Re-open spec phase: amend the spec (user approves), re-plan affected tasks |
| Structure/approach wrong, spec is right | plan | Re-dispatch planner with the feedback; affected tasks redone |
| Behavior bug, spec and plan are right | implement | New task file for the fix; implementer + re-judge touched code |
| "looks wrong" / visual mismatch | visual | Back to `visual-mock` — update mock first, then implement from it |

Ask the user ONE clarifying question only when the routing is genuinely ambiguous. Always write the state file (`phase: <target>`) BEFORE re-entering the phase.

## Finish (all gates passed: judges clean, checklist OK)

1. State file → `phase: done`.
2. Final commit on the feature branch (`rtk git add`, `rtk git commit`) if anything is pending.
3. Remove the feature's line from `docs/state/_active.md` on main and commit there.
4. Tell the user: branch ready for PR/merge — that decision is theirs.
