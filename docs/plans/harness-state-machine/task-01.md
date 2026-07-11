goal: document the canonical versioned Harness state contract and transition rules in docs/formats.md
files: docs/formats.md
read-files: docs/specs/harness-state-machine.md, docs/formats.md, docs/learnings.md
tests: AC-13 [unit] by inspection in task-02; contract supports AC-1 through AC-11 inputs
done-when: docs/formats.md defines state version, legal phases, mode-specific transition table, required artifacts, approval evidence shape, checkpoint fields, iteration invalidation rules, unversioned safe defaults, and contains no token telemetry/budget/analysis field added by this feature
pattern: docs/formats.md
risk: medium — persisted state format must stay backward-compatible with existing unversioned state files
depends-on: none
