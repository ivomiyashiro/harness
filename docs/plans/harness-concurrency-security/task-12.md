goal: integration-test conflict recovery preserves successful commits and records the exact pending integration
files: scripts/harness-integration-recovery.integration.test.js
tests: AC-6 (integration)
done-when: node --test scripts/harness-integration-recovery.integration.test.js green; AC-6 proves no partial branch advance past conflict
pattern: scripts/harness-worktrees.test.js
