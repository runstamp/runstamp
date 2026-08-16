import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

export interface PackageDiffIssue {
  path: string;
  type: "added" | "removed" | "modified";
}

export interface PackageDiffReport {
  passed: boolean;
  issues: PackageDiffIssue[];
}

const VOLATILE_PATH_PATTERNS = [
  /^docProps\/core\.xml$/,
  /^docProps\/app\.xml$/,
  /^ppt\/presProps\.xml$/,
  /^ppt\/viewProps\.xml$/,
];

const xmlParser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

function isVolatilePath(path: string): boolean {
  return VOLATILE_PATH_PATTERNS.some((pattern) => pattern.test(path));
}

function normalizeXml(xml: string): string {
  try {
    return JSON.stringify(xmlParser.parse(xml));
  } catch {
    return xml.replace(/\s+/g, " ").trim();
  }
}

async function loadComparableEntries(buffer: Buffer): Promise<Map<string, string | Buffer>> {
  const zip = await JSZip.loadAsync(buffer);
  const entries = new Map<string, string | Buffer>();

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir || isVolatilePath(path)) continue;
    if (path.endsWith(".xml") || path.endsWith(".rels")) {
      entries.set(path, normalizeXml(await entry.async("string")));
      continue;
    }
    entries.set(path, await entry.async("nodebuffer"));
  }

  return entries;
}

export async function diffNormalizedPackages(
  original: Buffer,
  candidate: Buffer,
): Promise<PackageDiffReport> {
  const base = await loadComparableEntries(original);
  const next = await loadComparableEntries(candidate);
  const issues: PackageDiffIssue[] = [];

  for (const path of base.keys()) {
    if (!next.has(path)) {
      issues.push({ path, type: "removed" });
    }
  }

  for (const path of next.keys()) {
    if (!base.has(path)) {
      issues.push({ path, type: "added" });
      continue;
    }

    const left = base.get(path);
    const right = next.get(path);
    if (typeof left === "string" && typeof right === "string") {
      if (left !== right) {
        issues.push({ path, type: "modified" });
      }
      continue;
    }

    if (Buffer.isBuffer(left) && Buffer.isBuffer(right) && !left.equals(right)) {
      issues.push({ path, type: "modified" });
    }
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}
