import { performance } from "node:perf_hooks";
import { writeFileSync } from "node:fs";
import { PdfEngine } from "../src/engine.js";
import {
  extractPdfEvidence,
  findPdfEvidence,
  redactPdfEvidence,
  verifyPdfRedaction,
} from "../src/evidence-processing.js";

const pageCount = 25;
const query = "998877";
const knownBadOverlay = await PdfEngine.render({
  pages: [{
    graphics: [{ type: "rect", x: 94, y: 704, width: 48, height: 14, fill: { space: "solid", color: { space: "rgb", r: 0, g: 0, b: 0 } } }],
    text: { value: query, x: 96, y: 708, fontSize: 10 },
  }],
});
const source = await PdfEngine.render({
  meta: { author: "Runstamp benchmark", title: "A03 buyer-shaped evidence fixture" },
  pages: Array.from({ length: pageCount }, (_, pageIndex) => ({
    texts: [
      { value: `Mortgage application page ${pageIndex + 1}`, x: 54, y: 738, fontSize: 12 },
      { value: pageIndex === 12 ? `Account ${query}` : `Public record ${String(pageIndex + 1).padStart(4, "0")}`, x: 54, y: 710, fontSize: 10 },
      { value: "Reviewer route: document operations", x: 54, y: 688, fontSize: 10 },
    ],
  })),
});

const startedAt = performance.now();
const extraction = await extractPdfEvidence(source);
const extractedAt = performance.now();
const matches = findPdfEvidence(extraction, query);
const redaction = await redactPdfEvidence(source, matches);
const redactedAt = performance.now();
const verification = await verifyPdfRedaction(redaction.buffer, [query]);
const knownBadVerification = await verifyPdfRedaction(knownBadOverlay, [query]);
const verifiedAt = performance.now();

const outputArgument = process.argv.find((argument) => argument.startsWith("--out="));
if (outputArgument) writeFileSync(outputArgument.slice("--out=".length), redaction.buffer);
const knownBadOutputArgument = process.argv.find((argument) => argument.startsWith("--known-bad-out="));
if (knownBadOutputArgument) writeFileSync(knownBadOutputArgument.slice("--known-bad-out=".length), knownBadOverlay);

console.log(JSON.stringify({
  pageCount,
  sourceBytes: source.length,
  sanitizedBytes: redaction.buffer.length,
  textRuns: extraction.textRuns.length,
  matches: matches.length,
  losses: redaction.losses.map((loss) => loss.code),
  verification: verification.status,
  knownBadVerification: knownBadVerification.status,
  sha256: redaction.sha256,
  durationsMs: {
    extract: Number((extractedAt - startedAt).toFixed(3)),
    redact: Number((redactedAt - extractedAt).toFixed(3)),
    verify: Number((verifiedAt - redactedAt).toFixed(3)),
    total: Number((verifiedAt - startedAt).toFixed(3)),
  },
}, null, 2));
