import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const originalCwd = process.cwd();
let FIRST_DOC_HREF = "";
let docsCollection: Awaited<typeof import("@/lib/config/docs")>["docsCollection"];

beforeAll(async () => {
  process.chdir(path.join(originalCwd, "platform"));
  const docsModule = await import("@/lib/config/docs");
  FIRST_DOC_HREF = docsModule.FIRST_DOC_HREF;
  docsCollection = docsModule.docsCollection;
});

afterAll(() => {
  process.chdir(originalCwd);
});

describe("paper docs smoke", () => {
  it("keeps the first docs route and metadata on the shared collection", () => {
    expect(FIRST_DOC_HREF).toBe("/docs/getting-started/quick-start");
    expect(
      docsCollection.generateMetadata(["getting-started", "quick-start"], {
        siteName: "Runstamp",
      }).title,
    ).toBe("Quick Start — Runstamp Docs");
  });
});
