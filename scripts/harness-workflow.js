#!/usr/bin/env node
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { assertResumeIdentity } from "./harness-state.js";
import { updateRegistry } from "./harness-registry.js";
import { runHarnessProcess } from "./harness-process.js";

function options(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 2) {
    if (!values[index]?.startsWith("--") || values[index + 1] === undefined) throw new Error("invalid workflow arguments");
    result[values[index].slice(2)] = values[index + 1];
  }
  return result;
}

export async function runWorkflow(argv, cwd = process.cwd()) {
  const [command, ...values] = argv;
  const args = options(values);
  if (command === "resume-identity") {
    if (!args.state || !args.repository || Object.keys(args).length !== 2) throw new Error("usage: resume-identity --state <json> --repository <path>");
    const persisted = JSON.parse(await readFile(args.state, "utf8"));
    const current = {
      worktree: await realpath(cwd),
      branch: (await runHarnessProcess("git", ["branch", "--show-current"], { cwd })).stdout.trim(),
    };
    await assertResumeIdentity(persisted, current, await realpath(args.repository));
    return { status: "identity-ok" };
  }
  if (command === "update-registry") {
    if (!args.registry || !args["content-file"]) throw new Error("usage: update-registry --registry <path> --content-file <path> [--expected-revision <sha>] [--default-branch <name>]");
    return updateRegistry({
      registryPath: path.resolve(cwd, args.registry),
      content: await readFile(args["content-file"], "utf8"),
      expectedRevision: args["expected-revision"],
      defaultBranch: args["default-branch"],
    });
  }
  throw new Error("usage: harness-workflow.js <resume-identity|update-registry> ...");
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  runWorkflow(process.argv.slice(2)).then((result) => console.log(JSON.stringify(result))).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
