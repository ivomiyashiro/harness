goal: auto-fix both-judge confirmed findings, auto-dismiss single-judge findings, cap re-judge at 2 cycles, always pass current spec path
files: skills/judge/SKILL.md
tests: AC-5 [manual], AC-6 [manual], AC-9 [manual]
done-when: inspection of skills/judge/SKILL.md confirms (a) both-confirmed findings → fixer dispatched automatically (no user gate), re-judge, escalate only after 2 cycles without convergence; (b) single-judge findings → auto-dismissed and logged, never surfaced to user as a decision; (c) dispatch calls to judge-a/judge-b/fixer include the current spec path explicitly; (d) a note that a finding contradicting an already-amended AC must NOT revert the implementation
pattern: skills/judge/SKILL.md (same frontmatter + Dual review table/Lite mode/Drift memory structure; edit in-place)
