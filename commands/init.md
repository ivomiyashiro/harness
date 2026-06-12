---
description: One-time project setup — draft docs/conventions.md from a codebase scan
---

One-time per project. Produces `docs/conventions.md` — the architecture contract every implementer, fixer, and judge reads.

## Steps

1. If `docs/conventions.md` exists, show it and ask whether to regenerate or stop.
2. Dispatch the `explorer` agent: "Scan this codebase and report, caveman style, per section: folder structure (top 2 levels + purpose), layering (what calls what), error handling pattern (+ one exemplar file path), naming conventions, key libraries and what each is used for, test setup (runner, location, style)." For large repos, dispatch one explorer per section in parallel.
3. Draft `docs/conventions.md` from the reports. Section list:
   - **Folder structure** — where things live
   - **Layers** — allowed dependencies between them
   - **Error handling** — the pattern + exemplar file path
   - **Naming** — files, types, functions
   - **Libraries** — what to use for what (and what NOT to add)
   - **Testing** — runner, file placement, style
   - **Stack skills** — optional list of skill names agents should load (e.g. personal stack skills)
   Each rule must be citable: short, concrete, with an exemplar file path where one exists.
4. Present the draft to the user for approval/edits. Write ONLY the approved version.
5. If the repo is greenfield (nothing to scan), interview the user briefly (one question at a time) for the intended conventions instead.

## Rules

- You never read source code yourself — the explorer does (orchestrator golden rule).
- Keep conventions.md ≤ ~60 lines: it ships in every implementer/judge prompt, so every line costs tokens forever.
