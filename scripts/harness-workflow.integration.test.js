import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, symlink, writeFile } from "node:fs/promises";
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
  await writeFile(state, `worktree: ${await realpath(repository)}\nbranch: feature/expected\n`);
  const before = await git(repository, "status", "--porcelain=v1");

  await assert.rejects(exec(process.execPath, [workflow, "resume-identity", "--state", state, "--repository", repository], { cwd: repository }), /resume branch mismatch/);
  assert.equal(await git(repository, "status", "--porcelain=v1"), before);
});

test("AC-4 resume workflow entrypoint accepts canonical persisted identity", async () => {
  const repository = await mkdtemp(path.join(os.tmpdir(), "workflow-resume-ok-"));
  await git(repository, "init", "-b", "feature/expected");
  const state = path.join(repository, "identity.md");
  await writeFile(state, `worktree: ${await realpath(repository)}\nbranch: feature/expected\n`);

  const { stdout } = await exec(process.execPath, [workflow, "resume-identity", "--state", state, "--repository", repository], { cwd: repository });

  assert.deepEqual(JSON.parse(stdout), { status: "identity-ok" });
});

test("AC-4 resume workflow entrypoint rejects worktree mismatch before mutation", async () => {
  const repository = await mkdtemp(path.join(os.tmpdir(), "workflow-resume-worktree-"));
  await git(repository, "init", "-b", "trunk");
  await git(repository, "config", "user.email", "test@example.test");
  await git(repository, "config", "user.name", "Test");
  await writeFile(path.join(repository, "tracked"), "before\n");
  await git(repository, "add", "tracked");
  await git(repository, "commit", "-m", "fixture");
  const other = path.join(repository, ".worktrees", "other");
  await git(repository, "worktree", "add", "-b", "feature/other", other);
  const state = path.join(repository, "identity.md");
  await writeFile(state, `worktree: ${await realpath(repository)}\nbranch: trunk\n`);
  const beforeState = await readFile(state, "utf8");
  const beforeHead = await git(repository, "rev-parse", "HEAD");

  await assert.rejects(
    exec(process.execPath, [workflow, "resume-identity", "--state", state, "--repository", repository], { cwd: other }),
    /resume worktree mismatch/,
  );
  assert.equal(await readFile(state, "utf8"), beforeState);
  assert.equal(await git(repository, "rev-parse", "HEAD"), beforeHead);
});

test("AC-4 resume workflow entrypoint rejects unsafe persisted identity before mutation", async () => {
  const repository = await mkdtemp(path.join(os.tmpdir(), "workflow-resume-unsafe-"));
  await git(repository, "init", "-b", "trunk");
  const state = path.join(repository, "identity.md");
  await writeFile(state, `worktree: ${await realpath(repository)}\nbranch: --evil\n`);
  const before = await readFile(state, "utf8");

  await assert.rejects(
    exec(process.execPath, [workflow, "resume-identity", "--state", state, "--repository", repository], { cwd: repository }),
    /persisted branch is unsafe/,
  );
  assert.equal(await readFile(state, "utf8"), before);
});

test("AC-4 resume workflow rejects state outside the repository or through a symlink", async () => {
  const repository = await mkdtemp(path.join(os.tmpdir(), "workflow-resume-boundary-"));
  const outside = await mkdtemp(path.join(os.tmpdir(), "workflow-resume-state-"));
  await git(repository, "init", "-b", "trunk");
  const outsideState = path.join(outside, "identity.md");
  await writeFile(outsideState, `worktree: ${await realpath(repository)}\nbranch: trunk\n`);
  await symlink(outsideState, path.join(repository, "identity-link.md"));

  for (const state of [outsideState, path.join(repository, "identity-link.md")]) {
    await assert.rejects(
      exec(process.execPath, [workflow, "resume-identity", "--state", state, "--repository", repository], { cwd: repository }),
      /outside allowed boundary/,
    );
  }
});

test("FR-5 registry workflow entrypoint performs CAS and rejects stale rewrite", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "workflow-registry-"));
  await git(directory, "init", "-b", "trunk");
  await git(directory, "config", "user.email", "test@example.test");
  await git(directory, "config", "user.name", "Test");
  const registry = path.join(directory, "_active.md");
  const candidate = path.join(directory, "candidate.md");
  await writeFile(registry, "winner\n");
  await writeFile(candidate, "loser\n");
  await git(directory, "add", "_active.md", "candidate.md");
  await git(directory, "commit", "-m", "fixture");

  const { stdout } = await exec(process.execPath, [workflow, "update-registry", "--registry", registry, "--content-file", candidate, "--expected-revision", "stale", "--default-branch", "trunk"], { cwd: directory });
  assert.equal(JSON.parse(stdout).status, "stale-revision");
  assert.equal(await readFile(registry, "utf8"), "winner\n");
});

test("AC-3 update-registry rejects canonical paths outside the repository before reading content", async () => {
  const repository = await mkdtemp(path.join(os.tmpdir(), "workflow-repository-"));
  const outside = await mkdtemp(path.join(os.tmpdir(), "workflow-outside-"));
  await git(repository, "init", "-b", "trunk");
  await mkdir(path.join(repository, "docs", "state"), { recursive: true });
  await symlink(outside, path.join(repository, "escaped"));
  await writeFile(path.join(outside, "_active.md"), "outside\n");
  const registry = path.join(repository, "docs", "state", "_active.md");
  await writeFile(registry, "original\n");

  await assert.rejects(
    exec(process.execPath, [workflow, "update-registry", "--registry", path.join(repository, "escaped", "_active.md"), "--content-file", path.join(outside, "missing.md"), "--default-branch", "trunk"], { cwd: repository }),
    /outside repository/,
  );
  assert.equal(await readFile(registry, "utf8"), "original\n");
});

test("FR-2 update-registry rejects an unsafe default branch before reading content", async () => {
  const repository = await mkdtemp(path.join(os.tmpdir(), "workflow-branch-"));
  await git(repository, "init", "-b", "trunk");
  const registry = path.join(repository, "_active.md");
  await writeFile(registry, "original\n");

  await assert.rejects(
    exec(process.execPath, [workflow, "update-registry", "--registry", registry, "--content-file", path.join(repository, "missing.md"), "--default-branch", "--evil"], { cwd: repository }),
    /Invalid default branch/,
  );
  assert.equal(await readFile(registry, "utf8"), "original\n");
});

test("FR-3/FR-5 productive entrypoint creates canonical state and registry together", async () => {
  const repository = await mkdtemp(path.join(os.tmpdir(), "workflow-initialize-"));
  await git(repository, "init", "-b", "trunk");
  await git(repository, "config", "user.email", "test@example.test");
  await git(repository, "config", "user.name", "Test");
  await mkdir(path.join(repository, "docs", "state"), { recursive: true });
  const registry = path.join(repository, "docs", "state", "_active.md");
  const state = path.join(repository, "docs", "state", "feature.md");
  const stateCandidate = path.join(repository, "state-candidate");
  const registryCandidate = path.join(repository, "registry-candidate");
  await writeFile(registry, "");
  await writeFile(stateCandidate, `state_version: 1\nfeature: feature\nmode: full\nphase: brainstorm\nbranch: trunk\nworktree: ${await realpath(repository)}\nrevision: 0\napprovals: none\n`);
  await writeFile(registryCandidate, "feature | full | brainstorm\n");
  await git(repository, "add", ".");
  await git(repository, "commit", "-m", "fixture");
  const { stdout } = await exec(process.execPath, [workflow, "initialize-feature", "--state", state, "--state-content-file", stateCandidate, "--registry", registry, "--registry-content-file", registryCandidate, "--default-branch", "trunk"], { cwd: repository });
  assert.equal(JSON.parse(stdout).status, "updated");
  assert.match(await readFile(state, "utf8"), /feature: feature/);
  assert.equal(await readFile(registry, "utf8"), "feature | full | brainstorm\n");
});
