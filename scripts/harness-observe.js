#!/usr/bin/env node
import { spawn } from "node:child_process"

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

export function observeCommand(selectedProfile, values) {
  const fixed = fixedProfiles.get(selectedProfile)
  if (!fixed || values.length > fixed.max || !safeOperands(values)) throw new Error("unsafe observation arguments")
  return [fixed.command, [...fixed.args, ...values, ...(fixed.suffix ?? [])]]
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  try {
    const [command, commandArgs] = observeCommand(profile, args)
    const child = spawn(command, commandArgs, { stdio: "inherit" })
    child.on("error", (error) => { console.error(error.message); process.exitCode = 1 })
    child.on("close", (code) => { process.exitCode = code ?? 1 })
  } catch (error) {
    console.error(error.message)
    process.exitCode = 2
  }
}
