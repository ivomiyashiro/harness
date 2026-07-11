feature: harness-state-machine
summary: Make every Harness phase transition explicit, validated, resumable, and backward-compatible so no workflow can skip a required gate or reuse stale downstream state.

problem: Phase changes are currently encoded across skills without one enforceable transition model. This permits skipped gates, stale artifacts after iteration, inconsistent mode behavior, and partially completed workflows reported as done. Existing persisted state files must continue to load safely.

requirements:
- FR-1: Define the legal phase transitions and required artifacts for hotfix, lite, full, and epic workflows in one canonical state contract.
- FR-2: Record explicit approval evidence for irreversible and pre-start gates without treating an arbitrary resumed message as approval.
- FR-3: Make phase transitions idempotent and reject transitions whose prerequisites are absent, stale, or inconsistent.
- FR-4: Route full UI work through visual approval and route non-UI work directly from approved plan to implementation.
- FR-5: Require approved plans before hotfix or lite implementation while allowing their documented inline state specification.
- FR-6: Invalidate affected downstream task, judge, verification, and checklist state when iteration returns work to an earlier phase.
- FR-7: Evaluate all blocking judge findings and re-judge the cumulative feature diff after fixes.
- FR-8: Mark a feature done only after required verification, commit, registry, and cleanup checkpoints succeed.
- FR-9: Read existing unversioned state files using safe defaults and write the canonical versioned format on the next successful transition.
- FR-10: Extend doctor validation to report illegal transitions, missing artifacts, invalid gates, and inconsistent state without silently rewriting workflow history.
- FR-11: Do not add token telemetry, token budgets, or token-analysis requirements.

AC-1 [unit]: Given a workflow mode and current phase When a requested transition is checked Then only transitions declared by the canonical state contract are accepted and every rejected transition includes the unmet rule.
AC-2 [unit]: Given a transition requiring human approval When the workflow resumes with no approval evidence tied to that gate and state revision Then the transition remains blocked and an unrelated user message is not accepted as approval.
AC-3 [unit]: Given an approved transition that has already completed When the same transition is resumed Then it produces the same phase and checkpoints without duplicating registry entries or discarding completed work.
AC-4 [unit]: Given a full feature whose approved plan contains UI work When planning completes Then the next phase is visual and implementation remains blocked until visual approval is recorded.
AC-5 [unit]: Given a full feature whose approved plan contains no UI work When planning completes Then the next phase is implement without creating a visual gate.
AC-6 [unit]: Given a hotfix or lite feature with an inline specification When implementation is requested Then it starts only if its plan exists and explicit plan approval is recorded.
AC-7 [unit]: Given iteration feedback that changes requirements or implementation When the workflow routes back to the owning phase Then affected downstream tasks, judge results, verification results, and manual checklist entries are reset while unaffected upstream approvals remain valid.
AC-8 [unit]: Given one judge reports a blocking finding and the other judge does not When findings are synthesized Then the finding must be explicitly confirmed or rejected with evidence and cannot disappear solely because it was reported once.
AC-9 [unit]: Given confirmed findings have been fixed When re-judging begins Then both required reviewers receive the cumulative diff from the approved baseline through the fixer commit.
AC-10 [unit]: Given verification passed but commit, active-registry update, or cleanup has not completed When finalization runs Then the feature is not marked done and resume continues from the incomplete checkpoint.
AC-11 [unit]: Given an existing unversioned state file using the current documented fields When it is loaded Then all preserved values remain available, missing canonical fields receive safe defaults, and no approval is inferred.
AC-12 [integration]: Given valid and invalid workflow states in temporary repositories When harness doctor runs Then it exits successfully for valid states and returns actionable non-zero validation results for illegal phases, missing required artifacts, invalid approvals, and inconsistent completion checkpoints without modifying those files unless an explicit safe fix exists.
AC-13 [unit]: Given the canonical state format and workflow instructions When this feature is complete Then they contain no token telemetry, token budget, or token-analysis field added by this feature.

pattern: skills/write-plan/SKILL.md for phase transitions and human-gate instructions
pattern: docs/formats.md for the canonical persisted state contract
pattern: scripts/harness-doctor.js for CLI state validation
