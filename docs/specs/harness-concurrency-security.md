feature: harness-concurrency-security
summary: Make concurrent Harness sessions deterministic and constrain all user-controlled paths, Git operations, agent permissions, and doctor fixes to their intended scope.

problem: Concurrent tasks and feature sessions can currently share mutable Git and registry state, while command arguments and broad Bash permissions expose avoidable write and path risks. Recovery must preserve completed work and existing projects without assuming a branch named main or modifying unrelated OpenCode plugins.

requirements:
- FR-1: Validate feature, epic, status, and doctor arguments before using them in paths, refs, prompts that trigger commands, or process execution.
- FR-2: Resolve repository and worktree paths through real paths and reject traversal, symlink escapes, invalid slugs, option injection, and branch/ref injection.
- FR-3: Keep each full or epic feature in its declared worktree and require branch/worktree identity to match persisted state on resume.
- FR-4: Run parallel-safe implementation tasks in separate task worktrees and integrate their commits serially into the feature branch; retain sequential execution when isolation cannot be established.
- FR-5: Update the active registry and workflow state atomically with lock or compare-and-swap semantics so concurrent sessions cannot lose another session's update.
- FR-6: Resolve the repository default branch instead of assuming main and fail safely when it cannot be determined.
- FR-7: Make interrupted registry, state, worktree, and integration operations resumable without duplicate commits, partial state, stale locks, or deletion of completed work.
- FR-8: Enforce read-only agent permissions at the tool boundary, including denial of indirect writes through unrestricted Bash while allowing the commands required for inspection and runtime verification.
- FR-9: Execute child processes with explicit argv, bounded timeouts, checked exit status, and guaranteed cleanup instead of interpolated shell commands.
- FR-10: Restrict doctor fixes to deterministic Harness-owned configuration and state; never rewrite options for unrelated plugins or fabricate repairs it did not perform.
- FR-11: Preserve existing valid state files and plugin configuration while producing actionable errors for unsafe or ambiguous legacy values.
- FR-12: Do not add token telemetry, token budgets, or token-analysis behavior.

AC-1 [unit]: Given a valid lowercase hyphenated feature slug When it is parsed Then it is accepted unchanged; given traversal, whitespace, shell metacharacters, leading options, ref syntax, empty segments, or absolute paths Then parsing rejects it before any filesystem or Git operation.
AC-2 [unit]: Given command arguments for go, epic, status, or doctor When they are converted into paths, refs, or process argv Then each command uses the canonical validated value and no raw argument is interpolated into a shell command.
AC-3 [integration]: Given a repository containing symlinks and paths inside and outside its root When a worktree or artifact path is resolved Then only real paths inside the allowed repository/worktree boundary are accepted and symlink escapes are rejected.
AC-4 [integration]: Given persisted feature state When a session resumes Then execution continues only in the declared real worktree on the declared branch; a mismatch exits without modifying state or Git.
AC-5 [integration]: Given two parallel-safe tasks When both run concurrently Then each uses a distinct task worktree and their successful commits are integrated one at a time into the feature branch without sharing an index or contaminating either commit.
AC-6 [integration]: Given one parallel task fails or conflicts during serial integration When recovery runs Then successful task commits remain reachable, the feature branch is not partially advanced past the conflict, and state identifies the exact pending integration.
AC-7 [integration]: Given at least eight concurrent registry writers with distinct feature entries When all updates complete Then every entry is present exactly once and the registry remains parseable.
AC-8 [integration]: Given two writers start from the same state revision When both attempt incompatible updates Then one succeeds and the other receives a stale-revision result without overwriting the winner.
AC-9 [unit]: Given a repository whose default branch is not main When registry operations run Then they use the resolved default branch; given no unambiguous default branch Then they stop with an actionable error before writing.
AC-10 [unit]: Given explorer, judge, or verifier agent configuration When permissions are registered Then edit is denied and Bash cannot execute filesystem mutation, Git mutation, shell redirection, or arbitrary commands outside the agent's inspection/runtime allowlist.
AC-11 [unit]: Given a child process started by Harness When it exits non-zero, hangs, or the parent operation fails Then the error is propagated, timeout is enforced, and cleanup executes exactly once.
AC-12 [integration]: Given OpenCode configuration containing Harness and unrelated plugin tuples When doctor --fix runs Then only the identified Harness tuple and deterministic Harness state repairs may change, unrelated plugin options remain byte-equivalent, and every reported repair corresponds to an actual change.
AC-13 [unit]: Given an existing safe unversioned state or valid Harness configuration When concurrency/security validation loads it Then its values are preserved; unsafe ambiguous values are rejected rather than silently normalized into authority.
AC-14 [unit]: Given changed configuration, state contracts, and tests When this feature is complete Then no token telemetry, budget, or analysis behavior has been introduced.

pattern: commands/go.md for feature worktree and resume boundaries
pattern: skills/write-plan/SKILL.md for active-registry coordination
pattern: docs/formats.md for atomic state and finalization contracts
pattern: scripts/harness-doctor.js for argument, path, configuration, and safe-fix validation
