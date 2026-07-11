import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { integrateTaskCommits, runChild } from './harness-worktrees.js';

async function tempRepo() {
  const repo = await mkdtemp(path.join(tmpdir(), 'harness-integration-recovery-'));
  await runChild('git', ['init', '-q', '-b', 'feature'], { cwd: repo });
  await runChild('git', ['config', 'user.email', 'test@example.com'], { cwd: repo });
  await runChild('git', ['config', 'user.name', 'Test'], { cwd: repo });
  await writeFile(path.join(repo, 'value'), 'base\n');
  await runChild('git', ['add', 'value'], { cwd: repo });
  await runChild('git', ['commit', '-qm', 'base'], { cwd: repo });
  return repo;
}

test('conflict recovery preserves successful integration and exact pending commit', async () => {
  const repo = await tempRepo();
  const statePath = path.join(repo, 'integration.json');
  const base = (await runChild('git', ['rev-parse', 'HEAD'], { cwd: repo })).stdout.trim();

  await writeFile(path.join(repo, 'successful'), 'kept\n');
  await runChild('git', ['add', 'successful'], { cwd: repo });
  await runChild('git', ['commit', '-qm', 'successful task'], { cwd: repo });
  const successful = (await runChild('git', ['rev-parse', 'HEAD'], { cwd: repo })).stdout.trim();
  await runChild('git', ['branch', 'task-successful', successful], { cwd: repo });

  await runChild('git', ['reset', '--hard', '-q', base], { cwd: repo });
  await writeFile(path.join(repo, 'value'), 'task conflict\n');
  await runChild('git', ['commit', '-qam', 'conflicting task'], { cwd: repo });
  const conflicting = (await runChild('git', ['rev-parse', 'HEAD'], { cwd: repo })).stdout.trim();
  await runChild('git', ['branch', 'task-conflicting', conflicting], { cwd: repo });

  await runChild('git', ['reset', '--hard', '-q', base], { cwd: repo });
  await writeFile(path.join(repo, 'value'), 'feature change\n');
  await runChild('git', ['commit', '-qam', 'feature change'], { cwd: repo });

  await assert.rejects(
    integrateTaskCommits({ repo, commits: [successful, conflicting], statePath }),
    /conflict/,
  );

  const integrationHead = (await runChild('git', ['rev-parse', 'HEAD'], { cwd: repo })).stdout.trim();
  assert.equal((await readFile(path.join(repo, 'successful'), 'utf8')), 'kept\n');
  assert.equal((await readFile(path.join(repo, 'value'), 'utf8')), 'feature change\n');
  assert.equal((await runChild('git', ['rev-parse', 'task-successful'], { cwd: repo })).stdout.trim(), successful);
  assert.notEqual(integrationHead, conflicting);
  assert.deepEqual(JSON.parse(await readFile(statePath, 'utf8')), {
    integrated: [successful],
    pending: conflicting,
  });
});
