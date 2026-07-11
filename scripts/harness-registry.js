import { createHash, randomUUID } from "node:crypto";
import { open, readFile, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { runHarnessProcess } from "./harness-process.js";

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function runGit(args) {
  return (await runHarnessProcess("git", args)).stdout;
}

async function registryPathOnBranch(registryPath, branch, git) {
  const root = await realpath((await git(["rev-parse", "--show-toplevel"])).trim());
  const canonicalRegistryPath = await realpath(registryPath);
  const relative = path.relative(root, canonicalRegistryPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Registry path is outside repository");
  const lines = (await git(["worktree", "list", "--porcelain"])).split(/\r?\n/);
  let worktree;
  for (let index = 0; index < lines.length; index++) {
    if (lines[index] === `branch refs/heads/${branch}`) worktree = lines[index - 1]?.replace(/^worktree /, "");
  }
  if (!worktree) throw new Error(`Default branch ${branch} has no checked-out worktree`);
  const canonicalWorktree = await realpath(worktree);
  return path.join(canonicalWorktree, relative);
}

export function validateDefaultBranch(branch) {
  if (typeof branch !== "string"
    || branch.startsWith("-")
    || branch.includes("..")
    || branch.includes("//")
    || branch.includes("@{")
    || !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(branch)
    || branch.endsWith("/")
    || branch.endsWith(".")
    || branch.endsWith(".lock")
    || branch.split("/").some((segment) => segment.startsWith("."))) {
    throw new TypeError("Invalid default branch");
  }
  return branch;
}

export async function resolveDefaultBranch({ git = runGit } = {}) {
  try {
    const ref = (await git([
      "symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD",
    ])).trim();
    const match = /^(?:refs\/remotes\/)?origin\/(.+)$/.exec(ref);
    if (match) return validateDefaultBranch(match[1]);
  } catch {
    // The actionable error below is stable across Git versions.
  }
  throw new Error("Unable to determine repository default branch; configure origin/HEAD to an unambiguous branch");
}

export function registryRevision(content) {
  return createHash("sha256").update(content).digest("hex");
}

function processIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

async function removeStaleLock(lockPath, staleLockMs) {
  let metadata;
  try {
    metadata = JSON.parse(await readFile(lockPath, "utf8"));
  } catch {
    let age;
    try {
      age = Date.now() - (await stat(lockPath)).mtimeMs;
    } catch (error) {
      if (error.code === "ENOENT") return false;
      throw error;
    }
    if (age < staleLockMs) return false;
    metadata = null;
  }
  if (metadata && (!Number.isSafeInteger(metadata.pid) || metadata.pid <= 0 || processIsAlive(metadata.pid))) return false;

  const stalePath = `${lockPath}.stale.${process.pid}.${randomUUID()}`;
  try {
    await rename(lockPath, stalePath);
    await rm(stalePath, { force: true });
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function acquireLock(lockPath, timeoutMs, staleLockMs) {
  const deadline = Date.now() + timeoutMs;
  while (true) {
    try {
      const lock = await open(lockPath, "wx");
      await lock.writeFile(JSON.stringify({ pid: process.pid }));
      return lock;
    } catch (error) {
      if (error.code !== "EEXIST" || Date.now() >= deadline) {
        throw new Error(`Unable to acquire registry lock: ${error.message}`);
      }
      await removeStaleLock(lockPath, staleLockMs);
      await wait(10);
    }
  }
}

export async function updateRegistry({
  registryPath,
  expectedRevision,
  content,
  transform,
  defaultBranch,
  git,
  lockTimeoutMs = 5000,
  staleLockMs = 30000,
}) {
  const gitRunner = git ?? runGit;
  const branch = defaultBranch === undefined
    ? await resolveDefaultBranch({ git: gitRunner })
    : validateDefaultBranch(defaultBranch);
  const targetPath = defaultBranch ? registryPath : await registryPathOnBranch(registryPath, branch, gitRunner);
  const lockPath = `${targetPath}.lock`;
  const lock = await acquireLock(lockPath, lockTimeoutMs, staleLockMs);
  const temporaryPath = `${targetPath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    let current;
    try {
      current = await readFile(targetPath, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      current = "";
    }
    const revision = registryRevision(current);
    if (expectedRevision !== undefined && expectedRevision !== revision) {
      return { status: "stale-revision", branch, revision };
    }
    const next = transform ? await transform(current) : content;
    if (typeof next !== "string") throw new TypeError("Registry update must produce string content");
    await writeFile(temporaryPath, next, { flag: "wx" });
    await rename(temporaryPath, targetPath);
    return { status: "updated", branch, revision: registryRevision(next) };
  } finally {
    await rm(temporaryPath, { force: true });
    await lock.close();
    await rm(lockPath, { force: true });
  }
}
