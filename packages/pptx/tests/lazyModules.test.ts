import { describe, expect, it } from "vitest";

import { createLazyModuleLoader } from "../src/engine/lazyModules.js";

describe("createLazyModuleLoader", () => {
  it("shares one import promise across concurrent and repeated loads", async () => {
    const module = { value: "loaded" };
    let importCount = 0;
    const loadModule = createLazyModuleLoader(async () => {
      importCount++;
      await Promise.resolve();
      return module;
    });

    const [first, second] = await Promise.all([loadModule(), loadModule()]);
    const third = await loadModule();

    expect(first).toBe(module);
    expect(second).toBe(module);
    expect(third).toBe(module);
    expect(importCount).toBe(1);
  });

  it("clears a rejected import promise so a later call can retry", async () => {
    let importCount = 0;
    const loadModule = createLazyModuleLoader(async () => {
      importCount++;
      if (importCount === 1) {
        throw new Error("transient import failure");
      }
      return { value: "recovered" };
    });

    await expect(loadModule()).rejects.toThrow("transient import failure");
    await expect(loadModule()).resolves.toEqual({ value: "recovered" });
    expect(importCount).toBe(2);
  });
});
