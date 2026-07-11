goal: integration-test doctor --fix preserves unrelated plugin bytes and reports only applied Harness repairs
files: scripts/harness-doctor.integration.test.js
tests: AC-12 (integration)
done-when: node --test scripts/harness-doctor.integration.test.js green; AC-12 covers mixed-plugin configuration and deterministic state repairs
pattern: scripts/harness-doctor.test.js
