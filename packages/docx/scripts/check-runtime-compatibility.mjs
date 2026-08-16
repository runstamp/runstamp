#!/usr/bin/env node

import JSZip from "jszip";
import {
  renderToDocx,
  validateDocxBuffer,
} from "../dist/index.js";

const expected = ["Runtime compatibility", "Nested semantic value"];
const result = await renderToDocx({
  type: "DocxDocument",
  metadata: { language: "ko-KR" },
  pages: [{
    elements: [
      { type: "heading", level: 1, text: expected[0] },
      {
        type: "table",
        rows: [{ cells: [{ elements: [{ type: "paragraph", text: expected[1] }] }] }],
      },
    ],
  }],
});

if (!Buffer.isBuffer(result.buffer) || result.buffer.subarray(0, 2).toString("utf8") !== "PK") {
  throw new Error("Runtime compatibility render did not return a DOCX ZIP buffer.");
}
const validation = await validateDocxBuffer(result.buffer);
if (!validation.ok) {
  throw new Error(`Runtime compatibility validator failed: ${JSON.stringify(validation.issues)}`);
}
const zip = await JSZip.loadAsync(result.buffer);
const documentXml = await zip.file("word/document.xml")?.async("string");
if (!documentXml || expected.some((text) => !documentXml.includes(text))) {
  throw new Error("Runtime compatibility render lost expected semantic text.");
}
if (!documentXml.includes('w:lang w:val="ko-KR"')) {
  throw new Error("Runtime compatibility render did not emit the document language.");
}

console.log(JSON.stringify({
  node: process.version,
  bytes: result.buffer.length,
  logicalPageCount: result.stats.logicalPageCount,
  validationIssues: validation.issues.length,
}));
