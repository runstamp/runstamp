import { createRequire as __runstampCreateRequire } from "node:module";
const require = __runstampCreateRequire(import.meta.url);
import {
  generateNotesMaster,
  generateNotesMasterRels,
  generateNotesSlide,
  generateNotesSlideRels,
  generateNotesTheme,
  generateSlideRels,
  generateSlideShell
} from "./chunk-OV2ZPS4E.js";
import {
  asArray,
  ooxmlMutationBuilder,
  ooxmlMutationParser
} from "./chunk-JHKUGPWV.js";
import {
  normalizePresentationChildOrder
} from "./chunk-BKM7I4JR.js";
import {
  require_lib
} from "./chunk-FL4YUJCS.js";
import {
  DETERMINISTIC_DATE,
  isDeterministicMode
} from "./chunk-PUKAI6X5.js";
import {
  __toESM
} from "./chunk-OWC7QHPZ.js";

// src/template/mutator.ts
var import_jszip = __toESM(require_lib(), 1);
import { posix as posixPath } from "node:path";
function ensureZipFolder(zip, path, opts) {
  const normalized = path.endsWith("/") ? path : `${path}/`;
  zip.file(normalized, null, { ...opts, dir: true });
}
function ensureZipParentFolders(zip, path, opts) {
  const parts = path.split("/").slice(0, -1);
  for (let i = 1; i <= parts.length; i++) {
    ensureZipFolder(zip, parts.slice(0, i).join("/"), opts);
  }
}
function relationshipSourceDirectory(relationshipPath) {
  if (relationshipPath === "_rels/.rels") return "";
  const marker = "/_rels/";
  const markerIndex = relationshipPath.indexOf(marker);
  if (markerIndex < 0 || !relationshipPath.endsWith(".rels")) return "";
  const sourcePart = posixPath.join(
    relationshipPath.slice(0, markerIndex),
    relationshipPath.slice(markerIndex + marker.length, -".rels".length)
  );
  return posixPath.dirname(sourcePart);
}
async function pruneUnreferencedMedia(zip) {
  const referencedParts = /* @__PURE__ */ new Set();
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
async function assembleFromTemplate(templateIndex, options) {
  const zip = new import_jszip.default();
  const opts = isDeterministicMode() ? { date: DETERMINISTIC_DATE } : {};
  const ctDoc = ooxmlMutationParser.parse(templateIndex.contentTypesXml);
  const presDoc = ooxmlMutationParser.parse(templateIndex.presentationXml);
  const relsDoc = ooxmlMutationParser.parse(templateIndex.presentationRels);
  const typesRoot = ctDoc.Types;
  typesRoot.Override = asArray(typesRoot.Override);
  typesRoot.Default = asArray(typesRoot.Default);
  relsDoc.Relationships.Relationship = asArray(relsDoc.Relationships.Relationship);
  let maxTemplateRId = 0;
  for (const rel of relsDoc.Relationships.Relationship) {
    const idStr = rel["@_Id"] ?? "";
    const m = /^rId(\d+)$/.exec(idStr);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxTemplateRId) maxTemplateRId = n;
    }
  }
  const slideRIdBase = Math.max(maxTemplateRId + 1, 101);
  const templateZip = templateIndex.zip;
  for (const [path, file] of Object.entries(templateZip.files)) {
    if (file.dir) continue;
    const normalizedPath = posixPath.normalize(path);
    if (normalizedPath.includes("..") || normalizedPath.startsWith("/")) continue;
    if (path.startsWith("ppt/slides/")) continue;
    if (path.startsWith("ppt/notesSlides/")) continue;
    if (path.startsWith("ppt/comments/")) continue;
    const content = await file.async("nodebuffer");
    ensureZipParentFolders(zip, path, opts);
    zip.file(path, content, opts);
  }
  ensureZipFolder(zip, "ppt/slides", opts);
  ensureZipFolder(zip, "ppt/slides/_rels", opts);
  ensureZipFolder(zip, "ppt/media", opts);
  const slideNotes = options.slideNotes ?? [];
  const hasAnyNotes = slideNotes.some((n) => n !== void 0 && n !== "" && !(Array.isArray(n) && n.length === 0));
  if (hasAnyNotes) {
    ensureZipFolder(zip, "ppt/notesMasters", opts);
    ensureZipFolder(zip, "ppt/notesMasters/_rels", opts);
    ensureZipFolder(zip, "ppt/notesSlides", opts);
    ensureZipFolder(zip, "ppt/notesSlides/_rels", opts);
    ensureZipFolder(zip, "ppt/theme", opts);
  }
  const commentSlideInfos = options.commentSlideInfos ?? [];
  const hasComments = commentSlideInfos.length > 0;
  if (hasComments) {
    ensureZipFolder(zip, "ppt/comments", opts);
  }
  if (options.fontDataFiles && options.fontDataFiles.length > 0) {
    ensureZipFolder(zip, "ppt/fonts", opts);
  }
  const hasAnyChart = options.slideChartManifests?.some((manifest) => manifest.charts.length > 0) ?? false;
  const hasAnyChartDrawing = options.slideChartManifests?.some((manifest) => manifest.charts.some((chart) => chart.chartDrawingXml)) ?? false;
  if (hasAnyChart) {
    ensureZipFolder(zip, "ppt/charts", opts);
    ensureZipFolder(zip, "ppt/charts/_rels", opts);
    ensureZipFolder(zip, "ppt/embeddings", opts);
  }
  if (hasAnyChartDrawing) {
    ensureZipFolder(zip, "ppt/drawings", opts);
  }
  typesRoot.Override = typesRoot.Override.filter((o) => {
    const pn = o["@_PartName"] ?? "";
    return !/\/ppt\/slides\/slide\d+\.xml$/.test(pn) && !/\/ppt\/notesSlides\/notesSlide\d+\.xml$/.test(pn) && !/\/ppt\/comments\/comment\d+\.xml$/.test(pn);
  });
  for (let i = 1; i <= options.slideCount; i++) {
    typesRoot.Override.push({
      "@_PartName": `/ppt/slides/slide${i}.xml`,
      "@_ContentType": "application/vnd.openxmlformats-officedocument.presentationml.slide+xml"
    });
  }
  if (options.slideChartManifests) {
    for (const manifest of options.slideChartManifests) {
      for (const chart of manifest.charts) {
        const prefix = chart.isChartEx ? "chartEx" : "chart";
        const ct = chart.isChartEx ? "application/vnd.ms-office.chartex+xml" : "application/vnd.openxmlformats-officedocument.drawingml.chart+xml";
        typesRoot.Override.push({
          "@_PartName": `/ppt/charts/${prefix}${chart.chartIndex}.xml`,
          "@_ContentType": ct
        });
        if (chart.chartDrawingXml) {
          typesRoot.Override.push({
            "@_PartName": `/ppt/drawings/drawing${chart.chartIndex}.xml`,
            "@_ContentType": "application/vnd.openxmlformats-officedocument.drawingml.chartshapes+xml"
          });
        }
      }
    }
    if (hasAnyChart && !typesRoot.Default.some((d) => d["@_Extension"] === "xlsx")) {
      typesRoot.Default.push({
        "@_Extension": "xlsx",
        "@_ContentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
    }
  }
  const hasSvg = options.slideMediaManifests.some((m) => m.svgAssets.length > 0);
  if (hasSvg && !typesRoot.Default.some((d) => d["@_Extension"] === "svg")) {
    typesRoot.Default.push({
      "@_Extension": "svg",
      "@_ContentType": "image/svg+xml"
    });
  }
  if (hasAnyNotes) {
    if (!typesRoot.Override.some((o) => (o["@_PartName"] ?? "").includes("notesMaster1.xml"))) {
      typesRoot.Override.push({
        "@_PartName": "/ppt/notesMasters/notesMaster1.xml",
        "@_ContentType": "application/vnd.openxmlformats-officedocument.presentationml.notesMaster+xml"
      });
    }
    if (!typesRoot.Override.some((o) => (o["@_PartName"] ?? "") === "/ppt/theme/theme2.xml")) {
      typesRoot.Override.push({
        "@_PartName": "/ppt/theme/theme2.xml",
        "@_ContentType": "application/vnd.openxmlformats-officedocument.theme+xml"
      });
    }
    for (let i = 0; i < options.slideCount; i++) {
      const n = slideNotes[i];
      if (n !== void 0 && n !== "" && !(Array.isArray(n) && n.length === 0)) {
        typesRoot.Override.push({
          "@_PartName": `/ppt/notesSlides/notesSlide${i + 1}.xml`,
          "@_ContentType": "application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"
        });
      }
    }
  }
  if (hasComments) {
    if (!typesRoot.Override.some((o) => (o["@_PartName"] ?? "").includes("commentAuthors.xml"))) {
      typesRoot.Override.push({
        "@_PartName": "/ppt/commentAuthors.xml",
        "@_ContentType": "application/vnd.openxmlformats-officedocument.presentationml.commentAuthors+xml"
      });
    }
    for (const info of commentSlideInfos) {
      typesRoot.Override.push({
        "@_PartName": `/ppt/comments/comment${info.commentFileIndex}.xml`,
        "@_ContentType": "application/vnd.openxmlformats-officedocument.presentationml.comments+xml"
      });
    }
  }
  if (options.fontDataFiles && options.fontDataFiles.length > 0) {
    if (!typesRoot.Default.some((d) => d["@_Extension"] === "fntdata")) {
      typesRoot.Default.push({
        "@_Extension": "fntdata",
        "@_ContentType": "application/x-fontdata"
      });
    }
  }
  zip.file("[Content_Types].xml", ooxmlMutationBuilder.build(ctDoc), opts);
  let pres = presDoc["p:presentation"];
  const newSldIds = [];
  for (let i = 1; i <= options.slideCount; i++) {
    newSldIds.push({
      "@_id": String(255 + i),
      "@_r:id": `rId${slideRIdBase + i - 1}`
    });
  }
  pres["p:sldIdLst"] = { "p:sldId": newSldIds };
  const notesMasterRel = relsDoc.Relationships.Relationship.find(
    (rel) => (rel["@_Type"] ?? "").includes("notesMaster")
  );
  const notesMasterRId = notesMasterRel?.["@_Id"];
  if (hasAnyNotes) {
    pres["p:notesMasterIdLst"] = {
      "p:notesMasterId": {
        "@_r:id": notesMasterRId ?? "rIdNotesMaster"
      }
    };
  }
  if (options.embeddedFontListXml) {
    const fontFragDoc = ooxmlMutationParser.parse(options.embeddedFontListXml);
    const fontLst = fontFragDoc["p:embeddedFontLst"];
    if (fontLst) {
      const insertAfter = "p:notesSz" in pres ? "p:notesSz" : "p:sldSz" in pres ? "p:sldSz" : null;
      if (insertAfter) {
        const rebuilt = {};
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
  relsDoc.Relationships.Relationship = relsDoc.Relationships.Relationship.filter(
    (r) => !(r["@_Type"] ?? "").endsWith("/slide")
  );
  for (let i = 1; i <= options.slideCount; i++) {
    relsDoc.Relationships.Relationship.push({
      "@_Id": `rId${slideRIdBase + i - 1}`,
      "@_Type": "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide",
      "@_Target": `slides/slide${i}.xml`
    });
  }
  if (hasAnyNotes && !relsDoc.Relationships.Relationship.some(
    (r) => (r["@_Type"] ?? "").includes("notesMaster")
  )) {
    relsDoc.Relationships.Relationship.push({
      "@_Id": "rIdNotesMaster",
      "@_Type": "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster",
      "@_Target": "notesMasters/notesMaster1.xml"
    });
  }
  if (hasComments && options.commentAuthorsXml && !relsDoc.Relationships.Relationship.some(
    (r) => (r["@_Target"] ?? "").includes("commentAuthors")
  )) {
    relsDoc.Relationships.Relationship.push({
      "@_Id": "rIdCommentAuthors",
      "@_Type": "http://schemas.openxmlformats.org/officeDocument/2006/relationships/commentAuthors",
      "@_Target": "commentAuthors.xml"
    });
  }
  if (options.extraPresentationRels) {
    for (const rel of options.extraPresentationRels) {
      relsDoc.Relationships.Relationship.push({
        "@_Id": rel.rId,
        "@_Type": rel.type,
        "@_Target": rel.target
      });
    }
  }
  zip.file("ppt/_rels/presentation.xml.rels", ooxmlMutationBuilder.build(relsDoc), opts);
  if (hasAnyNotes) {
    if (!templateZip.file("ppt/notesMasters/notesMaster1.xml")) {
      zip.file("ppt/notesMasters/notesMaster1.xml", generateNotesMaster(), opts);
      zip.file("ppt/notesMasters/_rels/notesMaster1.xml.rels", generateNotesMasterRels(), opts);
    }
    if (!templateZip.file("ppt/theme/theme2.xml")) {
      zip.file("ppt/theme/theme2.xml", generateNotesTheme(), opts);
    }
  }
  if (options.commentFilesMap) {
    for (const [path, content] of options.commentFilesMap) {
      ensureZipParentFolders(zip, path, opts);
      zip.file(path, content, opts);
    }
  }
  if (options.commentAuthorsXml) {
    zip.file("ppt/commentAuthors.xml", options.commentAuthorsXml, opts);
  }
  if (options.fontDataFiles) {
    for (const { path, buffer } of options.fontDataFiles) {
      ensureZipParentFolders(zip, path, opts);
      zip.file(path, buffer, opts);
    }
  }
  for (let i = 1; i <= options.slideCount; i++) {
    const innerSpTree = options.slideContents[i - 1] ?? "";
    const mediaManifest = options.slideMediaManifests[i - 1];
    const chartManifest = options.slideChartManifests?.[i - 1];
    const hyperlinkRels = options.slideHyperlinkRels?.[i - 1] ?? [];
    const background = options.slideBackgrounds?.[i - 1];
    const headerFooter = options.slideHeaderFooters?.[i - 1];
    const notes = options.slideNotes?.[i - 1];
    const bgImageAsset = options.slideBgImageAssets?.[i - 1];
    const mediaRels = [];
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
    const videoRels = [];
    if (mediaManifest?.videoAssets) {
      for (const asset of mediaManifest.videoAssets) {
        zip.file(asset.mediaPath, asset.buffer, opts);
        const rel = {
          videoRId: asset.videoRId,
          mediaRId: asset.mediaRId,
          videoTarget: asset.relativePath
        };
        if (asset.posterRId && asset.posterBuffer && asset.posterMediaPath && asset.posterRelativePath) {
          zip.file(asset.posterMediaPath, asset.posterBuffer, opts);
          rel.posterRId = asset.posterRId;
          rel.posterTarget = asset.posterRelativePath;
        }
        videoRels.push(rel);
      }
    }
    const audioRels = [];
    if (mediaManifest?.audioAssets) {
      for (const asset of mediaManifest.audioAssets) {
        zip.file(asset.mediaPath, asset.buffer, opts);
        audioRels.push({
          audioRId: asset.audioRId,
          mediaRId: asset.mediaRId,
          audioTarget: asset.relativePath
        });
      }
    }
    const svgRels = [];
    if (mediaManifest) {
      for (const svgAsset of mediaManifest.svgAssets) {
        zip.file(svgAsset.svgMediaPath, svgAsset.svgBuffer, opts);
        svgRels.push({ rId: svgAsset.svgRId, target: svgAsset.svgRelativePath });
      }
    }
    const chartRels = [];
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
            type: chart.isChartEx ? "chartEx" : "chart"
          });
        }
        if (chart.fallbackPng && chart.fallbackMediaPath) {
          zip.file(chart.fallbackMediaPath, chart.fallbackPng, opts);
          if (chart.fallbackRId && chart.fallbackRelativePath) {
            mediaRels.push({ rId: chart.fallbackRId, target: chart.fallbackRelativePath });
          }
        }
      }
    }
    if (bgImageAsset) {
      zip.file(bgImageAsset.mediaPath, bgImageAsset.buffer, opts);
      mediaRels.push({ rId: bgImageAsset.rId, target: bgImageAsset.relativePath });
    }
    const layoutTarget = options.slideLayoutTargets?.[i - 1] ?? "../slideLayouts/slideLayout1.xml";
    const hasNotes = notes !== void 0 && notes !== "" && !(Array.isArray(notes) && notes.length === 0);
    const notesSlideIndex = hasNotes ? i : void 0;
    const commentInfo = commentSlideInfos.find((c) => c.slideIndex === i - 1);
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
        `template-slide:${i}`
      ),
      opts
    );
    zip.file(
      `ppt/slides/_rels/slide${i}.xml.rels`,
      generateSlideRels(mediaRels, hyperlinkRels, chartRels, notesSlideIndex, layoutTarget, commentInfo?.commentFileIndex, videoRels, audioRels, svgRels),
      opts
    );
    if (hasNotes) {
      const notesResult = generateNotesSlide(notes, i);
      zip.file(`ppt/notesSlides/notesSlide${i}.xml`, notesResult.xml, opts);
      zip.file(`ppt/notesSlides/_rels/notesSlide${i}.xml.rels`, generateNotesSlideRels(i, notesResult.hyperlinkRels), opts);
    }
  }
  await pruneUnreferencedMedia(zip);
  return await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
}

export {
  assembleFromTemplate
};
//# sourceMappingURL=chunk-3MAFQYVW.js.map
