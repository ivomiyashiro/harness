#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { spawnSync } from "node:child_process"
import { checkTransition } from "./harness-state.js"
import { updateRegistry } from "./harness-registry.js"

const root = process.cwd()
const harnessIndex = resolve(dirname(fileURLToPath(import.meta.url)), "..", "index.js")
const args = process.argv.slice(2)
if (args.length > 1 || (args.length === 1 && args[0] !== "--fix")) {
  console.error("Usage: harness-doctor.js [--fix]")
  process.exit(2)
}
const fix = args[0] === "--fix"

const errors = []
const warnings = []
const fixes = []

function path(...parts) {
  return join(root, ...parts)
}

function read(file) {
  return readFileSync(path(file), "utf8")
}

function write(file, value) {
  writeFileSync(path(file), value)
  fixes.push(file)
}

function add(level, message) {
  if (level === "error") errors.push(message)
  else warnings.push(message)
}

function parseState(input) {
  const state = {}
  for (const line of input.split(/\r?\n/)) {
    const separator = line.indexOf(":")
    if (separator === -1) continue
    state[line.slice(0, separator).trim()] = line.slice(separator + 1).trim()
  }
  return state
}

function parseCheckpoints(value = "") {
  const checkpoints = {}
  const pattern = /\b(spec|plan|visual|implement|judge|verify|commit|registry|cleanup)\s+(pending|done|approved|not-required)\b/g
  for (const match of value.matchAll(pattern)) checkpoints[match[1]] = match[2]
  return checkpoints
}

function parseApprovals(feature, value = "", revision = 0) {
  if (!value || value === "none") return {}

  const approvals = {}
  const pattern = /\b(spec|plan|visual)\s+rev\s+(\d+)\s+by\s+\S+\s+at\s+(\S+)\s+evidence\s+([^,]+)/g
  for (const match of value.matchAll(pattern)) {
    const [, gate, rev, timestamp] = match
    if (Number.isNaN(Date.parse(timestamp))) add("error", `${feature}: invalid approval evidence for ${gate}`)
    if (Number(rev) !== revision) add("error", `${feature}: approval revision mismatch for ${gate}: expected ${revision}, got ${rev}`)
    approvals[gate] = { gate, revision: Number(rev), approved: Number(rev) === revision }
  }

  if (!Object.keys(approvals).length) add("error", `${feature}: invalid approval evidence`)
  return approvals
}

function hasTaskFile(feature) {
  const dir = path("docs/plans", feature)
  if (!existsSync(dir)) return false
  return readdirSync(dir).some((file) => /^task-\d+\.md$/.test(file))
}

function doctorState(feature, state) {
  const legalPhases = new Set(["brainstorm", "spec", "plan", "visual", "implement", "judge", "verify", "iterate", "done"])
  const required = ["feature", "mode", "phase", "branch", "worktree", "plan", "tasks", "globs", "judges", "checklist", "checkpoints", "revision", "next"]
  const versioned = state.state_version !== undefined
  const revision = Number(state.revision ?? 0)
  const checkpoints = parseCheckpoints(state.checkpoints)

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(state.feature ?? "") || state.feature !== feature) {
    add("error", `${feature}: invalid feature: ${state.feature ?? "missing"}`)
  }

  if (!legalPhases.has(state.phase)) add("error", `${feature}: invalid phase: ${state.phase ?? "missing"}`)

  if (versioned) {
    for (const field of required) {
      if (state[field] === undefined || state[field] === "") add("error", `${feature}: missing required field: ${field}`)
    }
  }

  const planPath = state.plan || `docs/plans/${feature}/plan.md`
  const planExists = existsSync(path(planPath))
  if (state.plan || ["plan", "visual", "implement", "judge", "verify", "done"].includes(state.phase)) {
    if (!planExists) add("error", `${feature}: missing artifact: ${planPath}`)
  }

  if (state.tasks || ["plan", "visual", "implement", "judge", "verify", "done"].includes(state.phase)) {
    if (!hasTaskFile(feature)) add("error", `${feature}: missing artifact: docs/plans/${feature}/task-NN.md`)
  }

  const approvals = parseApprovals(feature, state.approvals, revision)
  const canonical = {
    mode: state.mode,
    phase: state.phase,
    revision,
    plan: { exists: planExists, hasUi: checkpoints.visual === "pending" },
    approvals,
    verification: { passed: checkpoints.verify === "done" },
    finalization: {
      commit: checkpoints.commit === "done",
      registry: checkpoints.registry === "done",
      cleanup: checkpoints.cleanup === "done",
    },
  }

  if (state.phase === "plan" && legalPhases.has(state.phase)) {
    const requested = ["hotfix", "lite"].includes(state.mode) ? "start-implement" : "complete-plan"
    const result = checkTransition(canonical, requested)
    if (!result.ok) add("error", `${feature}: ${result.rule}`)
  }

  if (state.phase === "done") {
    for (const checkpoint of ["verify", "commit", "registry", "cleanup"]) {
      if (checkpoints[checkpoint] !== "done") add("error", `${feature}: ${checkpoint} checkpoint incomplete`)
    }
  }
}

function checkWorkflowStates() {
  const dir = path("docs/state")
  if (!existsSync(dir)) return

  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".md") || file === "_active.md") continue
    const feature = file.slice(0, -3)
    doctorState(feature, parseState(read(`docs/state/${file}`)))
  }
}

function checkRequiredPaths() {
  for (const dir of ["docs", "docs/state", "docs/plans", "docs/specs"]) {
    if (!existsSync(path(dir))) {
      if (fix) {
        mkdirSync(path(dir), { recursive: true })
        fixes.push(dir)
      } else {
        add("warning", `missing directory: ${dir}`)
      }
    }
  }

  for (const file of ["AGENTS.md", "commands/go.md", "docs/formats.md"]) {
    if (!existsSync(path(file))) add("error", `missing Harness file: ${file}`)
  }
}

function checkModels() {
  const file = "opencode.json"
  if (!existsSync(path(file))) return

  const raw = read(file)
  let config
  try {
    config = JSON.parse(raw)
  } catch (error) {
    add("error", `opencode.json invalid JSON: ${error.message}`)
    return
  }

  const expected = {
    defaultModel: "openai/gpt-5.6-terra",
    explorer: "openai/gpt-5.4-mini",
    planner: "openai/gpt-5.6-terra",
    implementer: "openai/gpt-5.6-sol",
    "judge-a": "openai/gpt-5.6-terra",
    "judge-b": "openai/gpt-5.6-terra",
    fixer: "openai/gpt-5.6-sol",
    visual: "openai/gpt-5.6-terra",
    verifier: "openai/gpt-5.4-mini",
  }

  let changed = false
  if (config.model && !String(config.model).startsWith("openai/gpt-5.6-")) {
    add("warning", `root model is not gpt-5.6 tier: ${config.model}`)
  }

  const isHarnessPlugin = (spec) => spec === "opencode-harness"
    || spec.startsWith("opencode-harness@")
    || spec === harnessIndex
    || spec === pathToFileURL(harnessIndex).href

  const harnessPlugins = (config.plugin ?? []).filter((plugin) => Array.isArray(plugin) && typeof plugin[0] === "string" && isHarnessPlugin(plugin[0]))
  if (harnessPlugins.length > 1) {
    add("error", "ambiguous duplicate Harness plugin tuples")
    return
  }

  for (const plugin of config.plugin ?? []) {
    if (!Array.isArray(plugin) || typeof plugin[0] !== "string" || !isHarnessPlugin(plugin[0])) continue
    const options = Array.isArray(plugin) ? plugin[1] : undefined
    if (!options || typeof options !== "object") continue
    if (options.defaultModel !== expected.defaultModel) {
      add("warning", `defaultModel expected ${expected.defaultModel}, got ${options.defaultModel ?? "missing"}`)
      if (fix) {
        options.defaultModel = expected.defaultModel
        changed = true
      }
    }
    const models = options.models
    for (const [agent, model] of Object.entries(expected)) {
      if (agent === "defaultModel") continue
      if (models?.[agent] !== model) {
        add("warning", `${agent} model expected ${model}, got ${models?.[agent] ?? "missing"}`)
        if (fix) {
          options.models ??= {}
          options.models[agent] = model
          changed = true
        }
      }
    }
  }

  if (fix && changed) {
    const pluginKey = /"plugin"\s*:/.exec(raw)
    const arrayStart = pluginKey ? raw.indexOf("[", pluginKey.index + pluginKey[0].length) : -1
    const spans = []
    if (arrayStart !== -1) {
      let depth = 0
      let start = arrayStart + 1
      let string = false
      let escaped = false
      for (let index = arrayStart + 1; index < raw.length; index += 1) {
        const character = raw[index]
        if (string) {
          if (escaped) escaped = false
          else if (character === "\\") escaped = true
          else if (character === '"') string = false
          continue
        }
        if (character === '"') string = true
        else if (character === "[" || character === "{") depth += 1
        else if (character === "]" || character === "}") {
          if (character === "]" && depth === 0) {
            spans.push([start, index])
            break
          }
          depth -= 1
        } else if (character === "," && depth === 0) {
          spans.push([start, index])
          start = index + 1
        }
      }
    }

    let updated = raw
    for (const [start, end] of spans.reverse()) {
      const source = raw.slice(start, end)
      let plugin
      try { plugin = JSON.parse(source) } catch { continue }
      if (!Array.isArray(plugin) || typeof plugin[0] !== "string" || !isHarnessPlugin(plugin[0])) continue
      const configured = (config.plugin ?? []).find((entry) => Array.isArray(entry) && entry[0] === plugin[0])
      if (configured) updated = updated.slice(0, start) + JSON.stringify(configured) + updated.slice(end)
    }
    write(file, updated)
  }
}

async function checkActiveRegistry() {
  const registry = "docs/state/_active.md"
  if (!existsSync(path(registry))) return

  const lines = read(registry).split(/\r?\n/).filter(Boolean)
  const header = lines[0] ?? "feature | mode | phase | branch | globs | next"
  const kept = [header]
  let changed = false

  for (const line of lines.slice(1)) {
    const feature = line.split("|")[0]?.trim()
    if (!feature) continue
    const statePath = `docs/state/${feature}.md`
    if (!existsSync(path(statePath))) {
      add("warning", `active feature has no state file: ${feature}`)
      kept.push(line)
      continue
    }

    const state = parseState(read(statePath))
    if (state.phase === "done") {
      add("warning", `done feature still active: ${feature}`)
      if (fix) {
        changed = true
        continue
      }
    }
    kept.push(line)
  }

  if (fix && changed) {
    const removed = new Set(lines.slice(1).filter((line) => !kept.includes(line)).map((line) => line.split("|")[0]?.trim()))
    let updated = false
    await updateRegistry({
      registryPath: path(registry),
      transform(current) {
        const currentLines = current.split(/\r?\n/).filter(Boolean)
        const next = `${currentLines.filter((line, index) => index === 0 || !removed.has(line.split("|")[0]?.trim())).join("\n")}\n`
        updated = next !== current
        return next
      },
    })
    if (updated) fixes.push(registry)
  }
}

function checkRtk() {
  const result = spawnSync("rtk", ["--version"], { stdio: "ignore" })
  if (result.error?.code === "ENOENT") {
    add("warning", "rtk not found in PATH; agents should fall back to plain commands and log a learning")
  }
}

function checkPromptDrift() {
  const pairs = [
    ["AGENTS.md", "Stop for the human in exactly 3 categories"],
    ["CLAUDE.md", "Stop for the human in exactly 3 categories"],
    ["docs/formats.md", "tokens:"],
    ["docs/formats.md", "read-files:"],
  ]
  for (const [file, needle] of pairs) {
    if (existsSync(path(file)) && !read(file).includes(needle)) {
      add("warning", `${file} missing expected contract: ${needle}`)
    }
  }
}

checkRequiredPaths()
checkModels()
await checkActiveRegistry()
checkWorkflowStates()
checkRtk()
checkPromptDrift()

for (const message of errors) console.log(`FAIL ${message}`)
for (const message of warnings) console.log(`WARN ${message}`)
for (const file of fixes) console.log(`FIX ${file}`)

if (!errors.length && !warnings.length) console.log("OK harness doctor clean")
else console.log(`SUMMARY ${errors.length} fail, ${warnings.length} warn, ${fixes.length} fix`)

process.exit(errors.length ? 1 : 0)
