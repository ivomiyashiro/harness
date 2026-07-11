import assert from "node:assert/strict"
import test from "node:test"
import { runHarnessProcess } from "./harness-process.js"

const node = process.execPath

test("propagates a non-zero exit and cleans up exactly once", async () => {
  let cleanups = 0

  await assert.rejects(
    runHarnessProcess(node, ["-e", "process.exit(7)"], {
      cleanup: () => cleanups++,
    }),
    (error) => error.code === 7 && /exited with status 7/.test(error.message),
  )
  assert.equal(cleanups, 1)
})

test("enforces the timeout and cleans up exactly once", async () => {
  let cleanups = 0

  await assert.rejects(
    runHarnessProcess(node, ["-e", "setInterval(() => {}, 1000)"], {
      timeoutMs: 25,
      cleanup: () => cleanups++,
    }),
    (error) => error.code === "ETIMEDOUT" && /timed out after 25ms/.test(error.message),
  )
  assert.equal(cleanups, 1)
})

test("propagates parent operation failure and cleans up exactly once", async () => {
  let cleanups = 0
  const failure = new Error("parent failed")

  await assert.rejects(
    runHarnessProcess(node, ["-e", "process.stdout.write('ok')"], {
      cleanup: () => cleanups++,
      operation: () => {
        throw failure
      },
    }),
    failure,
  )
  assert.equal(cleanups, 1)
})

test("passes arguments as explicit argv without shell interpolation", async () => {
  const value = "$(printf unsafe); spaced"
  const result = await runHarnessProcess(node, ["-e", "process.stdout.write(process.argv[1])", value])

  assert.equal(result.stdout, value)
})
