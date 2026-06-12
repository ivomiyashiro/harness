# Task 4: Judge Loop

**Goal:** Create the dual blind judge agents (`judge-a`, `judge-b`), the `fixer` agent, and the `judge` phase skill that synthesizes verdicts. Completing this task (with T3) enables `lite` mode end-to-end.

**Type:** AFK

**Files:**
- Create: `agents/judge-a.md`
- Create: `agents/judge-b.md`
- Create: `agents/fixer.md`
- Create: `skills/judge/SKILL.md`

**Task Type:** Documentation (prompt artifacts)

**Skills & Rules:**
- `skill-creator` — Rule: valid frontmatter; judges get read-only tools, fixer gets edit tools.
- `judgment-day` (installed skill) — Rule: mine its blind-dual-review protocol for phrasing, but the harness version differs: judges receive spec + diff + conventions ONLY (never the plan), and verdict synthesis lives in the skill, not a separate orchestrator doc.

**Visual Reference:** None.

**Blocked by:** T1. Parallel with T3 (no shared files).

**Context for the executor:** The judges exist to catch SPEC drift, not plan compliance — that's why they never see the plan (FR-26). Two independent sonnet judges review the same diff blind; only issues BOTH report get auto-fixed by the fixer; disagreements go to the user (FR-27). Judges also police the test budget bidirectionally (FR-28): every `integration`/`e2e`-tagged AC needs its test, and every test needs a tagged AC behind it.

**Review Level:** Strict

## Acceptance criteria
- [ ] `judge-a.md` and `judge-b.md`: `model: sonnet`, read-only tools. Inputs (by path): the spec, the diff (obtained via `rtk git diff <range>`), `docs/conventions.md`. Explicitly forbidden inputs: the plan, task files, the other judge's verdict, chat history (FR-26).
- [ ] Judge prompts require: findings cite a spec AC or a conventions.md rule (citable, not taste); bidirectional test-coverage check — missing test for `integration`/`e2e`-tagged AC = finding; test tracing to no AC = over-testing finding (FR-28); verdict in caveman format: numbered findings, each one line + citation.
- [ ] `fixer.md`: `model: sonnet`, edit tools. Applies ONLY the confirmed-issues list it receives; touches nothing else; one commit `fix: apply judge findings`; rtk commands; caveman report.
- [ ] `skills/judge/SKILL.md`: launch both judges in parallel with identical inputs; synthesize — both report it → fixer queue; only one reports it → surface to user, never resolve silently (FR-27); after fixes, re-judge ONLY touched code; repeated drift findings appended to `docs/learnings.md` (FR-26); `lite` mode uses a single judge.
- [ ] State file updated with `judges:` verdict summary before phase advance (FR-3, FR-11).

**Steps:**

- [ ] **Step 1: Write `agents/judge-a.md`** — frontmatter + body per ACs above: input list, forbidden list, citation requirement, bidirectional coverage check, caveman verdict format with example.

- [ ] **Step 2: Write `agents/judge-b.md`** — same contract as judge-a (duplicate the content; blindness comes from separate launches, not different prompts). A one-line difference is acceptable: instruct judge-b to read the diff bottom-up to decorrelate attention.

- [ ] **Step 3: Write `agents/fixer.md`** — input: confirmed-findings list + the same three file paths judges had. Scope lock: only listed findings. Commit + caveman report.

- [ ] **Step 4: Write `skills/judge/SKILL.md`** — orchestration: parallel launch (single Agent message, two calls), synthesis matrix (both/one/none), fixer dispatch, re-judge scope, learnings append rule, lite-mode single-judge branch, state-file update.

- [ ] **Step 5: Verify and commit** — frontmatter parses; forbidden-inputs list present in both judges; synthesis matrix covers all three outcomes; commit `feat: add judge agents, fixer, and judge skill`.

**Definition of Done:**
- [ ] All ACs above check out
- [ ] Judges' input/forbidden lists match FR-26 verbatim in meaning
- [ ] Committed with conventional commit message
