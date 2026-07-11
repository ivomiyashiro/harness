goal: validate canonical feature, epic, status, and doctor arguments before they reach paths, refs, prompts, or argv
files: scripts/harness-input.js, scripts/harness-input.test.js, commands/go.md, commands/epic.md, commands/status.md
tests: AC-1 (unit), AC-2 (unit)
done-when: node --test scripts/harness-input.test.js green; unsafe raw arguments are rejected before command use
pattern: scripts/harness-doctor.js
