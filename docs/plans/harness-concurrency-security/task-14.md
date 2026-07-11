goal: integration-test incompatible same-revision registry writers return a stale-revision result without overwrite
files: scripts/harness-registry-cas.integration.test.js
tests: AC-8 (integration)
done-when: node --test scripts/harness-registry-cas.integration.test.js green; AC-8 proves winner preservation and stale failure
pattern: scripts/harness-registry.test.js
