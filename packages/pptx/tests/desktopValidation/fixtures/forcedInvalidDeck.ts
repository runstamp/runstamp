import JSZip from "jszip";
import { PaperEngine } from "../../../src/index.js";
import type { PaperDocument } from "../../../src/index.js";

const baseDoc: PaperDocument = {
  type: "Document",
  meta: { title: "Forced Invalid Relationship Fixture" },
  slides: [
    {
      type: "Slide",
      children: [
        {
          type: "Text",
          content: "This deck is intentionally corrupted for harness self-tests.",
          style: { fontSize: 28, fontWeight: "bold" },
        },
      ],
    },
  ],
};

export async function buildForcedInvalidRelTargetDeck(): Promise<Buffer> {
  const buffer = await PaperEngine.render(baseDoc);
  const zip = await JSZip.loadAsync(buffer);
  const rels = zip.file("ppt/_rels/presentation.xml.rels");
  if (!rels) {
    throw new Error("presentation rels missing while building forced invalid deck");
  }
  const xml = await rels.async("string");
  zip.file(
    "ppt/_rels/presentation.xml.rels",
    xml.replace(
      'Target="slides/slide1.xml"',
      'Target="slides/missing-slide1.xml"',
    ),
  );
  return zip.generateAsync({ type: "nodebuffer" });
}
