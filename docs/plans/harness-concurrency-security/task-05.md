goal: validate doctor input and make --fix report and apply only actual deterministic Harness-owned repairs
files: scripts/harness-doctor.js, scripts/harness-doctor.test.js, commands/doctor.md
tests: AC-2 (unit), AC-13 (unit), deterministic doctor-fix unit cases
done-when: node --test scripts/harness-doctor.test.js green; invalid doctor arguments and unsafe or fabricated fixes are rejected
pattern: scripts/harness-doctor.test.js
