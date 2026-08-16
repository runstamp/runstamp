import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../..", import.meta.url));

const canonicalV2Files = [
  "app/app/(marketing)/examples/data/qbr-deck.ts",
  "app/app/(marketing)/examples/data/pitch-deck.ts",
  "app/app/(marketing)/examples/data/dashboard-deck.ts",
  "app/app/(marketing)/examples/data/sales-training.ts",
  "app/app/(marketing)/examples/data/product-launch.ts",
  "app/app/(marketing)/examples/data/investor-update.ts",
  "app/app/(marketing)/examples/data/conference-talk.ts",
  "app/app/(marketing)/examples/data/mcp-demo.ts",
  "app/app/(marketing)/examples/data/document-builder.ts",
  "app/app/(marketing)/examples/data/snippets.ts",
  "app/app/(marketing)/pptx-showcase/pptx-showcase-client.tsx",
  "app/content/docs/overview.mdx",
  "app/content/docs/getting-started/choose-a-package.mdx",
  "app/content/docs/packages/pptx.mdx",
  "app/content/docs/packages/pdf.mdx",
  "app/content/docs/packages/docx.mdx",
  "app/content/docs/packages/xlsx.mdx",
  "app/content/docs/packages/mcp-server.mdx",
  "app/content/docs/hosted/quick-start.mdx",
  "app/content/docs/hosted/api-reference.mdx",
  "app/content/docs/license.mdx",
  "app/app/api/llms.txt/route.ts",
  "app/README.md",
  "packages/core/README.md",
  "packages/core/README.md",
  "packages/mcp-server/README.md",
  "packages/mcp-server/SKILL.md",
  "llms.txt",
  "llms-full.txt",
];

const approvedLegacyFiles = [
  "app/content/docs/hosted/migrate-v1-to-v2.mdx",
];

const legacyMarkers = [
  "/v1/presentations/generate",
  "AgentDocument",
  "presentationTitle",
  "compileAgentDocument",
  "\"version\": \"1.0\"",
  "\"pattern\":",
  "pattern:",
];

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("V2 content guard", () => {
  it("keeps canonical first-party surfaces free of unlabelled V1 examples", () => {
    for (const relativePath of canonicalV2Files) {
      const contents = read(relativePath);
      for (const marker of legacyMarkers) {
        for (const line of contents.split("\n").filter((candidate) => candidate.includes(marker))) {
          expect(
            line,
            `${relativePath} should label legacy marker ${marker}`,
          ).toMatch(/legacy|deprecated|do not send|not accepted|package-local/i);
        }
      }
    }
  });

  it("keeps approved legacy files explicitly labeled", () => {
    for (const relativePath of approvedLegacyFiles) {
      const contents = read(relativePath);
      expect(
        contents.toLowerCase(),
        `${relativePath} should carry a visible legacy label`,
      ).toContain("legacy");
    }
  });
});
