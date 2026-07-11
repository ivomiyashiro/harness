import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  integrateTaskCommits,
  runChild,
  runParallelTasks,
} from './harness-worktrees.js';

async function tempRepo() {
  const repo = await mkdtemp(path.join(tmpdir(), 'harness-worktrees-'));
  await runChild('git', ['init', '-q', '-b', 'feature'], { cwd: repo });
  await runChild('git', ['config', 'user.email', 'test@example.com'], { cwd: repo });
  await runChild('git', ['config', 'user.name', 'Test'], { cwd: repo });
  await runChild('git', ['commit', '--allow-empty', '-qm', 'base'], { cwd: repo });
  return repo;
}

test('runChild propagates non-zero exits and cleans up exactly once', async () => {
  let cleanups = 0;
  await assert.rejects(
    runChild(process.execPath, ['-e', 'process.exit(7)'], { cleanup: () => cleanups++ }),
    /exited with code 7/,
  );
  assert.equal(cleanups, 1);
});

test('runChild enforces timeout and cleans up exactly once', async () => {
  let cleanups = 0;
  await assert.rejects(
    runChild(process.execPath, ['-e', 'setTimeout(() => {}, 10000)'], {
      cleanup: () => cleanups++, timeoutMs: 20,
    }),
    /timed out/,
  );
  assert.equal(cleanups, 1);
});

test('parallel tasks use distinct worktrees and report isolation failure', async () => {
  const repo = await tempRepo();
  const seen = [];
  const isolated = await runParallelTasks({
    repo, tasks: ['07', '08'],
    runTask: async (task, worktree) => seen.push([task, worktree]),
  });
  assert.equal(new Set(seen.map(([, worktree]) => worktree)).size, 2);
  assert.equal(isolated.mode, 'isolated');

  const fallbackSeen = [];
  const fallback = await runParallelTasks({
    repo, tasks: ['09', '10'], createWorktree: async () => { throw new Error('no space'); },
    runTask: async (task, worktree) => fallbackSeen.push([task, worktree]),
  });
  assert.equal(fallback.mode, 'sequential-fallback');
  assert.deepEqual(fallbackSeen, [['09', repo], ['10', repo]]);
});

test('serial integration records progress and resume skips integrated commits', async () => {
  const repo = await tempRepo();
  const statePath = path.join(repo, 'integration.json');
  const base = (await runChild('git', ['rev-parse', 'HEAD'], { cwd: repo })).stdout.trim();
  await writeFile(path.join(repo, 'one'), 'one\n');
  await runChild('git', ['add', 'one'], { cwd: repo });
  await runChild('git', ['commit', '-qm', 'task one'], { cwd: repo });
  const first = (await runChild('git', ['rev-parse', 'HEAD'], { cwd: repo })).stdout.trim();
  await runChild('git', ['reset', '--hard', '-q', base], { cwd: repo });
  await writeFile(path.join(repo, 'two'), 'two\n');
  await runChild('git', ['add', 'two'], { cwd: repo });
  await runChild('git', ['commit', '-qm', 'task two'], { cwd: repo });
  const second = (await runChild('git', ['rev-parse', 'HEAD'], { cwd: repo })).stdout.trim();
  await runChild('git', ['reset', '--hard', '-q', base], { cwd: repo });

  await integrateTaskCommits({ repo, commits: [first, second], statePath });
  const state = JSON.parse(await readFile(statePath, 'utf8'));
  assert.deepEqual(state, { integrated: [first, second], pending: null });
  const head = (await runChild('git', ['rev-parse', 'HEAD'], { cwd: repo })).stdout.trim();
  await integrateTaskCommits({ repo, commits: [first, second], statePath });
  assert.equal((await runChild('git', ['rev-parse', 'HEAD'], { cwd: repo })).stdout.trim(), head);
});

test('integration conflict stops before advancing and persists exact pending commit', async () => {
  const repo = await tempRepo();
  const statePath = path.join(repo, 'integration.json');
  await writeFile(path.join(repo, 'value'), 'base\n');
  await runChild('git', ['add', 'value'], { cwd: repo });
  await runChild('git', ['commit', '-qm', 'base value'], { cwd: repo });
  const base = (await runChild('git', ['rev-parse', 'HEAD'], { cwd: repo })).stdout.trim();
  await writeFile(path.join(repo, 'value'), 'task\n');
  await runChild('git', ['commit', '-qam', 'task'], { cwd: repo });
  const taskCommit = (await runChild('git', ['rev-parse', 'HEAD'], { cwd: repo })).stdout.trim();
  await runChild('git', ['reset', '--hard', '-q', base], { cwd: repo });
  await writeFile(path.join(repo, 'value'), 'feature\n');
  await runChild('git', ['commit', '-qam', 'feature'], { cwd: repo });
  const before = (await runChild('git', ['rev-parse', 'HEAD'], { cwd: repo })).stdout.trim();

  await assert.rejects(integrateTaskCommits({ repo, commits: [taskCommit], statePath }), /conflict/);
  assert.equal((await runChild('git', ['rev-parse', 'HEAD'], { cwd: repo })).stdout.trim(), before);
  assert.deepEqual(JSON.parse(await readFile(statePath, 'utf8')), { integrated: [], pending: taskCommit });
});
