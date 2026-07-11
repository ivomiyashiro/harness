#!/usr/bin/env node
import test from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawnSync } from "node:child_process"

const doctor = new URL("./harness-doctor.js", import.meta.url)

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "harness-doctor-"))
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

function writeState(root, feature, lines) {
  writeFileSync(join(root, "docs/state", `${feature}.md`), `${lines.trim()}\n`)
}

function writePlan(root, feature) {
  mkdirSync(join(root, "docs/plans", feature), { recursive: true })
  writeFileSync(join(root, "docs/plans", feature, "plan.md"), "feature: test\n")
  writeFileSync(join(root, "docs/plans", feature, "task-01.md"), "goal: test\n")
}

function runDoctor(root, ...args) {
  return spawnSync(process.execPath, [doctor.pathname, ...args], { cwd: root, encoding: "utf8" })
}

test("AC-1 illegal transition reports unmet rule through validator", () => {
  const root = fixture()
  writePlan(root, "blocked")
  writeState(root, "blocked", `
state_version: 1
feature: blocked
mode: full
phase: plan
branch: feature/blocked
worktree: ${root}
spec: docs/specs/blocked.md
plan: docs/plans/blocked/plan.md
tasks: pending 1
globs: none
approvals: none
judges: not-run
checklist: none
checkpoints: spec done, plan approved, visual not-required, implement pending, judge pending, verify pending, commit pending, registry pending, cleanup pending
revision: 2
next: implement
`)

  const result = runDoctor(root)

  assert.notEqual(result.status, 0)
  assert.match(result.stdout, /FAIL blocked: approval missing for plan at revision 2/)
})

test("AC-10 inconsistent done/final checkpoints reported", () => {
  const root = fixture()
  writeState(root, "unfinished", `
state_version: 1
feature: unfinished
mode: full
phase: done
branch: feature/unfinished
worktree: ${root}
spec: docs/specs/unfinished.md
plan: docs/plans/unfinished/plan.md
tasks: done 1
globs: none
approvals: none
judges: not-run
checklist: none
checkpoints: spec done, plan approved, visual not-required, implement done, judge done, verify done, commit pending, registry done, cleanup done
revision: 5
next: complete
`)

  const result = runDoctor(root)

  assert.notEqual(result.status, 0)
  assert.match(result.stdout, /FAIL unfinished: commit checkpoint incomplete/)
})

test("AC-11 unversioned states load with safe defaults", () => {
  const root = fixture()
  writePlan(root, "legacy")
  writeState(root, "legacy", `
feature: legacy
mode: lite
phase: plan
branch: feature/legacy
next: implement
`)
  const before = readFileSync(join(root, "docs/state/legacy.md"), "utf8")

  const result = runDoctor(root)

  assert.notEqual(result.status, 0)
  assert.match(result.stdout, /FAIL legacy: approval missing for plan at revision 0/)
  assert.equal(readFileSync(join(root, "docs/state/legacy.md"), "utf8"), before)
})

test("AC-12 valid and invalid doctor fixtures do not rewrite without explicit safe fix", () => {
  const valid = fixture()
  writePlan(valid, "finished")
  writeState(valid, "finished", `
state_version: 1
feature: finished
mode: full
phase: done
branch: feature/finished
worktree: ${valid}
spec: docs/specs/finished.md
plan: docs/plans/finished/plan.md
tasks: done 1
globs: none
approvals: none
judges: judge-a clean, judge-b clean
checklist: none
checkpoints: spec done, plan approved, visual not-required, implement done, judge done, verify done, commit done, registry done, cleanup done
revision: 6
next: complete
`)
  assert.equal(runDoctor(valid).status, 0)

  const invalid = fixture()
  writeState(invalid, "bad", `
state_version: 1
feature: bad
mode: full
phase: chaos
branch: feature/bad
worktree: ${invalid}
plan: docs/plans/bad/plan.md
tasks: pending 1
globs: none
approvals: plan rev 3 by human at nope evidence message
judges: not-run
checklist: none
checkpoints: spec done, plan approved, visual not-required, implement pending, judge pending, verify pending, commit pending, registry pending, cleanup pending
revision: 3
next: implement
`)
  const before = readFileSync(join(invalid, "docs/state/bad.md"), "utf8")
  const result = runDoctor(invalid)

  assert.notEqual(result.status, 0)
  assert.match(result.stdout, /FAIL bad: invalid phase: chaos/)
  assert.match(result.stdout, /FAIL bad: missing artifact: docs\/plans\/bad\/plan.md/)
  assert.match(result.stdout, /FAIL bad: invalid approval evidence for plan/)
  assert.equal(readFileSync(join(invalid, "docs/state/bad.md"), "utf8"), before)
})
