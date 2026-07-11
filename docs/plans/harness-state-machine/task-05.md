goal: extend harness doctor to report canonical state-machine validation errors without silently rewriting history
files: scripts/harness-doctor.js, scripts/harness-doctor.test.js, package.json
read-files: docs/specs/harness-state-machine.md, docs/formats.md, docs/learnings.md, scripts/harness-doctor.js, scripts/harness-state.js, scripts/harness-state.test.js, package.json
tests: AC-1 [unit] illegal transition reports unmet rule through validator; AC-10 [unit] inconsistent done/final checkpoints reported; AC-11 [unit] unversioned states load with safe defaults; AC-12 prep valid/invalid doctor fixtures do not rewrite without explicit safe fix
done-when: node --test scripts/harness-doctor.test.js green and doctor reports illegal phases/transitions, missing artifacts, invalid approvals, and inconsistent completion checkpoints without modifying files when --fix is absent
pattern: scripts/harness-doctor.js
risk: high — doctor must validate new rules while keeping existing warnings and --fix behavior safe
depends-on: task 2
