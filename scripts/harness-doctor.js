#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { spawnSync } from "node:child_process"

const root = process.cwd()
const fix = process.argv.includes("--fix")

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

  let raw = read(file)
  let config
  try {
    config = JSON.parse(raw)
  } catch (error) {
    add("error", `opencode.json invalid JSON: ${error.message}`)
    return
  }

  const expected = {
    defaultModel: "openai/gpt-5.6-terra",
    explorer: "openai/gpt-5.6-luna",
    planner: "openai/gpt-5.6-terra",
    implementer: "openai/gpt-5.6-sol",
    "judge-a": "openai/gpt-5.6-terra",
    "judge-b": "openai/gpt-5.6-terra",
    fixer: "openai/gpt-5.6-sol",
    visual: "openai/gpt-5.6-terra",
    verifier: "openai/gpt-5.6-luna",
  }

  let changed = false
  if (config.model && !String(config.model).startsWith("openai/gpt-5.6-")) {
    add("warning", `root model is not gpt-5.6 tier: ${config.model}`)
    if (fix) {
      config.model = "openai/gpt-5.6-sol"
      changed = true
    }
  }

  for (const plugin of config.plugin ?? []) {
    const options = Array.isArray(plugin) ? plugin[1] : undefined
    if (!options || typeof options !== "object") continue
    if (options.defaultModel !== expected.defaultModel) {
      add("warning", `defaultModel expected ${expected.defaultModel}, got ${options.defaultModel ?? "missing"}`)
      if (fix) {
        options.defaultModel = expected.defaultModel
        changed = true
      }
    }
    options.models ??= {}
    for (const [agent, model] of Object.entries(expected)) {
      if (agent === "defaultModel") continue
      if (options.models[agent] !== model) {
        add("warning", `${agent} model expected ${model}, got ${options.models[agent] ?? "missing"}`)
        if (fix) {
          options.models[agent] = model
          changed = true
        }
      }
    }
  }

  if (raw.includes("copenai/")) {
    add("error", "invalid provider id found: copenai/")
    if (fix) changed = true
  }

  if (fix && changed) write(file, `${JSON.stringify(config, null, 2)}\n`)
}

function checkActiveRegistry() {
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

  if (fix && changed) write(registry, `${kept.join("\n")}\n`)
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
checkActiveRegistry()
checkRtk()
checkPromptDrift()

for (const message of errors) console.log(`FAIL ${message}`)
for (const message of warnings) console.log(`WARN ${message}`)
for (const file of fixes) console.log(`FIX ${file}`)

if (!errors.length && !warnings.length) console.log("OK harness doctor clean")
else console.log(`SUMMARY ${errors.length} fail, ${warnings.length} warn, ${fixes.length} fix`)

process.exit(errors.length ? 1 : 0)
