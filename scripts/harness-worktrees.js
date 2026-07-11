import { spawn } from 'node:child_process';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
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
  const root = path.join(repo, '.git', 'harness-task-worktrees');
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
  } catch {
    for (const worktree of worktrees) {
      await runChild('git', ['worktree', 'remove', '--force', worktree], { cwd: repo }).catch(() => {});
    }
    const results = [];
    for (const task of tasks) results.push(await runTask(task, repo));
    return { mode: 'sequential', results };
  }

  const results = await Promise.all(tasks.map((task, index) => runTask(task, worktrees[index])));
  return { mode: 'isolated', results, worktrees };
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
  const temporary = `${statePath}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(state)}\n`, { flag: 'wx' });
  await rename(temporary, statePath);
}

export async function integrateTaskCommits({ repo, commits, statePath }) {
  const state = await loadState(statePath);
  for (const commit of commits) {
    if (state.integrated.includes(commit)) continue;
    state.pending = commit;
    await saveState(statePath, state);
    try {
      await runChild('git', ['cherry-pick', commit], { cwd: repo });
    } catch (error) {
      await runChild('git', ['cherry-pick', '--abort'], { cwd: repo }).catch(() => {});
      const conflict = new Error(`integration conflict at ${commit}: ${error.message}`);
      conflict.cause = error;
      throw conflict;
    }
    state.integrated.push(commit);
    state.pending = null;
    await saveState(statePath, state);
  }
  return state;
}
