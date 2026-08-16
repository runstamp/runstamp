import { compareSemanticDocuments } from "../dist/index.js";

const make = (version, text) => ({
  schemaVersion: 1,
  artifactId: "determinism-contract",
  artifactKind: "docx",
  version: { id: version, sha256: (version === "v1" ? "a" : "b").repeat(64) },
  nodes: [{
    id: "clause-1",
    kind: "paragraph",
    locator: { artifactId: "determinism-contract", scheme: "docx.node", value: ["body", "clause-1"] },
    text,
    style: { italic: false, bold: true },
  }],
});

const result = await compareSemanticDocuments(make("v1", "Payment is due in 30 days."), make("v2", "Payment is due in 15 days."));
process.stdout.write(`${result.changeSetHash}\n`);
