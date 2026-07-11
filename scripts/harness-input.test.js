import assert from "node:assert/strict"
import test from "node:test"

import { parseCommandArguments, parseFeatureSlug } from "./harness-input.js"

test("accepts a canonical lowercase hyphenated feature slug unchanged", () => {
  assert.equal(parseFeatureSlug("harness-concurrency-security"), "harness-concurrency-security")
})

test("rejects unsafe feature values", () => {
  for (const value of [
    "../feature", "feature/name", " feature", "feature name", "feature;rm", "--fix",
    "feat@{1}", "feature..other", "feature~1", "feature^", "", "feature--part",
    "/tmp/feature", "Feature",
  ]) {
    assert.throws(() => parseFeatureSlug(value), /invalid feature slug/)
  }
})

test("canonicalizes feature arguments for go, epic, and status", () => {
  assert.deepEqual(parseCommandArguments("go", ["safe-feature"]), { feature: "safe-feature" })
  assert.deepEqual(parseCommandArguments("epic", ["safe-epic"]), { feature: "safe-epic" })
  assert.deepEqual(parseCommandArguments("status", ["safe-feature"]), { feature: "safe-feature" })
  assert.deepEqual(parseCommandArguments("status", []), {})
  assert.throws(() => parseCommandArguments("go", ["../unsafe"]), /invalid feature slug/)
})

test("accepts only the canonical doctor option", () => {
  assert.deepEqual(parseCommandArguments("doctor", []), { fix: false })
  assert.deepEqual(parseCommandArguments("doctor", ["--fix"]), { fix: true })
  assert.throws(() => parseCommandArguments("doctor", ["--fix;rm"]), /invalid doctor arguments/)
  assert.throws(() => parseCommandArguments("doctor", ["--fix", "extra"]), /invalid doctor arguments/)
})
