// src/ooxml/contentTypes.ts
import { PackageManifest } from "./packageManifest.js";

const CONTENT_TYPES = {
  rels: "application/vnd.openxmlformats-package.relationships+xml",
  xml: "application/xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  tiff: "image/tiff",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  webm: "video/webm",
  avi: "video/x-msvideo",
  mov: "video/quicktime",
  wmv: "video/x-ms-wmv",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  wma: "audio/x-ms-wma",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  fntdata: "application/x-fontdata",
  presentation: "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml",
  slideMaster: "application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml",
  slideLayout: "application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml",
  theme: "application/vnd.openxmlformats-officedocument.theme+xml",
  presProps: "application/vnd.openxmlformats-officedocument.presentationml.presProps+xml",
  viewProps: "application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml",
  tableStyles: "application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml",
  coreProps: "application/vnd.openxmlformats-package.core-properties+xml",
  appProps: "application/vnd.openxmlformats-officedocument.extended-properties+xml",
  slide: "application/vnd.openxmlformats-officedocument.presentationml.slide+xml",
  chart: "application/vnd.openxmlformats-officedocument.drawingml.chart+xml",
  chartEx: "application/vnd.ms-office.chartex+xml",
  chartDrawing: "application/vnd.openxmlformats-officedocument.drawingml.chartshapes+xml",
  notesMaster: "application/vnd.openxmlformats-officedocument.presentationml.notesMaster+xml",
  notesSlide: "application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml",
  commentAuthors: "application/vnd.openxmlformats-officedocument.presentationml.commentAuthors+xml",
  comments: "application/vnd.openxmlformats-officedocument.presentationml.comments+xml",
  customProps: "application/vnd.openxmlformats-officedocument.custom-properties+xml",
  handoutMaster: "application/vnd.openxmlformats-officedocument.presentationml.handoutMaster+xml",
} as const;

export function generateContentTypes(
  slideCount: number = 1,
  chartCount: number = 0,
  hasNotes: boolean = false,
  notesSlideIndices: number[] = [],
  commentFileIndices?: number[],
  hasFontData: boolean = false,
  hasVideo: boolean = false,
  hasAudio: boolean = false,
  hasCustomProps: boolean = false,
  hasHandoutMaster: boolean = false,
  chartExCount: number = 0,
  chartDrawingIndices: number[] = [],
  hasSvg: boolean = false,
  layoutCount: number = 1,
  masterCount: number = 1,
): string {
  const manifest = new PackageManifest();

  manifest.addDefault("rels", CONTENT_TYPES.rels);
  manifest.addDefault("xml", CONTENT_TYPES.xml);
  manifest.addDefault("png", CONTENT_TYPES.png);
  manifest.addDefault("jpg", CONTENT_TYPES.jpg);
  manifest.addDefault("jpeg", CONTENT_TYPES.jpeg);
  manifest.addDefault("gif", CONTENT_TYPES.gif);
  manifest.addDefault("webp", CONTENT_TYPES.webp);
  manifest.addDefault("tiff", CONTENT_TYPES.tiff);
  manifest.addDefault("bmp", CONTENT_TYPES.bmp);

  if (hasSvg) manifest.addDefault("svg", CONTENT_TYPES.svg);
  if (hasVideo) {
    manifest.addDefault("mp4", CONTENT_TYPES.mp4);
    manifest.addDefault("webm", CONTENT_TYPES.webm);
    manifest.addDefault("avi", CONTENT_TYPES.avi);
    manifest.addDefault("mov", CONTENT_TYPES.mov);
    manifest.addDefault("wmv", CONTENT_TYPES.wmv);
  }
  if (hasAudio) {
    manifest.addDefault("mp3", CONTENT_TYPES.mp3);
    manifest.addDefault("wav", CONTENT_TYPES.wav);
    manifest.addDefault("ogg", CONTENT_TYPES.ogg);
    manifest.addDefault("m4a", CONTENT_TYPES.m4a);
    manifest.addDefault("wma", CONTENT_TYPES.wma);
  }
  if (chartCount > 0 || chartExCount > 0) {
    manifest.addDefault("xlsx", CONTENT_TYPES.xlsx);
  }

  manifest.addPart("ppt/presentation.xml", CONTENT_TYPES.presentation);
  for (let i = 1; i <= masterCount; i++) {
    manifest.addPart(`ppt/slideMasters/slideMaster${i}.xml`, CONTENT_TYPES.slideMaster);
  }
  for (let i = 1; i <= layoutCount; i++) {
    manifest.addPart(`ppt/slideLayouts/slideLayout${i}.xml`, CONTENT_TYPES.slideLayout);
  }
  manifest.addPart("ppt/theme/theme1.xml", CONTENT_TYPES.theme);
  manifest.addPart("ppt/presProps.xml", CONTENT_TYPES.presProps);
  manifest.addPart("ppt/viewProps.xml", CONTENT_TYPES.viewProps);
  manifest.addPart("ppt/tableStyles.xml", CONTENT_TYPES.tableStyles);
  manifest.addPart("docProps/core.xml", CONTENT_TYPES.coreProps);
  manifest.addPart("docProps/app.xml", CONTENT_TYPES.appProps);

  for (let i = 1; i <= slideCount; i++) {
    manifest.addPart(`ppt/slides/slide${i}.xml`, CONTENT_TYPES.slide);
  }

  for (let i = 1; i <= chartCount; i++) {
    manifest.addPart(`ppt/charts/chart${i}.xml`, CONTENT_TYPES.chart);
  }

  for (let i = 1; i <= chartExCount; i++) {
    manifest.addPart(`ppt/charts/chartEx${i}.xml`, CONTENT_TYPES.chartEx);
  }

  for (const idx of chartDrawingIndices) {
    manifest.addPart(`ppt/drawings/drawing${idx}.xml`, CONTENT_TYPES.chartDrawing);
  }

  if (hasNotes) {
    manifest.addPart("ppt/theme/theme2.xml", CONTENT_TYPES.theme);
    manifest.addPart("ppt/notesMasters/notesMaster1.xml", CONTENT_TYPES.notesMaster);
    for (const idx of notesSlideIndices) {
      manifest.addPart(`ppt/notesSlides/notesSlide${idx + 1}.xml`, CONTENT_TYPES.notesSlide);
    }
  }

  if (commentFileIndices && commentFileIndices.length > 0) {
    manifest.addPart("ppt/commentAuthors.xml", CONTENT_TYPES.commentAuthors);
    for (const idx of commentFileIndices) {
      manifest.addPart(`ppt/comments/comment${idx}.xml`, CONTENT_TYPES.comments);
    }
  }

  if (hasFontData) {
    manifest.addDefault("fntdata", CONTENT_TYPES.fntdata);
  }

  if (hasCustomProps) {
    manifest.addPart("docProps/custom.xml", CONTENT_TYPES.customProps);
  }

  if (hasHandoutMaster) {
    manifest.addPart("ppt/handoutMasters/handoutMaster1.xml", CONTENT_TYPES.handoutMaster);
  }

  return manifest.generateContentTypesXml();
}
