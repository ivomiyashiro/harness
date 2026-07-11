goal: allow bounded agents to discover any needed repository context without task read allowlists
files: agents/implementer.md, agents/planner.md, skills/implement/SKILL.md, skills/write-plan/SKILL.md, docs/formats.md
tests: AC-10 (unit), AC-15 (unit)
done-when: node --test scripts/harness-state.test.js green; task guidance treats conventions as optional and encourages minimal targeted reads without blocking on read-files
pattern: agents/fixer.md
