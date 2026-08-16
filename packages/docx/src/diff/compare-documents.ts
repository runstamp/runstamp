import { createHash } from "node:crypto";

import type { Change, DiffStatistics } from "@runstamp/document-diff";
import { compileTrackedChangesResult, type CompareManifestEntry, type TrackChangesGranularity } from "../core/revision-tracker.js";
import { Errors } from "../errors.js";
import { renderToDocx } from "../render.js";
import { parseDocxBuffer } from "./docx-buffer-parser.js";

export interface CompareDocumentsOptions {
  author?: string;
  date?: string;
  granularity?: TrackChangesGranularity;
  licenseKey?: string;
  /**
   * Render the comparison artifact deterministically.
   *
   * Without this the internal `renderToDocx` call falls back to its default,
   * which stamps timestamps and identifiers — so two comparisons of the same
   * pair of documents produced different bytes even within one process, while
   * `docx.diff` advertised `deterministic: true`. C7/C8 caught it the first
   * time a conformance fixture invoked the verb.
   *
   * The revision save ID is covered too: it otherwise defaults to a hash of
   * `Date.now()` and `Math.random()`, which is upstream of rendering and so
   * unreachable by the renderer's own deterministic mode.
   */
  deterministic?: boolean;
}

export interface CompareDocumentsResult {
  buffer: Buffer;
  changes: Change[];
  summary: string;
  statistics: DiffStatistics;
}

export async function compareDocuments(
  originalBuffer: Buffer,
  revisedBuffer: Buffer,
  options: CompareDocumentsOptions = {},
): Promise<CompareDocumentsResult> {

  const [original, revised] = await Promise.all([
    parseDocxBuffer(originalBuffer),
    parseDocxBuffer(revisedBuffer),
  ]);

  if (original.hasTrackedRevisions || revised.hasTrackedRevisions) {
    throw Errors.invalidDocument("compareDocuments does not support source DOCX files that already contain tracked revisions");
  }

  // Derived from the compared bytes so it is stable for a given pair and still
  // distinct between pairs, which is what an rsid is for.
  const deterministicRsid = options.deterministic === true
    ? createHash("sha256")
      .update(originalBuffer)
      .update(revisedBuffer)
      .digest("hex")
      .slice(0, 8)
      .toUpperCase()
    : undefined;

  const compared = compileTrackedChangesResult(
    original.document,
    revised.document,
    {
      author: options.author,
      date: options.date,
      granularity: options.granularity,
      ...(deterministicRsid !== undefined ? { rsid: deterministicRsid } : {}),
    },
    {
      tableStrategy: "block",
    },
  );

  const rendered = await renderToDocx(compared.document, {
    licenseKey: options.licenseKey,
    ...(options.deterministic !== undefined ? { deterministic: options.deterministic } : {}),
  });
  const changes = buildChanges(compared.compareManifest);

  return {
    buffer: rendered.buffer,
    changes,
    summary: buildSummary(changes),
    statistics: buildStatistics(changes),
  };
}

function buildChanges(compareManifest: CompareManifestEntry[]): Change[] {
  return compareManifest.map((entry) => ({
    type: entry.type,
    path: `pages[${entry.pageIndex}].elements[${entry.elementIndex}]`,
    description: describeChange(entry),
    before: entry.beforeText,
    after: entry.afterText,
    severity: entry.type === "modified" ? "minor" : "major",
  }));
}

function describeChange(entry: CompareManifestEntry): string {
  const label = entry.elementType === "table"
    ? "Table"
    : entry.elementType === "heading"
      ? "Heading"
      : "Paragraph";

  if (entry.type === "moved") {
    return `${label} moved`;
  }

  if (entry.type === "added") {
    return `${label} added`;
  }

  if (entry.type === "removed") {
    return `${label} removed`;
  }

  if (entry.mode === "format") {
    return `${label} formatting changed`;
  }

  if (entry.mode === "property") {
    return `${label} properties changed`;
  }

  return `${label} text changed`;
}

function buildStatistics(changes: Change[]): DiffStatistics {
  return changes.reduce<DiffStatistics>((statistics, change) => {
    statistics[change.type] += 1;
    return statistics;
  }, {
    added: 0,
    removed: 0,
    modified: 0,
    moved: 0,
  });
}

function buildSummary(changes: Change[]): string {
  if (changes.length === 0) {
    return "No changes";
  }

  const counts = new Map<string, number>();
  for (const change of changes) {
    const label = summarizeChange(change);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([label, count]) => `${count} ${label}`)
    .join(", ");
}

function summarizeChange(change: Change): string {
  if (change.description.startsWith("Heading")) {
    return change.type === "moved"
      ? "heading moved"
      : change.type === "modified"
        ? "heading modified"
        : `heading ${change.type === "added" ? "added" : "removed"}`;
  }

  if (change.description.startsWith("Paragraph")) {
    return change.type === "moved"
      ? "paragraph moved"
      : change.type === "modified"
        ? "paragraph modified"
        : `paragraph ${change.type === "added" ? "added" : "removed"}`;
  }

  return `table ${change.type === "added" ? "added" : change.type === "removed" ? "removed" : change.type === "moved" ? "moved" : "modified"}`;
}
