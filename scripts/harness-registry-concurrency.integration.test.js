import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const worker = `
  const [{ updateRegistry }, registryPath, feature] = await Promise.all([
    import(process.argv[1]),
    Promise.resolve(process.argv[2]),
    Promise.resolve(process.argv[3]),
  ]);
  await updateRegistry({
    registryPath,
    defaultBranch: "trunk",
    transform: (current) => JSON.stringify([...JSON.parse(current), feature]),
  });
`;

function runWriter(moduleUrl, registryPath, feature) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--input-type=module", "--eval", worker, moduleUrl, registryPath, feature]);
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0
      ? resolve()
      : reject(new Error(stderr.trim() || `writer exited with status ${code}`)));
  });
}

test("eight concurrent registry writers retain every parseable entry exactly once", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "registry-concurrency-"));
  const registryPath = path.join(directory, "_active.json");
  const moduleUrl = pathToFileURL(path.join(import.meta.dirname, "harness-registry.js")).href;
  const features = Array.from({ length: 8 }, (_, index) => `feature-${index}`);
  await writeFile(registryPath, "[]");

  await Promise.all(features.map((feature) => runWriter(moduleUrl, registryPath, feature)));

  const entries = JSON.parse(await readFile(registryPath, "utf8"));
  assert.equal(entries.length, features.length);
  assert.deepEqual(entries.toSorted(), features.toSorted());
});
