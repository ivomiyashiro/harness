import { spawn } from 'node:child_process';
import { mkdir, readFile, realpath, rename, writeFile } from 'node:fs/promises';
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
    for (const worktree of worktrees) {
      await runChild('git', ['worktree', 'remove', '--force', worktree], { cwd: repo }).catch(() => {});
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
  const execution = await runParallelTasks({ repo, tasks, runTask, createWorktree });
  if (execution.mode === 'sequential-fallback') return { ...execution, commits: [], integration: null };
  const commits = [];
  for (const worktree of execution.worktrees) {
    const commit = (await runChild('git', ['rev-parse', 'HEAD'], { cwd: worktree })).stdout.trim();
    if (commit === base) throw new Error(`task completed without a commit: ${worktree}`);
    commits.push(commit);
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

export async function worktreeEntrypoint(args, { createWorktree = defaultCreateWorktree } = {}) {
  const options = parseCliArgs(args);
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
  throw new Error('operation must be prepare or integrate');
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  worktreeEntrypoint(process.argv.slice(2)).then(
    (result) => process.stdout.write(`${JSON.stringify(result)}\n`),
    (error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; },
  );
}
