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

test("restricts observe-only agents to explicit Bash allowlists", async () => {
  const plugin = await HarnessPlugin({})
  const config = {}

  plugin.config(config)

  for (const name of ["explorer", "judge-a", "judge-b", "verifier"]) {
    assert.equal(config.agent[name].permission.edit, "deny")
    assert.equal(config.agent[name].permission.bash["*"], "deny")
    assert.equal(config.agent[name].permission.bash["rm *"], undefined)
    assert.equal(config.agent[name].permission.bash["git commit *"], undefined)
  }

  assert.equal(config.agent.explorer.permission.bash["git log *"], "allow")
  assert.equal(config.agent["judge-a"].permission.bash["git diff *"], "allow")
  for (const command of ["npm run *", "pnpm run *", "yarn run *", "bun run *", "rtk npm run *"]) {
    assert.equal(config.agent.verifier.permission.bash[command], undefined)
  }
  assert.equal(config.agent.verifier.permission.bash["node --test *"], "allow")
  assert.equal(config.agent.verifier.permission.bash["node *"], undefined)
  assert.equal(config.agent.verifier.permission.bash["node -e *"], undefined)
  assert.equal(config.agent.verifier.permission.bash["rtk node *"], undefined)
})

test("command templates never interpolate raw arguments into shell text", async () => {
  const plugin = await HarnessPlugin({})
  const config = {}
  plugin.config(config)

  for (const name of ["harness:go", "harness:epic", "harness:status"]) {
    assert.doesNotMatch(config.command[name].template, /\$ARGUMENTS/)
  }
})
