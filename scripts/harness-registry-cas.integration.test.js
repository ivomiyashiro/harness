import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { updateRegistry } from "./harness-registry.js";

test("incompatible same-revision writers preserve the winner and reject the stale writer", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "registry-cas-"));
  const registryPath = path.join(directory, "_active.md");
  const initial = "initial\n";
  await writeFile(registryPath, initial);
  const expectedRevision = createHash("sha256").update(initial).digest("hex");

  const contents = ["writer-one\n", "writer-two\n"];
  const git = async (args) => args[0] === "rev-parse"
    ? `${directory}\n`
    : `worktree ${directory}\nbranch refs/heads/trunk\n`;
  const results = await Promise.all(contents.map((content) => updateRegistry({
    registryPath,
    expectedRevision,
    content,
    defaultBranch: "trunk",
    git,
  })));

  const winnerIndex = results.findIndex(({ status }) => status === "updated");
  const staleIndex = results.findIndex(({ status }) => status === "stale-revision");
  assert.notEqual(winnerIndex, -1);
  assert.notEqual(staleIndex, -1);
  assert.notEqual(winnerIndex, staleIndex);
  assert.equal(await readFile(registryPath, "utf8"), contents[winnerIndex]);
});
