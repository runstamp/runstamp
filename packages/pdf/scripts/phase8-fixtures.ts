import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { PNG } from "pngjs";
import { createExternalLinkDocument } from "./phase6-fixtures.js";
import { ensurePhase2FontFixtures } from "./phase2-font-fixtures.js";
import { createTaggedDocument } from "./phase7-fixtures.js";
import type { PdfaConformanceLevel, PdfDocumentPhase8 } from "../src/engine.js";

const requireFrom = createRequire(import.meta.url);

export function resolvePdfaIccProfilePath(): string {
  const candidates = [
    process.env.RUNSTAMP_PDFA_ICC,
    "/System/Library/ColorSync/Profiles/sRGB Profile.icc",
    "/System/Library/ColorSync/Profiles/Generic RGB Profile.icc",
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  try {
    return requireFrom.resolve("pdfkit/js/data/sRGB_IEC61966_2_1.icc");
  } catch {
    throw new Error("Unable to locate an sRGB ICC profile for Phase 8 fixtures");
  }
}

export async function createPdfaDocument(): Promise<PdfDocumentPhase8> {
  const fonts = await ensurePhase2FontFixtures();
  const tagged = createTaggedDocument();

  return {
    ...tagged,
    accessibility: {
      ...(tagged.accessibility ?? {}),
      lang: "en-US",
      tagged: true,
    },
    meta: {
      ...(tagged.meta ?? {}),
      author: "Runstamp",
      creationDate: "2026-03-29T12:00:00.000Z",
      creator: "Phase 8 benchmark",
      modDate: "2026-03-29T12:00:00.000Z",
      producer: "Runstamp json-to-pdf",
      subject: "PDF/A-2a verification",
      title: "Phase 8 PDF/A-2a",
    },
    pdfa: {
      enabled: true,
      fallbackFont: {
        family: "Lato",
        source: fonts.lato,
      },
      fallbackFonts: [
        {
          family: "Noto Sans CJK JP",
          source: fonts.cjk,
        },
      ],
      iccProfile: resolvePdfaIccProfilePath(),
    },
  };
}

export async function createPdfaExternalLinkDocument(): Promise<PdfDocumentPhase8> {
  const fonts = await ensurePhase2FontFixtures();
  const base = createExternalLinkDocument();

  return {
    ...base,
    accessibility: {
      lang: "en-US",
      tagged: true,
    },
    meta: {
      ...(base.meta ?? {}),
      author: "Runstamp",
      creationDate: "2026-03-29T12:00:00.000Z",
      creator: "Phase 8 benchmark",
      modDate: "2026-03-29T12:00:00.000Z",
      producer: "Runstamp json-to-pdf",
      title: "Phase 8 PDF/A External Link Rejection",
    },
    pdfa: {
      enabled: true,
      fallbackFont: {
        family: "Lato",
        source: fonts.lato,
      },
      fallbackFonts: [
        {
          family: "Noto Sans CJK JP",
          source: fonts.cjk,
        },
      ],
      iccProfile: resolvePdfaIccProfilePath(),
    },
  };
}

export async function createPdfaConformanceDocument(
  conformance: PdfaConformanceLevel,
): Promise<PdfDocumentPhase8> {
  const fonts = await ensurePhase2FontFixtures();
  const tagged = createTaggedDocument();

  return {
    ...tagged,
    accessibility: {
      ...(tagged.accessibility ?? {}),
      lang: "en-US",
    },
    meta: {
      ...(tagged.meta ?? {}),
      author: "Runstamp",
      creationDate: "2026-03-29T12:00:00.000Z",
      creator: "Phase 8 benchmark",
      modDate: "2026-03-29T12:00:00.000Z",
      producer: "Runstamp json-to-pdf",
      subject: `PDF/A-${conformance} verification`,
      title: `Phase 8 PDF/A-${conformance}`,
    },
    pdfa: {
      conformance,
      enabled: true,
      fallbackFont: {
        family: "Lato",
        source: fonts.lato,
      },
      fallbackFonts: [
        {
          family: "Noto Sans CJK JP",
          source: fonts.cjk,
        },
      ],
      iccProfile: resolvePdfaIccProfilePath(),
    },
  };
}

function createTransparentPng(): Buffer {
  const png = new PNG({ colorType: 6, height: 24, width: 48 });
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const index = (png.width * y + x) * 4;
      png.data[index] = 200;
      png.data[index + 1] = 100;
      png.data[index + 2] = 50;
      png.data[index + 3] = 128; // 50% transparent
    }
  }
  return PNG.sync.write(png);
}

export async function createPdfa1bTransparencyDocument(): Promise<PdfDocumentPhase8> {
  const fonts = await ensurePhase2FontFixtures();

  return {
    children: [
      {
        type: "paragraph",
        value: "A document with a semi-transparent image.",
      },
      {
        alt: "Semi-transparent test image",
        format: "png" as const,
        height: 24,
        source: createTransparentPng(),
        type: "figure",
        width: 48,
      },
    ],
    meta: {
      author: "Runstamp",
      creationDate: "2026-03-29T12:00:00.000Z",
      modDate: "2026-03-29T12:00:00.000Z",
      producer: "Runstamp json-to-pdf",
      title: "PDF/A-1b Transparency Rejection",
    },
    pdfa: {
      conformance: "1b",
      enabled: true,
      fallbackFont: {
        family: "Lato",
        source: fonts.lato,
      },
      iccProfile: resolvePdfaIccProfilePath(),
    },
  } as PdfDocumentPhase8;
}
