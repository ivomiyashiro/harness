import { spawn } from "node:child_process"

const DEFAULT_TIMEOUT_MS = 120_000
const MAX_TIMEOUT_MS = 600_000

function validate(command, args, timeoutMs) {
  if (typeof command !== "string" || !command) throw new TypeError("command must be a non-empty string")
  if (!Array.isArray(args) || args.some((arg) => typeof arg !== "string")) {
    throw new TypeError("args must be an array of strings")
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > MAX_TIMEOUT_MS) {
    throw new RangeError(`timeoutMs must be between 1 and ${MAX_TIMEOUT_MS}`)
  }
}

function execute(command, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false, stdio: ["ignore", "pipe", "pipe"] })
    let stdout = ""
    let stderr = ""
    let timedOut = false

    child.stdout.setEncoding("utf8").on("data", (chunk) => stdout += chunk)
    child.stderr.setEncoding("utf8").on("data", (chunk) => stderr += chunk)

    const timer = setTimeout(() => {
      timedOut = true
      child.kill("SIGKILL")
    }, timeoutMs)

    child.once("error", (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.once("close", (code, signal) => {
      clearTimeout(timer)
      if (timedOut) {
        const error = new Error(`${command} timed out after ${timeoutMs}ms`)
        error.code = "ETIMEDOUT"
        reject(error)
      } else if (code !== 0) {
        const error = new Error(`${command} exited with status ${code}${signal ? ` (${signal})` : ""}`)
        error.code = code
        error.stderr = stderr
        reject(error)
      } else {
        resolve({ code, stdout, stderr })
      }
    })
  })
}

export async function runHarnessProcess(command, args, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const cleanup = options.cleanup ?? (() => {})
  const operation = options.operation ?? ((result) => result)
  validate(command, args, timeoutMs)
  if (typeof cleanup !== "function") throw new TypeError("cleanup must be a function")
  if (typeof operation !== "function") throw new TypeError("operation must be a function")

  try {
    return await operation(await execute(command, args, timeoutMs))
  } finally {
    await cleanup()
  }
}
