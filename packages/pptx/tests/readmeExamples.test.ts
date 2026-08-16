// WS-6 safety net: the public README Quick Start blocks must remain
// parseable against the current schemas WITHOUT a built dist. The
// enterprise `pnpm docs:verify` script is the canonical gate, but it
// depends on a built lite bundle. This test fires on every `vitest run`
// and catches schema shape regressions at the point of the change.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AgentDocumentSchema } from "../src/interpreter/agentSchema.js";
import { PaperDocumentSchema } from "../src/validator/schema.js";
import { isAgentDocumentShape, normalizeRenderInput } from "../src/engine/inputNormalizer.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function extractBlocks(markdown: string): Array<{ header: string; body: string; line: number }> {
  const out: Array<{ header: string; body: string; line: number }> = [];
  const re = /```(?:ts|typescript)([^\n]*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(markdown)) !== null) {
    const header = (match[1] ?? "").trim();
    const body = match[2] ?? "";
    const line = markdown.slice(0, match.index).split("\n").length;
    out.push({ header, body, line });
  }
  return out;
}

function extractFirstObjectLiteral(src: string): string | null {
  const trimmed = src.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;

  // const x = { ... }
  const constMatch = trimmed.match(/(?:const|let|var)\s+\w+\s*(?::\s*[^=]+)?=\s*(\{[\s\S]+)/);
  if (constMatch) {
    const start = trimmed.indexOf(constMatch[1]);
    return sliceBalancedBraces(trimmed, start);
  }

  // PaperEngine.render({...}) / compileAgentDocument({...})
  const callMatch = trimmed.match(/(?:PaperEngine\.render|compileAgentDocument|PaperDocumentSchema\.parse|AgentDocumentSchema\.parse)\s*\(\s*\{/);
  if (callMatch && callMatch.index !== undefined) {
    const braceIdx = trimmed.indexOf("{", callMatch.index);
    return sliceBalancedBraces(trimmed, braceIdx);
  }
  return null;
}

function sliceBalancedBraces(src: string, start: number): string | null {
  if (src[start] !== "{") return null;
  let depth = 0;
  let str: string | null = null;
  let escape = false;
  for (let i = start; i < src.length; i += 1) {
    const ch = src[i];
    if (escape) { escape = false; continue; }
    if (str) {
      if (ch === "\\") { escape = true; continue; }
      if (ch === str) str = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { str = ch; continue; }
    if (ch === "{") depth += 1;
    else if (ch === "}") { depth -= 1; if (depth === 0) return src.slice(start, i + 1); }
  }
  return null;
}

function evalLiteral(literal: string): unknown {
  return new Function(`return (${literal});`)();
}

describe("README examples sanity", () => {
  const readmes = [
    path.join(REPO_ROOT, "packages/pptx/README.md"),
    path.join(REPO_ROOT, "packages/pptx/README.md"),
  ];

  for (const readmePath of readmes) {
    describe(path.relative(REPO_ROOT, readmePath), () => {
      const markdown = readFileSync(readmePath, "utf8");
      const blocks = extractBlocks(markdown)
        .filter((b) => /docs-verify=(parse|render)\b/.test(b.header));

      // Sanity: at least one verifiable block exists
      it("exposes at least one verifiable block", () => {
        expect(blocks.length).toBeGreaterThan(0);
      });

      for (const block of blocks) {
        const literal = extractFirstObjectLiteral(block.body);
        if (!literal) continue; // functional-only blocks are covered by docs:verify
        let value: unknown;
        try {
          value = evalLiteral(literal);
        } catch {
          continue; // block not a pure object-literal snippet
        }
        if (value === null || typeof value !== "object") continue;
        const obj = value as Record<string, unknown>;
        if (typeof obj.type !== "string" && !isAgentDocumentShape(obj)) continue;

        it(`line ${block.line}: validates against the matching schema`, () => {
          if (obj.type === "Document") {
            const result = PaperDocumentSchema.safeParse(obj);
            if (!result.success) {
              const issues = result.error.issues
                .slice(0, 3)
                .map((i) => `  - ${i.path.map((p) => String(p)).join(".") || "<root>"}: ${i.message}`)
                .join("\n");
              throw new Error(`PaperDocumentSchema rejected block:\n${issues}`);
            }
          } else if (obj.type === "presentation" || isAgentDocumentShape(obj)) {
            const result = AgentDocumentSchema.safeParse(obj);
            if (!result.success) {
              const issues = result.error.issues
                .slice(0, 3)
                .map((i) => `  - ${i.path.map((p) => String(p)).join(".") || "<root>"}: ${i.message}`)
                .join("\n");
              throw new Error(`AgentDocumentSchema rejected block:\n${issues}`);
            }
          }
        });

        it(`line ${block.line}: normalizeRenderInput accepts the block`, () => {
          // Agent inputs go through compileAgentDocument; PaperDocument
          // inputs pass through. Either should not throw for a valid
          // README example.
          if (obj.type === "Document") {
            const out = normalizeRenderInput(obj);
            expect(out.type).toBe("Document");
          } else if (obj.type === "presentation" || isAgentDocumentShape(obj)) {
            const out = normalizeRenderInput(obj);
            expect(out.type).toBe("Document");
          }
        });
      }
    });
  }
});
