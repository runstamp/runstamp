import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import JSZip from "jszip";
import { PptxArchive } from "../src/ooxml/zipper.js";
import { setDeterministicMode } from "../src/deterministicMode.js";
import {
  exportPptxTemplate,
  importPptxTemplate,
  mutatePptxTemplate,
  verifyPptxTemplate,
} from "../src/template/roundTrip.js";

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? resolve(process.argv[index + 1]) : resolve(fallback);
}

function slideShape(index: number): string {
  return `<p:sp><p:nvSpPr><p:cNvPr id="2" name="runstamp:slot:headline-${index}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="685800" y="685800"/><a:ext cx="10820400" cy="914400"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="2400"/><a:t>Executive update ${index}</a:t></a:r><a:endParaRPr lang="en-US"/></a:p></p:txBody></p:sp>`;
}

async function buildExecutiveDeck(): Promise<Buffer> {
  setDeterministicMode(true);
  const archive = new PptxArchive();
  const slideCount = 55;
  archive.assemblePresentation(slideCount, {
    meta: { title: "A04 executive template", author: "Runstamp factory" },
    slideContents: Array.from({ length: slideCount }, (_, index) => slideShape(index + 1)),
    slideMediaManifests: Array.from({ length: slideCount }, () => ({ assets: [], fillAssets: [], svgAssets: [], videoAssets: [], audioAssets: [], warnings: [] })),
    slideNotes: Array.from({ length: slideCount }, (_, index) => index === 0 ? "Approved Q3 source notes" : undefined),
    themeConfig: {
      colorScheme: { accent1: "0057B8", accent2: "00A6A6", accent3: "6B7280", dk1: "111827", lt1: "FFFFFF" },
      fontScheme: { majorLatin: "Aptos Display", minorLatin: "Aptos" },
    },
  });
  return archive.generateBuffer();
}

async function main(): Promise<void> {
  const outputPath = arg("--out", "factory/evidence/A04/executive-55-round-trip.pptx");
  const sourcePath = arg("--source-out", "factory/evidence/A04/executive-55-source.pptx");
  const knownBadPath = arg("--known-bad-out", "factory/evidence/A04/known-bad-dangling-relationship.pptx");
  const source = await buildExecutiveDeck();
  const imported = await importPptxTemplate(source);
  const mutated = await mutatePptxTemplate(imported, {
    textSlots: { "headline-1": "Approved executive update" },
    themeColors: { "0057B8": "003B73" },
  });
  const exported = await exportPptxTemplate(mutated);
  const verification = await verifyPptxTemplate(exported.buffer, imported.inspection);
  if (verification.status !== "PASS") throw new Error(JSON.stringify(verification.issues));

  const badZip = await JSZip.loadAsync(exported.buffer);
  const relPath = "ppt/slides/_rels/slide1.xml.rels";
  const rels = await badZip.file(relPath)!.async("string");
  badZip.file(relPath, rels.replace("../slideLayouts/slideLayout1.xml", "../slideLayouts/missing-layout.xml"));
  const knownBad = await badZip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } });
  const knownBadVerification = await verifyPptxTemplate(knownBad);
  if (knownBadVerification.status !== "FAIL") throw new Error("Known-bad dangling relationship did not fail.");

  await mkdir(dirname(outputPath), { recursive: true });
  await mkdir(dirname(sourcePath), { recursive: true });
  await mkdir(dirname(knownBadPath), { recursive: true });
  await writeFile(sourcePath, source);
  await writeFile(outputPath, exported.buffer);
  await writeFile(knownBadPath, knownBad);
  console.log(JSON.stringify({
    outputPath,
    sourcePath,
    sha256: exported.sha256,
    byteLength: exported.byteLength,
    slides: imported.inspection.counts.slides,
    objects: imported.inspection.counts.objects,
    slots: imported.inspection.slots.length,
    verification: verification.status,
    knownBadPath,
    knownBadVerification: knownBadVerification.status,
    knownBadIssues: knownBadVerification.issues.map((issue) => issue.code),
  }, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
