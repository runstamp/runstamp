#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { rollup } from "rollup";
import { dts } from "rollup-plugin-dts";

const mappings = [];
const external = new Set();
const pruneDirectories = [];

for (const argument of process.argv.slice(2)) {
  if (argument.startsWith("--external=")) {
    external.add(argument.slice("--external=".length));
    continue;
  }
  if (argument.startsWith("--prune=")) {
    pruneDirectories.push(argument.slice("--prune=".length));
    continue;
  }
  const separator = argument.indexOf(":");
  if (separator <= 0 || separator === argument.length - 1) {
    throw new Error("Usage: bundle-declarations.mjs <input.d.ts:output.d.ts> [--external=package]");
  }
  mappings.push([argument.slice(0, separator), argument.slice(separator + 1)]);
}

if (mappings.length === 0) {
  throw new Error("At least one input:output declaration mapping is required");
}

for (const [input, output] of mappings) {
  if (!fs.existsSync(input)) {
    throw new Error(`Declaration input does not exist: ${input}`);
  }
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const temporaryOutput = `${output}.bundling`;
  const bundle = await rollup({
    input,
    external: (specifier) => {
      const packageName = specifier.startsWith("@")
        ? specifier.split("/").slice(0, 2).join("/")
        : specifier.split("/")[0];
      return external.has(packageName);
    },
    plugins: [dts({ respectExternal: true })],
    onwarn(warning, warn) {
      if (warning.code === "CIRCULAR_DEPENDENCY") return;
      warn(warning);
    },
  });
  try {
    await bundle.write({ file: temporaryOutput, format: "es" });
    fs.renameSync(temporaryOutput, output);
  } finally {
    await bundle.close();
    fs.rmSync(temporaryOutput, { force: true });
  }
  console.log(`[types] ${input} -> ${output}`);
}

const retainedOutputs = new Set(mappings.map(([, output]) => path.resolve(output)));
for (const pruneDirectory of pruneDirectories) {
  for (const entry of fs.readdirSync(pruneDirectory, { recursive: true })) {
    if (typeof entry !== "string") continue;
    const absolutePath = path.resolve(pruneDirectory, entry);
    if (absolutePath.endsWith(".d.ts.map") || (absolutePath.endsWith(".d.ts") && !retainedOutputs.has(absolutePath))) {
      fs.rmSync(absolutePath, { force: true });
    }
  }
}
