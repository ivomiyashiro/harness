# Task 5: Planning Layer

**Goal:** Create the three planning phase skills (`brainstorm`, `spec`, `write-plan`) and the `planner` agent. Completing this task enables `full` mode pipelines (phases up to implement).

**Type:** AFK

**Files:**
- Create: `skills/brainstorm/SKILL.md`
- Create: `skills/spec/SKILL.md`
- Create: `skills/write-plan/SKILL.md`
- Create: `agents/planner.md`

**Task Type:** Documentation (prompt artifacts)

**Skills & Rules:**
- `skill-creator` — Rule: valid frontmatter, trigger-focused descriptions.
- `ivos-skills:brainstorming` — Rule: mine its one-question-at-a-time + recommendation-per-question discipline for the brainstorm skill body.
- grill-me (github.com/mattpocock/skills, referenced in design) — Rule: decision-tree interrogation walks branch-by-branch once the design shape exists; never two questions at once.

**Visual Reference:** None.

**Blocked by:** T2 (explorer agent must exist for self-answer dispatch).

**Context for the executor:** This is the front half of `full` mode. Brainstorm runs IN the main thread (it's dialogue), but any codebase-answerable question goes to the cheap `explorer` agent instead of the user (FR-17). Spec converts the brainstorm outcome into the lean spec format with tagged ACs — the test budget. Write-plan dispatches the `planner` agent (sonnet) to produce caveman task files with `pattern:` exemplars.

**Review Level:** Strict

## Acceptance criteria
- [ ] `skills/brainstorm/SKILL.md`: main-thread dialogue, ONE question at a time, each with a recommendation (FR-16); codebase questions auto-dispatched to explorer and self-answered, never asked to the user (FR-17); grill mode kicks in after the shape exists — walk the decision tree branch-by-branch; epic detection: scope spanning multiple independent subsystems → switch to epic decomposition, output sub-spec list + dependency order to `docs/state/epic-<name>.md`, NO detailed design at epic level (FR-18); if the feature has UI, flag that the visual sub-phase (mock approval) gates implementation (FR-22 awareness).
- [ ] `skills/spec/SKILL.md`: produces `docs/specs/<feature>.md` per `docs/formats.md` — zero filler prose, full Given/When/Then ACs (FR-8); every AC tagged using the baked-in criteria: `e2e` only for critical journeys (money, auth, data loss); `integration` only where a real boundary crossed would be hidden by mocks; `manual` for UX/feel; `unit` otherwise (FR-9); states "spec approval = test-budget approval"; for novel code, the `pattern:` exemplar is chosen here (FR-10); user approval is the phase gate.
- [ ] `agents/planner.md`: `model: sonnet`; inputs by path: spec + `docs/conventions.md` + `docs/learnings.md`; outputs `docs/plans/<feature>/plan.md` + `task-NN.md` in caveman format (`goal / files / tests / done-when / pattern:`); integration/e2e tests generated as FINAL tasks exclusively from tagged ACs (FR-25); declares the file globs the plan will touch (consumed by the T8 overlap check); rtk + caveman report baked in.
- [ ] `skills/write-plan/SKILL.md`: dispatch planner; on return, check declared globs against `docs/state/_active.md` — overlap → warn user, sequence-or-proceed decision BEFORE implement (FR-32; the registry format exists from T1, full protocol arrives in T8 — reference it); update state file; user approves plan before implement.

**Steps:**

- [ ] **Step 1: Write `skills/brainstorm/SKILL.md`** per its AC. Include the explorer-dispatch heuristic: "could a developer answer this by reading the repo? → explorer".

- [ ] **Step 2: Write `skills/spec/SKILL.md`** per its AC. Embed the tag criteria table verbatim so the skill is self-contained.

- [ ] **Step 3: Write `agents/planner.md`** per its AC, including a complete worked example of one caveman task file.

- [ ] **Step 4: Write `skills/write-plan/SKILL.md`** per its AC.

- [ ] **Step 5: Verify and commit** — frontmatter parses; tag criteria present in spec skill; planner example task matches `docs/formats.md`; commit `feat: add planning layer skills and planner agent`.

**Definition of Done:**
- [ ] All ACs above check out
- [ ] No format drift from `docs/formats.md`
- [ ] Committed with conventional commit message
