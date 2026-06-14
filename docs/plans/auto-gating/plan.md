feature: auto-gating
globs: CLAUDE.md, skills/write-plan/SKILL.md, skills/spec/SKILL.md, skills/judge/SKILL.md, skills/iterate/SKILL.md
tasks:
1. Add human-gate policy + auto-proceder mechanism to CLAUDE.md (FR-1, AC-1)
2. Remove blocking plan-approval gate from write-plan, add auto-proceed + glob-overlap signal (FR-2/FR-3 part, AC-2/AC-3)
3. Auto-resolve tags + exemplars in spec skill, keep final approval gate (FR-3, AC-4)
4. Auto-fix both-judge findings, auto-dismiss single-judge findings, add re-judge cap + current spec path (FR-4/FR-6, AC-5/AC-6/AC-9)
5. Amend spec IN-PLACE in iterate skill (FR-6, AC-8)
parallel-safe: tasks 2, 3, 4, 5 are parallel-safe (each edits a different file); task 1 must complete first so its definitions are stable when other tasks reference them
