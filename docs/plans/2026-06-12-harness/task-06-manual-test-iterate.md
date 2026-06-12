# Task 6: Manual Test + Iterate

**Goal:** Create the `verifier` agent and the `manual-test` + `iterate` phase skills — the back half of `full` mode (human gate + feedback routing + finish).

**Type:** AFK

**Files:**
- Create: `agents/verifier.md`
- Create: `skills/manual-test/SKILL.md`
- Create: `skills/iterate/SKILL.md`

**Task Type:** Documentation (prompt artifacts)

**Skills & Rules:**
- `skill-creator` — Rule: valid frontmatter; verifier is read+run, not edit.
- `verify` (installed skill) — Rule: mine its run-the-app-and-observe patterns for the verifier body (launch per project type, happy-path observation).

**Visual Reference:** None.

**Blocked by:** T4 (full mode must reach the judge phase before manual test makes sense). Parallel with T7 (no shared files).

**Context for the executor:** After judging, a cheap haiku `verifier` boots the app and checks the obvious so the human never wastes time on a broken build (FR-29). Then the orchestrator generates a human checklist from ONLY the `manual`-tagged ACs (automated levels are already covered by tests). The iterate skill closes the loop: user feedback is routed to the phase that owns the defect, not blindly to implement (FR-30).

**Review Level:** Strict

## Acceptance criteria
- [ ] `agents/verifier.md`: `model: haiku`; runs the app with rtk-prefixed commands, validates boot + happy path only; NO fixes, no edits; caveman report (`boots: yes | happy path: ok | smell: <one-liner>`).
- [ ] `skills/manual-test/SKILL.md`: dispatch verifier first; on pass, generate the human checklist exclusively from ACs tagged `[manual]` in the spec — one checkbox per AC, phrased as a user action + expected result (FR-29); user OK is the gate; checklist status recorded in the state file.
- [ ] `skills/iterate/SKILL.md`: feedback routing table — wrong requirement/missing behavior in spec → spec phase; design/plan structure wrong → write-plan; code defect → implement (new task + re-judge touched code); visual mismatch → visual-mock (FR-30). Finish path: all gates passed → state `phase: done`, final commit, remove feature from `_active.md`.
- [ ] Every transition writes the state file BEFORE advancing (FR-3).

**Steps:**

- [ ] **Step 1: Write `agents/verifier.md`** — frontmatter + body: detect how to run the app (dev-server script, flutter run, etc.), rtk prefix, observe-only mandate, caveman report template.

- [ ] **Step 2: Write `skills/manual-test/SKILL.md`** — verifier dispatch → checklist generation rule (only `[manual]` tags; never invent items beyond the ACs) → present to user → record outcome in state file.

- [ ] **Step 3: Write `skills/iterate/SKILL.md`** — the routing table per its AC, plus the finish protocol (state done, final commit, `_active.md` cleanup).

- [ ] **Step 4: Verify and commit** — frontmatter parses; routing table covers all four destinations; checklist rule references `[manual]` tags only; commit `feat: add verifier agent, manual-test and iterate skills`.

**Definition of Done:**
- [ ] All ACs above check out
- [ ] Committed with conventional commit message
