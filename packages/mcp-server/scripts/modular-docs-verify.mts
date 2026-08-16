import { readFile } from "node:fs/promises";

const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
const manifest = JSON.parse(await readFile(new URL("../server.json", import.meta.url), "utf8")) as { version?: string };
const tools = [
  "runstamp_list_operations",
  "runstamp_describe_operation",
  "runstamp_invoke_operation",
];
for (const tool of tools) if (!readme.includes(tool)) throw new Error(`README does not document ${tool}.`);
if (manifest.version !== "1.0.0") throw new Error(`server.json version is ${String(manifest.version)}, expected 1.0.0.`);
console.log(`[mcp-server] documentation and three-tool budget verified`);
