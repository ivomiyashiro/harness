import { createHash, randomUUID } from "node:crypto";
import { open, readFile, rename, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function runGit(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0
      ? resolve(stdout)
      : reject(new Error(stderr.trim() || `git exited with status ${code}`)));
  });
}

export async function resolveDefaultBranch({ git = runGit } = {}) {
  try {
    const ref = (await git([
      "symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD",
    ])).trim();
    const match = /^(?:refs\/remotes\/)?origin\/([^/]+)$/.exec(ref);
    if (match) return match[1];
  } catch {
    // The actionable error below is stable across Git versions.
  }
  throw new Error("Unable to determine repository default branch; configure origin/HEAD to an unambiguous branch");
}

export function registryRevision(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function acquireLock(lockPath, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (true) {
    try {
      return await open(lockPath, "wx");
    } catch (error) {
      if (error.code !== "EEXIST" || Date.now() >= deadline) {
        throw new Error(`Unable to acquire registry lock: ${error.message}`);
      }
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
}) {
  const branch = defaultBranch ?? await resolveDefaultBranch({ git });
  const lockPath = `${registryPath}.lock`;
  const lock = await acquireLock(lockPath, lockTimeoutMs);
  const temporaryPath = `${registryPath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    let current;
    try {
      current = await readFile(registryPath, "utf8");
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
    await rename(temporaryPath, registryPath);
    return { status: "updated", branch, revision: registryRevision(next) };
  } finally {
    await rm(temporaryPath, { force: true });
    await lock.close();
    await rm(lockPath, { force: true });
  }
}
