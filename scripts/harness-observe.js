#!/usr/bin/env node
import { spawn } from "node:child_process"

const [profile, ...args] = process.argv.slice(2)
const gitSubcommands = new Set(["diff", "log", "show", "status"])
const runtimeProfiles = new Map([
  ["node-test", ["node", "--test"]],
  ["bun-test", ["bun", "test"]],
  ["cargo-run", ["cargo", "run"]],
  ["cargo-test", ["cargo", "test"]],
  ["pytest", ["pytest"]],
  ["flutter-run", ["flutter", "run"]],
  ["flutter-test", ["flutter", "test"]],
  ["dart-run", ["dart", "run"]],
])

function safeOperands(values) {
  return values.every((value) => value !== "--" && !value.startsWith("-") && !/[|&;<>`\n\r]/.test(value))
}

export function observeCommand(selectedProfile, values) {
  if (selectedProfile === "git") {
    const [subcommand, ...operands] = values
    if (!gitSubcommands.has(subcommand) || !safeOperands(operands)) throw new Error("unsafe git inspection arguments")
    return ["git", [subcommand, ...operands]]
  }
  if (selectedProfile === "curl-get") {
    if (values.length !== 1 || !/^https?:\/\/[^\s|&;<>`]+$/.test(values[0])) throw new Error("unsafe curl URL")
    return ["curl", ["--fail", "--silent", "--show-error", values[0]]]
  }
  const fixed = runtimeProfiles.get(selectedProfile)
  if (!fixed || !safeOperands(values)) throw new Error("unsafe runtime arguments")
  return [fixed[0], [...fixed.slice(1), ...values]]
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
