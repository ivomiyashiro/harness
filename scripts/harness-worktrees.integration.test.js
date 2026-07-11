#!/usr/bin/env node
import test from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawn, spawnSync } from "node:child_process"
import { executeParallelTasks, runParallelTasks, worktreeEntrypoint } from "./harness-worktrees.js"

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

function worktreesCli(cwd, ...args) {
  const result = spawnSync(process.execPath, [join(import.meta.dirname, "harness-worktrees.js"), ...args], { cwd, encoding: "utf8" })
  assert.equal(result.status, 0, result.stderr)
  return JSON.parse(result.stdout)
}

async function concurrentWorktreeFixture() {
  const root = mkdtempSync(join(tmpdir(), "harness-worktrees-"))
  git(root, "init", "-b", "feature/concurrency")
  git(root, "config", "user.name", "Harness Test")
  git(root, "config", "user.email", "harness@example.test")
  writeFileSync(join(root, ".gitignore"), "ignored\n")
  git(root, "add", ".gitignore")
  git(root, "commit", "-m", "test: initialize fixture")
  const statePath = join(root, "integration.json")
  const prepared = worktreesCli(root, "prepare", "--repo", root, "--state", statePath, "--task", "one", "--task", "two")
  await Promise.all(prepared.results.map(({ task, worktree }) => commitTask(worktree, `task-${task}.txt`)))
  const commits = prepared.worktrees.map((worktree) => git(worktree, "rev-parse", "HEAD"))
  const integration = worktreesCli(root, "integrate", "--repo", root, "--state", statePath, ...commits.flatMap((commit) => ["--commit", commit]))
  const result = { ...prepared, commits, integration }
  assert.notEqual(git(result.worktrees[0], "rev-parse", "--git-path", "index"), git(result.worktrees[1], "rev-parse", "--git-path", "index"))
  const taskOneFiles = git(root, "diff-tree", "--no-commit-id", "--name-only", "-r", result.commits[0]).split("\n")
  const taskTwoFiles = git(root, "diff-tree", "--no-commit-id", "--name-only", "-r", result.commits[1]).split("\n")
  const integratedFiles = git(root, "diff", "--name-only", "HEAD~2", "HEAD").split("\n").sort()

  return { taskOneFiles, taskTwoFiles, integratedFiles, result }
}

test("AC-5 concurrent tasks use isolated indexes and integrate uncontaminated commits serially", async () => {
  const result = await concurrentWorktreeFixture()

  assert.deepEqual(result.taskOneFiles, ["task-one.txt"])
  assert.deepEqual(result.taskTwoFiles, ["task-two.txt"])
  assert.deepEqual(result.integratedFiles, ["task-one.txt", "task-two.txt"])
  assert.deepEqual(result.result.integration.integrated, result.result.commits)
})

test("FR-4 entrypoint falls back sequentially before tasks and integration conflicts stay checkpointed", async () => {
  const root = mkdtempSync(join(tmpdir(), "harness-worktrees-fallback-"))
  git(root, "init", "-b", "feature/fallback")
  git(root, "config", "user.name", "Harness Test")
  git(root, "config", "user.email", "harness@example.test")
  writeFileSync(join(root, "value"), "base\n")
  git(root, "add", "value")
  git(root, "commit", "-m", "base")
  const base = git(root, "rev-parse", "HEAD")
  writeFileSync(join(root, "value"), "task\n")
  git(root, "commit", "-am", "task")
  const task = git(root, "rev-parse", "HEAD")
  git(root, "reset", "--hard", base)
  writeFileSync(join(root, "value"), "feature\n")
  git(root, "commit", "-am", "feature")
  const before = git(root, "rev-parse", "HEAD")
  const statePath = join(root, "integration.json")
  const fallback = await worktreeEntrypoint(["prepare", "--repo", root, "--state", statePath, "--task", "one", "--task", "two"], {
    createWorktree: async () => { throw new Error("isolation unavailable") },
  })
  assert.equal(fallback.mode, "sequential-fallback")
  assert.deepEqual(fallback.results, [{ task: "one", worktree: root }, { task: "two", worktree: root }])
  const conflict = spawnSync(process.execPath, [join(import.meta.dirname, "harness-worktrees.js"), "integrate", "--repo", root, "--state", statePath, "--commit", task], { encoding: "utf8" })
  assert.equal(conflict.status, 1)
  assert.equal(git(root, "rev-parse", "HEAD"), before)
  assert.equal(JSON.parse(readFileSync(statePath, "utf8")).pending, task)
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

test("AC-6 integration state checkpoints successful sibling commits when a parallel task fails", async () => {
  const root = mkdtempSync(join(tmpdir(), "harness-partial-failure-"))
  git(root, "init", "-b", "feature/failure")
  git(root, "config", "user.name", "Harness Test")
  git(root, "config", "user.email", "harness@example.test")
  git(root, "commit", "--allow-empty", "-m", "base")
  const statePath = join(root, "integration.json")
  await assert.rejects(executeParallelTasks({
    repo: root,
    tasks: ["good", "bad"],
    statePath,
    runTask: async (task, worktree) => {
      if (task === "bad") throw new Error("task failed")
      await commitTask(worktree, "good.txt")
    },
  }), /successful sibling commit.*checkpointed/)
  const state = JSON.parse(readFileSync(statePath, "utf8"))
  assert.equal(state.pendingCommits.length, 1)
  assert.equal(git(root, "cat-file", "-t", state.pendingCommits[0]), "commit")
  assert.equal(git(root, "rev-parse", "HEAD^{tree}"), git(root, "rev-parse", "HEAD^{tree}"))
})
