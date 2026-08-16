import { PdfError } from "./errors.js";
import {
  buildFontInputKey,
  prepareEmbeddedFonts,
  preparedFontSupportsText,
  type PdfEmbeddedFontInput,
  type PreparedEmbeddedFont,
} from "./font-embedding.js";
import { SRGB_ICC_PROFILE } from "./pdfa/srgb-icc-profile.js";
import type { PdfDocumentInteractiveSpec, PdfRenderedPage } from "./pdf-renderer.js";
import { analyzePhase7Document, type Phase7DocumentAnalysis } from "./phase7-analyze.js";
import type { PdfDocumentPhase8 } from "./phase8-types.js";
import type { PdfaConformanceLevel } from "./phase8-types.js";
import { escapeXml } from "./xml-escape.js";

const DEFAULT_LANG = "en-US";
const DEFAULT_OUTPUT_CONDITION_IDENTIFIER = "sRGB IEC61966-2.1";
const DEFAULT_PRODUCER = "Runstamp PDF";

function normalizeIsoDate(value: Date | string | undefined): string {
  if (!value) {
    return "";
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new TypeError("Invalid PDF/A metadata date");
    }
    return value.toISOString();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new TypeError(`Invalid PDF/A metadata date: ${value}`);
  }
  return parsed.toISOString();
}

function clonePages(pages: PdfRenderedPage[]): PdfRenderedPage[] {
  return pages.map((page) => ({
    ...page,
    annotations: [...(page.annotations ?? [])],
    extraCommands: [...(page.extraCommands ?? [])],
    graphics: [...(page.graphics ?? [])],
    texts: page.texts.map((text) => ({ ...text })),
  }));
}

function buildPdfaMetadataXml(
  meta: NonNullable<PdfDocumentPhase8["meta"]>,
  lang: string,
  conformance: PdfaConformanceLevel,
): string {
  const title = meta.title ?? "";
  const author = meta.author ?? "";
  const subject = meta.subject ?? "";
  const producer = meta.producer ?? DEFAULT_PRODUCER;
  const creator = meta.creator ?? producer;
  const keywords = meta.keywords?.join(", ") ?? "";
  const createDate = normalizeIsoDate(meta.creationDate);
  const modifyDate = normalizeIsoDate(meta.modDate ?? meta.creationDate);
  const metadataDate = modifyDate || createDate;

  return `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>\n<x:xmpmeta xmlns:x="adobe:ns:meta/">\n<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmlns:pdf="http://ns.adobe.com/pdf/1.3/" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">\n<dc:title><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(title)}</rdf:li></rdf:Alt></dc:title>\n<dc:creator><rdf:Seq><rdf:li>${escapeXml(author)}</rdf:li></rdf:Seq></dc:creator>\n<dc:description><rdf:Alt><rdf:li xml:lang="${escapeXml(lang)}">${escapeXml(subject)}</rdf:li></rdf:Alt></dc:description>\n<pdf:Producer>${escapeXml(producer)}</pdf:Producer>\n<pdf:Keywords>${escapeXml(keywords)}</pdf:Keywords>\n<xmp:CreatorTool>${escapeXml(creator)}</xmp:CreatorTool>\n<xmp:CreateDate>${escapeXml(createDate)}</xmp:CreateDate>\n<xmp:ModifyDate>${escapeXml(modifyDate)}</xmp:ModifyDate>\n<xmp:MetadataDate>${escapeXml(metadataDate)}</xmp:MetadataDate>\n<pdfaid:part>${conformance.startsWith("1") ? "1" : "2"}</pdfaid:part>\n<pdfaid:conformance>${conformance.endsWith("a") ? "A" : "B"}</pdfaid:conformance>\n</rdf:Description>\n</rdf:RDF>\n</x:xmpmeta>\n<?xpacket end="w"?>`;
}

function normalizePdfaMeta(document: PdfDocumentPhase8): NonNullable<PdfDocumentPhase8["meta"]> {
  const meta = {
    ...(document.meta ?? {}),
  };

  if (!meta.producer) {
    meta.producer = DEFAULT_PRODUCER;
  }
  if (!meta.creator) {
    meta.creator = meta.producer;
  }
  if (!meta.modDate && meta.creationDate) {
    meta.modDate = meta.creationDate;
  }
  if (!meta.creationDate && meta.modDate) {
    meta.creationDate = meta.modDate;
  }

  return meta;
}

function uniqueFonts(fonts: PdfEmbeddedFontInput[]): PdfEmbeddedFontInput[] {
  const seen = new Set<string>();
  const unique: PdfEmbeddedFontInput[] = [];
  for (const font of fonts) {
    const key = buildFontInputKey(font);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(font);
  }
  return unique;
}

async function prepareFallbackCoverage(
  fonts: PdfEmbeddedFontInput[],
): Promise<Map<string, PreparedEmbeddedFont>> {
  const unique = uniqueFonts(fonts);
  return prepareEmbeddedFonts(
    unique.map((font, index) => ({
      alias: `F${index + 1}`,
      font,
      samples: [" "],
    })),
    { subset: false },
  );
}

function selectCoveringFont(
  textValue: string,
  candidates: PdfEmbeddedFontInput[],
  prepared: Map<string, PreparedEmbeddedFont>,
): PdfEmbeddedFontInput | undefined {
  return uniqueFonts(candidates).find((font) => {
    const preparedFont = prepared.get(buildFontInputKey(font));
    return preparedFont ? preparedFontSupportsText(preparedFont, textValue) : false;
  });
}

async function replaceBuiltInFonts(
  pages: PdfRenderedPage[],
  interactive: PdfDocumentInteractiveSpec,
  fallbackFont: PdfEmbeddedFontInput | undefined,
  fallbackFonts: PdfEmbeddedFontInput[] = [],
): Promise<string | undefined> {
  const hasWidgetForms = pages.some((page) =>
    (page.annotations ?? []).some((annotation) =>
      annotation.kind === "form-text"
      || annotation.kind === "form-checkbox"
      || annotation.kind === "form-dropdown"
      || annotation.kind === "form-radio"
      || annotation.kind === "form-signature"));
  const needsFallback = pages.some((page) =>
    page.texts.some((text) => !text.font || typeof text.font === "string")) ||
    (interactive.sharedForms ?? []).some((form) => !form.fontResourceKey || form.fontResourceKey === "Helvetica") ||
    hasWidgetForms;

  if (!needsFallback) {
    return undefined;
  }
  if (!fallbackFont) {
    throw new PdfError(
      "PDFA_VIOLATION",
      "PDF/A requires an embedded fallbackFont when built-in Helvetica is present",
      { constraint: "embedded-fallback-font-required" },
    );
  }

  const fallbackKey = buildFontInputKey(fallbackFont);
  const coverageFonts = uniqueFonts([
    fallbackFont,
    ...fallbackFonts,
    ...pages.flatMap((page) =>
      page.texts.flatMap((text) =>
        (!text.font || typeof text.font === "string") ? (text.fallbackFonts ?? []) : [],
      ),
    ),
  ]);
  const preparedFallbacks = await prepareFallbackCoverage(coverageFonts);
  pages.forEach((page) => {
    page.texts.forEach((text) => {
      if (!text.font || typeof text.font === "string") {
        const selected = selectCoveringFont(text.value, [
          fallbackFont,
          ...(text.fallbackFonts ?? []),
          ...fallbackFonts,
        ], preparedFallbacks);
        if (!selected) {
          throw new PdfError(
            "PDFA_VIOLATION",
            `PDF/A fallback fonts do not cover text "${text.value.slice(0, 40)}"; provide a pdfa.fallbackFonts entry with glyph coverage.`,
            { constraint: "fallback-font-glyph-coverage" },
          );
        }
        text.font = selected;
      }
    });
  });
  interactive.sharedForms = (interactive.sharedForms ?? []).map((form) => ({
    ...form,
    fontResourceKey: !form.fontResourceKey || form.fontResourceKey === "Helvetica" ? fallbackKey : form.fontResourceKey,
  }));

  return fallbackKey;
}

function assertNoExternalReferences(pages: PdfRenderedPage[]): void {
  for (const page of pages) {
    for (const annotation of page.annotations ?? []) {
      if (annotation.kind === "link-external") {
        throw new PdfError(
          "PDFA_VIOLATION",
          "PDF/A does not allow external URI link annotations in this implementation",
          { constraint: "no-external-uri-annotations" },
        );
      }
    }
  }
}

export async function analyzePhase8Document(document: PdfDocumentPhase8): Promise<Phase7DocumentAnalysis> {
  if (!document.pdfa?.enabled) {
    throw new Error("Phase 8 analysis requires pdfa.enabled");
  }

  const conformance = document.pdfa?.conformance ?? "2a";
  const iccProfile = document.pdfa.iccProfile ?? SRGB_ICC_PROFILE;
  const lang = document.accessibility?.lang ?? DEFAULT_LANG;
  const phase7Document = {
    ...document,
    accessibility: {
      ...(document.accessibility ?? {}),
      lang,
      tagged: conformance === "2a" ? true : (document.accessibility?.tagged ?? false),
    },
  };

  const analysis = await analyzePhase7Document(phase7Document);
  const pages = clonePages(analysis.pages);
  const wantsTagged = conformance === "2a" || (document.accessibility?.tagged === true);
  const interactive: PdfDocumentInteractiveSpec = {
    ...analysis.interactive,
    accessibility: wantsTagged && analysis.interactive.accessibility
      ? {
          ...analysis.interactive.accessibility,
          lang,
        }
      : undefined,
    sharedForms: [...(analysis.interactive.sharedForms ?? [])],
  };
  const meta = normalizePdfaMeta(document);

  assertNoExternalReferences(pages);

  const defaultFontKey = await replaceBuiltInFonts(pages, interactive, document.pdfa.fallbackFont, document.pdfa.fallbackFonts);
  interactive.metadataXml = buildPdfaMetadataXml(meta, lang, conformance);
  interactive.pdfa = {
    conformance,
    defaultFont: document.pdfa.fallbackFont,
    defaultFontKey,
    iccProfile,
    outputConditionIdentifier: document.pdfa.outputConditionIdentifier ?? DEFAULT_OUTPUT_CONDITION_IDENTIFIER,
  };

  return {
    ...analysis,
    interactive: interactive as Phase7DocumentAnalysis["interactive"],
    meta,
    pages,
  };
}
