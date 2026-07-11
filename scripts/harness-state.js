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
  plan: { exists: false, hasUi: false },
  approvals: {},
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

export function canonicalState(input = {}) {
  return merge(defaults, input)
}

function parseValue(value) {
  if (value === "true") return true
  if (value === "false") return false
  if (/^-?\d+$/.test(value)) return Number(value)
  return value
}

export function loadState(input) {
  const parsed = {}
  for (const line of String(input).split(/\r?\n/)) {
    const separator = line.indexOf(":")
    if (separator === -1) continue
    const key = line.slice(0, separator).trim()
    const value = line.slice(separator + 1).trim()
    if (!key) continue
    parsed[key] = parseValue(value)
  }
  return canonicalState({ ...parsed, version: STATE_VERSION, approvals: {}, gates: {} })
}

function approved(state, gate) {
  const evidence = state.approvals?.[gate]
  return evidence?.approved === true && evidence?.gate === gate && evidence?.revision === state.revision
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

export function checkTransition(input, requested) {
  const state = canonicalState(input)

  if (requested === "complete-plan") {
    if (state.checkpoints?.planCompleted && ["visual", "implement"].includes(state.phase)) return ok(state.phase)
    if (state.phase !== "plan") return reject("current phase must be plan")
    return requirePlan(state) ? reject(requirePlan(state)) : requireApproval(state, "plan") ? reject(requireApproval(state, "plan")) : ok(state.mode === "full" && state.plan.hasUi ? "visual" : "implement")
  }

  if (requested === "start-implement") {
    if (state.phase === "implement") return ok("implement")
    if (!["plan", "visual"].includes(state.phase)) return reject("current phase must be plan or visual")
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
    if (!["iterate", "judge", "verify", "manual-test", "finalize"].includes(state.phase)) return reject("current phase must be downstream of implement")
    return ok("implement")
  }

  if (requested === "finalize") {
    if (state.phase === "done") return ok("done")
    if (state.phase !== "finalize") return reject("current phase must be finalize")
    if (!state.verification?.passed) return reject("verification checkpoint incomplete")
    for (const checkpoint of ["commit", "registry", "cleanup"]) {
      if (!state.finalization?.[checkpoint]) return reject(`${checkpoint} checkpoint incomplete`)
    }
    return ok("done")
  }

  return reject(`unknown transition: ${requested}`)
}

function invalidated(state) {
  return {
    ...state,
    tasks: { done: [], pending: [] },
    judge: { passed: false, findings: [] },
    verification: { passed: false },
    manualChecklist: { items: [] },
  }
}

export function transition(input, requested) {
  const state = canonicalState(input)
  const checked = checkTransition(state, requested)
  if (!checked.ok) return { ok: false, rule: checked.rule, state }

  if (requested === "route-to-implement") return { ok: true, state: { ...invalidated(state), phase: "implement" } }
  if (requested === "finalize") return { ok: true, state: { ...state, phase: "done" } }
  if (requested === "complete-plan") {
    const next = checked.phase
    const gates = { ...state.gates }
    if (next === "visual") gates.visual = { revision: state.revision, required: true }
    else delete gates.visual
    return { ok: true, state: { ...state, phase: next, gates, checkpoints: { ...state.checkpoints, planCompleted: true } } }
  }
  if (requested === "start-implement") return { ok: true, state: { ...state, phase: "implement" } }

  return { ok: true, state: { ...state, phase: checked.phase } }
}
