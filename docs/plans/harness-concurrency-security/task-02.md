goal: resolve real repository paths and require persisted feature worktree and branch identity on resume
files: scripts/harness-paths.js, scripts/harness-paths.test.js, scripts/harness-state.js, scripts/harness-state.test.js, commands/go.md
tests: AC-13 (unit), path and resume identity unit cases
done-when: node --test scripts/harness-paths.test.js scripts/harness-state.test.js green; escapes and resume identity mismatches fail before mutation
pattern: commands/go.md
