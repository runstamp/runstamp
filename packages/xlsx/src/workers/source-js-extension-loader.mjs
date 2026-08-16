import { access } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";

export async function resolve(specifier, context, defaultResolve) {
  if (
    context.parentURL?.includes("/src/")
    && specifier.startsWith(".")
    && specifier.endsWith(".js")
  ) {
    const tsUrl = new URL(specifier.replace(/\.js$/, ".ts"), context.parentURL);
    try {
      await access(fileURLToPath(tsUrl));
      return {
        shortCircuit: true,
        url: tsUrl.href,
      };
    } catch {
      // Fall through to Node's normal resolver when no source .ts twin exists.
    }
  }

  return defaultResolve(specifier, context, defaultResolve);
}

export async function load(url, context, defaultLoad) {
  if (url.includes("/src/") && url.endsWith(".ts")) {
    const source = await readFile(fileURLToPath(url), "utf8");
    const result = await transform(source, {
      format: "esm",
      loader: "ts",
      sourcemap: "inline",
      target: "node20",
    });
    return {
      format: "module",
      shortCircuit: true,
      source: result.code,
    };
  }

  return defaultLoad(url, context, defaultLoad);
}
