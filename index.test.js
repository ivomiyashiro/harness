import test from "node:test"
import assert from "node:assert/strict"

import HarnessPlugin from "./index.js"

test("preserves the provider-qualified model for configured agents", async () => {
  const plugin = await HarnessPlugin({}, {
    models: { explorer: "openai/gpt-5.6-luna" },
  })
  const config = {}

  plugin.config(config)

  assert.equal(config.agent.explorer.model, "openai/gpt-5.6-luna")
})

test("AC-10 agents can inspect freely while observe-only roles retain edit denial", async () => {
  const plugin = await HarnessPlugin({})
  const config = {}

  plugin.config(config)

  for (const name of ["explorer", "judge-a", "judge-b", "verifier", "fixer", "implementer"]) {
    assert.equal(config.agent[name].permission.read, "allow")
    assert.equal(config.agent[name].permission.glob, "allow")
    assert.equal(config.agent[name].permission.grep, "allow")
    assert.equal(config.agent[name].permission.bash, "allow")
  }

  for (const name of ["explorer", "judge-a", "judge-b", "verifier"]) {
    assert.equal(config.agent[name].permission.edit, "deny")
  }
})

test("AC-10 observe-only agent instructions permit direct targeted inspection", async () => {
  const { readFile } = await import("node:fs/promises")
  for (const name of ["explorer", "judge-a", "judge-b", "verifier"]) {
    const instructions = await readFile(new URL(`./agents/${name}.md`, import.meta.url), "utf8")
    assert.doesNotMatch(instructions, /harness-observe\.js/)
  }
})

test("command templates never interpolate raw arguments into shell text", async () => {
  const plugin = await HarnessPlugin({})
  const config = {}
  plugin.config(config)

  for (const name of ["harness:go", "harness:epic", "harness:status"]) {
    assert.doesNotMatch(config.command[name].template, /\$ARGUMENTS/)
    assert.match(config.command[name].template, /node "[^"]+\/scripts\/harness-input\.js"/)
    assert.match(config.command[name].template, /"\$1"/)
    assert.doesNotMatch(config.command[name].template, /__HARNESS_ROOT__|node scripts\/harness-input\.js/)
  }
})
