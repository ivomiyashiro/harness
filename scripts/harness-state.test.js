#!/usr/bin/env node
import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

import {
  canonicalState,
  checkTransition,
  loadState,
  transition,
} from "./harness-state.js"

const skill = (name) => readFileSync(new URL(`../skills/${name}/SKILL.md`, import.meta.url), "utf8")
const agent = (name) => readFileSync(new URL(`../agents/${name}.md`, import.meta.url), "utf8")

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
    revision: 1,
    spec: { exists: true },
    plan: { exists: true, tasksExist: true },
    approvals: {
      spec: { gate: "spec", revision: 1, approved: true },
      plan: { gate: "plan", revision: 1, approved: true },
    },
    tasks: { done: ["task-01"], pending: [] },
    judge: { passed: true, findings: ["fixed"] },
    verification: { passed: true },
    manualChecklist: { items: [{ id: "AC-1", done: true }] },
  })

  const result = transition(state, "route-to-implement")

  assert.equal(result.state.phase, "implement")
  assert.equal(result.state.approvals.spec.revision, 1)
  assert.deepEqual(result.state.tasks, state.tasks)
  assert.equal(result.state.revision, 2)
  assert.deepEqual(result.state.judge, { passed: false, findings: [] })
  assert.deepEqual(result.state.verification, { passed: false })
  assert.deepEqual(result.state.manualChecklist, { items: [] })
})

test("AC-10 finalization checkpoints", () => {
  const incomplete = canonicalState({
    mode: "full",
    phase: "verify",
    verification: { passed: true },
    finalization: { commit: true, registry: false, cleanup: true },
  })

  const blocked = transition(incomplete, "finalize")
  assert.equal(blocked.state.phase, "verify")
  assert.match(blocked.rule, /registry checkpoint incomplete/)

  const complete = canonicalState({
    mode: "full",
    phase: "verify",
    verification: { passed: true },
    finalization: { commit: true, registry: true, cleanup: true },
  })
  assert.equal(transition(complete, "finalize").state.phase, "done")
})

test("FSM-1 canonical mode transitions stay within legal phases", () => {
  const cases = [
    ["full", "brainstorm", "complete-brainstorm", "spec", "brainstorm"],
    ["full", "implement", "complete-implement", "judge", "implement"],
    ["lite", "judge", "complete-judge", "verify", "judge"],
    ["full", "verify", "request-iteration", "iterate", "verify"],
  ]

  for (const [mode, phase, request, expected, checkpoint] of cases) {
    const result = transition(canonicalState({ mode, phase, checkpoints: { [checkpoint]: "done" } }), request)
    assert.equal(result.ok, true)
    assert.equal(result.state.phase, expected)
  }
  assert.equal(checkTransition(canonicalState({ mode: "lite", phase: "brainstorm", checkpoints: { brainstorm: "done" } }), "complete-brainstorm").ok, false)
})

test("FSM-2 route-to-implement preserves tasks and invalidates only downstream state", () => {
  const state = canonicalState({
    mode: "full",
    phase: "iterate",
    revision: 8,
    spec: { exists: true },
    plan: { exists: true, tasksExist: true },
    approvals: {
      spec: { gate: "spec", revision: 8, approved: true },
      plan: { gate: "plan", revision: 8, approved: true },
    },
    tasks: { done: ["task-01"], pending: ["task-02"] },
    checkpoints: { implement: "done", judge: "done", verify: "done", commit: "done" },
    finalization: { commit: true, registry: false, cleanup: false },
  })

  const result = transition(state, "route-to-implement").state
  assert.deepEqual(result.tasks, state.tasks)
  assert.equal(result.approvals.plan.revision, 8)
  assert.equal(result.checkpoints.implement, "done")
  assert.equal(result.checkpoints.judge, "pending")
  assert.equal(result.checkpoints.commit, "pending")
  assert.equal(result.revision, 9)
})

test("route-to-implement rejects undeclared mode routes and validates idempotent resumes", () => {
  for (const mode of ["hotfix", "lite", "full", "epic"]) {
    const undeclared = checkTransition(canonicalState({ mode, phase: "verify" }), "route-to-implement")
    assert.equal(undeclared.ok, false)
    assert.match(undeclared.rule, /not declared/)

    const revision = 2
    const approvals = { plan: { gate: "plan", revision, approved: true } }
    if (mode === "full") approvals.spec = { gate: "spec", revision, approved: true }
    const first = transition(canonicalState({
      mode, phase: "iterate", revision,
      spec: { exists: ["full", "epic"].includes(mode), inline: ["hotfix", "lite"].includes(mode) },
      plan: { exists: true, tasksExist: true }, approvals,
    }), "route-to-implement")
    const resumed = transition(first.state, "route-to-implement")
    assert.equal(first.ok, true)
    assert.deepEqual(resumed.state, first.state)
  }

  const unknownModeResume = canonicalState({ mode: "unknown", phase: "implement", checkpoints: { routeToImplement: "done" } })
  assert.equal(checkTransition(unknownModeResume, "route-to-implement").ok, false)
})

test("AC-7 selectively resets affected tasks and rebases only preserved approvals", () => {
  const state = canonicalState({
    mode: "full",
    phase: "iterate",
    revision: 4,
    spec: { exists: true },
    plan: { exists: true, tasksExist: true },
    tasks: { done: ["task-01", "task-02"], pending: ["task-03"] },
    approvals: {
      spec: { gate: "spec", revision: 4, approved: true },
      plan: { gate: "plan", revision: 4, approved: true },
      visual: { gate: "visual", revision: 4, approved: true },
    },
    gates: { visual: { revision: 4, required: true } },
  })

  const result = transition(state, "route-to-implement", {
    affectedTasks: ["task-02"],
    invalidatedGates: ["visual"],
  }).state

  assert.deepEqual(result.tasks, { done: ["task-01"], pending: ["task-03", "task-02"] })
  assert.equal(result.approvals.spec.revision, 4)
  assert.equal(result.approvals.plan.revision, 4)
  assert.equal(result.approvals.visual, undefined)
  assert.equal(result.gates.visual, undefined)
  assert.equal(checkTransition({ ...result, phase: "plan", plan: { exists: true, hasUi: false } }, "start-implement").ok, true)
})

test("feedback enters iterate legally in every mode without direct bypass", () => {
  for (const mode of ["hotfix", "lite", "full", "epic"]) {
    for (const phase of ["implement", "judge", "verify"]) {
      assert.equal(checkTransition(canonicalState({ mode, phase }), "request-iteration").ok, true)
    }
    assert.equal(checkTransition(canonicalState({ mode, phase: "plan" }), "request-iteration").ok, false)
  }
})

test("iterate route requires artifact and UI approval prerequisites", () => {
  const base = { mode: "full", phase: "iterate", revision: 3 }
  assert.match(checkTransition(canonicalState(base), "route-to-implement").rule, /plan artifact/)
  const artifacts = { ...base, spec: { exists: true }, plan: { exists: true, tasksExist: true, hasUi: true } }
  assert.match(checkTransition(canonicalState(artifacts), "route-to-implement").rule, /approval missing for plan/)
  const planApproved = { ...artifacts, approvals: { plan: { gate: "plan", revision: 3, approved: true } } }
  assert.match(checkTransition(canonicalState(planApproved), "route-to-implement").rule, /approval missing for spec/)
  const upstreamApproved = { ...planApproved, approvals: { ...planApproved.approvals, spec: { gate: "spec", revision: 3, approved: true } } }
  assert.match(checkTransition(canonicalState(upstreamApproved), "route-to-implement").rule, /approval missing for visual/)
})

test("iteration preserves evidence and removes invalidated gate approvals", () => {
  const evidence = { gate: "plan", revision: 6, approved: true, by: "human", evidence: "msg-42" }
  const state = canonicalState({
    mode: "lite", phase: "iterate", revision: 6, spec: { inline: true },
    plan: { exists: true, tasksExist: true },
    approvals: { plan: evidence, visual: { gate: "visual", revision: 6, approved: true } },
  })
  const result = transition(state, "route-to-implement", { invalidatedGates: ["visual"] }).state
  assert.deepEqual(result.approvals.plan, evidence)
  assert.equal(result.approvals.visual, undefined)
  assert.equal(checkTransition({ ...result, phase: "iterate" }, "route-to-implement").ok, true)
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

test("AC-13 preserves safe legacy values and rejects ambiguous authority", () => {
  const loaded = loadState(`feature: legacy-feature
mode: lite
phase: implement
branch: feat/legacy-feature
worktree: /tmp/legacy-feature
revision: 7
next: judge
`)

  assert.equal(loaded.feature, "legacy-feature")
  assert.equal(loaded.mode, "lite")
  assert.equal(loaded.phase, "implement")
  assert.equal(loaded.branch, "feat/legacy-feature")
  assert.equal(loaded.worktree, "/tmp/legacy-feature")
  assert.equal(loaded.revision, 7)
  assert.equal(loaded.next, "judge")
  const noApproval = loadState("feature: legacy-feature\napprovals: none\n")
  assert.deepEqual(noApproval.approvals, {})
  assert.equal(checkTransition({ ...noApproval, mode: "lite", phase: "plan", plan: { exists: true } }, "start-implement").ok, false)
  assert.throws(() => loadState("mode: full\nmode: lite\n"), /ambiguous duplicate field: mode/)
  assert.throws(() => loadState("approvals: plan approved\n"), /unsafe legacy field: approvals/)
})

test("AC-14 state and configuration reject token behavior fields", () => {
  const text = JSON.stringify(canonicalState())

  assert.doesNotMatch(text, /token/i)
  assert.doesNotMatch(text, /budget/i)
  assert.doesNotMatch(text, /analysis/i)
  for (const field of ["tokenTelemetry", "token_budget", "analysis"]) {
    assert.throws(() => canonicalState({ [field]: true }), /unsupported token behavior field/)
    assert.throws(() => loadState(`${field}: true`), /unsupported token behavior field/)
  }
})

test("AC-2 skill gates require explicit approval evidence", () => {
  const docs = [skill("write-plan"), skill("visual-mock"), skill("verify")].join("\n")

  assert.match(docs, /approval evidence tied to the gate and state revision/i)
  assert.match(docs, /current resume message is not approval evidence/i)
})

test("AC-3 and AC-10 skills checkpoint resumable transitions and finalization", () => {
  const docs = [skill("write-plan"), skill("visual-mock"), skill("implement"), skill("verify"), skill("iterate")].join("\n")

  assert.match(docs, /checkpoint/i)
  assert.match(docs, /idempotent/i)
  assert.match(docs, /commit, registry, and cleanup checkpoints/i)
  assert.match(docs, /resume from the first incomplete checkpoint/i)
})

test("AC-4 AC-5 AC-6 skills route plan completion through canonical gates", () => {
  const docs = [skill("write-plan"), skill("visual-mock"), skill("implement")].join("\n")

  assert.match(docs, /full UI.*complete-plan.*phase: visual/is)
  assert.match(docs, /full non-UI.*complete-plan.*phase: implement/is)
  assert.match(docs, /hotfix.*lite.*plan approval.*start-implement/is)
  assert.match(docs, /implementation remains blocked until visual approval/i)
})

test("AC-7 iteration skill invalidates only affected downstream state", () => {
  const docs = skill("iterate")

  assert.match(docs, /reset affected downstream/i)
  assert.match(docs, /tasks, judge results, verification results, and manual checklist/i)
  assert.match(docs, /preserve unaffected upstream approvals/i)
})

test("AC-8 judge synthesis preserves blocking findings with evidence", () => {
  const docs = skill("judge")

  assert.match(docs, /every blocking finding/i)
  assert.match(docs, /explicitly confirm or reject/i)
  assert.match(docs, /with evidence/i)
  assert.match(docs, /store.*evidence.*judge state.*checkpoint/is)
  assert.doesNotMatch(docs, /Finding reported by ONE only \| → AUTO-DISMISS/i)
})

test("AC-9 judge re-runs both reviewers on cumulative fixer diff", () => {
  const docs = skill("judge")

  assert.match(docs, /re-judge.*both judges/i)
  assert.match(docs, /cumulative diff/i)
  assert.match(docs, /approved baseline.*fixer commit/is)
})

test("AC-10 bounded agents can inspect repository context without read allowlists", () => {
  const docs = [agent("implementer"), agent("planner"), skill("implement"), skill("write-plan")].join("\n")

  assert.match(docs, /read any repository file needed/i)
  assert.match(docs, /minimal targeted (reads|exploration)/i)
  assert.doesNotMatch(docs, /read ONLY/i)
  assert.doesNotMatch(docs, /read-files:/i)
})

test("AC-15 missing read-files or optional conventions never blocks bounded work", () => {
  const docs = [agent("implementer"), agent("planner"), skill("implement"), skill("write-plan")].join("\n")

  assert.match(docs, /conventions.*optional/i)
  assert.match(docs, /missing plan context is not a reason to stop/i)
  assert.match(docs, /discover.*repository context/i)
})
import { mkdtemp, mkdir, realpath, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { assertResumeIdentity, loadFeatureIdentity, loadPersistedFeatureIdentity } from './harness-state.js'

test('preserves safe persisted worktree and branch identity', async () => {
  const repo = await mkdtemp(path.join(tmpdir(), 'harness-state-'))
  let worktree = path.join(repo, '.worktrees', 'safe-feature')
  await mkdir(worktree, { recursive: true })
  worktree = await realpath(worktree)
  const canonicalRepo = await realpath(repo)
  const state = { worktree, branch: 'feat/safe-feature' }

  assert.deepEqual(await loadFeatureIdentity(state, canonicalRepo), state)
  await assert.doesNotReject(assertResumeIdentity(state, { worktree, branch: state.branch }, canonicalRepo))
})

test('rejects unsafe or ambiguous persisted identity without normalizing it', async () => {
  const repo = await mkdtemp(path.join(tmpdir(), 'harness-state-'))

  await assert.rejects(loadFeatureIdentity({ worktree: '../escape', branch: 'feat/safe' }, repo), /worktree/)
  await assert.rejects(loadFeatureIdentity({ worktree: repo, branch: '--force' }, repo), /branch/)
})

test('rejects resume worktree and branch mismatches', async () => {
  const repo = await mkdtemp(path.join(tmpdir(), 'harness-state-'))
  let worktree = path.join(repo, '.worktrees', 'safe-feature')
  let other = path.join(repo, '.worktrees', 'other')
  await mkdir(worktree, { recursive: true })
  await mkdir(other, { recursive: true })
  worktree = await realpath(worktree)
  other = await realpath(other)
  const canonicalRepo = await realpath(repo)
  const persisted = { worktree, branch: 'feat/safe-feature' }

  await assert.rejects(assertResumeIdentity(persisted, { worktree: other, branch: persisted.branch }, canonicalRepo), /worktree mismatch/)
  await assert.rejects(assertResumeIdentity(persisted, { worktree, branch: 'feat/other' }, canonicalRepo), /branch mismatch/)
})

test('parses resume identity from canonical persisted Harness state', async () => {
  const repo = await mkdtemp(path.join(tmpdir(), 'harness-state-'))
  const worktree = await realpath(repo)
  const statePath = path.join(repo, 'feature.md')
  await writeFile(statePath, `feature: safe-feature\nmode: full\nphase: implement\nworktree: ${worktree}\nbranch: feat/safe-feature\n`)

  assert.deepEqual(await loadPersistedFeatureIdentity(statePath, repo), {
    worktree,
    branch: 'feat/safe-feature',
  })
})
