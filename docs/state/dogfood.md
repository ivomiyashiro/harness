# Dogfood Run — T10

Scratch repo: `C:\Users\Ivan\source\repos\harness-dogfood` (TS + vitest, 6 tests green, `docs/state/_active.md` pre-seeded with `string-cleanup | feat/string-cleanup | src/string/**` for the AC-6 overlap scenario).

## Launch

```
cd C:\Users\Ivan\source\repos\harness-dogfood
claude --plugin-dir C:\Users\Ivan\source\repos\harness
```

Fallback if commands don't appear: `/plugin` → add marketplace/local path → install `harness`. Confirm `/harness:go`, `/harness:init`, `/harness:status`, `/harness:epic` exist.

## Scenarios

### Run 1 — init + full pipeline (suggested feature: `truncate` — `truncate(input, maxLen)` with word-boundary option, lives in `src/string/`)

- [ ] `/harness:init` → explorer scans, conventions.md drafted, you approve
- [ ] `/harness:go truncate` → triage recommends `full` (or `lite`; if `lite`, accept `full` manually to exercise all phases)
- [ ] Brainstorm: one question at a time, recommendations included; codebase questions self-answered via explorer (never asked to you)
- [ ] Spec: Given/When/Then ACs, tags recommended; approve
- [ ] **AC-6**: plan declares `src/string/**` globs → overlap warning vs seeded `string-cleanup` BEFORE implement. Choose "proceed".
- [ ] **AC-1**: during implement (after task 1 commits), KILL the session. Relaunch, `/harness:go truncate` → resumes at the right task, re-asks nothing.
- [ ] **AC-3/AC-8 sabotage**: after implement, BEFORE judge — hand-edit the code to violate one spec AC, and add one test that traces to no AC. Then let the judge phase run: both the violation and the orphan test must be findings.
- [ ] Judge: confirmed findings → fixer; disagreements surfaced to you
- [ ] Manual-test: verifier boots/runs tests; checklist contains ONLY `[manual]`-tagged ACs
- [ ] Finish: state → done, `_active.md` line removed

### Run 2 — triage check
- [ ] **AC-4**: `/harness:go fix-slugify-emoji` describing a one-line bug → triage recommends `lite` or `hotfix`, NOT `full`

### Transcript checks (during/after Run 1)
- [ ] **AC-2**: main-thread transcript contains NO source-code file contents
- [ ] **AC-7**: every subagent report ≤ ~3 lines, no code
- [ ] Telemetry: `tokens:` line in `docs/state/truncate.md` populated per phase

### AC-5 (visual)
Deferred — no UI in the dogfood sample. Needs explicit sign-off note here, or a second dogfood with a Flutter/web screen.

## Results

(fill per AC: pass/fail + notes + token numbers)

- AC-1:
- AC-2:
- AC-3:
- AC-4:
- AC-6:
- AC-7:
- AC-8:
- AC-5: deferred / run separately
- tokens:
