#!/usr/bin/env node
import test from "node:test"
import assert from "node:assert/strict"

import {
  canonicalState,
  checkTransition,
  loadState,
  transition,
} from "./harness-state.js"

test("AC-1 transition accept/reject with unmet rule", () => {
  const state = canonicalState({ mode: "full", phase: "plan" })

  assert.equal(checkTransition(state, "complete-plan").ok, false)
  assert.match(checkTransition(state, "complete-plan").rule, /plan artifact missing/)

  const ready = canonicalState({
    mode: "full",
    phase: "plan",
    revision: 4,
    plan: { exists: true, hasUi: false },
    approvals: { plan: { gate: "plan", revision: 4, approved: true } },
  })
  assert.equal(checkTransition(ready, "complete-plan").ok, true)
})

test("AC-2 approval evidence tied to gate and revision", () => {
  const state = canonicalState({
    mode: "lite",
    phase: "plan",
    revision: 7,
    plan: { exists: true, hasUi: false },
    approvals: {
      visual: { gate: "visual", revision: 7, approved: true },
      plan: { gate: "plan", revision: 6, approved: true },
    },
    resumeMessage: "approved, go ahead",
  })

  const result = checkTransition(state, "start-implement")

  assert.equal(result.ok, false)
  assert.match(result.rule, /approval missing for plan at revision 7/)
})

test("AC-3 idempotent completed resume", () => {
  const state = canonicalState({
    mode: "full",
    phase: "implement",
    revision: 2,
    plan: { exists: true, hasUi: false },
    approvals: { plan: { gate: "plan", revision: 2, approved: true } },
    registry: ["harness-state-machine"],
    checkpoints: { planCompleted: true },
  })

  const once = transition(state, "complete-plan")
  const twice = transition(once.state, "complete-plan")

  assert.equal(twice.state.phase, "implement")
  assert.deepEqual(twice.state.checkpoints, once.state.checkpoints)
  assert.deepEqual(twice.state.registry, ["harness-state-machine"])
})

test("AC-4 full UI plan routes to visual and blocks implement", () => {
  const state = canonicalState({
    mode: "full",
    phase: "plan",
    revision: 3,
    plan: { exists: true, hasUi: true },
    approvals: { plan: { gate: "plan", revision: 3, approved: true } },
  })

  const result = transition(state, "complete-plan")

  assert.equal(result.state.phase, "visual")
  assert.equal(checkTransition(result.state, "start-implement").ok, false)
  assert.match(checkTransition(result.state, "start-implement").rule, /approval missing for visual/)
})

test("AC-5 full non-UI plan routes to implement without visual gate", () => {
  const state = canonicalState({
    mode: "full",
    phase: "plan",
    revision: 3,
    plan: { exists: true, hasUi: false },
    approvals: { plan: { gate: "plan", revision: 3, approved: true } },
  })

  const result = transition(state, "complete-plan")

  assert.equal(result.state.phase, "implement")
  assert.equal(result.state.gates.visual, undefined)
})

test("AC-6 hotfix/lite requires plan and explicit approval", () => {
  for (const mode of ["hotfix", "lite"]) {
    const missingPlan = canonicalState({ mode, phase: "plan", revision: 1 })
    assert.match(checkTransition(missingPlan, "start-implement").rule, /plan artifact missing/)

    const missingApproval = canonicalState({
      mode,
      phase: "plan",
      revision: 1,
      plan: { exists: true, hasUi: false },
    })
    assert.match(checkTransition(missingApproval, "start-implement").rule, /approval missing for plan/)

    const approved = canonicalState({
      mode,
      phase: "plan",
      revision: 1,
      plan: { exists: true, hasUi: false },
      approvals: { plan: { gate: "plan", revision: 1, approved: true } },
    })
    assert.equal(transition(approved, "start-implement").state.phase, "implement")
  }
})

test("AC-7 downstream invalidation", () => {
  const state = canonicalState({
    mode: "full",
    phase: "iterate",
    approvals: { spec: { gate: "spec", revision: 1, approved: true } },
    tasks: { done: ["task-01"], pending: [] },
    judge: { passed: true, findings: ["fixed"] },
    verification: { passed: true },
    manualChecklist: { items: [{ id: "AC-1", done: true }] },
  })

  const result = transition(state, "route-to-implement")

  assert.equal(result.state.phase, "implement")
  assert.deepEqual(result.state.approvals, state.approvals)
  assert.deepEqual(result.state.tasks, { done: [], pending: [] })
  assert.deepEqual(result.state.judge, { passed: false, findings: [] })
  assert.deepEqual(result.state.verification, { passed: false })
  assert.deepEqual(result.state.manualChecklist, { items: [] })
})

test("AC-10 finalization checkpoints", () => {
  const incomplete = canonicalState({
    mode: "full",
    phase: "finalize",
    verification: { passed: true },
    finalization: { commit: true, registry: false, cleanup: true },
  })

  const blocked = transition(incomplete, "finalize")
  assert.equal(blocked.state.phase, "finalize")
  assert.match(blocked.rule, /registry checkpoint incomplete/)

  const complete = canonicalState({
    mode: "full",
    phase: "finalize",
    verification: { passed: true },
    finalization: { commit: true, registry: true, cleanup: true },
  })
  assert.equal(transition(complete, "finalize").state.phase, "done")
})

test("AC-11 unversioned load safe defaults and no inferred approval", () => {
  const loaded = loadState(`feature: harness-state-machine
mode: full
phase: plan
branch: feature/harness-state-machine
next: implement
`)

  assert.equal(loaded.version, "harness-state/v1")
  assert.equal(loaded.feature, "harness-state-machine")
  assert.equal(loaded.mode, "full")
  assert.equal(loaded.phase, "plan")
  assert.equal(loaded.branch, "feature/harness-state-machine")
  assert.equal(loaded.next, "implement")
  assert.deepEqual(loaded.approvals, {})
  assert.deepEqual(loaded.gates, {})
})

test("AC-13 no token fields", () => {
  const text = JSON.stringify(canonicalState())

  assert.doesNotMatch(text, /token/i)
  assert.doesNotMatch(text, /budget/i)
  assert.doesNotMatch(text, /analysis/i)
})
