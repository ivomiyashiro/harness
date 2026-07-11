goal: integration-test resume identity rejection without state or Git mutation
files: scripts/harness-resume.integration.test.js
tests: AC-4 (integration)
done-when: node --test scripts/harness-resume.integration.test.js green; AC-4 covers declared real worktree and branch mismatch cases
pattern: scripts/harness-state.test.js
read-files: scripts/harness-state.js, scripts/harness-state.test.js
