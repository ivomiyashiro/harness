goal: validate update-registry paths and default-branch values before resolving or writing the registry target
files: scripts/harness-workflow.js, scripts/harness-registry.js, scripts/harness-registry.test.js, scripts/harness-workflow.integration.test.js
tests: AC-2 (unit), AC-9 (unit)
done-when: node --test scripts/harness-registry.test.js scripts/harness-workflow.integration.test.js green; outside paths and unsafe branch values fail before reads, locks, or writes
pattern: scripts/harness-input.js
