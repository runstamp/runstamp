import { createHash } from "node:crypto";
import type { OpenedPptx } from "./open.js";

const VOLATILE_CORE_FIELDS = [
  "dcterms:created",
  "dcterms:modified",
  "cp:revision",
  "cp:lastModifiedBy",
  "dc:creator",
  "cp:lastPrinted",
];

const VOLATILE_APP_FIELDS = [
  "AppVersion",
  "Application",
  "TotalTime",
  "PresentationFormat",
];

export interface NormalizationOptions {
  stripVolatileMetadata?: boolean;
}

const isXmlPath = (path: string) =>
  path.endsWith(".xml") || path.endsWith(".rels");

function stripTags(xml: string, tags: string[]): string {
  let out = xml;
  for (const tag of tags) {
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`<${escaped}\\b[^>]*>[\\s\\S]*?<\\/${escaped}>`, "g");
    out = out.replace(re, "");
    const selfClose = new RegExp(`<${escaped}\\b[^/]*\\/>`, "g");
    out = out.replace(selfClose, "");
  }
  return out;
}

export function normalizeXml(path: string, raw: Buffer): string {
  let text = raw.toString("utf8");
  if (path === "docProps/core.xml") {
    text = stripTags(text, VOLATILE_CORE_FIELDS);
  } else if (path === "docProps/app.xml") {
    text = stripTags(text, VOLATILE_APP_FIELDS);
  }
  return text;
}

function sha256Hex(input: Buffer | string): string {
  const h = createHash("sha256");
  h.update(input);
  return h.digest("hex");
}

export interface NormalizedPart {
  path: string;
  kind: "xml" | "binary";
  hash: string;
  size: number;
}

export function normalizeForHash(opened: OpenedPptx): {
  digest: string;
  parts: NormalizedPart[];
} {
  const sortedPaths = opened.listParts();
  const parts: NormalizedPart[] = [];

  for (const path of sortedPaths) {
    const buf = opened.getPart(path)!;
    if (isXmlPath(path)) {
      const normalized = normalizeXml(path, buf);
      parts.push({
        path,
        kind: "xml",
        hash: sha256Hex(normalized),
        size: Buffer.byteLength(normalized, "utf8"),
      });
    } else {
      parts.push({
        path,
        kind: "binary",
        hash: sha256Hex(buf),
        size: buf.length,
      });
    }
  }

  const manifest = parts.map((p) => `${p.path}\t${p.kind}\t${p.hash}\n`).join("");
  return { digest: sha256Hex(manifest), parts };
}
