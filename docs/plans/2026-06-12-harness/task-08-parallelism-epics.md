# Task 8: Parallelism & Epics

**Goal:** Create the `/harness:epic` command, the `_active.md` overlap-check protocol, and the worktree-per-spec protocol.

**Type:** AFK

**Files:**
- Create: `commands/epic.md`
- Modify: `skills/write-plan/SKILL.md` (flesh out the overlap check stub from T5)
- Modify: `commands/go.md` (add worktree protocol section)
- Modify: `docs/formats.md` (add `docs/state/epic-<name>.md` format)

**Task Type:** Documentation (prompt artifacts)

**Skills & Rules:**
- `skill-creator` — Rule: valid frontmatter.
- `ivos-skills:using-git-worktrees` — Rule: mine its isolation patterns; harness rule is one spec = one worktree = one branch = one session.
- `chained-pr` (installed skill) — Rule: mine the chained-PR mechanics for epic delivery (one PR per sub-spec, dependency order).

**Visual Reference:** None.

**Blocked by:** T5 (modifies `write-plan` and the epic flow brainstorm hands off to). Parallel with T9 (T9 touches `docs/formats.md` telemetry section and `skills/implement/`; coordinate: T8 adds a NEW section to formats.md, T9 edits the state-file section — different sections, but if run in parallel, executors must append, not rewrite, formats.md).

**Context for the executor:** Parallel feature work happens as multiple terminal sessions, each in its own worktree+branch with self-contained state (FR-31). Conflicts are prevented up front: at plan time, the plan's declared file globs are checked against `docs/state/_active.md` on main (FR-32). Epics decompose into sub-specs, each running its own `full` pipeline; independent sub-specs may run in parallel worktrees; delivery is chained PRs in dependency order (FR-33).

**Review Level:** Strict

## Acceptance criteria
- [ ] `commands/epic.md`: runs the epic decomposition brainstorm directly — output is `docs/state/epic-<name>.md` with sub-spec list + dependency order, NO detailed design (FR-18); for each sub-spec, instructs launching its own `full` pipeline via `/harness:go <sub-feature>` in its own worktree; independent sub-specs flagged as parallel-safe; delivery: one PR per sub-spec, chained in dependency order (FR-33).
- [ ] `write-plan` skill modification: after planner returns, read `docs/state/_active.md` from main (`rtk git show main:docs/state/_active.md` when in a worktree); compare declared globs; overlap → warn the user with the conflicting feature + globs, ask sequence-or-proceed BEFORE implement (FR-32); no overlap → register this feature's line in `_active.md` on main.
- [ ] `go.md` modification: new feature in `full`/`epic` mode → create worktree + branch (`rtk git worktree add`), state lives in the branch (FR-31); resume detects it is already in the right worktree.
- [ ] `docs/formats.md` addition: epic state format — caveman list of sub-specs with `name | depends-on | status` lines, one example.

**Steps:**

- [ ] **Step 1: Add epic format to `docs/formats.md`** (append a new section; do not touch existing sections).

- [ ] **Step 2: Write `commands/epic.md`** per its AC.

- [ ] **Step 3: Modify `skills/write-plan/SKILL.md`** — replace the T5 overlap-check stub with the full protocol per its AC.

- [ ] **Step 4: Modify `commands/go.md`** — add the worktree section per its AC.

- [ ] **Step 5: Verify and commit** — frontmatter parses; `_active.md` read/write paths consistent (registry lives on main, features register at plan approval, deregister at finish — cross-check the T6 iterate skill's finish protocol mentions deregistration); commit `feat: add epic command, overlap check, and worktree protocol`.

**Definition of Done:**
- [ ] All ACs above check out
- [ ] formats.md changes are append-only
- [ ] Committed with conventional commit message
