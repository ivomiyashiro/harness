# Task 9: Telemetry & Learnings

**Goal:** Wire token telemetry into the orchestrator flow and define the `docs/learnings.md` protocol across all agents.

**Type:** AFK

**Files:**
- Modify: `commands/go.md` (telemetry recording rule)
- Modify: `docs/formats.md` (learnings.md format section — append-only edit)
- Modify: `agents/implementer.md`, `agents/explorer.md`, `agents/planner.md`, `agents/visual.md` (add "read learnings first" line where missing)
- Modify: `skills/judge/SKILL.md` (confirm repeated-drift → learnings append is present; add if T4 omitted it)

**Task Type:** Documentation (prompt artifacts)

**Skills & Rules:**
- `skill-creator` — Rule: keep additions surgical; don't restructure existing prompt files.

**Visual Reference:** None.

**Blocked by:** T3 (implementer must exist). Practical note: also touches files from T2, T4, T5, T7 — run after those when executing sequentially; if parallel with T8, see the formats.md append-only coordination note in task-08.

**Context for the executor:** Two cheap feedback loops. Telemetry: each Agent tool result includes approximate token usage; the orchestrator records it caveman-style in the state file per phase (FR-34) so dogfooding produces real numbers. Learnings: `docs/learnings.md` is the per-project gotcha file — one caveman line each; agents read it at start, the orchestrator appends on surprises (FR-12). It replaces engram's role within a project.

**Review Level:** Self-only

## Acceptance criteria
- [ ] `go.md` instructs: after every subagent returns, append/update the state file's `tokens:` line (`tokens: explore 2k | implement 45k | judge 18k` style) BEFORE the next dispatch (FR-34, FR-3).
- [ ] `docs/formats.md` has a learnings.md section: one line per gotcha, caveman, with one example (e.g. `vitest needs --pool=forks on this repo, workers crash`).
- [ ] Every agent that reads project context (explorer, implementer, planner, visual) has a "read `docs/learnings.md` first if it exists" instruction. Judges/fixer/verifier excluded by design (judges' starved diet is spec+diff+conventions only per FR-26).
- [ ] `go.md` has the append rule: orchestrator appends one caveman line to `docs/learnings.md` when a surprise surfaces (failed assumption, env quirk, repeated judge drift finding).

**Steps:**

- [ ] **Step 1: Modify `commands/go.md`** — add telemetry recording rule + learnings append rule (two short subsections).

- [ ] **Step 2: Append learnings format to `docs/formats.md`**.

- [ ] **Step 3: Sweep the four agents** — add the read-learnings line where T2/T3/T5/T7 didn't already include it. Surgical one-liners; do not restructure.

- [ ] **Step 4: Check `skills/judge/SKILL.md`** for the repeated-drift→learnings rule (FR-26); add if missing.

- [ ] **Step 5: Verify and commit** — grep that all four agents reference learnings.md and judges do NOT; commit `feat: add telemetry and learnings protocols`.

**Definition of Done:**
- [ ] All ACs above check out
- [ ] No restructuring of existing files — additive edits only
- [ ] Committed with conventional commit message
