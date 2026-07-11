goal: formalize safe legacy state/config loading and retain the no-token-behavior contract
files: scripts/harness-state.js, scripts/harness-state.test.js, docs/formats.md
tests: AC-13 (unit), AC-14 (unit)
done-when: node --test scripts/harness-state.test.js green; valid legacy values survive and unsafe ambiguity or token fields are rejected
pattern: docs/formats.md
