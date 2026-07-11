goal: load resume identity from canonical persisted state rather than a JSON-only parser
files: scripts/harness-workflow.js, scripts/harness-state.js, scripts/harness-state.test.js
tests: AC-13 (unit), canonical resume-state parsing unit
done-when: node --test scripts/harness-state.test.js green; safe canonical state is preserved and malformed or ambiguous persisted identity fails without normalization
pattern: commands/go.md
