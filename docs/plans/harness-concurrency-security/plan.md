feature: harness-concurrency-security
globs: index.js, index.test.js, agents/{explorer,judge-a,judge-b,verifier,implementer,planner}.md, commands/{go,epic,status,doctor}.md, skills/{write-plan,implement}/SKILL.md, scripts/harness-{input,paths,process,registry,worktrees,observe,workflow}.js, scripts/harness-{input,paths,process,registry,worktrees}.test.js, scripts/harness-workflow.integration.test.js, scripts/harness-*.integration.test.js, scripts/harness-state.js, scripts/harness-state.test.js, scripts/harness-doctor.js, scripts/harness-doctor.test.js, docs/formats.md
tasks:
1. Add canonical argument and slug validation before command values reach paths, refs, prompts, or argv.
2. Add real-path boundary and persisted branch/worktree identity validation for feature sessions and resume.
3. Add an explicit-argv child-process runner with timeout, checked failures, and one-time cleanup.
4. Enforce inspection-only agent permissions at the plugin boundary and test the Bash allowlist.
5. Constrain doctor argument parsing and --fix writes to deterministic Harness-owned changes.
6. Add default-branch resolution plus locked/CAS active-registry updates and stale-revision results.
7. Add isolated task-worktree creation, serial integration, and resumable pending-integration state.
8. Preserve safe legacy state/config values, reject ambiguous authority, and guard against token behavior.
9. Prove AC-3 real-path and symlink-boundary behavior in an integration fixture.
10. Prove AC-4 resume rejects declared worktree or branch identity mismatches without mutation.
11. Prove AC-5 isolated concurrent task worktrees and serial clean integration.
12. Prove AC-6 failed/conflicting integration recovery preserves reachable successful commits and pending state.
13. Prove AC-7 concurrent registry writers retain every distinct entry exactly once.
14. Prove AC-8 incompatible same-revision registry writers return stale-revision without overwrite.
15. Prove AC-12 doctor --fix changes only deterministic Harness data and preserves unrelated plugin bytes.
16. Remove task read allowlists and strict input diets while keeping targeted discovery and optional conventions guidance.
17. Remove command-profile Bash sandboxing while preserving edit denial for observe-only roles.
18. Bound update-registry paths and default-branch inputs to the canonical repository target.
19. Parse persisted resume state through the canonical state contract instead of a JSON-only path.
20. Prove AC-4 resume accepts canonical persisted state and rejects unsafe or mismatched identity without mutation.
dependencies: 2 after 1; 6 after 2; 7 after 6; 8 after 2; 9 after 2; 10 after 2; 11-12 after 7; 13-14 after 6; 15 after 5; 9-15 after 1-8; 18 after 6; 19 after 18; 20 after 19
parallel-safe: 1, 3, 4, 5; 6, 8; 9, 10, 11, 12, 13, 14, 15; 16, 17
