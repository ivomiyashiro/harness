# Task 7: Visual Sub-Phase

**Goal:** Create the `visual` agent and the `visual-mock` phase skill — native-stack mock iteration with token isolation, design tokens, and the mock-approval gate.

**Type:** AFK

**Files:**
- Create: `agents/visual.md`
- Create: `skills/visual-mock/SKILL.md`

**Task Type:** Documentation (prompt artifacts)

**Skills & Rules:**
- `skill-creator` — Rule: valid frontmatter.
- `ivos-skills:flutter-add-widget-preview` — Rule: mine the previews.dart system mechanics for the Flutter branch of the skill (mock widgets rendered via widget previews/emulator).
- `ivos-skills:frontend-design` — Rule: mine for the web/HTML mock branch (distinctive, non-generic visual quality).

**Visual Reference:** None (this task CREATES the mock machinery).

**Blocked by:** T5 (visual sub-phase hangs off the full-mode planning flow). Parallel with T6 (no shared files).

**Context for the executor:** Mocks are built in the TARGET stack so nothing is lost in translation: web → static HTML opened in the browser; Flutter → a real widget with hardcoded data on previews/emulator (FR-19). The whole iteration runs inside the isolated `visual` agent so screenshots and mock code never touch the main thread (FR-20). The USER is the eye of the loop — feedback arrives as text; the agent ingests screenshots only for final self-check (~2–4 per screen) or when lost. Approved Flutter mocks become the implementation's base widget, not throwaways (FR-22).

**Review Level:** Strict

## Acceptance criteria
- [ ] `agents/visual.md`: model = session model (inherit); full edit + run tools. Body enforces: build mock in target stack under `docs/mocks/` (FR-19); iterate on USER text feedback relayed by the orchestrator; screenshot ingestion budget ~2–4 per screen, only for final self-verification or when lost (FR-20); use ONLY design tokens once the tokens file exists (FR-21); caveman reports to orchestrator (mock path + status, never mock code).
- [ ] `skills/visual-mock/SKILL.md`: detects stack (web vs Flutter) and instructs accordingly — web: static HTML + open in browser as visual companion; Flutter: widget with hardcoded data via widget previews or emulator; first visual feature in a project → create the design-tokens contract file (colors, typography, spacing) and record its path in `docs/conventions.md` (FR-21); mock approval is a HARD gate before implement (FR-22); on approval, the skill ensures the plan's task files reference the approved mock file as the implementation base (web: markup reference; Flutter: the widget file itself gets logic/data wired in).
- [ ] Isolation rule explicit in both files: mock code and screenshots never enter the main thread; orchestrator relays text feedback only (FR-20, FR-4).

**Steps:**

- [ ] **Step 1: Write `agents/visual.md`** per its AC — include the feedback-loop protocol: present mock location + how the user can view it (browser URL / emulator), wait for text feedback, iterate, repeat; self-verify with budgeted screenshots before declaring ready.

- [ ] **Step 2: Write `skills/visual-mock/SKILL.md`** per its AC — stack detection, tokens-file bootstrap (first time only), approval gate wording, the plan-linkage step (update task files' `pattern:`/base-component line to point at the approved mock).

- [ ] **Step 3: Verify and commit** — frontmatter parses; screenshot budget and isolation rule present in both files; tokens bootstrap is first-feature-only; commit `feat: add visual agent and visual-mock skill`.

**Definition of Done:**
- [ ] All ACs above check out
- [ ] Committed with conventional commit message
