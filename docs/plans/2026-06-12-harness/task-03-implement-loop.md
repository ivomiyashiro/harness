# Task 3: Implement Loop

**Goal:** Create the `implementer` agent and the `implement` phase skill — the TDD execution core that powers every mode.

**Type:** AFK

**Files:**
- Create: `agents/implementer.md`
- Create: `skills/implement/SKILL.md`

**Task Type:** Documentation (prompt artifacts)

**Skills & Rules:**
- `skill-creator` — Rule: SKILL.md frontmatter `name` + `description` with clear trigger; agent frontmatter includes `model` and `tools`.
- `ivos-skills:test-driven-development` — Rule: red → green → refactor is non-negotiable; no production code before a failing test. (Mine this skill's phrasing for the implementer prompt — it is battle-tested against rationalization.)

**Visual Reference:** None.

**Blocked by:** T1 (formats reference). Parallel with T4 (no shared files).

**Context for the executor:** The implementer is the workhorse: one fresh-context agent per task, doing strict TDD on exactly ONE task file, then committing one atomic work-unit commit. Its input diet is deliberately starved (FR-23) to keep tokens low and drift impossible: task file + relevant spec section + conventions + learnings. Nothing else — not the plan, not other tasks.

**Review Level:** Strict

## Acceptance criteria
- [ ] `agents/implementer.md`: model = session model (omit `model` field or set inherit), full edit tools. Prompt enforces: inputs are EXACTLY its task file, the referenced spec section, `docs/conventions.md`, `docs/learnings.md` (FR-23); strict TDD red→green→refactor; follow the task's `pattern:` exemplar file; one atomic commit per task with conventional message (FR-24); rtk prefix on all test/git/build commands (FR-7); caveman completion report ≤ 3 lines, no code (FR-6).
- [ ] `skills/implement/SKILL.md`: orchestrator-side instructions — for each pending task in `docs/plans/<feature>/`, launch ONE implementer with the starved input list (file paths, not content), collect the caveman report, update the state file (task done + telemetry) BEFORE dispatching the next (FR-3).
- [ ] Mode awareness: in `hotfix`/`lite`, the skill requires only the bug's regression test, not a full TDD plan (FR-25).
- [ ] Failure path: implementer reports raw error caveman-style; orchestrator surfaces it, no silent retry (FR-35).

**Steps:**

- [ ] **Step 1: Write `agents/implementer.md`** — frontmatter + body covering: input diet (the four allowed inputs, by path), TDD cycle with explicit "write the failing test FIRST, run it, see it fail" gate, `pattern:` exemplar mirroring (read the exemplar, match its structure/idioms), work-unit commit, rtk command examples (`rtk vitest run`, `rtk cargo test`, `rtk git diff`, `rtk git commit`), caveman report template.

- [ ] **Step 2: Write `skills/implement/SKILL.md`** — frontmatter (description: "implement phase — dispatch one TDD implementer per task"). Body: read state file for next task number; build the implementer prompt with the four input paths + the task's spec AC references; launch; on caveman success report → mark task done in state file + append telemetry; on failure → stop and surface. Loop until tasks exhausted. Hotfix/lite shortcut: single implementer, regression-test-only requirement.

- [ ] **Step 3: Verify and commit** — frontmatter parses; the four-input diet appears verbatim in both files (agent enforces, skill supplies); commit `feat: add implementer agent and implement skill`.

**Definition of Done:**
- [ ] All ACs above check out
- [ ] rtk examples present in the agent body
- [ ] Committed with conventional commit message
