#!/usr/bin/env node

const FEATURE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function parseFeatureSlug(value) {
  if (typeof value !== "string" || !FEATURE_SLUG.test(value)) {
    throw new TypeError("invalid feature slug")
  }
  return value
}

export function parseCommandArguments(command, args) {
  if (!Array.isArray(args) || args.some((value) => typeof value !== "string")) {
    throw new TypeError(`invalid ${command} arguments`)
  }

  if (command === "doctor") {
    if (args.length === 0) return { fix: false }
    if (args.length === 1 && args[0] === "--fix") return { fix: true }
    throw new TypeError("invalid doctor arguments")
  }

  if (command === "status" && args.length === 0) return {}
  if (["go", "epic", "status"].includes(command) && args.length === 1) {
    return { feature: parseFeatureSlug(args[0]) }
  }
  throw new TypeError(`invalid ${command} arguments`)
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], "file:").href) {
  try {
    process.stdout.write(`${JSON.stringify(parseCommandArguments(process.argv[2], process.argv.slice(3)))}\n`)
  } catch (error) {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 2
  }
}
