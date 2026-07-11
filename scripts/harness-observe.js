#!/usr/bin/env node
import { spawn } from "node:child_process"

const [profile, ...args] = process.argv.slice(2)
const fixedProfiles = new Map([
  ["git-diff", ["git", "diff", "--", "."]],
  ["git-log", ["git", "log", "--oneline", "-10"]],
  ["git-status", ["git", "status", "--short"]],
  ["node-test", ["node", "--test"]],
  ["bun-test", ["bun", "test"]],
  ["cargo-test", ["cargo", "test"]],
  ["pytest", ["pytest"]],
  ["flutter-test", ["flutter", "test"]],
])

function safeOperands(values) {
  return values.every((value) => value !== "--" && !value.startsWith("-") && !/[|&;<>`\n\r]/.test(value))
}

export function observeCommand(selectedProfile, values) {
  const fixed = fixedProfiles.get(selectedProfile)
  if (!fixed || values.length !== 0 || !safeOperands(values)) throw new Error("unsafe observation arguments")
  return [fixed[0], fixed.slice(1)]
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
