import { readFile } from "node:fs/promises";

const catalog = JSON.parse(await readFile(new URL("../catalog.json", import.meta.url), "utf8")) as Array<Record<string, unknown>>;
if (catalog.length !== 79) throw new Error(`Expected 79 descriptors, found ${String(catalog.length)}.`);
for (const descriptor of catalog) {
  if (descriptor.stability !== "stable") throw new Error(`${String(descriptor.name)} is not stable.`);
  if ("implementation" in descriptor) throw new Error(`${String(descriptor.name)} leaks an implementation binding.`);
}
