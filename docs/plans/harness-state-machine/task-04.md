goal: update judge workflow to preserve all blocking findings and re-judge cumulative feature diff after fixes
files: skills/judge/SKILL.md
read-files: docs/specs/harness-state-machine.md, docs/formats.md, docs/learnings.md, skills/judge/SKILL.md
tests: AC-8 [unit intent] blocking findings confirmed/rejected with evidence; AC-9 [unit intent] both reviewers get cumulative diff from approved baseline through fixer commit
done-when: skills/judge/SKILL.md requires synthesis to explicitly confirm or reject every blocking finding with evidence, store that evidence in judge state/checkpoints, and re-run both judges on the cumulative approved-baseline..fixer-commit diff after fixes
pattern: skills/judge/SKILL.md
risk: medium — judge prompt currently auto-dismisses some one-judge findings and must not let blocking findings disappear silently
depends-on: task 1
