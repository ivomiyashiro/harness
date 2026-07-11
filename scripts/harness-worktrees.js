import { spawn } from 'node:child_process';
import { lstat, mkdir, open, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

export function runChild(command, args, options = {}) {
  const { cleanup = () => {}, timeoutMs = 30_000, ...spawnOptions } = options;
  return new Promise((resolve, reject) => {
    let output = '';
    let errorOutput = '';
    let settled = false;
    const child = spawn(command, args, { ...spawnOptions, stdio: ['ignore', 'pipe', 'pipe'] });
    const finish = async (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { await cleanup(); } catch (cleanupError) { error ||= cleanupError; }
      error ? reject(error) : resolve(value);
    };
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { errorOutput += chunk; });
    child.on('error', error => finish(error));
    child.on('close', code => finish(
      code === 0 ? null : new Error(`${command} exited with code ${code}: ${errorOutput.trim()}`),
      { stdout: output, stderr: errorOutput },
    ));
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish(new Error(`${command} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
}

async function defaultCreateWorktree(repo, task) {
  const commonDirOutput = await runChild(
    'git',
    ['rev-parse', '--path-format=absolute', '--git-common-dir'],
    { cwd: repo },
  );
  const commonDir = await realpath(commonDirOutput.stdout.trim());
  const root = path.join(commonDir, 'harness-task-worktrees');
  await mkdir(root, { recursive: true });
  const worktree = path.join(root, `${task}-${process.pid}-${Date.now()}`);
  const branch = `harness-task-${task}-${process.pid}-${Date.now()}`;
  await runChild('git', ['worktree', 'add', '-q', '-b', branch, worktree, 'HEAD'], { cwd: repo });
  return worktree;
}

export async function runParallelTasks({ repo, tasks, runTask, createWorktree = defaultCreateWorktree }) {
  const worktrees = [];
  try {
    for (const task of tasks) worktrees.push(await createWorktree(repo, task));
  } catch (error) {
    const cleanupFailures = [];
    for (const worktree of worktrees) {
      try {
        await runChild('git', ['worktree', 'remove', '--force', worktree], { cwd: repo });
      } catch (cleanupError) {
        cleanupFailures.push({ worktree, cleanupError });
      }
    }
    if (cleanupFailures.length) {
      const retained = cleanupFailures.map(({ worktree }) => worktree).join(', ');
      const cleanupError = new Error(`worktree cleanup failed; retained worktree(s): ${retained}; remove them and retry before sequential fallback`);
      cleanupError.cause = cleanupFailures[0].cleanupError;
      cleanupError.isolationError = error;
      throw cleanupError;
    }
    const results = [];
    for (const task of tasks) results.push(await runTask(task, repo));
    return { mode: 'sequential-fallback', results, worktrees: tasks.map(() => repo), isolationError: error.message };
  }

  const results = await Promise.all(tasks.map((task, index) => runTask(task, worktrees[index])));
  return { mode: 'isolated', results, worktrees };
}

export async function executeParallelTasks({ repo, tasks, runTask, statePath, createWorktree = defaultCreateWorktree }) {
  if (!statePath) throw new Error('integration state path is required');
  const base = (await runChild('git', ['rev-parse', 'HEAD'], { cwd: repo })).stdout.trim();
  const execution = await runParallelTasks({
    repo,
    tasks,
    createWorktree,
    runTask: async (...args) => {
      try { return { status: 'fulfilled', value: await runTask(...args) }; }
      catch (reason) { return { status: 'rejected', reason }; }
    },
  });
  if (execution.mode === 'sequential-fallback') return { ...execution, commits: [], integration: null };
  const commits = [];
  for (let index = 0; index < execution.worktrees.length; index++) {
    if (execution.results[index].status === 'rejected') continue;
    const worktree = execution.worktrees[index];
    const commit = (await runChild('git', ['rev-parse', 'HEAD'], { cwd: worktree })).stdout.trim();
    if (commit === base) throw new Error(`task completed without a commit: ${worktree}`);
    commits.push(commit);
  }
  const failures = execution.results.filter((result) => result.status === 'rejected');
  if (failures.length) {
    await updateState(statePath, (state) => ({
      ...state,
      pendingCommits: [...new Set([...(state.pendingCommits ?? []), ...commits])],
    }));
    const error = new Error(`parallel task failure; ${commits.length} successful sibling commit(s) checkpointed for integration`);
    error.cause = failures[0].reason;
    throw error;
  }
  const integration = await integrateTaskCommits({ repo, commits, statePath });
  return { ...execution, commits, integration };
}

async function loadState(statePath) {
  try {
    return JSON.parse(await readFile(statePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return { integrated: [], pending: null };
    throw error;
  }
}

async function saveState(statePath, state) {
  const temporary = `${statePath}.${process.pid}.${Date.now()}.${Math.random()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(state)}\n`, { flag: 'wx' });
  await rename(temporary, statePath);
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function updateState(statePath, transform) {
  return withStateLock(statePath, async () => {
    const current = await loadState(statePath);
    const next = await transform(current);
    await saveState(statePath, next);
    return next;
  });
}

async function withStateLock(statePath, operation) {
  const lockPath = `${statePath}.lock`;
  let lock;
  for (let attempts = 0; !lock; attempts++) {
    try { lock = await open(lockPath, 'wx'); }
    catch (error) {
      if (error.code !== 'EEXIST' || attempts >= 500) throw new Error(`unable to acquire integration state lock: ${error.message}`);
      await wait(10);
    }
  }
  try {
    return await operation();
  } finally {
    await lock.close();
    await rm(lockPath, { force: true });
  }
}

export async function integrateTaskCommits({ repo, commits, statePath, run = runChild }) {
  return withStateLock(statePath, async () => {
    let state = await loadState(statePath);
    for (const commit of commits) {
      if ((state.integrated ?? []).includes(commit)) continue;
      state = { ...state, integrated: state.integrated ?? [], pending: commit };
      await saveState(statePath, state);
      try {
        await run('git', ['cherry-pick', commit], { cwd: repo });
      } catch (error) {
        try {
          await run('git', ['cherry-pick', '--abort'], { cwd: repo });
        } catch (abortError) {
          state = { ...state, recoveryError: `cherry-pick --abort failed: ${abortError.message}` };
          await saveState(statePath, state);
          const recoveryFailure = new Error(`integration conflict at ${commit}; cherry-pick --abort failed: ${abortError.message}`);
          recoveryFailure.cause = error;
          recoveryFailure.abortError = abortError;
          throw recoveryFailure;
        }
        const conflict = new Error(`integration conflict at ${commit}: ${error.message}`);
        conflict.cause = error;
        throw conflict;
      }
      const pendingCommits = state.pendingCommits?.filter((pending) => pending !== commit);
      state = {
        ...state,
        integrated: [...new Set([...(state.integrated ?? []), commit])],
        pending: null,
        recoveryError: undefined,
        ...(pendingCommits === undefined ? {} : { pendingCommits }),
      };
      await saveState(statePath, state);
    }
    return state;
  });
}

export async function checkpointTaskCommits({ commits, statePath }) {
  return updateState(statePath, (state) => ({
    ...state,
    pendingCommits: [...new Set([...(state.pendingCommits ?? []), ...commits])],
  }));
}

function parseCliArgs(args) {
  const [operation, ...rest] = args;
  const values = { tasks: [], commits: [] };
  for (let index = 0; index < rest.length; index += 2) {
    const flag = rest[index];
    const value = rest[index + 1];
    if (!value || !['--repo', '--state', '--task', '--commit'].includes(flag)) throw new Error('invalid worktree arguments');
    if (flag === '--task') values.tasks.push(value);
    else if (flag === '--commit') values.commits.push(value);
    else values[flag.slice(2)] = value;
  }
  if (!values.repo || !values.state) throw new Error('repo and state are required');
  return { operation, ...values };
}

async function canonicalCliOptions(options) {
  for (const [label, value] of [['repo', options.repo], ['state', options.state]]) {
    if (value.split(/[\\/]/).includes('..')) throw new Error(`${label} must not contain traversal`);
  }
  const requestedRepo = path.resolve(options.repo);
  const repo = await realpath(requestedRepo);
  if (repo !== requestedRepo) throw new Error('repo must be a canonical path without symlinks');
  const gitRoot = await realpath((await runChild('git', ['rev-parse', '--show-toplevel'], { cwd: repo })).stdout.trim());
  if (gitRoot !== repo) throw new Error('repo must identify the current worktree root');

  const requestedState = path.resolve(options.state);
  const stateParent = await realpath(path.dirname(requestedState));
  const state = path.join(stateParent, path.basename(requestedState));
  const relative = path.relative(repo, state);
  if (state !== requestedState || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('state must be a canonical path inside repo without symlinks');
  }
  try {
    if ((await lstat(state)).isSymbolicLink()) throw new Error('state must not be a symlink');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (options.tasks.some((task) => !/^\d{2}$/.test(task))) throw new Error('task must be a two-digit plan task number');
  if (options.commits.some((commit) => !/^[0-9a-f]{40,64}$/.test(commit))) throw new Error('commit must be a canonical object id');
  return { ...options, repo, state };
}

export async function worktreeEntrypoint(args, { createWorktree = defaultCreateWorktree } = {}) {
  const options = await canonicalCliOptions(parseCliArgs(args));
  if (options.operation === 'prepare') {
    return runParallelTasks({
      repo: options.repo,
      tasks: options.tasks,
      createWorktree,
      runTask: async (task, worktree) => ({ task, worktree }),
    });
  }
  if (options.operation === 'integrate') {
    return integrateTaskCommits({ repo: options.repo, commits: options.commits, statePath: options.state });
  }
  if (options.operation === 'checkpoint') {
    return checkpointTaskCommits({ commits: options.commits, statePath: options.state });
  }
  throw new Error('operation must be prepare, checkpoint, or integrate');
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  worktreeEntrypoint(process.argv.slice(2)).then(
    (result) => process.stdout.write(`${JSON.stringify(result)}\n`),
    (error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; },
  );
}
