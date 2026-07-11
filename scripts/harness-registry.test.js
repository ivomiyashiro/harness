import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
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
