goal: add final integration coverage for harness doctor across valid and invalid temporary repositories
files: scripts/harness-doctor.test.js, package.json
read-files: docs/specs/harness-state-machine.md, docs/formats.md, docs/learnings.md, scripts/harness-doctor.js, scripts/harness-state.js, scripts/harness-doctor.test.js, package.json
tests: AC-12 [integration] valid temp repo exits 0; invalid temp repos return actionable non-zero validation for illegal phases, missing required artifacts, invalid approvals, and inconsistent completion checkpoints; files unchanged unless explicit safe fix exists
done-when: node --test scripts/harness-doctor.test.js green with AC-12 tagged integration cases and full node --test green
pattern: scripts/harness-doctor.js
risk: medium — integration fixtures must isolate process.cwd and avoid mutating real repository state
depends-on: tasks 2, 5
