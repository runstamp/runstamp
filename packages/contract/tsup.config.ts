import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    // The conformance kit (§7). A separate entry so importing the contract never
    // pulls in node:child_process, which the runtime types have no need of.
    "verify/index": "src/verify/index.ts",
  },
  format: ["esm"],
  dts: true,
  // Both entries share the error model, locator codec and loss ordering. Without
  // splitting, tsup inlines a second copy into `verify`, and a `PaperError` built
  // by one bundle then fails `instanceof` against the other's class.
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  platform: "node",
  // Matches package.json engines.node.
  target: "node18",
  // tsup 8 strips the `node:` prefix by default, emitting a bare `crypto`
  // specifier that a userland package of the same name could shadow. Keep the
  // prefix so the builtin always resolves to the builtin.
  removeNodeProtocol: false,
});
