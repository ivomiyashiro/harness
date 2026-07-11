import test from "node:test"
import assert from "node:assert/strict"

import HarnessPlugin from "./index.js"
import { observeCommand } from "./scripts/harness-observe.js"

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
    for (const escape of ["*;*", "*&&*", "*$(*", "*`*"]) {
      assert.equal(config.agent[name].permission.bash[escape], "deny")
    }
    for (const escape of ["*>*", "*<*", "*|*", "* > *", "* < *", "* | *"]) {
      assert.equal(config.agent[name].permission.bash[escape], "deny")
    }
  }

  assert.equal(Object.keys(config.agent.explorer.permission.bash).some((command) => command.endsWith("harness-observe.js git-diff")), true)
  assert.equal(config.agent["judge-a"].permission.bash["git diff *"], undefined)
  for (const command of ["npm run *", "pnpm run *", "yarn run *", "bun run *", "rtk npm run *"]) {
    assert.equal(config.agent.verifier.permission.bash[command], undefined)
  }
  assert.equal(config.agent.verifier.permission.bash["node --test *"], undefined)
  assert.equal(config.agent.verifier.permission.bash["node *"], undefined)
  assert.equal(config.agent.verifier.permission.bash["node -e *"], undefined)
  assert.equal(config.agent.verifier.permission.bash["rtk node *"], undefined)
})

test("AC-10 observation wrapper fixes operations and rejects arguments and shell escapes", () => {
  for (const args of [
    ["git", ["diff", "--output=/tmp/stolen"]],
    ["git", ["log", "--config-env=x=y"]],
    ["git", ["status", "--porcelain", ";touch", "/tmp/pwned"]],
    ["curl-get", ["--output", "/tmp/stolen", "https://example.test"]],
    ["curl-get", ["https://example.test", "--config", "/tmp/config"]],
    ["node-test", ["--test-reporter-destination=/tmp/stolen"]],
  ]) assert.throws(() => observeCommand(args[0], args[1]), /unsafe/)

  for (const value of ["test/fixture.test.js", "../outside.test.js", "|touch", "| touch", ">out", "> out"]) {
    assert.throws(() => observeCommand("node-test", [value]), /unsafe/)
  }
  assert.deepEqual(observeCommand("git-diff", []), ["git", ["diff", "--", "."]])
  assert.deepEqual(observeCommand("node-test", []), ["node", ["--test"]])
})

test("command templates never interpolate raw arguments into shell text", async () => {
  const plugin = await HarnessPlugin({})
  const config = {}
  plugin.config(config)

  for (const name of ["harness:go", "harness:epic", "harness:status"]) {
    assert.doesNotMatch(config.command[name].template, /\$ARGUMENTS/)
  }
})
