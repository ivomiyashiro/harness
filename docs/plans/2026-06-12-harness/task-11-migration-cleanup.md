# Task 11: Migration & Cleanup

**Goal:** Remove the superseded tooling (gentle-ai, engram, ivos-skills) and trim the global CLAUDE.md, now that the harness replaces them.

**Type:** HITL (destructive, irreversible without backups; user confirms each removal)

**Files:**
- Modify: `~/.claude/CLAUDE.md` (global — trim)
- Delete (external): gentle-ai install + scoop package, engram plugin, ivos-skills plugin, leftover `.atl/` dirs
- Create: ported personal stack skills (paths under `~/.claude/skills/` or as the user prefers)
- Create/Modify: `docs/learnings.md` in relevant projects (engram export target)

**Task Type:** Configuration

**Skills & Rules:**
- `skill-creator` — Rule: ported stack skills keep valid frontmatter and their original author intent; port, don't rewrite.

**Visual Reference:** None.

**Blocked by:** T10 — HARD GATE. FR-40: ivos-skills' workflow skills and engram are the scaffolding that built the harness; removing them before dogfood passes saws off the branch we sit on. Do NOT start this task without the user's explicit "dogfood passed".

**Context for the executor:** This is the payoff stage: the token savings start when the giant fixed instruction cost (gentle-ai orchestrator protocol, SDD workflow, engram protocol, ivos-skills trigger noise) disappears from every session. Order matters — export/port BEFORE uninstalling.

**Review Level:** Strict (user confirms each destructive step)

## Acceptance criteria
- [ ] Engram observations worth keeping are exported to the relevant projects' `docs/learnings.md` (caveman, one line each) BEFORE plugin removal (FR-37).
- [ ] Wanted stack skills (`hono-bun-api`, Flutter skills, `react-best-practices` — user confirms the final list) are ported to standalone personal skills and referenced from project `docs/conventions.md` BEFORE ivos-skills uninstall (FR-39).
- [ ] gentle-ai uninstalled: `gentle-ai uninstall` run, scoop package removed, leftover `.atl/` dirs deleted from active repos (FR-36).
- [ ] Engram plugin (MCP server + memory protocol) removed (FR-37).
- [ ] ivos-skills plugin uninstalled (FR-39).
- [ ] Global `~/.claude/CLAUDE.md` trimmed — KEEP: RTK command guide, core rules (verification, response length, no AI attribution in commits), Gentleman persona (scope, language, tone, behavior). REMOVE: engram protocol, Agent Teams orchestrator, SDD workflow + dispatcher + guards, model assignment tables, sub-agent launch protocols, contextual skill-loading mandates (FR-38). A backup copy of the original is saved before editing.
- [ ] A fresh Claude Code session starts clean: no engram hooks firing, no SDD/orchestrator instructions, harness commands available.

## Steps (order is load-bearing: export → port → uninstall → trim → verify)

- [ ] **Step 1: Export engram** — review observations per project (`mem_search`/timeline or the engram DB), write keepers as caveman lines into each project's `docs/learnings.md`. User approves the keep list.
- [ ] **Step 2: Port stack skills** — user confirms the wanted list; copy each skill to a personal-skill location preserving content; reference them from `docs/conventions.md` in the projects that use them.
- [ ] **Step 3: Uninstall gentle-ai** — `gentle-ai uninstall`, then `scoop uninstall gentle-ai`; sweep active repos for `.atl/` leftovers (including this repo's untracked `.atl/`) and delete.
- [ ] **Step 4: Remove engram plugin** — uninstall via `/plugin`; verify no MCP server or SessionStart hooks remain.
- [ ] **Step 5: Uninstall ivos-skills** — via `/plugin`.
- [ ] **Step 6: Trim global CLAUDE.md** — back up original (e.g. `CLAUDE.md.pre-harness.bak`), rewrite per the keep/remove lists, user reviews the diff before saving.
- [ ] **Step 7: Verify** — start a fresh session: confirm harness commands load, no engram/SDD noise, rtk rules still active. Commit nothing here unless a repo file changed (learnings exports are committed in their own repos).

**Definition of Done:**
- [ ] All ACs above check out, each destructive step explicitly user-confirmed
- [ ] Backup of original global CLAUDE.md exists
- [ ] Fresh-session verification done
