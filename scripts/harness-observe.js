#!/usr/bin/env node
import { lstatSync, realpathSync } from "node:fs"
import path from "node:path"
import { runHarnessProcess } from "./harness-process.js"

const [profile, ...args] = process.argv.slice(2)
const fixedProfiles = new Map([
  ["git-diff", { command: "git", args: ["diff"], max: 1, suffix: ["--", "."] }],
  ["git-log", { command: "git", args: ["log", "--oneline", "-10"], max: 1 }],
  ["git-show", { command: "git", args: ["show", "--stat"], max: 1 }],
  ["git-status", { command: "git", args: ["status", "--short"], max: 0 }],
  ["node-test", { command: "node", args: ["--test"], max: Infinity }],
  ["bun-test", { command: "bun", args: ["test"], max: Infinity }],
  ["cargo-test", { command: "cargo", args: ["test"], max: 0 }],
  ["pytest", { command: "pytest", args: [], max: Infinity }],
  ["flutter-test", { command: "flutter", args: ["test"], max: Infinity }],
])

function safeOperands(values) {
  return values.every((value) => value.length > 0 && !value.startsWith("-") && !value.split("/").includes("..") && /^[A-Za-z0-9_./~^]+$/.test(value))
}

function safeNodeTests(values, boundary = process.cwd()) {
  const root = realpathSync(boundary)
  return values.every((value) => {
    if (path.isAbsolute(value) || !/\.(?:test|spec)\.[cm]?[jt]s$/.test(value)) return false
    const resolved = path.resolve(root, value)
    if (path.relative(root, resolved).startsWith("..") || path.relative(root, resolved) === "") return false
    try {
      return !lstatSync(resolved).isSymbolicLink() && realpathSync(resolved) === resolved
    } catch {
      return false
    }
  })
}

export function observeCommand(selectedProfile, values, boundary = process.cwd()) {
  const fixed = fixedProfiles.get(selectedProfile)
  if (!fixed || values.length > fixed.max || !safeOperands(values) || (selectedProfile === "node-test" && !safeNodeTests(values, boundary))) throw new Error("unsafe observation arguments")
  return [fixed.command, [...fixed.args, ...values, ...(fixed.suffix ?? [])]]
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  try {
    const [command, commandArgs] = observeCommand(profile, args)
    runHarnessProcess(command, commandArgs, {
      operation(result) {
        process.stdout.write(result.stdout)
        process.stderr.write(result.stderr)
      },
    }).catch((error) => { console.error(error.message); process.exitCode = 1 })
  } catch (error) {
    console.error(error.message)
    process.exitCode = 2
  }
}
