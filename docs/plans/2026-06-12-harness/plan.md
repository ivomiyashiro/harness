# Implementation Plan: Harness Plugin

Spec: `docs/specs/2026-06-12-harness-design.md`
Deliverable: a self-contained Claude Code plugin (`harness`) — this repo IS the plugin. All artifacts are markdown (commands, agents, skills, plugin CLAUDE.md). No runtime binary.

## Macro Plan

| # | Name | Goal | File | Prereq | Parallel with | Type |
|---|------|------|------|--------|---------------|------|
| T1 | Plugin scaffold | Plugin manifest, directory layout, plugin CLAUDE.md, artifact-format reference | `task-01-scaffold.md` | None | None | AFK |
| T2 | Orchestrator commands | `/harness:go`, `/harness:init`, `/harness:status` + `explorer` agent | `task-02-orchestrator-commands.md` | T1 | None | AFK |
| T3 | Implement loop | `implementer` agent + `implement` phase skill (TDD, rtk, work-unit commits) | `task-03-implement-loop.md` | T1 | T4 | AFK |
| T4 | Judge loop | `judge-a`/`judge-b`/`fixer` agents + `judge` phase skill (blind dual review) | `task-04-judge-loop.md` | T1 | T3 | AFK |
| T5 | Planning layer | `brainstorm`/`spec`/`write-plan` phase skills + `planner` agent | `task-05-planning-layer.md` | T2 | None | AFK |
| T6 | Manual test + iterate | `verifier` agent + `manual-test`/`iterate` phase skills | `task-06-manual-test-iterate.md` | T4 | T7 | AFK |
| T7 | Visual sub-phase | `visual` agent + `visual-mock` phase skill (native-stack mocks, design tokens) | `task-07-visual-subphase.md` | T5 | T6 | AFK |
| T8 | Parallelism & epics | `/harness:epic` command, `_active.md` overlap check, worktree protocol | `task-08-parallelism-epics.md` | T5 | T9 | AFK |
| T9 | Telemetry & learnings | Token logging protocol + `learnings.md` protocol | `task-09-telemetry-learnings.md` | T3 | T8 | AFK |
| T10 | Dogfood test | Install plugin locally, run full pipeline on a sample feature, verify AC-1..AC-8 | `task-10-dogfood.md` | T1–T9 | None | HITL |
| T11 | Migration & cleanup | Uninstall gentle-ai + engram + ivos-skills, trim global CLAUDE.md | `task-11-migration-cleanup.md` | T10 | None | HITL |

## Required Skills

- `skill-creator` — LLM-first skill authoring with valid frontmatter (all phase skills)
- `ivos-skills:writing-skills` — skill quality patterns and pressure-testing
- `ivos-skills:skill-cso` — skill descriptions/triggers that load at the right time
- `test-driven-development` — implicit; applies only to T10's sample feature (the plugin itself is markdown, no business logic)

## Execution Notes

- Build order mirrors spec section 9 (stages 1–9). `lite` mode is usable after T4; `full` mode after T6.
- Plugin source layout (repo root): `.claude-plugin/plugin.json`, `commands/`, `agents/`, `skills/`, `CLAUDE.md`.
- Every prompt artifact is in English. Caveman format for state/handoffs; full Given/When/Then for spec ACs.
- T10 and T11 are HITL: T10 needs the user's eyes on transcripts and emulator/browser; T11 destroys tooling the user depends on and is gated on T10 passing (FR-40).

## Scope Change Protocol

Spec/plan changes during execution: trivial → fix inline + note in commit; non-trivial → stop, report, version as `plan-v2.md` / spec `-v2.md`. Never overwrite originals.
