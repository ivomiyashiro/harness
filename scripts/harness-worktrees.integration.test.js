#!/usr/bin/env node
import test from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawn, spawnSync } from "node:child_process"
import { runParallelTasks } from "./harness-worktrees.js"

function git(cwd, ...args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" })
  assert.equal(result.status, 0, result.stderr)
  return result.stdout.trim()
}

function commitTask(cwd, filename) {
  writeFileSync(join(cwd, filename), `${filename}\n`)
  return new Promise((resolve, reject) => {
    const child = spawn("git", ["add", filename], { cwd })
    child.on("error", reject)
    child.on("close", (addStatus) => {
      if (addStatus !== 0) return reject(new Error(`git add failed with status ${addStatus}`))
      const commit = spawn("git", ["commit", "-m", `feat: add ${filename}`], { cwd })
      commit.on("error", reject)
      commit.on("close", (status) => status === 0
        ? resolve()
        : reject(new Error(`git commit failed with status ${status}`)))
    })
  })
}

async function concurrentWorktreeFixture() {
  const root = mkdtempSync(join(tmpdir(), "harness-worktrees-"))
  const taskOne = `${root}-task-one`
  const taskTwo = `${root}-task-two`
  git(root, "init", "-b", "feature/concurrency")
  git(root, "config", "user.name", "Harness Test")
  git(root, "config", "user.email", "harness@example.test")
  writeFileSync(join(root, ".gitignore"), "ignored\n")
  git(root, "add", ".gitignore")
  git(root, "commit", "-m", "test: initialize fixture")
  git(root, "worktree", "add", "-b", "task/one", taskOne)
  git(root, "worktree", "add", "-b", "task/two", taskTwo)

  assert.notEqual(git(taskOne, "rev-parse", "--git-path", "index"), git(taskTwo, "rev-parse", "--git-path", "index"))
  await Promise.all([
    commitTask(taskOne, "task-one.txt"),
    commitTask(taskTwo, "task-two.txt"),
  ])

  const taskOneFiles = git(root, "diff-tree", "--no-commit-id", "--name-only", "-r", "task/one").split("\n")
  const taskTwoFiles = git(root, "diff-tree", "--no-commit-id", "--name-only", "-r", "task/two").split("\n")
  git(root, "cherry-pick", "task/one")
  git(root, "cherry-pick", "task/two")
  const integratedFiles = git(root, "diff", "--name-only", "HEAD~2", "HEAD").split("\n").sort()

  return { taskOneFiles, taskTwoFiles, integratedFiles }
}

test("AC-5 concurrent tasks use isolated indexes and integrate uncontaminated commits serially", async () => {
  const result = await concurrentWorktreeFixture()

  assert.deepEqual(result.taskOneFiles, ["task-one.txt"])
  assert.deepEqual(result.taskTwoFiles, ["task-two.txt"])
  assert.deepEqual(result.integratedFiles, ["task-one.txt", "task-two.txt"])
})

test("AC-5 creates task worktrees from a linked feature worktree", async () => {
  const root = mkdtempSync(join(tmpdir(), "harness-linked-feature-"))
  const feature = `${root}-feature`
  git(root, "init", "-b", "base")
  git(root, "config", "user.name", "Harness Test")
  git(root, "config", "user.email", "harness@example.test")
  git(root, "commit", "--allow-empty", "-m", "base")
  git(root, "worktree", "add", "-b", "feature/linked", feature)

  const seen = []
  const result = await runParallelTasks({
    repo: feature,
    tasks: ["one", "two"],
    runTask: async (_task, worktree) => seen.push(worktree),
  })

  assert.equal(result.mode, "isolated")
  assert.equal(new Set(seen).size, 2)
  assert.equal(git(feature, "rev-parse", "--is-inside-work-tree"), "true")
  for (const worktree of seen) assert.equal(git(worktree, "rev-parse", "--is-inside-work-tree"), "true")
})
