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
