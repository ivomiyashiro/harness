goal: run parallel-safe tasks in isolated worktrees, integrate commits serially, and persist resumable integration state
files: scripts/harness-worktrees.js, scripts/harness-worktrees.test.js, skills/implement/SKILL.md
tests: AC-11 (unit), task-worktree and serial-integration unit cases
done-when: node --test scripts/harness-worktrees.test.js green; isolation fallback, serial integration, conflict stop, and resume state are covered
pattern: skills/implement/SKILL.md
