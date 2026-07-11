import assert from "node:assert/strict";
import { mkdtemp, readFile, utimes, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { resolveDefaultBranch, updateRegistry } from "./harness-registry.js";

test("resolves and uses a non-main remote default branch", async () => {
  const calls = [];
  const git = async (args) => {
    calls.push(args);
    if (args[0] === "symbolic-ref") return "refs/remotes/origin/trunk\n";
    throw new Error(`unexpected git call: ${args.join(" ")}`);
  };

  assert.equal(await resolveDefaultBranch({ git }), "trunk");
  assert.deepEqual(calls, [["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"]]);
});

test("FR-6 resolved non-main branch selects the registry worktree actually written", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "registry-branch-"));
  const feature = path.join(directory, "feature");
  const trunk = path.join(directory, "trunk");
  await Promise.all([writeFile(path.join(directory, "feature-active"), "feature\n"), writeFile(path.join(directory, "trunk-active"), "trunk\n")]);
  const git = async (args) => {
    if (args[0] === "symbolic-ref") return "origin/trunk\n";
    if (args[0] === "rev-parse") return `${feature}\n`;
    if (args[0] === "worktree") return `worktree ${feature}\nbranch refs/heads/feature\n\nworktree ${trunk}\nbranch refs/heads/trunk\n`;
    throw new Error("unexpected git call");
  };
  const registryPath = path.join(feature, "docs/state/_active.md");
  await import("node:fs/promises").then(({ mkdir }) => Promise.all([
    mkdir(path.dirname(registryPath), { recursive: true }),
    mkdir(path.join(trunk, "docs/state"), { recursive: true }),
  ]));
  await Promise.all([writeFile(registryPath, "feature\n"), writeFile(path.join(trunk, "docs/state/_active.md"), "trunk\n")]);
  await updateRegistry({ registryPath, content: "updated\n", git });
  assert.equal(await readFile(registryPath, "utf8"), "feature\n");
  assert.equal(await readFile(path.join(trunk, "docs/state/_active.md"), "utf8"), "updated\n");
});

test("ambiguous default branch fails before registry writes", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "registry-"));
  const registryPath = path.join(directory, "_active.md");
  await writeFile(registryPath, "original\n");

  await assert.rejects(
    updateRegistry({ registryPath, expectedRevision: "x", content: "changed\n", git: async () => "" }),
    /Unable to determine repository default branch/,
  );
  assert.equal(await readFile(registryPath, "utf8"), "original\n");
});

test("compare-and-swap rejects a stale revision without overwriting", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "registry-"));
  const registryPath = path.join(directory, "_active.md");
  await writeFile(registryPath, "winner\n");

  const result = await updateRegistry({
    registryPath,
    expectedRevision: "stale",
    content: "loser\n",
    defaultBranch: "trunk",
  });

  assert.equal(result.status, "stale-revision");
  assert.equal(await readFile(registryPath, "utf8"), "winner\n");
});

test("lock serializes concurrent writers and preserves every distinct entry", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "registry-"));
  const registryPath = path.join(directory, "_active.md");
  await writeFile(registryPath, "");

  await Promise.all(Array.from({ length: 8 }, (_, index) => updateRegistry({
    registryPath,
    defaultBranch: "trunk",
    transform: (current) => `${current}feature-${index}\n`,
  })));

  const entries = (await readFile(registryPath, "utf8")).trim().split("\n").sort();
  assert.deepEqual(entries, Array.from({ length: 8 }, (_, index) => `feature-${index}`).sort());
});

test("recovers a dead writer lock without stealing a live writer lock", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "registry-"));
  const registryPath = path.join(directory, "_active.md");
  const readyPath = path.join(directory, "ready");
  await writeFile(registryPath, "original\n");

  const moduleUrl = new URL("./harness-registry.js", import.meta.url).href;
  const child = spawn(process.execPath, ["--input-type=module", "-e", `
    import { writeFile } from "node:fs/promises";
    import { updateRegistry } from ${JSON.stringify(moduleUrl)};
    await updateRegistry({
      registryPath: ${JSON.stringify(registryPath)},
      defaultBranch: "trunk",
      transform: async () => {
        await writeFile(${JSON.stringify(readyPath)}, "ready");
        setInterval(() => {}, 1000);
        await new Promise(() => {});
      },
    });
  `], { stdio: "ignore" });

  while (true) {
    try { await readFile(readyPath); break; } catch { await new Promise((resolve) => setTimeout(resolve, 10)); }
  }

  const liveAttempt = updateRegistry({
    registryPath,
    defaultBranch: "trunk",
    content: "must-not-win\n",
    lockTimeoutMs: 40,
  });
  await assert.rejects(liveAttempt, /Unable to acquire registry lock/);
  assert.equal(await readFile(registryPath, "utf8"), "original\n");

  child.kill("SIGKILL");
  await new Promise((resolve) => child.once("close", resolve));
  const recovered = await updateRegistry({ registryPath, defaultBranch: "trunk", content: "recovered\n" });
  assert.equal(recovered.status, "updated");
  assert.equal(await readFile(registryPath, "utf8"), "recovered\n");
});

test("FR-7 recovers an old malformed interruption lock but not a fresh creator lock", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "registry-lock-"));
  const registryPath = path.join(directory, "_active.md");
  const lockPath = `${registryPath}.lock`;
  await writeFile(registryPath, "original\n");
  await writeFile(lockPath, "");

  await assert.rejects(updateRegistry({ registryPath, defaultBranch: "trunk", content: "unsafe\n", lockTimeoutMs: 30, staleLockMs: 1000 }), /Unable to acquire/);
  assert.equal(await readFile(registryPath, "utf8"), "original\n");

  const old = new Date(Date.now() - 2000);
  await utimes(lockPath, old, old);
  const result = await updateRegistry({ registryPath, defaultBranch: "trunk", content: "recovered\n", staleLockMs: 1000 });
  assert.equal(result.status, "updated");
  assert.equal(await readFile(registryPath, "utf8"), "recovered\n");
});
