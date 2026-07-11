import assert from 'node:assert/strict'
import { mkdtemp, mkdir, realpath, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { resolveInside } from './harness-paths.js'

test('accepts a real path inside the repository boundary', async () => {
  const repository = await mkdtemp(path.join(tmpdir(), 'harness-repository-'))
  const worktree = path.join(repository, 'worktree')
  await mkdir(worktree)

  assert.equal(await resolveInside(repository, worktree), await realpath(worktree))
})

test('rejects a real path outside the repository boundary', async () => {
  const repository = await mkdtemp(path.join(tmpdir(), 'harness-repository-'))
  const outside = await mkdtemp(path.join(tmpdir(), 'harness-outside-'))

  await assert.rejects(resolveInside(repository, outside), /outside allowed boundary/)
})

test('rejects an artifact path that escapes its worktree through a symlink', async () => {
  const repository = await mkdtemp(path.join(tmpdir(), 'harness-repository-'))
  const worktree = path.join(repository, 'worktree')
  const outside = await mkdtemp(path.join(tmpdir(), 'harness-outside-'))
  await mkdir(worktree)
  await symlink(outside, path.join(worktree, 'artifact'))

  await assert.rejects(resolveInside(worktree, 'artifact'), /outside allowed boundary/)
})
