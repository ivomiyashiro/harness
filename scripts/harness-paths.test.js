import assert from 'node:assert/strict'
import { mkdtemp, mkdir, realpath, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { resolveInside } from './harness-paths.js'

test('resolves an existing path to its real path inside the boundary', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'harness-paths-'))
  await mkdir(path.join(root, 'safe'))

  assert.equal(await resolveInside(root, 'safe'), await realpath(path.join(root, 'safe')))
})

test('rejects traversal and symlink escapes', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'harness-paths-'))
  const outside = await mkdtemp(path.join(tmpdir(), 'harness-outside-'))
  await symlink(outside, path.join(root, 'escape'))

  await assert.rejects(resolveInside(root, '..'), /outside allowed boundary/)
  await assert.rejects(resolveInside(root, 'escape'), /outside allowed boundary/)
})
