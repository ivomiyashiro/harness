# Harness

Token-economic multi-agent development pipeline for Claude Code and opencode.

## Install in Claude Code

This repo keeps Claude Code's native plugin layout:

- `.claude-plugin/plugin.json` is the Claude plugin manifest.
- `CLAUDE.md` is the Claude plugin instruction file.
- `commands/`, `agents/`, and `skills/` stay in the Claude-compatible layout.

Install it in Claude Code from this local repo/plugin path as before. The opencode files (`package.json`, `index.js`, `AGENTS.md`) are additive and do not replace the Claude plugin manifest.

## Install in opencode

Use opencode's git-backed plugin install. Add this to the global
opencode config at `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-harness@git+https://github.com/ivomiyashiro/harness.git"]
}
```

If `plugin` already exists, append the Harness entry to the existing array. Do
not create a second `plugin` key; JSON object keys must be unique.

Example with existing plugins preserved:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "existing-plugin",
    "opencode-harness@git+https://github.com/ivomiyashiro/harness.git"
  ]
}
```

For local development from this repo, point opencode at this repo instead of a
git:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["file:///C:/Users/Ivan/source/repos/harness/index.js"]
}
```

To run Harness phases on non-Claude models, pass plugin options. The keys are Harness agent names, not opencode built-ins:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "opencode-harness@git+https://github.com/ivomiyashiro/harness.git",
      {
        "defaultModel": "openai/gpt-5.6-terra",
        "models": {
          "explorer": "openai/gpt-5.6-luna",
          "planner": "openai/gpt-5.6-terra",
          "implementer": "openai/gpt-5.6-sol",
          "judge-a": "openai/gpt-5.6-terra",
          "judge-b": "openai/gpt-5.6-terra",
          "fixer": "openai/gpt-5.6-sol",
          "visual": "openai/gpt-5.6-terra",
          "verifier": "openai/gpt-5.6-luna"
        }
      }
    ]
  ]
}
```

If `models` is omitted, opencode uses its current session/default model for Harness agents. Frontmatter aliases like `sonnet` and `haiku` are treated as documentation only unless replaced with provider-qualified model IDs such as `anthropic/claude-sonnet-4-6`.

Restart opencode after changing plugin config.

After restart, check that these commands appear in opencode:

- `/harness:init`
- `/harness:go`
- `/harness:doctor`
- `/harness:status`
- `/harness:epic`

For LLM installers: preserve all existing config fields, edit only the
`plugin` array, and validate that `opencode.json` remains valid JSON. Use the
git-backed plugin spec `opencode-harness@git+https://github.com/ivomiyashiro/harness.git`.

## Commands

- `/harness:go <feature>` starts or resumes a pipeline. New work auto-detects `hotfix`, `lite`, `full`, or `epic` unless the user explicitly names a mode.
- `/harness:init` creates project conventions.
- `/harness:doctor [--fix]` validates Harness state/config and optionally applies safe fixes.
- `/harness:status [feature]` reports active work.
- `/harness:epic <name>` decomposes oversized initiatives.

The opencode plugin registers the repo's `commands/`, `agents/`, and `skills/` resources at startup. Harness dispatches its own opencode subagents (`explorer`, `planner`, `implementer`, `judge-a`, `judge-b`, `fixer`, `visual`, `verifier`) for each phase; it does not rely on Claude Code agents.

Skills orchestrate phases and pipeline state; agents execute bounded work. Implementers commit persistent unit, integration, and e2e tests from the plan. After judge, the `verify` skill dispatches the observe-only `verifier` for a real web, API, or mobile happy-path smoke. Human testing is requested only for acceptance criteria explicitly tagged `[manual]`.

Recommended model tiers: `openai/gpt-5.6-sol` for implementation/fixing, `openai/gpt-5.6-terra` for planning/review/visual work, and `openai/gpt-5.6-luna` for cheap exploration/verification.
