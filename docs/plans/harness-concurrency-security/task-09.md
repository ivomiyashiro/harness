goal: integration-test real-path containment and symlink escape rejection
files: scripts/harness-paths.integration.test.js
tests: AC-3 (integration)
done-when: node --test scripts/harness-paths.integration.test.js green; AC-3 covered with inside, outside, and symlink fixtures
pattern: scripts/harness-paths.test.js
read-files: scripts/harness-paths.js, scripts/harness-paths.test.js
status: complete
