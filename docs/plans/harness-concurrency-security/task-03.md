goal: execute Harness child processes through bounded explicit argv with checked status and exactly-once cleanup
files: scripts/harness-process.js, scripts/harness-process.test.js
tests: AC-11 (unit)
done-when: node --test scripts/harness-process.test.js green; non-zero, timeout, and parent-failure cleanup cases are covered
pattern: scripts/harness-doctor.js
