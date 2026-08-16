// src/ooxml/slideRelationships.ts
import { generateRelationshipsXml, type PackageRelationship } from "./packageManifest.js";

const REL_TYPES = {
  slideLayout: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout",
  image: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
  video: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/video",
  media: "http://schemas.microsoft.com/office/2007/relationships/media",
  audio: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/audio",
  hyperlink: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink",
  chartEx: "http://schemas.microsoft.com/office/2014/relationships/chartEx",
  chart: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart",
  notesSlide: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide",
  comments: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments",
  notesMaster: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster",
  slide: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide",
  theme: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme",
  slideMaster: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster",
} as const;

export interface MediaRelationship {
  rId: string;     // e.g., "rId2"
  target: string;  // relative path, e.g., "../media/image1.png"
}

export interface HyperlinkRelationship {
  rId: string;
  url: string;
  external?: boolean;  // default true for backward compat
}

export interface ChartRelationship {
  rId: string;
  target: string;  // e.g., "../charts/chart1.xml"
  type: string;    // "chart"
}

export interface VideoMediaRelationship {
  videoRId: string;
  mediaRId: string;
  posterRId?: string;
  videoTarget: string;    // e.g., "../media/media1.mp4"
  posterTarget?: string;  // e.g., "../media/image3.png"
}

export interface AudioMediaRelationship {
  audioRId: string;
  mediaRId: string;
  audioTarget: string;    // e.g., "../media/media2.mp3"
}

function parseRIdValue(rId: string | undefined): number | null {
  if (!rId) return null;
  const match = /^rId(\d+)$/.exec(rId);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Generates the .rels file for a single slide.
 *
 * rId1 always links to the blank slide layout.
 * Additional entries link to media assets, hyperlinks, charts, video/audio, and notes.
 */
export function generateSlideRels(
  mediaRels: MediaRelationship[] = [],
  hyperlinkRels: HyperlinkRelationship[] = [],
  chartRels: ChartRelationship[] = [],
  notesSlideIndex?: number,
  layoutTarget: string = "../slideLayouts/slideLayout1.xml",
  commentFileIndex?: number,
  videoRels: VideoMediaRelationship[] = [],
  audioRels: AudioMediaRelationship[] = [],
  svgRels: MediaRelationship[] = [],
): string {
  const relationships: PackageRelationship[] = [
    { id: "rId1", type: REL_TYPES.slideLayout, target: layoutTarget },
  ];

  let maxRId = 1;
  for (const rel of mediaRels) {
    maxRId = Math.max(maxRId, parseRIdValue(rel.rId) ?? maxRId);
  }
  for (const rel of hyperlinkRels) {
    maxRId = Math.max(maxRId, parseRIdValue(rel.rId) ?? maxRId);
  }
  for (const rel of chartRels) {
    maxRId = Math.max(maxRId, parseRIdValue(rel.rId) ?? maxRId);
  }
  for (const rel of videoRels) {
    maxRId = Math.max(maxRId, parseRIdValue(rel.videoRId) ?? maxRId);
    maxRId = Math.max(maxRId, parseRIdValue(rel.mediaRId) ?? maxRId);
    maxRId = Math.max(maxRId, parseRIdValue(rel.posterRId) ?? maxRId);
  }
  for (const rel of audioRels) {
    maxRId = Math.max(maxRId, parseRIdValue(rel.audioRId) ?? maxRId);
    maxRId = Math.max(maxRId, parseRIdValue(rel.mediaRId) ?? maxRId);
  }
  for (const rel of svgRels) {
    maxRId = Math.max(maxRId, parseRIdValue(rel.rId) ?? maxRId);
  }

  for (const rel of mediaRels) {
    relationships.push({ id: rel.rId, type: REL_TYPES.image, target: rel.target });
  }

  // Video relationships: each video has a video rel, a media rel, and optionally a poster image rel
  // Web videos only have poster rels (hyperlink rels are handled via hyperlinkRels)
  for (const rel of videoRels) {
    if (rel.videoRId) {
      relationships.push({ id: rel.videoRId, type: REL_TYPES.video, target: rel.videoTarget });
    }
    if (rel.mediaRId) {
      relationships.push({ id: rel.mediaRId, type: REL_TYPES.media, target: rel.videoTarget });
    }
    if (rel.posterRId && rel.posterTarget) {
      relationships.push({ id: rel.posterRId, type: REL_TYPES.image, target: rel.posterTarget });
    }
  }

  // Audio relationships: each audio has an audio rel and a media rel
  for (const rel of audioRels) {
    relationships.push(
      { id: rel.audioRId, type: REL_TYPES.audio, target: rel.audioTarget },
      { id: rel.mediaRId, type: REL_TYPES.media, target: rel.audioTarget },
    );
  }

  // SVG relationships: each SVG image gets an image rel for the SVG file
  for (const rel of svgRels) {
    relationships.push({ id: rel.rId, type: REL_TYPES.image, target: rel.target });
  }

  for (const rel of hyperlinkRels) {
    const isExternal = rel.external !== false;  // default true for backward compat
    relationships.push({
      id: rel.rId,
      type: REL_TYPES.hyperlink,
      target: rel.url,
      targetMode: isExternal ? "External" : undefined,
    });
  }

  for (const rel of chartRels) {
    if (rel.type === "chartEx") {
      relationships.push({ id: rel.rId, type: REL_TYPES.chartEx, target: rel.target });
    } else {
      relationships.push({ id: rel.rId, type: REL_TYPES.chart, target: rel.target });
    }
  }

  if (notesSlideIndex !== undefined) {
    const notesRId = maxRId + 1;
    relationships.push({ id: `rId${notesRId}`, type: REL_TYPES.notesSlide, target: `../notesSlides/notesSlide${notesSlideIndex}.xml` });
    maxRId = notesRId;
  }

  if (commentFileIndex !== undefined) {
    const commentRId = maxRId + 1;
    relationships.push({ id: `rId${commentRId}`, type: REL_TYPES.comments, target: `../comments/comment${commentFileIndex}.xml` });
  }

  return generateRelationshipsXml(relationships);
}

/**
 * Generates rels for a notes slide, linking back to the slide and notes master.
 * Optionally includes hyperlink relationships from rich-text notes.
 */
export function generateNotesSlideRels(
  slideIndex: number,
  notesHyperlinkRels: { rId: string; url: string }[] = [],
): string {
  const relationships: PackageRelationship[] = [
    { id: "rId1", type: REL_TYPES.notesMaster, target: "../notesMasters/notesMaster1.xml" },
    { id: "rId2", type: REL_TYPES.slide, target: `../slides/slide${slideIndex}.xml` },
  ];
  for (const rel of notesHyperlinkRels) {
    relationships.push({
      id: rel.rId,
      type: REL_TYPES.hyperlink,
      target: rel.url,
      targetMode: "External",
    });
  }

  return generateRelationshipsXml(relationships);
}

/**
 * Generates rels for the notes master, linking to theme.
 * @param themeTarget - relative path from notesMasters/ to the theme file.
 *   Defaults to "../theme/theme1.xml" (the only theme generated by the engine).
 *   Pass a different path if using a multi-theme template.
 */
export function generateNotesMasterRels(themeTarget: string = "../theme/theme2.xml"): string {
  return generateRelationshipsXml([
    { id: "rId1", type: REL_TYPES.theme, target: themeTarget },
  ]);
}

// Links the slide master to its layout(s) and theme
export function generateSlideMasterRels(layoutCount: number = 1): string {
  const relationships: PackageRelationship[] = [];
  for (let i = 1; i <= layoutCount; i++) {
    relationships.push({ id: `rId${i}`, type: REL_TYPES.slideLayout, target: `../slideLayouts/slideLayout${i}.xml` });
  }
  relationships.push({ id: `rId${layoutCount + 1}`, type: REL_TYPES.theme, target: "../theme/theme1.xml" });
  return generateRelationshipsXml(relationships);
}

// Links the slide layout back to the slide master
export function generateSlideLayoutRels(masterTarget: string = "../slideMasters/slideMaster1.xml"): string {
  return generateRelationshipsXml([
    { id: "rId1", type: REL_TYPES.slideMaster, target: masterTarget },
  ]);
}
