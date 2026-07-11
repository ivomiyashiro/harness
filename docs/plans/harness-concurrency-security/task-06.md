goal: resolve the repository default branch and atomically update the active registry with lock/CAS conflict results
files: scripts/harness-registry.js, scripts/harness-registry.test.js, skills/write-plan/SKILL.md
tests: AC-9 (unit), registry lock and compare-and-swap unit cases
done-when: node --test scripts/harness-registry.test.js green; non-main defaults work and ambiguous branches or stale revisions fail before writes
pattern: skills/write-plan/SKILL.md
