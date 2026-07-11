goal: integration-test distinct concurrent task worktrees and serial feature-branch integration
files: scripts/harness-worktrees.integration.test.js
tests: AC-5 (integration)
done-when: node --test scripts/harness-worktrees.integration.test.js green; AC-5 proves isolated indexes and uncontaminated commits
pattern: scripts/harness-doctor.test.js
