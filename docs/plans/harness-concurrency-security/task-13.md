goal: integration-test eight concurrent distinct registry writers retain every parseable entry exactly once
files: scripts/harness-registry-concurrency.integration.test.js
tests: AC-7 (integration)
done-when: node --test scripts/harness-registry-concurrency.integration.test.js green; AC-7 covers at least eight concurrent writers
pattern: scripts/harness-doctor.test.js
