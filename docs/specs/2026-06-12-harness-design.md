# Harness — Token-Economic Multi-Agent Development Pipeline

Self-contained Claude Code plugin implementing the pipeline: brainstorm → spec → plan → implement (TDD) → judge → manual test → iterate/finish. Replaces gentle-ai. Design priorities, in order: (1) token economy, (2) implementation speed, (3) built-matches-specified.

## 1. Problem / Opportunity

Working with Claude Code on real projects burns tokens on context that doesn't need to exist (verbose tool output, code in the orchestrator thread, re-explained state) and produces implementations misaligned with intent (ambiguous specs, HTML mocks that don't translate to Flutter, reviews that validate the plan instead of the spec). gentle-ai proves the multi-agent + persistent-artifact concept but carries a huge fixed instruction cost and isn't this pipeline. The harness is a self-contained plugin with token economy as a first-class design constraint.

## 2. Functional Requirements

### Pipeline & modes

- FR-1: `/harness:go <feature>` starts or resumes a pipeline; it reads `docs/state/<feature>.md` and continues from the recorded phase.
- FR-2: The pipeline has 4 modes, recommended by the orchestrator and confirmed by the user at start:
  - `hotfix`: implement + regression test → done
  - `lite`: implement-tdd → single judge → done (one-line spec in the state file)
  - `full`: brainstorm → spec → plan → implement-tdd → dual judge → manual-test → iterate/finish
  - `epic`: decomposition brainstorm → N sub-specs, each running its own `full` pipeline
- FR-3: Phase order in `full` mode is enforced; each phase gate writes the state file BEFORE advancing.

### Orchestration & agents

- FR-4: The main thread acts as thin orchestrator: dialogues with the user, dispatches subagents, reads ONLY state files — never source code.
- FR-5: Agent definitions (plugin `agents/`) with fixed model assignment:
  - `explorer` (haiku) — codebase questions, brainstorm self-answers
  - `planner` (sonnet) — writes plan + task files from the spec
  - `implementer` (session model) — TDD for ONE task, fresh context
  - `judge-a`, `judge-b` (sonnet) — blind independent review
  - `fixer` (sonnet) — applies only confirmed issues
  - `verifier` (haiku) — runs the app, checks happy path
  - `visual` (session model) — isolated visual mock iteration
- FR-6: Agents hand off by file path, never content. Subagents report in ultra-brief caveman format (e.g. `task 3: 4 tests green, 2 files`).
- FR-7: All agent definitions bake in `rtk`-prefixed commands for tests, git, builds, and dev servers (e.g. `rtk vitest run`, `rtk git diff`).

### Artifacts (per target repo)

- FR-8: `docs/specs/<feature>.md` — lean format: zero filler prose, but ACs in full Given/When/Then (human-approved contract; precision over brevity).
- FR-9: Every AC carries a test-level tag: `unit | integration | e2e | manual`. The spec skill recommends tags using baked-in criteria: `e2e` only for critical user journeys (money, auth, data loss); `integration` only where a real boundary is crossed that mocks would hide (real DB, external API, cross-screen navigation); `manual` for UX/feel; `unit` otherwise. Spec approval = test-budget approval.
- FR-10: `docs/plans/<feature>/plan.md` + `task-NN.md` — caveman structured: `goal / files / tests / done-when` bullets, plus a `pattern:` line pointing to the codebase exemplar file the task must mirror (example-driven beats rule-driven). For novel code with no precedent, the exemplar is chosen at spec phase.
- FR-11: `docs/state/<feature>.md` — full caveman: phase, tasks done/next, judge verdicts, checklist status, token telemetry.
- FR-12: `docs/learnings.md` — one caveman line per project gotcha; agents read it at start, orchestrator appends on surprises.
- FR-13: `docs/state/_active.md` (on main) — registry of active features and the file globs each will touch.
- FR-14: `docs/mocks/` — approved visual mocks in the TARGET stack (HTML for web, Flutter widget files for mobile).
- FR-15: `docs/conventions.md` — per-project architecture contract created once via `/harness:init`: explorer scans the codebase, drafts detected patterns (folder structure, layers, error handling, naming, library usage), user approves/edits. May reference existing stack skills to load. Read by every implementer, fixer, and judge.

### Brainstorm + grill

- FR-16: Brainstorm runs in the main thread, one question at a time, each with a recommendation. Grill mode walks the design decision tree branch-by-branch once the shape exists.
- FR-17: Any question answerable from the codebase is dispatched to `explorer` and self-answered — never asked to the user.
- FR-18: If scope spans multiple independent subsystems, brainstorm switches to epic decomposition: produce sub-spec list + dependency order in `docs/state/epic-<name>.md`, no detailed design at epic level.

### Visual sub-phase (features with UI)

- FR-19: Mocks are built in the target stack: web → static HTML (visual companion in browser); Flutter → real widget with hardcoded data rendered via widget previews/emulator.
- FR-20: Visual iteration runs in the isolated `visual` subagent; screenshots/mock code never enter the main thread. The user is the eye of the loop (feedback in text); the agent ingests screenshots only for final self-verification (~2-4 per screen) or when lost.
- FR-21: First visual feature establishes a design-tokens contract file (colors, typography, spacing); all mocks may only use tokens.
- FR-22: Approved Flutter mock widgets are the starting point of implementation (logic/data get wired in), not throwaways. Mock approval is a hard gate.

### Implement (TDD)

- FR-23: One `implementer` per task, fresh context. Its prompt inputs are exactly: its task file (with `pattern:` exemplar), the relevant spec section, `docs/conventions.md`, and `docs/learnings.md`. Nothing else. Strict TDD: red → green → refactor.
- FR-24: Each task closes with one atomic work-unit commit (rollback = targeted revert).
- FR-25: Integration/e2e tests are generated as final plan tasks, exclusively from ACs tagged `integration`/`e2e`. No test may exist without a tagged AC behind it. `lite`/`hotfix` modes require only the bug's regression test.

### Judge

- FR-26: Judges A and B review blind (no access to each other's verdict) and receive ONLY the spec + the diff + `docs/conventions.md` — never the plan or history — to catch spec drift. Contract deviations are citable findings, not taste. Repeated drift findings get appended to `docs/learnings.md`.
- FR-27: Orchestrator synthesizes: issues confirmed by both → `fixer` applies; disagreements → surfaced to the user, never resolved silently. Re-judge covers only touched code.
- FR-28: Judges verify test coverage in BOTH directions: an AC tagged `integration`/`e2e` without its test is a finding; a test that traces to no AC is an over-testing finding (anti-slop enforcement).

### Manual test

- FR-29: `verifier` runs the app and validates the obvious (boots, happy path). Then the harness generates a human checklist from the ACs tagged `manual` (automated levels are already covered). User OK is the gate.

### Iterate / finish

- FR-30: User feedback routes back to the CORRECT phase (spec bug → spec; impl bug → implement), not always to implement. Finish: state → `done`, final commit.

### Parallelism & epics

- FR-31: One spec = one worktree = one branch = one Claude session. Feature state lives in its branch, self-contained. Parallelism = multiple terminal sessions.
- FR-32: At plan time, declared file globs are checked against `_active.md`; overlap with another active feature triggers a warning and a sequence-or-proceed decision BEFORE implementation.
- FR-33: Epic sub-specs without mutual dependencies may run in parallel worktrees; delivery is chained PRs, one per sub-spec, in dependency order.

### Telemetry & resilience

- FR-34: Per-phase approximate token usage (from Agent tool results) is recorded caveman-style in the state file (`tokens: explore 2k | implement 45k | judge 18k`).
- FR-35: Subagent failure → orchestrator reports the raw error; no blind retries. Session death/compaction → `/harness:go <feature>` resumes from state file.

### Migration & cleanup (final stage, after dogfood passes)

- FR-36: Uninstall gentle-ai: run `gentle-ai uninstall` (removes managed files: orchestrator protocol, SDD skills, skill registry, `.atl/`), then remove the scoop package. Remove leftover `.atl/` directories from active repos.
- FR-37: Remove the engram plugin (MCP server + memory protocol). Before removal, export any engram observations worth keeping into the relevant project's `docs/learnings.md` (caveman, one line each).
- FR-38: Trim global `~/.claude/CLAUDE.md` to a minimal file. Keep: RTK command guide, core rules (verification, response length, no AI attribution in commits), persona (Gentleman: scope, language, tone, behavior). Remove: Engram protocol, Agent Teams orchestrator instructions, SDD workflow + dispatcher + guards, model assignment tables, sub-agent launch protocols, contextual skill-loading mandates — all superseded by the harness plugin's own (short) CLAUDE.md.
- FR-39: Uninstall the ivos-skills plugin — its workflow skills (brainstorming, writing-plans, TDD, subagent-driven-development, etc.) are superseded by harness phase skills and would create duplicate skill-trigger noise. Before removal, port any stack skills still wanted (e.g. `hono-bun-api`, Flutter skills, `react-best-practices`) to standalone personal skills referenced from project `docs/conventions.md`.
- FR-40: Cleanup runs ONLY after the dogfood test (build stage 8) passes — ivos-skills' writing-plans/TDD skills and engram are the scaffolding used to build the harness itself. Removing them earlier saws off the branch we sit on.

## 3. Acceptance Criteria (representative)

- AC-1 (FR-1/35): Given a feature with state `phase: implement, done: 1,2`, when `/harness:go <feature>` runs in a new session, then it dispatches task 3 without re-asking anything answered before. [manual]
- AC-2 (FR-4): Given any `full` pipeline run, when inspecting the main-thread transcript, then no source-code file contents appear in it. [manual]
- AC-3 (FR-26): Given an implementation that follows the plan but violates a spec AC, when judges review, then the violation is reported (plan compliance is irrelevant to them). [manual]
- AC-4 (FR-2): Given a one-line bug fix request, when the orchestrator triages, then it recommends `lite` or `hotfix`, not `full`. [manual]
- AC-5 (FR-19/22): Given an approved Flutter mock, when implementation starts, then the implementer's task file references the mock widget file as the base component. [manual]
- AC-6 (FR-32): Given feature-b active touching `src/auth/*`, when feature-c's plan declares `src/auth/login.ts`, then the user is warned before implement starts. [manual]
- AC-7 (FR-6): Given any subagent completion, when it reports to the orchestrator, then the report is ≤ ~3 lines, no code. [manual]
- AC-8 (FR-9/28): Given a spec where AC-X is tagged `e2e` and the diff contains a test tracing to no AC, when judges review, then the missing AC-X test AND the orphan test are both reported as findings. [manual]

Note: all ACs are tagged `manual` because the deliverable is a plugin (markdown skills/agents) — its behavior is verified by dogfooding, not by an automated test suite.

## 4. Plugin Inventory

Plugin name: `harness`. No hooks in v1 (deliberate: fixed cost; rtk/telemetry baked into agent prompts; revisit with dogfood data).

User commands:

| Command | Purpose |
| --- | --- |
| `/harness:init` | One-time per project: scan codebase, draft `docs/conventions.md`, user approves |
| `/harness:go <feature>` | Start or resume pipeline (reads state file; else triages mode hotfix/lite/full/epic) |
| `/harness:status [feature]` | Report active features, phases, pending items from state files |
| `/harness:epic <name>` | Direct epic decomposition (also auto-detected in brainstorm) |

Internal phase skills (loaded by orchestrator per phase): `brainstorm` (grill mode), `spec` (ACs + test-level tags), `write-plan`, `implement`, `judge`, `manual-test`, `iterate`, `visual-mock`.

Agents (`agents/`, fixed model): `explorer` (haiku), `planner` (sonnet), `implementer` (session model), `judge-a`/`judge-b` (sonnet), `fixer` (sonnet), `verifier` (haiku), `visual` (session model).

Plugin CLAUDE.md: short — artifact paths, "paths not content" golden rule, caveman report format.

## 5. Constraints & Non-Functional Requirements

- Plugin-only: no runtime binary; everything is skills, agents, and plugin CLAUDE.md.
- The plugin's own CLAUDE.md must be SHORT (replaces gentle-ai's giant one; the savings start there).
- All plugin artifacts (skills, agents, docs) in English.
- Specs prioritize precision over brevity; state/tasks/handoffs prioritize brevity (caveman).
- Headroom MCP is NOT part of the design (fixed cost; rtk filters at the source instead).

## 6. Out of Scope

- Cross-project memory (learnings.md is per-project; engram replacement not attempted).
- CI/CD integration, GitHub automation beyond chained PRs.
- Support for agents other than Claude Code.

## 7. Dependencies

- Claude Code plugin system (skills, agents/).
- `rtk` CLI installed (already on PATH).
- Git worktrees; Flutter toolchain + emulators for the mobile visual phase.
- ivos-skills NOT a dependency (self-contained by decision).

## 8. Risks & Mitigations

- Agents ignore caveman/rtk instructions → bake into agent definition prompts, not suggestions; dogfood test verifies (AC-7).
- Spec too lean → ambiguity → iteration waste → ACs always full Given/When/Then; judge phase catches drift early.
- Visual loop token blowout → isolation + user-as-eye + screenshot budget (~2-4/screen) + design tokens amortization.
- State file corruption/staleness → state written before every transition; single writer (orchestrator).
- Parallel worktree merge conflicts → `_active.md` overlap check at plan time.
- AI-generated valueless tests → AC test-level tags as test budget + bidirectional coverage check by judges (FR-28).

## 9. Build Order

Each stage usable on its own, dogfooding from the start:

1. Scaffold: plugin structure (`.claude-plugin/plugin.json`, `skills/`, `agents/`, plugin CLAUDE.md), state-file format, `/harness:go` orchestrator with mode triage + resume, `/harness:init`.
2. Core loop: `implement` skill + `implementer` agent (TDD, rtk, work-unit commits, caveman reports) + `judge` skill (dual blind + fixer) → enables `lite` mode.
3. Planning layer: `brainstorm` (grill mode, explorer self-answers, epic detection), `spec` (template + test tags), `write-plan` (planner agent) → enables `full` mode.
4. Manual test + iterate: verifier agent, AC-derived checklist, feedback routing.
5. Visual sub-phase: visual agent, companion (web), Flutter preview/emulator flow, design tokens, mocks gate.
6. Parallelism & epics: worktree handling, `_active.md` registry + overlap check, epic decomposition + chained PRs.
7. Telemetry & learnings: token logging per phase, learnings.md protocol.
8. Dogfood test: run the full pipeline on a small sample feature; verify ACs 1-8; tune agent prompts with real token numbers.
9. Migration & cleanup (FR-36..40): uninstall gentle-ai, remove engram (after exporting learnings), trim global CLAUDE.md to minimal (rtk + rules + persona), uninstall ivos-skills (after porting wanted stack skills). Gate: stage 8 passed.
