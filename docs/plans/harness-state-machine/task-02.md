goal: create pure state-machine validator/transition module with unit tests covering canonical behavior and migration defaults
files: scripts/harness-state.js, scripts/harness-state.test.js, package.json
read-files: docs/specs/harness-state-machine.md, docs/formats.md, docs/learnings.md, scripts/harness-doctor.js, package.json
tests: AC-1 [unit] transition accept/reject with unmet rule; AC-2 [unit] approval evidence tied to gate+revision; AC-3 [unit] idempotent completed resume; AC-4 [unit] full UI plan routes to visual and blocks implement; AC-5 [unit] full non-UI plan routes to implement; AC-6 [unit] hotfix/lite requires plan+explicit approval; AC-7 [unit] downstream invalidation; AC-10 [unit] finalization checkpoints; AC-11 [unit] unversioned load safe defaults/no inferred approval; AC-13 [unit] no token fields
done-when: node --test scripts/harness-state.test.js green and package.json exposes a test command that can run node --test
pattern: scripts/harness-doctor.js
risk: high — central transition logic must be idempotent and not infer human approval from resumed text
depends-on: task 1
