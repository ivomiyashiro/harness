goal: integration-test canonical resume parsing and identity mismatch safety
files: scripts/harness-workflow.integration.test.js
tests: AC-4 (integration)
done-when: node --test scripts/harness-workflow.integration.test.js green; AC-4 covers canonical state parsing plus worktree and branch mismatch non-mutation
pattern: scripts/harness-resume.integration.test.js
