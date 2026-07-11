#!/usr/bin/env node
import test from "node:test"
import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { promisify } from "node:util"

import { assertResumeIdentity } from "./harness-state.js"

const exec = promisify(execFile)

async function git(cwd, ...args) {
  const { stdout } = await exec("git", args, { cwd })
  return stdout.trim()
}

async function fixture(t) {
  const repository = await mkdtemp(path.join(tmpdir(), "harness-resume-"))
  t.after(() => rm(repository, { recursive: true, force: true }))
  await git(repository, "init", "-b", "trunk")
  await git(repository, "config", "user.email", "harness@example.test")
  await git(repository, "config", "user.name", "Harness Test")
  await writeFile(path.join(repository, "README.md"), "fixture\n")
  await git(repository, "add", "README.md")
  await git(repository, "commit", "-m", "fixture")

  const declared = path.join(repository, ".worktrees", "declared")
  const other = path.join(repository, ".worktrees", "other")
  await git(repository, "worktree", "add", "-b", "feature/declared", declared)
  await git(repository, "worktree", "add", "-b", "feature/other", other)
  const canonicalRepository = await realpath(repository)
  const stateFile = path.join(declared, ".harness-state.json")
  const persisted = { worktree: await realpath(declared), branch: "feature/declared" }
  await writeFile(stateFile, `${JSON.stringify(persisted)}\n`)

  return { repository: canonicalRepository, declared, other: await realpath(other), stateFile, persisted }
}

async function snapshot({ repository, declared, stateFile }) {
  return {
    state: await readFile(stateFile, "utf8"),
    refs: await git(repository, "show-ref"),
    head: await git(declared, "rev-parse", "HEAD"),
    status: await git(declared, "status", "--porcelain=v1"),
  }
}

test("AC-4 rejects a resume outside the declared real worktree without mutation", async (t) => {
  const context = await fixture(t)
  const before = await snapshot(context)

  await assert.rejects(
    assertResumeIdentity(context.persisted, { worktree: context.other, branch: "feature/other" }, context.repository),
    /resume worktree mismatch/,
  )

  assert.deepEqual(await snapshot(context), before)
})

test("AC-4 rejects a resume on the wrong branch without mutation", async (t) => {
  const context = await fixture(t)
  await git(context.declared, "switch", "-c", "feature/wrong")
  const actualBranch = await git(context.declared, "branch", "--show-current")
  const before = await snapshot(context)

  await assert.rejects(
    assertResumeIdentity(context.persisted, { worktree: context.persisted.worktree, branch: actualBranch }, context.repository),
    /resume branch mismatch/,
  )

  assert.deepEqual(await snapshot(context), before)
})
