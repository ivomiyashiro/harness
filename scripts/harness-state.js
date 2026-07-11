#!/usr/bin/env node

export const STATE_VERSION = "harness-state/v1"

const defaults = {
  version: STATE_VERSION,
  feature: "",
  mode: "full",
  phase: "brainstorm",
  revision: 0,
  branch: "",
  next: "",
  spec: { exists: false, inline: false },
  plan: { exists: false, hasUi: false, tasksExist: false },
  approvals: {},
  preservedApprovals: [],
  gates: {},
  checkpoints: {},
  registry: [],
  tasks: { done: [], pending: [] },
  judge: { passed: false, findings: [] },
  verification: { passed: false },
  manualChecklist: { items: [] },
  finalization: { commit: false, registry: false, cleanup: false },
}

function copy(value) {
  return JSON.parse(JSON.stringify(value))
}

function merge(base, override) {
  const result = copy(base)
  for (const [key, value] of Object.entries(override ?? {})) {
    if (value && typeof value === "object" && !Array.isArray(value) && result[key] && typeof result[key] === "object" && !Array.isArray(result[key])) {
      result[key] = merge(result[key], value)
    } else {
      result[key] = copy(value)
    }
  }
  return result
}

const TOKEN_BEHAVIOR_FIELD = /token|budget|analysis/i

function rejectTokenBehaviorFields(value, location = "state") {
  if (!value || typeof value !== "object") return
  for (const [key, nested] of Object.entries(value)) {
    if (TOKEN_BEHAVIOR_FIELD.test(key)) {
      throw new Error(`unsupported token behavior field: ${location}.${key}`)
    }
    rejectTokenBehaviorFields(nested, `${location}.${key}`)
  }
}

export function canonicalState(input = {}) {
  rejectTokenBehaviorFields(input)
  return merge(defaults, input)
}

function parseValue(value) {
  if (value === "true") return true
  if (value === "false") return false
  if (/^-?\d+$/.test(value)) return Number(value)
  return value
}

function parseApprovals(value) {
  if (value === "none") return {}
  const match = /^(spec|plan|visual) rev (\d+) by (\S+) at (\S+) evidence (.+)$/.exec(value)
  if (!match) throw new Error("unsafe legacy field: approvals")
  const [, gate, revision, by, at, evidence] = match
  return { [gate]: { gate, revision: Number(revision), approved: true, by, at, evidence } }
}

export function loadState(input) {
  const parsed = {}
  const seen = new Set()
  for (const line of String(input).split(/\r?\n/)) {
    const separator = line.indexOf(":")
    if (separator === -1) continue
    const key = line.slice(0, separator).trim()
    const value = line.slice(separator + 1).trim()
    if (!key) continue
    if (seen.has(key)) throw new Error(`ambiguous duplicate field: ${key}`)
    if (key === "approvals") {
      seen.add(key)
      parsed.approvals = parseApprovals(value)
      continue
    }
    if (["gates", "preservedApprovals"].includes(key)) {
      throw new Error(`unsafe legacy field: ${key}`)
    }
    seen.add(key)
    parsed[key] = parseValue(value)
  }
  return canonicalState({ ...parsed, version: STATE_VERSION, approvals: parsed.approvals ?? {}, gates: {} })
}

function approved(state, gate) {
  const evidence = state.approvals?.[gate]
  const current = evidence?.revision === state.revision
  const preserved = evidence?.revision < state.revision && state.preservedApprovals?.includes(gate)
  return evidence?.approved === true && evidence?.gate === gate && (current || preserved)
}

function requireApproval(state, gate) {
  if (approved(state, gate)) return undefined
  return `approval missing for ${gate} at revision ${state.revision}`
}

function requirePlan(state) {
  if (state.plan?.exists) return undefined
  return "plan artifact missing"
}

function ok(phase) {
  return { ok: true, phase }
}

function reject(rule) {
  return { ok: false, rule }
}

const modeTransitions = {
  hotfix: { plan: ["implement"], implement: ["judge", "iterate"], judge: ["verify", "iterate"], verify: ["iterate", "done"], iterate: ["implement"] },
  lite: { plan: ["implement"], implement: ["judge", "iterate"], judge: ["verify", "iterate"], verify: ["iterate", "done"], iterate: ["implement"] },
  full: {
    brainstorm: ["spec"],
    spec: ["plan"],
    plan: ["visual", "implement"],
    visual: ["implement", "iterate"],
    implement: ["judge", "iterate"],
    judge: ["verify", "iterate"],
    verify: ["iterate", "done"],
    iterate: ["spec", "plan", "visual", "implement"],
  },
  epic: { plan: ["implement"], implement: ["judge", "iterate"], judge: ["verify", "iterate"], verify: ["iterate", "done"], iterate: ["implement"] },
}

function checkpointDone(state, name) {
  return state.checkpoints?.[name] === true || state.checkpoints?.[name] === "done"
}

function requireDeclaredTransition(state, target) {
  if (modeTransitions[state.mode]?.[state.phase]?.includes(target)) return undefined
  return `${state.mode} transition from ${state.phase} to ${target} is not declared`
}

export function checkTransition(input, requested) {
  const state = canonicalState(input)

  const completions = {
    "complete-brainstorm": ["spec", "brainstorm"],
    "complete-spec": ["plan", "spec"],
    "complete-implement": ["judge", "implement"],
    "complete-judge": ["verify", "judge"],
  }
  if (completions[requested]) {
    const [target, checkpoint] = completions[requested]
    if (state.phase === target && checkpointDone(state, checkpoint)) return ok(target)
    const rule = requireDeclaredTransition(state, target)
    if (rule) return reject(rule)
    if (!checkpointDone(state, checkpoint)) return reject(`${checkpoint} checkpoint incomplete`)
    if (requested === "complete-spec") {
      const approvalRule = requireApproval(state, "spec")
      if (approvalRule) return reject(approvalRule)
    }
    return ok(target)
  }

  if (requested === "request-iteration") {
    if (state.phase === "iterate") return ok("iterate")
    const rule = requireDeclaredTransition(state, "iterate")
    return rule ? reject(rule) : ok("iterate")
  }

  if (requested === "complete-plan") {
    if (state.checkpoints?.planCompleted && ["visual", "implement"].includes(state.phase)) return ok(state.phase)
    if (state.phase !== "plan") return reject("current phase must be plan")
    const target = state.mode === "full" && state.plan.hasUi ? "visual" : "implement"
    const declaredRule = requireDeclaredTransition(state, target)
    return declaredRule ? reject(declaredRule) : requirePlan(state) ? reject(requirePlan(state)) : requireApproval(state, "plan") ? reject(requireApproval(state, "plan")) : ok(target)
  }

  if (requested === "start-implement") {
    if (state.phase === "implement") return ok("implement")
    if (!["plan", "visual"].includes(state.phase)) return reject("current phase must be plan or visual")
    const declaredRule = requireDeclaredTransition(state, "implement")
    if (declaredRule) return reject(declaredRule)
    if (state.mode === "full" && state.plan?.hasUi && state.phase === "visual") {
      const rule = requireApproval(state, "visual")
      return rule ? reject(rule) : ok("implement")
    }
    const planRule = requirePlan(state)
    if (planRule) return reject(planRule)
    const approvalRule = requireApproval(state, "plan")
    return approvalRule ? reject(approvalRule) : ok("implement")
  }

  if (requested === "route-to-implement") {
    if (state.phase === "implement" && checkpointDone(state, "routeToImplement")) {
      const rule = modeTransitions[state.mode]?.iterate?.includes("implement") ? undefined : `${state.mode} transition from iterate to implement is not declared`
      return rule ? reject(rule) : ok("implement")
    }
    const rule = requireDeclaredTransition(state, "implement")
    if (rule) return reject(rule)
    const planRule = requirePlan(state)
    if (planRule) return reject(planRule)
    if (!state.plan?.tasksExist) return reject("task artifacts missing")
    if (["full", "epic"].includes(state.mode) && !state.spec?.exists) return reject("spec artifact missing")
    if (["hotfix", "lite"].includes(state.mode) && !state.spec?.inline && !state.spec?.exists) return reject("inline specification missing")
    const planApprovalRule = requireApproval(state, "plan")
    if (planApprovalRule) return reject(planApprovalRule)
    if (state.mode === "full") {
      const specApprovalRule = requireApproval(state, "spec")
      if (specApprovalRule) return reject(specApprovalRule)
      if (state.plan.hasUi) {
        const visualApprovalRule = requireApproval(state, "visual")
        if (visualApprovalRule) return reject(visualApprovalRule)
      }
    }
    return ok("implement")
  }

  if (requested === "finalize") {
    if (state.phase === "done") return ok("done")
    const rule = requireDeclaredTransition(state, "done")
    if (rule) return reject(rule)
    if (!state.verification?.passed && !checkpointDone(state, "verify")) return reject("verification checkpoint incomplete")
    for (const checkpoint of ["commit", "registry", "cleanup"]) {
      if (!state.finalization?.[checkpoint] && !checkpointDone(state, checkpoint)) return reject(`${checkpoint} checkpoint incomplete`)
    }
    return ok("done")
  }

  return reject(`unknown transition: ${requested}`)
}

function invalidated(state, { affectedTasks = [], invalidatedGates = [] } = {}) {
  const affected = new Set(affectedTasks)
  const invalidGates = new Set(invalidatedGates)
  const revision = state.revision + 1
  const approvals = Object.fromEntries(Object.entries(state.approvals).flatMap(([gate, evidence]) =>
    invalidGates.has(gate) ? [] : [[gate, evidence]],
  ))
  const done = state.tasks.done.filter((task) => !affected.has(task))
  const pending = [...state.tasks.pending]
  for (const task of state.tasks.done) if (affected.has(task) && !pending.includes(task)) pending.push(task)
  return {
    ...state,
    revision,
    approvals,
    preservedApprovals: Object.keys(approvals),
    gates: Object.fromEntries(Object.entries(state.gates).filter(([gate]) => !invalidGates.has(gate))),
    tasks: { ...state.tasks, done, pending },
    judge: { passed: false, findings: [] },
    verification: { passed: false },
    manualChecklist: { items: [] },
    checkpoints: {
      ...state.checkpoints,
      judge: "pending",
      verify: "pending",
      commit: "pending",
      registry: "pending",
      cleanup: "pending",
    },
    finalization: { commit: false, registry: false, cleanup: false },
  }
}

export function transition(input, requested, options) {
  const state = canonicalState(input)
  const checked = checkTransition(state, requested)
  if (!checked.ok) return { ok: false, rule: checked.rule, state }

  if (requested === "route-to-implement") {
    if (state.phase === "implement") return { ok: true, state }
    const next = invalidated(state, options)
    return { ok: true, state: { ...next, phase: "implement", checkpoints: { ...next.checkpoints, routeToImplement: "done" } } }
  }
  if (requested === "finalize") return { ok: true, state: { ...state, phase: "done" } }
  if (requested === "complete-plan") {
    const next = checked.phase
    const gates = { ...state.gates }
    if (next === "visual") gates.visual = { revision: state.revision, required: true }
    else delete gates.visual
    return { ok: true, state: { ...state, phase: next, gates, checkpoints: { ...state.checkpoints, planCompleted: true } } }
  }
  if (requested === "start-implement") return { ok: true, state: { ...state, phase: "implement" } }

  if (["complete-brainstorm", "complete-spec", "complete-implement", "complete-judge", "request-iteration"].includes(requested)) {
    return { ok: true, state: { ...state, phase: checked.phase } }
  }

  return { ok: true, state: { ...state, phase: checked.phase } }
}
import { resolveInside } from './harness-paths.js'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const SAFE_BRANCH = /^(?!-)(?!.*\.\.)(?!.*(?:^|\/)\.lock(?:\/|$))[A-Za-z0-9][A-Za-z0-9._/-]*$/

export async function loadFeatureIdentity(state, repository) {
  if (!state || typeof state.worktree !== 'string' || !path.isAbsolute(state.worktree)) {
    throw new Error('persisted worktree must be an absolute path')
  }
  if (typeof state.branch !== 'string' || !SAFE_BRANCH.test(state.branch)) {
    throw new Error('persisted branch is unsafe')
  }

  const worktree = await resolveInside(repository, state.worktree)
  if (worktree !== state.worktree) {
    throw new Error('persisted worktree must already be canonical')
  }
  return { worktree: state.worktree, branch: state.branch }
}

export async function loadPersistedFeatureIdentity(statePath, repository) {
  const canonicalStatePath = await resolveInside(repository, statePath)
  return loadFeatureIdentity(loadState(await readFile(canonicalStatePath, 'utf8')), repository)
}

export async function assertResumeIdentity(persisted, current, repository) {
  const expected = await loadFeatureIdentity(persisted, repository)
  const actualWorktree = await resolveInside(repository, current.worktree)

  if (actualWorktree !== expected.worktree) throw new Error('resume worktree mismatch')
  if (current.branch !== expected.branch) throw new Error('resume branch mismatch')
}
