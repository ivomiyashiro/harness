# Task 2: Orchestrator Commands

**Goal:** Create the three core user commands (`/harness:go`, `/harness:init`, `/harness:status`) and the `explorer` agent they depend on.

**Type:** AFK

**Files:**
- Create: `commands/go.md`
- Create: `commands/init.md`
- Create: `commands/status.md`
- Create: `agents/explorer.md`

**Task Type:** Documentation (prompt artifacts)

**Skills & Rules:**
- `skill-creator` — Rule: command files are markdown prompts; agent files need frontmatter `name`, `description`, `model`, `tools`.
- `ivos-skills:skill-cso` — Rule: descriptions must state WHEN to trigger, not just what the thing does.

**Visual Reference:** None.

**Blocked by:** T1 (needs `docs/formats.md` to reference state-file format).

**Context for the executor:** These commands are the harness's front door. `/harness:go` is the thin orchestrator entry point: it never reads source code, only state files, and dispatches subagents per phase. `explorer` is the cheap (haiku) read-only agent used by `init` to scan the codebase and later by brainstorm to self-answer codebase questions. Formats live in `docs/formats.md` (this repo) — reference, don't redefine.

**Review Level:** Strict

## Acceptance criteria
- [ ] `/harness:go <feature>`: if `docs/state/<feature>.md` exists → resume from recorded phase without re-asking answered questions (FR-1, FR-35); else → triage mode (hotfix/lite/full/epic) with a recommendation, user confirms (FR-2).
- [ ] `go.md` instructs: thin orchestrator — dialogue + dispatch only, read ONLY state files, never source code (FR-4); write state file BEFORE every phase transition (FR-3); on subagent failure report the raw error, no blind retries (FR-35).
- [ ] `/harness:init`: dispatches `explorer` to scan the codebase, drafts `docs/conventions.md` (folder structure, layers, error handling, naming, libraries, optional stack-skill references), user approves/edits before write (FR-15).
- [ ] `/harness:status [feature]`: reads state files (one or all under `docs/state/`) and reports phase, pending items, active features — read-only.
- [ ] `agents/explorer.md`: `model: haiku`, read-only tools (Read/Glob/Grep), bakes in rtk-prefixed commands for any shell use, caveman report format (≤ 3 lines, no code) baked in as a hard rule (FR-5, FR-6, FR-7).

**Steps:**

- [ ] **Step 1: Write `agents/explorer.md`** — frontmatter (name, description "answers codebase questions cheaply", model haiku, read-only tools). Body: answer the specific question asked, nothing more; report caveman; rtk prefix mandatory for shell commands; read `docs/learnings.md` first if it exists (FR-12).

- [ ] **Step 2: Write `commands/go.md`** — the orchestrator prompt. Contract:
  - Resume path: read `docs/state/<feature>.md`, continue at `phase`, dispatch next pending item.
  - Fresh path: triage the request → recommend ONE mode with one-line rationale → user confirms. Mode definitions: `hotfix` (implement + regression test), `lite` (implement-tdd → single judge), `full` (brainstorm → spec → plan → implement → dual judge → manual-test → iterate), `epic` (decomposition → N sub-specs each running full).
  - Per-phase dispatch table: which phase skill to load and which agent(s) to launch (skills/agents arrive in T3–T7; name them now per the spec inventory — forward references are fine).
  - State write discipline + telemetry line per FR-34 (record approximate token usage per phase from Agent results).
  - Hard rules restated: no source code in main thread; caveman reports only.

- [ ] **Step 3: Write `commands/init.md`** — dispatch explorer → draft `docs/conventions.md` → present to user for approval/edits → write approved version. Include the conventions.md section list (folder structure, layers, error handling, naming, library usage, stack skills to load).

- [ ] **Step 4: Write `commands/status.md`** — glob `docs/state/*.md`, parse caveman fields, print a compact table. No dispatching.

- [ ] **Step 5: Verify and commit** — frontmatter parses in all four files; every referenced path matches `docs/formats.md`; commit `feat: add orchestrator commands and explorer agent`.

**Definition of Done:**
- [ ] All ACs above check out
- [ ] No format redefinition (formats referenced from `docs/formats.md`)
- [ ] Committed with conventional commit message
