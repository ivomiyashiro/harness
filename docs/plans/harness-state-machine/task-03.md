goal: update workflow skills to use canonical transitions, explicit gates, checkpoints, and downstream invalidation
files: skills/write-plan/SKILL.md, skills/visual-mock/SKILL.md, skills/implement/SKILL.md, skills/verify/SKILL.md, skills/iterate/SKILL.md
read-files: docs/specs/harness-state-machine.md, docs/formats.md, docs/learnings.md, skills/write-plan/SKILL.md, skills/visual-mock/SKILL.md, skills/implement/SKILL.md, skills/verify/SKILL.md, skills/iterate/SKILL.md
tests: AC-2 [unit intent] gate evidence instructions; AC-3 [unit intent] resume/checkpoint idempotency instructions; AC-4 [unit intent] UI full plan to visual; AC-5 [unit intent] non-UI full plan to implement; AC-6 [unit intent] hotfix/lite plan approval; AC-7 [unit intent] iteration invalidation; AC-10 [unit intent] done only after final checkpoints
done-when: skill docs instruct orchestrator to call/follow canonical contract, record explicit approval evidence for gates, checkpoint each irreversible/final step, route UI/non-UI correctly, require hotfix/lite plan approval, and reset only affected downstream state on iteration
pattern: skills/write-plan/SKILL.md
risk: medium — prompt changes must preserve existing human-gate policy while making state transitions enforceable
depends-on: task 1
