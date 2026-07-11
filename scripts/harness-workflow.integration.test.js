import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, realpath, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const exec = promisify(execFile);
const workflow = new URL("./harness-workflow.js", import.meta.url).pathname;

async function git(cwd, ...args) { return (await exec("git", args, { cwd })).stdout.trim(); }

test("AC-4 resume workflow entrypoint rejects wrong branch before mutation", async () => {
  const repository = await mkdtemp(path.join(os.tmpdir(), "workflow-resume-"));
  await git(repository, "init", "-b", "trunk");
  await git(repository, "config", "user.email", "test@example.test");
  await git(repository, "config", "user.name", "Test");
  await writeFile(path.join(repository, "tracked"), "before\n");
  await git(repository, "add", "tracked");
  await git(repository, "commit", "-m", "fixture");
  const state = path.join(repository, "identity.json");
  await writeFile(state, JSON.stringify({ worktree: await realpath(repository), branch: "feature/expected" }));
  const before = await git(repository, "status", "--porcelain=v1");

  await assert.rejects(exec(process.execPath, [workflow, "resume-identity", "--state", state, "--repository", repository], { cwd: repository }), /resume branch mismatch/);
  assert.equal(await git(repository, "status", "--porcelain=v1"), before);
});

test("FR-5 registry workflow entrypoint performs CAS and rejects stale rewrite", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "workflow-registry-"));
  const registry = path.join(directory, "_active.md");
  const candidate = path.join(directory, "candidate.md");
  await writeFile(registry, "winner\n");
  await writeFile(candidate, "loser\n");

  const { stdout } = await exec(process.execPath, [workflow, "update-registry", "--registry", registry, "--content-file", candidate, "--expected-revision", "stale", "--default-branch", "trunk"], { cwd: directory });
  assert.equal(JSON.parse(stdout).status, "stale-revision");
  assert.equal(await readFile(registry, "utf8"), "winner\n");
});
