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

const modeTransitions = {
  hotfix: { plan: ["implement"], implement: ["judge"], judge: ["verify"], verify: ["done"] },
  lite: { plan: ["implement"], implement: ["judge"], judge: ["verify"], verify: ["done"] },
  full: {
    brainstorm: ["spec"],
    spec: ["plan"],
    plan: ["visual", "implement"],
    visual: ["implement"],
    implement: ["judge"],
    judge: ["verify"],
    verify: ["iterate", "done"],
  },
  epic: { plan: ["implement"], implement: ["judge"], judge: ["verify"], verify: ["done"] },
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
    "request-iteration": ["iterate", "verify"],
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
    if (!["iterate", "judge", "verify"].includes(state.phase)) return reject("current phase must be downstream of implement")
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

function invalidated(state) {
  return {
    ...state,
    revision: state.revision + 1,
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

  if (["complete-brainstorm", "complete-spec", "complete-implement", "complete-judge", "request-iteration"].includes(requested)) {
    return { ok: true, state: { ...state, phase: checked.phase } }
  }

  return { ok: true, state: { ...state, phase: checked.phase } }
}
