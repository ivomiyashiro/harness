# Task 10: Dogfood Test

**Goal:** Install the plugin locally, run the full pipeline on a real sample feature in a scratch repo, verify spec ACs 1–8, and tune agent prompts with real token numbers.

**Type:** HITL (the user is the eye on transcripts, checklists, and mode triage quality)

**Files:**
- Modify: any plugin file that dogfooding proves wrong (prompt tuning)
- Create (scratch repo, not committed here): a small sample project + sample feature

**Task Type:** Verification + Refactor (prompt tuning)

**Skills & Rules:**
- `ivos-skills:testing-skills` — Rule: test discipline-enforcing prompts under pressure; agents WILL rationalize around soft instructions — verify the hard rules (caveman, rtk, input diets) hold in real runs.
- `ivos-skills:test-driven-development` — applies to the sample feature's implementation inside the dogfood run.

**Visual Reference:** None (unless the sample feature has UI — then the visual sub-phase itself is under test, AC-5).

**Blocked by:** T1–T9 (entire plugin must exist).

**Context for the executor:** The plugin's ACs are all `[manual]` by design — a pile of markdown prompts can only be validated by running them. This stage produces the evidence that gates T11 (cleanup): FR-40 forbids removing ivos-skills/engram/gentle-ai until dogfood passes.

**Review Level:** Strict (user-driven)

## Acceptance criteria (maps 1:1 to spec ACs)
- [ ] AC-1: kill the session mid-implement; `/harness:go <feature>` in a new session resumes at the correct task without re-asking.
- [ ] AC-2: main-thread transcript contains no source-code file contents.
- [ ] AC-3: plant a deliberate spec violation that the plan permits; at least one judge reports it.
- [ ] AC-4: ask for a one-line bug fix; triage recommends `lite` or `hotfix`.
- [ ] AC-5 (if UI sample): approved mock file is referenced as the implementation base in the task file.
- [ ] AC-6: simulate two features with overlapping globs; the warning fires before implement.
- [ ] AC-7: every subagent report in the run is ≤ ~3 lines, no code.
- [ ] AC-8: plant an orphan test + omit a tagged AC's test; judges report both directions.
- [ ] Token telemetry recorded per phase; numbers reviewed and prompt sizes tuned where a phase is disproportionate.

## Steps

- [ ] **Step 1: Install** — add the plugin from the local path (`/plugin` marketplace add local dir or `--plugin-dir C:\Users\Ivan\source\repos\harness`). Confirm `/harness:go`, `/harness:init`, `/harness:status`, `/harness:epic` appear.
- [ ] **Step 2: Scratch repo** — create a tiny project (suggested: a small TS utility or API endpoint; add a trivial UI screen if testing AC-5). Run `/harness:init` → conventions.md approved.
- [ ] **Step 3: Full run** — `/harness:go sample-feature` in `full` mode end-to-end, including the planted defects for AC-3/AC-8 and the mid-run session kill for AC-1.
- [ ] **Step 4: Targeted runs** — lite/hotfix triage (AC-4), overlap simulation (AC-6).
- [ ] **Step 5: Tune** — for every AC failure: identify the prompt file at fault, fix, re-run the failing scenario only. Record gotchas in this repo's `docs/learnings.md`.
- [ ] **Step 6: Record + commit** — write results (pass/fail per AC + token numbers) to `docs/state/dogfood.md` in this repo; commit `test: dogfood results and prompt tuning`.

**Definition of Done:**
- [ ] All 8 ACs pass (AC-5 may be deferred with explicit user sign-off if no UI sample was built — note it in dogfood.md)
- [ ] Telemetry numbers captured
- [ ] User explicitly declares dogfood passed (this unlocks T11)
