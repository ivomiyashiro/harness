#!/usr/bin/env node
import test from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawnSync } from "node:child_process"

const doctor = new URL("./harness-doctor.js", import.meta.url)

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "harness-doctor-integration-"))
  mkdirSync(join(root, "docs/state"), { recursive: true })
  mkdirSync(join(root, "docs/plans"), { recursive: true })
  mkdirSync(join(root, "docs/specs"), { recursive: true })
  mkdirSync(join(root, "commands"), { recursive: true })
  writeFileSync(join(root, "AGENTS.md"), "Stop for the human in exactly 3 categories\n")
  writeFileSync(join(root, "CLAUDE.md"), "Stop for the human in exactly 3 categories\n")
  writeFileSync(join(root, "commands/go.md"), "go\n")
  writeFileSync(join(root, "docs/formats.md"), "tokens:\nread-files:\n")
  return root
}

test("AC-12 --fix preserves unrelated plugin bytes and reports only applied repairs", () => {
  const root = fixture()
  const configPath = join(root, "opencode.json")
  const unrelatedTuple = '["third-party-plugin", {"opaque":"  keep spacing  ","flags":[true,false]}]'
  writeFileSync(configPath, `{"plugin":[${unrelatedTuple},["opencode-harness",{"defaultModel":"copenai/gpt-5.6-terra","models":{}}]]}\n`)

  const statePath = join(root, "docs/state/finished.md")
  mkdirSync(join(root, "docs/plans/finished"), { recursive: true })
  writeFileSync(join(root, "docs/plans/finished/plan.md"), "feature: finished\n")
  writeFileSync(join(root, "docs/plans/finished/task-01.md"), "goal: finished\n")
  writeFileSync(statePath, `feature: finished
mode: full
phase: done
branch: feature/finished
worktree: ${root}
tasks: done 1
checkpoints: spec done, plan approved, visual not-required, implement done, judge done, verify done, commit done, registry done, cleanup done
next: complete
`)
  const unrelatedBefore = JSON.stringify(JSON.parse(readFileSync(configPath, "utf8")).plugin[0][1])
  const stateBefore = readFileSync(statePath, "utf8")

  const result = spawnSync(process.execPath, [doctor.pathname, "--fix"], { cwd: root, encoding: "utf8" })
  const configAfter = readFileSync(configPath, "utf8")
  const stateAfter = readFileSync(statePath, "utf8")
  const repairs = result.stdout.match(/^FIX .+$/gm) ?? []

  assert.equal(result.status, 0, result.stdout + result.stderr)
  assert.equal(JSON.stringify(JSON.parse(configAfter).plugin[0][1]), unrelatedBefore)
  assert.match(configAfter, /"defaultModel": "openai\/gpt-5\.6-terra"/)
  assert.equal(stateAfter, stateBefore)
  assert.deepEqual(repairs, ["FIX opencode.json"])
})
