# Task 1: Plugin Scaffold

**Goal:** Create the plugin's skeleton: manifest, directory layout, short plugin CLAUDE.md, and the artifact-format reference document that every later task builds on.

**Type:** AFK

**Files:**
- Create: `.claude-plugin/plugin.json`
- Create: `CLAUDE.md` (plugin-level, repo root)
- Create: `commands/.gitkeep`, `agents/.gitkeep`, `skills/.gitkeep` (placeholder dirs)
- Create: `docs/formats.md` (artifact-format reference)

**Task Type:** Configuration + Documentation

**Skills & Rules:**
- `skill-creator` — Rule: plugin manifest needs `name`, `description`, `version`; skills live in `skills/<name>/SKILL.md` with `name` + `description` frontmatter.
- Spec constraint (section 5): plugin CLAUDE.md must be SHORT — artifact paths, the "paths not content" golden rule, caveman report format. Nothing else.

**Visual Reference:** None.

**Blocked by:** None — can start immediately.

**Context for the executor:** This repo IS the `harness` Claude Code plugin: a token-economic multi-agent dev pipeline replacing gentle-ai. Everything later (commands, agents, skills) hangs off this skeleton. The formats document is the single source of truth for state files, task files, and caveman reports — later tasks reference it instead of redefining formats.

**Review Level:** Self-only

## Acceptance criteria
- [ ] `.claude-plugin/plugin.json` is valid JSON with `name: "harness"`, a one-line description, and `version: "0.1.0"`.
- [ ] Plugin `CLAUDE.md` is ≤ 40 lines and contains exactly: artifact paths table, the golden rule ("agents hand off file PATHS, never content"), and the caveman report format with one example.
- [ ] `docs/formats.md` defines all five artifact formats (below) with one concrete example each.

**Steps:**

- [ ] **Step 1: Write `.claude-plugin/plugin.json`** — fields: `name`, `description`, `version`. Description states what the plugin does in one sentence.

- [ ] **Step 2: Write plugin `CLAUDE.md`** (root). Content contract:
  - Artifact paths (per TARGET repo, not this repo): `docs/specs/<feature>.md`, `docs/plans/<feature>/plan.md` + `task-NN.md`, `docs/state/<feature>.md`, `docs/state/_active.md`, `docs/learnings.md`, `docs/mocks/`, `docs/conventions.md`.
  - Golden rule: orchestrator reads ONLY state files; agents pass file paths, never file content (FR-4, FR-6).
  - Caveman report format: ≤ 3 lines, no code, e.g. `task 3: 4 tests green, 2 files, committed abc123`.

- [ ] **Step 3: Write `docs/formats.md`** defining (one example each):
  1. **State file** (`docs/state/<feature>.md`) — caveman fields: `mode`, `phase`, `tasks: done N,N / next N`, `judges: <verdict summary>`, `checklist: <status>`, `tokens: <phase> Nk | ...` (FR-11, FR-34).
  2. **Spec format** — lean prose, FRs as bullets, ACs in full Given/When/Then, each AC tagged `[unit|integration|e2e|manual]` (FR-8, FR-9).
  3. **Task file** (`task-NN.md`) — caveman bullets: `goal / files / tests / done-when / pattern: <exemplar file path>` (FR-10).
  4. **Caveman subagent report** — ≤ 3 lines, no code (FR-6).
  5. **`_active.md` registry** — one line per active feature: `<feature> | <branch> | <file globs>` (FR-13).

- [ ] **Step 4: Verify and commit** — validate JSON parses (`rtk cargo` not applicable; use a quick parse check), count CLAUDE.md lines ≤ 40, commit `feat: scaffold harness plugin structure`.

**Definition of Done:**
- [ ] All three ACs above check out
- [ ] Committed with conventional commit message, no AI attribution
