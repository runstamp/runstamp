// src/template/mutator.ts — Template-aware ZIP assembly

import { posix as posixPath } from "node:path";
import JSZip from "jszip";
import type { TemplateIndex } from "./parser.js";
import type { SlideMediaManifest, MediaAsset } from "../ooxml/media.js";
import { generateSlideShell, generateNotesSlide, generateNotesMaster } from "../ooxml/slide.js";
import { generateSlideRels, generateNotesSlideRels, generateNotesMasterRels } from "../ooxml/slideRelationships.js";
import { generateNotesTheme } from "../ooxml/theme.js";
import type { SlideChartManifest } from "../ooxml/chart/index.js";
import type { VideoMediaRelationship, AudioMediaRelationship } from "../ooxml/slideRelationships.js";
import type { SlideBackground, HeaderFooter, Paragraph } from "../types/ast.js";
import { isDeterministicMode, DETERMINISTIC_DATE } from "../deterministicMode.js";
import { normalizePresentationChildOrder } from "../ooxml/presentationOrder.js";
import { ooxmlMutationParser, ooxmlMutationBuilder, asArray } from "./xmlParser.js";

type ZipFileOptions = { date?: Date };

function ensureZipFolder(zip: JSZip, path: string, opts: ZipFileOptions): void {
  const normalized = path.endsWith("/") ? path : `${path}/`;
  zip.file(normalized, null, { ...opts, dir: true });
}

function ensureZipParentFolders(zip: JSZip, path: string, opts: ZipFileOptions): void {
  const parts = path.split("/").slice(0, -1);
  for (let i = 1; i <= parts.length; i++) {
    ensureZipFolder(zip, parts.slice(0, i).join("/"), opts);
  }
}

function relationshipSourceDirectory(relationshipPath: string): string {
  if (relationshipPath === "_rels/.rels") return "";
  const marker = "/_rels/";
  const markerIndex = relationshipPath.indexOf(marker);
  if (markerIndex < 0 || !relationshipPath.endsWith(".rels")) return "";
  const sourcePart = posixPath.join(
    relationshipPath.slice(0, markerIndex),
    relationshipPath.slice(markerIndex + marker.length, -".rels".length),
  );
  return posixPath.dirname(sourcePart);
}

async function pruneUnreferencedMedia(zip: JSZip): Promise<void> {
  const referencedParts = new Set<string>();
  const relationshipPaths = Object.keys(zip.files).filter((path) => path.endsWith(".rels"));
  for (const relationshipPath of relationshipPaths) {
    const relationshipFile = zip.file(relationshipPath);
    if (!relationshipFile) continue;
    const relationshipDoc = ooxmlMutationParser.parse(await relationshipFile.async("string"));
    const relationships = asArray(relationshipDoc.Relationships?.Relationship);
    const sourceDirectory = relationshipSourceDirectory(relationshipPath);
    for (const relationship of relationships) {
      if (relationship["@_TargetMode"] === "External") continue;
      const target = relationship["@_Target"];
      if (typeof target !== "string" || target.length === 0) continue;
      const decodedTarget = decodeURIComponent(target).replace(/^\//u, "");
      referencedParts.add(posixPath.normalize(posixPath.join(sourceDirectory, decodedTarget)));
    }
  }

  for (const path of Object.keys(zip.files)) {
    if (path.startsWith("ppt/media/") && !zip.files[path]?.dir && !referencedParts.has(path)) {
      zip.remove(path);
    }
  }
}

export interface MutatorOptions {
  slideCount: number;
  slideContents: string[];
  slideMediaManifests: SlideMediaManifest[];
  slideChartManifests?: SlideChartManifest[];
  slideHyperlinkRels?: Array<Array<{ rId: string; url: string }>>;
  slideLayoutTargets?: string[];
  slideTransitionXmls?: string[];
  slideTimingXmls?: string[];

  // P1-5: Previously dropped features
  slideBackgrounds?: (SlideBackground | undefined)[];
  slideHeaderFooters?: (HeaderFooter | undefined)[];
  slideNotes?: (string | Paragraph[] | undefined)[];
  slideBgImageAssets?: (MediaAsset | undefined)[];
  slideWidthEmu?: number;
  slideHeightEmu?: number;

  // Comments
  commentSlideInfos?: Array<{ slideIndex: number; commentFileIndex: number }>;
  commentAuthorsXml?: string;
  commentFilesMap?: Map<string, string>;

  // Font embedding
  embeddedFontListXml?: string;
  extraPresentationRels?: Array<{ rId: string; type: string; target: string }>;
  fontDataFiles?: Array<{ path: string; buffer: Buffer }>;
}

/**
 * Assembles a PPTX from a template, replacing/adding slides while
 * preserving the template's theme, masters, and layouts.
 */
export async function assembleFromTemplate(
  templateIndex: TemplateIndex,
  options: MutatorOptions,
): Promise<Buffer> {
  const zip = new JSZip();
  const opts = isDeterministicMode() ? { date: DETERMINISTIC_DATE } : {};

  // Parse template XML strings into DOM trees for manipulation.
  // Content types, presentation XML, and presentation rels are each parsed once
  // using the round-trip mutation parser, mutated in-memory, then serialized back
  // via the mutation builder — eliminating all regex-based XML manipulation.
  const ctDoc = ooxmlMutationParser.parse(templateIndex.contentTypesXml);
  const presDoc = ooxmlMutationParser.parse(templateIndex.presentationXml);
  const relsDoc = ooxmlMutationParser.parse(templateIndex.presentationRels);

  // Normalize Override/Default/Relationship arrays (isArray callback ensures this
  // for templates with ≥1 entry, asArray handles the 0-entry edge case).
  const typesRoot = ctDoc.Types;
  typesRoot.Override = asArray(typesRoot.Override);
  typesRoot.Default = asArray(typesRoot.Default);
  relsDoc.Relationships.Relationship = asArray(relsDoc.Relationships.Relationship);

  // Parse existing rIds from presentation.xml.rels to find a safe starting offset
  // for new slide relationships. Templates with many custom rels (e.g. 120+)
  // would collide with the old hardcoded rId101+ offset.
  let maxTemplateRId = 0;
  for (const rel of relsDoc.Relationships.Relationship) {
    const idStr = (rel["@_Id"] ?? "") as string;
    const m = /^rId(\d+)$/.exec(idStr);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxTemplateRId) maxTemplateRId = n;
    }
  }
  const slideRIdBase = Math.max(maxTemplateRId + 1, 101);

  // Clone all non-slide files from template
  const templateZip = templateIndex.zip;
  for (const [path, file] of Object.entries(templateZip.files)) {
    if (file.dir) continue;
    // Security: normalize then reject paths with traversal sequences or absolute paths
    const normalizedPath = posixPath.normalize(path);
    if (normalizedPath.includes("..") || normalizedPath.startsWith("/")) continue;
    // Skip existing slides — we'll generate new ones
    if (path.startsWith("ppt/slides/")) continue;
    // Skip existing notes slides — we'll generate new ones if needed
    if (path.startsWith("ppt/notesSlides/")) continue;
    // Skip existing comment files — we'll generate new ones if needed
    if (path.startsWith("ppt/comments/")) continue;
    const content = await file.async("nodebuffer");
    ensureZipParentFolders(zip, path, opts);
    zip.file(path, content, opts);
  }

  // Ensure slide folders exist
  ensureZipFolder(zip, "ppt/slides", opts);
  ensureZipFolder(zip, "ppt/slides/_rels", opts);
  ensureZipFolder(zip, "ppt/media", opts);

  // Determine which slides have notes
  const slideNotes = options.slideNotes ?? [];
  const hasAnyNotes = slideNotes.some(n => n !== undefined && n !== "" && !(Array.isArray(n) && n.length === 0));
  if (hasAnyNotes) {
    ensureZipFolder(zip, "ppt/notesMasters", opts);
    ensureZipFolder(zip, "ppt/notesMasters/_rels", opts);
    ensureZipFolder(zip, "ppt/notesSlides", opts);
    ensureZipFolder(zip, "ppt/notesSlides/_rels", opts);
    ensureZipFolder(zip, "ppt/theme", opts);
  }

  // Determine which slides have comments
  const commentSlideInfos = options.commentSlideInfos ?? [];
  const hasComments = commentSlideInfos.length > 0;
  if (hasComments) {
    ensureZipFolder(zip, "ppt/comments", opts);
  }

  if (options.fontDataFiles && options.fontDataFiles.length > 0) {
    ensureZipFolder(zip, "ppt/fonts", opts);
  }

  const hasAnyChart = options.slideChartManifests?.some(manifest => manifest.charts.length > 0) ?? false;
  const hasAnyChartDrawing = options.slideChartManifests?.some(manifest => manifest.charts.some(chart => chart.chartDrawingXml)) ?? false;
  if (hasAnyChart) {
    ensureZipFolder(zip, "ppt/charts", opts);
    ensureZipFolder(zip, "ppt/charts/_rels", opts);
    ensureZipFolder(zip, "ppt/embeddings", opts);
  }
  if (hasAnyChartDrawing) {
    ensureZipFolder(zip, "ppt/drawings", opts);
  }

  // ---- Content Types (DOM-based) ----
  // Remove existing slide/notes/comment Override entries
  typesRoot.Override = typesRoot.Override.filter((o: any) => {
    const pn: string = o["@_PartName"] ?? "";
    return !/\/ppt\/slides\/slide\d+\.xml$/.test(pn) &&
           !/\/ppt\/notesSlides\/notesSlide\d+\.xml$/.test(pn) &&
           !/\/ppt\/comments\/comment\d+\.xml$/.test(pn);
  });

  // Add new slide overrides
  for (let i = 1; i <= options.slideCount; i++) {
    typesRoot.Override.push({
      "@_PartName": `/ppt/slides/slide${i}.xml`,
      "@_ContentType": "application/vnd.openxmlformats-officedocument.presentationml.slide+xml",
    });
  }

  // Add chart overrides if present
  if (options.slideChartManifests) {
    for (const manifest of options.slideChartManifests) {
      for (const chart of manifest.charts) {
        const prefix = chart.isChartEx ? "chartEx" : "chart";
        const ct = chart.isChartEx
          ? "application/vnd.ms-office.chartex+xml"
          : "application/vnd.openxmlformats-officedocument.drawingml.chart+xml";
        typesRoot.Override.push({
          "@_PartName": `/ppt/charts/${prefix}${chart.chartIndex}.xml`,
          "@_ContentType": ct,
        });
        if (chart.chartDrawingXml) {
          typesRoot.Override.push({
            "@_PartName": `/ppt/drawings/drawing${chart.chartIndex}.xml`,
            "@_ContentType": "application/vnd.openxmlformats-officedocument.drawingml.chartshapes+xml",
          });
        }
      }
    }
    if (hasAnyChart && !typesRoot.Default.some((d: any) => d["@_Extension"] === "xlsx")) {
      typesRoot.Default.push({
        "@_Extension": "xlsx",
        "@_ContentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
    }
  }

  // Add SVG content type if any slide has SVG assets
  const hasSvg = options.slideMediaManifests.some(m => m.svgAssets.length > 0);
  if (hasSvg && !typesRoot.Default.some((d: any) => d["@_Extension"] === "svg")) {
    typesRoot.Default.push({
      "@_Extension": "svg",
      "@_ContentType": "image/svg+xml",
    });
  }

  // Notes master + notes slides content type overrides
  if (hasAnyNotes) {
    if (!typesRoot.Override.some((o: any) => (o["@_PartName"] ?? "").includes("notesMaster1.xml"))) {
      typesRoot.Override.push({
        "@_PartName": "/ppt/notesMasters/notesMaster1.xml",
        "@_ContentType": "application/vnd.openxmlformats-officedocument.presentationml.notesMaster+xml",
      });
    }
    if (!typesRoot.Override.some((o: any) => (o["@_PartName"] ?? "") === "/ppt/theme/theme2.xml")) {
      typesRoot.Override.push({
        "@_PartName": "/ppt/theme/theme2.xml",
        "@_ContentType": "application/vnd.openxmlformats-officedocument.theme+xml",
      });
    }
    for (let i = 0; i < options.slideCount; i++) {
      const n = slideNotes[i];
      if (n !== undefined && n !== "" && !(Array.isArray(n) && n.length === 0)) {
        typesRoot.Override.push({
          "@_PartName": `/ppt/notesSlides/notesSlide${i + 1}.xml`,
          "@_ContentType": "application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml",
        });
      }
    }
  }

  // Comment overrides
  if (hasComments) {
    if (!typesRoot.Override.some((o: any) => (o["@_PartName"] ?? "").includes("commentAuthors.xml"))) {
      typesRoot.Override.push({
        "@_PartName": "/ppt/commentAuthors.xml",
        "@_ContentType": "application/vnd.openxmlformats-officedocument.presentationml.commentAuthors+xml",
      });
    }
    for (const info of commentSlideInfos) {
      typesRoot.Override.push({
        "@_PartName": `/ppt/comments/comment${info.commentFileIndex}.xml`,
        "@_ContentType": "application/vnd.openxmlformats-officedocument.presentationml.comments+xml",
      });
    }
  }

  // Font data content type
  if (options.fontDataFiles && options.fontDataFiles.length > 0) {
    if (!typesRoot.Default.some((d: any) => d["@_Extension"] === "fntdata")) {
      typesRoot.Default.push({
        "@_Extension": "fntdata",
        "@_ContentType": "application/x-fontdata",
      });
    }
  }

  zip.file("[Content_Types].xml", ooxmlMutationBuilder.build(ctDoc), opts);

  // ---- Presentation XML (DOM-based) ----
  let pres = presDoc["p:presentation"];

  // Replace slide ID list
  const newSldIds: Array<Record<string, string>> = [];
  for (let i = 1; i <= options.slideCount; i++) {
    newSldIds.push({
      "@_id": String(255 + i),
      "@_r:id": `rId${slideRIdBase + i - 1}`,
    });
  }
  pres["p:sldIdLst"] = { "p:sldId": newSldIds };

  const notesMasterRel = relsDoc.Relationships.Relationship.find(
    (rel: any) => ((rel["@_Type"] ?? "") as string).includes("notesMaster"),
  );
  const notesMasterRId = notesMasterRel?.["@_Id"] as string | undefined;
  if (hasAnyNotes) {
    pres["p:notesMasterIdLst"] = {
      "p:notesMasterId": {
        "@_r:id": notesMasterRId ?? "rIdNotesMaster",
      },
    };
  }

  // Inject embedded font list if provided (must appear after p:notesSz or
  // p:sldSz per ECMA-376 element ordering)
  if (options.embeddedFontListXml) {
    const fontFragDoc = ooxmlMutationParser.parse(options.embeddedFontListXml);
    const fontLst = fontFragDoc["p:embeddedFontLst"];
    if (fontLst) {
      const insertAfter = "p:notesSz" in pres
        ? "p:notesSz"
        : ("p:sldSz" in pres ? "p:sldSz" : null);
      if (insertAfter) {
        // Rebuild the object with the font list inserted at the correct position
        // (V8 preserves string key insertion order in object literals)
        const rebuilt: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(pres)) {
          rebuilt[key] = val;
          if (key === insertAfter) {
            rebuilt["p:embeddedFontLst"] = fontLst;
          }
        }
        presDoc["p:presentation"] = rebuilt;
        pres = rebuilt;
      } else {
        pres["p:embeddedFontLst"] = fontLst;
      }
    }
  }

  presDoc["p:presentation"] = normalizePresentationChildOrder(presDoc["p:presentation"]);
  pres = presDoc["p:presentation"];

  zip.file("ppt/presentation.xml", ooxmlMutationBuilder.build(presDoc), opts);

  // ---- Presentation Rels (DOM-based) ----
  // Remove existing slide rels
  relsDoc.Relationships.Relationship = relsDoc.Relationships.Relationship.filter(
    (r: any) => !((r["@_Type"] ?? "") as string).endsWith("/slide"),
  );

  // Add new slide rels
  for (let i = 1; i <= options.slideCount; i++) {
    relsDoc.Relationships.Relationship.push({
      "@_Id": `rId${slideRIdBase + i - 1}`,
      "@_Type": "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide",
      "@_Target": `slides/slide${i}.xml`,
    });
  }

  // Add notes master rel if we have notes and template doesn't already have one
  if (hasAnyNotes && !relsDoc.Relationships.Relationship.some(
    (r: any) => ((r["@_Type"] ?? "") as string).includes("notesMaster"),
  )) {
    relsDoc.Relationships.Relationship.push({
      "@_Id": "rIdNotesMaster",
      "@_Type": "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster",
      "@_Target": "notesMasters/notesMaster1.xml",
    });
  }

  // Add comment authors rel if we have comments and template doesn't already have one
  if (hasComments && options.commentAuthorsXml && !relsDoc.Relationships.Relationship.some(
    (r: any) => ((r["@_Target"] ?? "") as string).includes("commentAuthors"),
  )) {
    relsDoc.Relationships.Relationship.push({
      "@_Id": "rIdCommentAuthors",
      "@_Type": "http://schemas.openxmlformats.org/officeDocument/2006/relationships/commentAuthors",
      "@_Target": "commentAuthors.xml",
    });
  }

  // Add font embedding rels
  if (options.extraPresentationRels) {
    for (const rel of options.extraPresentationRels) {
      relsDoc.Relationships.Relationship.push({
        "@_Id": rel.rId,
        "@_Type": rel.type,
        "@_Target": rel.target,
      });
    }
  }

  zip.file("ppt/_rels/presentation.xml.rels", ooxmlMutationBuilder.build(relsDoc), opts);

  // Write notes master if needed
  if (hasAnyNotes) {
    // Only write notes master if template doesn't already have one
    if (!templateZip.file("ppt/notesMasters/notesMaster1.xml")) {
      zip.file("ppt/notesMasters/notesMaster1.xml", generateNotesMaster(), opts);
      zip.file("ppt/notesMasters/_rels/notesMaster1.xml.rels", generateNotesMasterRels(), opts);
    }
    if (!templateZip.file("ppt/theme/theme2.xml")) {
      zip.file("ppt/theme/theme2.xml", generateNotesTheme(), opts);
    }
  }

  // Write comment files
  if (options.commentFilesMap) {
    for (const [path, content] of options.commentFilesMap) {
      ensureZipParentFolders(zip, path, opts);
      zip.file(path, content, opts);
    }
  }
  if (options.commentAuthorsXml) {
    zip.file("ppt/commentAuthors.xml", options.commentAuthorsXml, opts);
  }

  // Write font data files
  if (options.fontDataFiles) {
    for (const { path, buffer } of options.fontDataFiles) {
      ensureZipParentFolders(zip, path, opts);
      zip.file(path, buffer, opts);
    }
  }

  // Generate slides
  for (let i = 1; i <= options.slideCount; i++) {
    const innerSpTree = options.slideContents[i - 1] ?? "";
    const mediaManifest = options.slideMediaManifests[i - 1];
    const chartManifest = options.slideChartManifests?.[i - 1];
    const hyperlinkRels = options.slideHyperlinkRels?.[i - 1] ?? [];
    const background = options.slideBackgrounds?.[i - 1];
    const headerFooter = options.slideHeaderFooters?.[i - 1];
    const notes = options.slideNotes?.[i - 1];
    const bgImageAsset = options.slideBgImageAssets?.[i - 1];

    // Build media rels (images + fill images)
    const mediaRels: Array<{ rId: string; target: string }> = [];
    if (mediaManifest) {
      for (const asset of mediaManifest.assets) {
        zip.file(asset.mediaPath, asset.buffer, opts);
        mediaRels.push({ rId: asset.rId, target: asset.relativePath });
      }
      for (const asset of mediaManifest.fillAssets) {
        zip.file(asset.mediaPath, asset.buffer, opts);
        mediaRels.push({ rId: asset.rId, target: asset.relativePath });
      }
    }

    // Build video rels
    const videoRels: VideoMediaRelationship[] = [];
    if (mediaManifest?.videoAssets) {
      for (const asset of mediaManifest.videoAssets) {
        zip.file(asset.mediaPath, asset.buffer, opts);
        const rel: VideoMediaRelationship = {
          videoRId: asset.videoRId,
          mediaRId: asset.mediaRId,
          videoTarget: asset.relativePath,
        };
        if (asset.posterRId && asset.posterBuffer && asset.posterMediaPath && asset.posterRelativePath) {
          zip.file(asset.posterMediaPath, asset.posterBuffer, opts);
          rel.posterRId = asset.posterRId;
          rel.posterTarget = asset.posterRelativePath;
        }
        videoRels.push(rel);
      }
    }

    // Build audio rels
    const audioRels: AudioMediaRelationship[] = [];
    if (mediaManifest?.audioAssets) {
      for (const asset of mediaManifest.audioAssets) {
        zip.file(asset.mediaPath, asset.buffer, opts);
        audioRels.push({
          audioRId: asset.audioRId,
          mediaRId: asset.mediaRId,
          audioTarget: asset.relativePath,
        });
      }
    }

    // Build SVG rels
    const svgRels: Array<{ rId: string; target: string }> = [];
    if (mediaManifest) {
      for (const svgAsset of mediaManifest.svgAssets) {
        zip.file(svgAsset.svgMediaPath, svgAsset.svgBuffer, opts);
        svgRels.push({ rId: svgAsset.svgRId, target: svgAsset.svgRelativePath });
      }
    }

    // Build chart rels
    const chartRels: Array<{ rId: string; target: string; type: string }> = [];
    if (chartManifest) {
      for (const chart of chartManifest.charts) {
        if (chart.chartXml && chart.chartRelsXml && chart.excelBuffer && chart.rId) {
          const prefix = chart.isChartEx ? "chartEx" : "chart";
          zip.file(`ppt/charts/${prefix}${chart.chartIndex}.xml`, chart.chartXml, opts);
          zip.file(`ppt/charts/_rels/${prefix}${chart.chartIndex}.xml.rels`, chart.chartRelsXml, opts);
          zip.file(`ppt/embeddings/${prefix}${chart.chartIndex}.xlsx`, chart.excelBuffer, opts);
          if (chart.chartDrawingXml) {
            zip.file(`ppt/drawings/drawing${chart.chartIndex}.xml`, chart.chartDrawingXml, opts);
          }
          chartRels.push({
            rId: chart.rId,
            target: `../charts/${prefix}${chart.chartIndex}.xml`,
            type: chart.isChartEx ? "chartEx" : "chart",
          });
        }
        // Fallback image
        if (chart.fallbackPng && chart.fallbackMediaPath) {
          zip.file(chart.fallbackMediaPath, chart.fallbackPng, opts);
          if (chart.fallbackRId && chart.fallbackRelativePath) {
            mediaRels.push({ rId: chart.fallbackRId, target: chart.fallbackRelativePath });
          }
        }
      }
    }

    // Process background image asset
    if (bgImageAsset) {
      zip.file(bgImageAsset.mediaPath, bgImageAsset.buffer, opts);
      mediaRels.push({ rId: bgImageAsset.rId, target: bgImageAsset.relativePath });
    }

    const layoutTarget = options.slideLayoutTargets?.[i - 1] ?? "../slideLayouts/slideLayout1.xml";

    // Notes slide
    const hasNotes = notes !== undefined && notes !== "" && !(Array.isArray(notes) && notes.length === 0);
    const notesSlideIndex = hasNotes ? i : undefined;

    // Comment info for this slide
    const commentInfo = commentSlideInfos.find(c => c.slideIndex === i - 1);

    const transitionXml = options.slideTransitionXmls?.[i - 1] ?? "";
    const timingXml = options.slideTimingXmls?.[i - 1] ?? "";
    const bgImageRId = bgImageAsset?.rId;
    zip.file(
      `ppt/slides/slide${i}.xml`,
      generateSlideShell(
        innerSpTree,
        transitionXml,
        timingXml,
        background,
        headerFooter,
        bgImageRId,
        options.slideWidthEmu,
        options.slideHeightEmu,
        `template-slide:${i}`,
      ),
      opts,
    );
    zip.file(
      `ppt/slides/_rels/slide${i}.xml.rels`,
      generateSlideRels(mediaRels, hyperlinkRels, chartRels, notesSlideIndex, layoutTarget, commentInfo?.commentFileIndex, videoRels, audioRels, svgRels),
      opts,
    );

    // Generate notes slide
    if (hasNotes) {
      const notesResult = generateNotesSlide(notes!, i);
      zip.file(`ppt/notesSlides/notesSlide${i}.xml`, notesResult.xml, opts);
      zip.file(`ppt/notesSlides/_rels/notesSlide${i}.xml.rels`, generateNotesSlideRels(i, notesResult.hyperlinkRels), opts);
    }
  }

  await pruneUnreferencedMedia(zip);

  return await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}
