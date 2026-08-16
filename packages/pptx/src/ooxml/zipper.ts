// src/ooxml/zipper.ts
import JSZip from "jszip";
import { generateContentTypes } from "./contentTypes.js";
import { generateGlobalRels, generatePresentationRels } from "./relationships.js";
import { generatePresentationXml } from "./presentation.js";
import { generateSlideShell, generateSlideLayoutMulti, generateSlideMaster, generateSlideMasterMulti, generateNotesSlide, generateNotesMaster } from "./slide.js";
import { generateSlideRels, generateSlideMasterRels, generateSlideLayoutRels, generateNotesSlideRels, generateNotesMasterRels } from "./slideRelationships.js";
import { generateTheme, generateNotesTheme } from "./theme.js";
import { generateCoreProperties, generateAppProperties } from "./docProps.js";
import { generateCustomProperties } from "./customProps.js";
import { generateHandoutMaster, generateHandoutMasterRels } from "./handoutMaster.js";
import { generatePresProps, generateViewProps, generateTableStyles } from "./packageParts.js";
import { assertOpcPackageInvariants, generateRelationshipsXml, type PackageRelationship } from "./packageManifest.js";
import type { SlideMediaManifest, MediaAsset } from "./media.js";
import type { VideoMediaRelationship, AudioMediaRelationship } from "./slideRelationships.js";
import type { SlideChartManifest } from "./chart/index.js";
import type { HyperlinkRel } from "./drawing/text.js";
import type { SlideBackground, SlideSize, HeaderFooter, ThemeConfig, SlideSection, DocumentProtection, CustomShow, SlideMasterConfig, Paragraph, CustomProperty, PrintSettings } from "../types/ast.js";
import type { Readable } from "node:stream";
import { isDeterministicMode, DETERMINISTIC_DATE } from "../deterministicMode.js";
import { getLogger } from "../logger.js";
import { PIXEL_TO_EMU } from "./drawing/math.js";
import { computePresNotesMasterRId } from "./rIdCalc.js";

/**
 * Generate a minimal valid JPEG (white, 256x192) for the PPTX thumbnail.
 * This is a hand-crafted minimal JFIF that Quick Look can parse.
 */
function generatePlaceholderThumbnail(): Buffer {
  const w = 256;
  const h = 192;

  const parts: number[] = [];
  const push = (...bytes: number[]) => parts.push(...bytes);

  // SOI
  push(0xFF, 0xD8);
  // APP0 (JFIF)
  push(0xFF, 0xE0);
  const app0 = [
    0x4A, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
    0x01, 0x01,                     // version 1.1
    0x00,                           // aspect ratio units: 0 = no units
    0x00, 0x01, 0x00, 0x01,         // X/Y density = 1
    0x00, 0x00,                     // no thumbnail
  ];
  push((app0.length + 2) >> 8, (app0.length + 2) & 0xFF, ...app0);

  // DQT — quantization table (all 1s for minimal quality — white image won't matter)
  push(0xFF, 0xDB);
  const qt = [0x00]; // 8-bit table, id 0
  for (let i = 0; i < 64; i++) qt.push(1);
  push((qt.length + 2) >> 8, (qt.length + 2) & 0xFF, ...qt);

  // SOF0 — baseline DCT
  push(0xFF, 0xC0);
  const sof = [
    0x08,                                   // precision 8 bits
    (h >> 8) & 0xFF, h & 0xFF,             // height
    (w >> 8) & 0xFF, w & 0xFF,             // width
    0x01,                                   // 1 component (grayscale)
    0x01, 0x11, 0x00,                       // comp 1: id=1, sampling=1x1, quant table 0
  ];
  push((sof.length + 2) >> 8, (sof.length + 2) & 0xFF, ...sof);

  // DHT — Huffman table for DC (table 0, class 0)
  push(0xFF, 0xC4);
  // Minimal DC table: one symbol (value 0) with code length 1
  const dhtDC = [
    0x00,                                               // class=0 (DC), id=0
    0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,   // counts for lengths 1-8
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,   // counts for lengths 9-16
    0x00,                                               // symbol: category 0
  ];
  push((dhtDC.length + 2) >> 8, (dhtDC.length + 2) & 0xFF, ...dhtDC);

  // DHT — Huffman table for AC (table 0, class 1)
  push(0xFF, 0xC4);
  // Minimal AC table: one symbol (EOB = 0x00) with code length 1
  const dhtAC = [
    0x10,                                               // class=1 (AC), id=0
    0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,   // counts for lengths 1-8
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,   // counts for lengths 9-16
    0x00,                                               // symbol: EOB (0/0)
  ];
  push((dhtAC.length + 2) >> 8, (dhtAC.length + 2) & 0xFF, ...dhtAC);

  // SOS — start of scan
  push(0xFF, 0xDA);
  const sos = [
    0x01,             // 1 component
    0x01, 0x00,       // comp 1: DC table 0, AC table 0
    0x00, 0x3F, 0x00, // spectral selection 0-63, successive approx 0
  ];
  push((sos.length + 2) >> 8, (sos.length + 2) & 0xFF, ...sos);

  // Entropy-coded data: each 8x8 block is white (DC=1023 mapped to diff=0 after DPCM, AC=EOB)
  // For a white image, all DC diffs are 0 and AC is EOB.
  // DC category 0 diff (code: 0 in 1 bit) + AC EOB (code: 0 in 1 bit) = 2 bits per block.
  // Total blocks = (256/8) * (192/8) = 32 * 24 = 768 blocks
  // 768 blocks * 2 bits = 1536 bits = 192 bytes, then pad to byte boundary
  const totalBlocks = (w / 8) * (h / 8);
  const totalBits = totalBlocks * 2; // 2 bits per block (DC 0 + AC EOB)
  const totalBytes = Math.ceil(totalBits / 8);
  // Each block contributes '00' (2 zero-bits). So all bytes are 0x00.
  // But we need to be careful: byte-stuffing requires 0xFF -> 0xFF 0x00
  // Since all bytes are 0x00, no stuffing needed.
  for (let i = 0; i < totalBytes; i++) push(0x00);

  // EOI
  push(0xFF, 0xD9);

  return Buffer.from(parts);
}

function generateMultiMasterPresentationRels(
  slideCount: number,
  masterCount: number,
  hasNotes: boolean,
  hasComments: boolean = false,
  extraRels?: Array<{ rId: string; type: string; target: string }>,
  hasHandoutMaster: boolean = false,
): string {
  const relationships: PackageRelationship[] = [];

  // Masters: rId1..rIdM
  for (let i = 1; i <= masterCount; i++) {
    relationships.push({
      id: `rId${i}`,
      type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster",
      target: `slideMasters/slideMaster${i}.xml`,
    });
  }

  // Theme: rId(M+1)
  let nextRId = masterCount + 1;
  relationships.push({
    id: `rId${nextRId++}`,
    type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme",
    target: "theme/theme1.xml",
  });

  // Slides: rId(M+2)..
  for (let i = 1; i <= slideCount; i++) {
    relationships.push({
      id: `rId${nextRId++}`,
      type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide",
      target: `slides/slide${i}.xml`,
    });
  }

  // Package parts
  relationships.push(
    {
      id: `rId${nextRId++}`,
      type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps",
      target: "presProps.xml",
    },
    {
      id: `rId${nextRId++}`,
      type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/viewProps",
      target: "viewProps.xml",
    },
    {
      id: `rId${nextRId++}`,
      type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/tableStyles",
      target: "tableStyles.xml",
    },
  );

  if (hasNotes) {
    relationships.push({
      id: `rId${nextRId++}`,
      type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster",
      target: "notesMasters/notesMaster1.xml",
    });
  }

  if (hasComments) {
    relationships.push({
      id: `rId${nextRId++}`,
      type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/commentAuthors",
      target: "commentAuthors.xml",
    });
  }

  if (hasHandoutMaster) {
    relationships.push({
      id: `rId${nextRId++}`,
      type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/handoutMaster",
      target: "handoutMasters/handoutMaster1.xml",
    });
  }

  if (extraRels) {
    for (const rel of extraRels) {
      relationships.push({ id: rel.rId, type: rel.type, target: rel.target });
    }
  }

  return generateRelationshipsXml(relationships);
}

export interface AssemblePresentationOptions {
  slideContents?: string[];
  slideMediaManifests?: SlideMediaManifest[];
  slideChartManifests?: SlideChartManifest[];
  slideHyperlinkRels?: HyperlinkRel[][];
  slideTransitionXmls?: string[];
  slideTimingXmls?: string[];
  slideBackgrounds?: (SlideBackground | undefined)[];
  slideNotes?: (string | Paragraph[] | undefined)[];
  meta?: { title?: string; author?: string; language?: string };
  slideSize?: SlideSize;
  slideHeaderFooters?: (HeaderFooter | undefined)[];
  themeConfig?: ThemeConfig;
  sections?: SlideSection[];
  protection?: DocumentProtection;
  customShows?: CustomShow[];
  notesSize?: SlideSize;
  embeddedFontListXml?: string;
  extraPresentationRels?: Array<{ rId: string; type: string; target: string }>;
  commentSlideInfos?: Array<{ slideIndex: number; commentFileIndex: number }>;
  commentAuthorsXml?: string;
  fontDataFiles?: Array<{ path: string; buffer: Buffer }>;
  mastersConfig?: SlideMasterConfig[];
  slideMasterNames?: (string | undefined)[];
  slideBgImageAssets?: (MediaAsset | undefined)[];
  customProperties?: CustomProperty[];
  handoutLayout?: string;
  printSettings?: PrintSettings;
  thumbnailBuffer?: Buffer;
}

export class PptxArchive {
  private zip: JSZip;
  private masterLayoutMap?: Map<string, { masterIndex: number; firstLayoutIndex: number; layoutCount: number }>;
  private thumbnailBuffer?: Buffer;
  private shouldValidateOpcInvariants = false;

  constructor() {
    this.zip = new JSZip();
    this.initializeOPC();
  }

  private zipOpts(): { date: Date } | Record<string, never> {
    return isDeterministicMode() ? { date: DETERMINISTIC_DATE } : {};
  }

  private addFolder(path: string): JSZip {
    const normalized = path.endsWith("/") ? path : `${path}/`;
    this.zip.file(normalized, null, { ...this.zipOpts(), dir: true });
    return this.zip.folder(path)!;
  }

  private ensureParentFolders(path: string): void {
    const segments = path.split("/").slice(0, -1);
    let current = "";
    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      const normalized = `${current}/`;
      if (!this.zip.files[normalized]) {
        this.zip.file(normalized, null, { ...this.zipOpts(), dir: true });
      }
    }
  }

  private initializeOPC() {
    // 1. Root Content Types (placeholder — replaced in assemblePresentation)
    this.zip.file("[Content_Types].xml", generateContentTypes(), this.zipOpts());

    // 2. Global Relationships
    this.addFolder("_rels").file(".rels", generateGlobalRels(), this.zipOpts());

    // 3. Presentation Scaffold
    this.addFolder("ppt");
    this.addFolder("ppt/_rels");
    this.addFolder("ppt/slides");
    this.addFolder("ppt/slides/_rels");
    this.addFolder("ppt/slideLayouts");
    this.addFolder("ppt/slideLayouts/_rels");
    this.addFolder("ppt/slideMasters");
    this.addFolder("ppt/slideMasters/_rels");
    this.addFolder("ppt/theme");
    this.addFolder("ppt/media");
  }

  // Helper for downstream emitters
  public addFile(path: string, content: string | Buffer) {
    this.ensureParentFolders(path);
    this.zip.file(path, content, this.zipOpts());
  }

  public setThumbnail(buffer: Buffer): void {
    this.thumbnailBuffer = buffer;
    this.zip.file("docProps/thumbnail.jpeg", buffer, this.zipOpts());
  }

  /**
   * Assembles a complete, valid PPTX structure for the given slides.
   */
  public assemblePresentation(
    slideCount: number,
    options: AssemblePresentationOptions = {},
  ): void {
    const slideContents = options.slideContents ?? [];
    const slideMediaManifests = options.slideMediaManifests ?? [];
    const slideChartManifests = options.slideChartManifests ?? [];
    const slideHyperlinkRels = options.slideHyperlinkRels ?? [];
    const slideTransitionXmls = options.slideTransitionXmls ?? [];
    const slideTimingXmls = options.slideTimingXmls ?? [];
    const slideBackgrounds = options.slideBackgrounds ?? [];
    const slideNotes = options.slideNotes ?? [];
    const meta = options.meta;
    const slideSize = options.slideSize;
    const slideHeaderFooters = options.slideHeaderFooters ?? [];
    const themeConfig = options.themeConfig;
    const sections = options.sections;
    const protection = options.protection;
    const customShows = options.customShows;
    const notesSize = options.notesSize;
    const embeddedFontListXml = options.embeddedFontListXml;
    const extraPresentationRels = options.extraPresentationRels;
    const commentSlideInfos = options.commentSlideInfos;
    const commentAuthorsXml = options.commentAuthorsXml;
    const fontDataFiles = options.fontDataFiles;
    const mastersConfig = options.mastersConfig;
    const slideMasterNames = options.slideMasterNames;
    const slideBgImageAssets = options.slideBgImageAssets;
    const customProperties = options.customProperties;
    const handoutLayout = options.handoutLayout;
    const printSettings = options.printSettings;
    const thumbnailBuffer = options.thumbnailBuffer;
    // Count total charts (classic and ChartEx separately) and collect drawing indices
    let totalCharts = 0;
    let totalChartEx = 0;
    const chartDrawingIndices: number[] = [];
    for (const manifest of slideChartManifests) {
      for (const chart of manifest.charts) {
        if (!chart.chartXml || !chart.chartRelsXml || !chart.excelBuffer) {
          continue;
        }
        if (chart.isChartEx) {
          totalChartEx++;
        } else {
          totalCharts++;
        }
        if (chart.chartDrawingXml) {
          chartDrawingIndices.push(chart.chartIndex);
        }
      }
    }

    // Determine which slides have notes
    const hasAnyNotes = slideNotes.some(n => n !== undefined && n !== "" && !(Array.isArray(n) && n.length === 0));
    const notesSlideIndices: number[] = [];
    for (let i = 0; i < slideCount; i++) {
      const n = slideNotes[i];
      if (n !== undefined && n !== "" && !(Array.isArray(n) && n.length === 0)) {
        notesSlideIndices.push(i);
      }
    }

    const opts = this.zipOpts();

    // Determine comment slide info
    const hasComments = commentSlideInfos && commentSlideInfos.length > 0;

    // Determine if any slides have video, audio, or SVG
    const hasAnyVideo = slideMediaManifests.some(m => m.videoAssets && m.videoAssets.length > 0);
    const hasAnyAudio = slideMediaManifests.some(m => m.audioAssets && m.audioAssets.length > 0);
    const hasAnySvg = slideMediaManifests.some(m => m.svgAssets && m.svgAssets.length > 0);

    // Update content types with correct slide, chart, notes, comments, font, video, audio, custom props, and handout count
    const hasCustomPropsFlag = customProperties !== undefined && customProperties.length > 0;
    const hasHandoutMasterFlag = handoutLayout !== undefined;
    this.zip.file("[Content_Types].xml", generateContentTypes(
      slideCount, totalCharts, hasAnyNotes, notesSlideIndices,
      commentSlideInfos?.map(c => c.commentFileIndex),
      fontDataFiles && fontDataFiles.length > 0,
      hasAnyVideo,
      hasAnyAudio,
      hasCustomPropsFlag,
      hasHandoutMasterFlag,
      totalChartEx,
      chartDrawingIndices,
      hasAnySvg,
    ), opts);

    // Document Properties
    this.addFolder("docProps");
    this.zip.file("docProps/core.xml", generateCoreProperties(meta?.title, meta?.author, meta?.language), opts);
    this.zip.file("docProps/app.xml", generateAppProperties(
      slideCount,
      themeConfig?.fontScheme?.majorLatin,
      themeConfig?.fontScheme?.minorLatin,
    ), opts);

    // Custom document properties
    const hasCustomProps = customProperties && customProperties.length > 0;
    if (hasCustomProps) {
      this.zip.file("docProps/custom.xml", generateCustomProperties(customProperties!), opts);
    }

    // Thumbnail for Quick Look / shell previews
    this.thumbnailBuffer = thumbnailBuffer ?? this.thumbnailBuffer ?? generatePlaceholderThumbnail();
    this.zip.file("docProps/thumbnail.jpeg", this.thumbnailBuffer, opts);

    // Update global rels to include docProps (and custom props if present)
    this.addFolder("_rels").file(".rels", generateGlobalRels(true, hasCustomProps), opts);

    // Handout master
    const hasHandoutMaster = handoutLayout !== undefined;
    if (hasHandoutMaster) {
      this.addFolder("ppt/handoutMasters");
      this.addFolder("ppt/handoutMasters/_rels");
      this.zip.file("ppt/handoutMasters/handoutMaster1.xml", generateHandoutMaster(), opts);
      this.zip.file("ppt/handoutMasters/_rels/handoutMaster1.xml.rels", generateHandoutMasterRels(), opts);
    }

    // Presentation XML and its relationships
    // rId layout: master(1) + theme(1) + slides(N) + presProps+viewProps+tableStyles(3) + notesMaster = N+6
    const notesMasterRId = hasAnyNotes ? `rId${computePresNotesMasterRId(1, slideCount)}` : undefined;
    this.zip.file("ppt/presentation.xml", generatePresentationXml(slideCount, slideSize, { sections, protection, customShows, notesSize, embeddedFontListXml, hasHandoutMaster, hasNotes: hasAnyNotes, hasComments: !!hasComments, notesMasterRId }), opts);
    this.zip.file("ppt/_rels/presentation.xml.rels", generatePresentationRels(
      slideCount, hasAnyNotes, hasComments, extraPresentationRels, hasHandoutMaster,
    ), opts);

    // Comment authors
    if (hasComments && commentAuthorsXml) {
      this.zip.file("ppt/commentAuthors.xml", commentAuthorsXml, opts);
    }

    // Font data files
    if (fontDataFiles) {
      this.addFolder("ppt/fonts");
      for (const font of fontDataFiles) {
        this.zip.file(font.path, font.buffer, opts);
      }
    }

    // Multi-master or single-master
    if (mastersConfig && mastersConfig.length > 0) {
      // Multi-master: generate multiple masters with their own layouts
      let globalLayoutIndex = 1;  // slideLayout1, slideLayout2, ...
      const masterLayoutMap: Map<string, { masterIndex: number; firstLayoutIndex: number; layoutCount: number }> = new Map();

      for (let mi = 0; mi < mastersConfig.length; mi++) {
        const masterConfig = mastersConfig[mi];
        const masterIndex = mi + 1;  // slideMaster1, slideMaster2, ...
        const firstLayoutIndex = globalLayoutIndex;
        const layoutCount = masterConfig.layouts.length;

        masterLayoutMap.set(masterConfig.name, { masterIndex, firstLayoutIndex, layoutCount });

        // Generate layouts for this master
        const layoutRIds: string[] = [];
        for (let li = 0; li < layoutCount; li++) {
          const layoutIndex = globalLayoutIndex++;
          const layoutRId = `rId${li + 1}`;  // layout rIds within master rels
          layoutRIds.push(layoutRId);

          this.zip.file(`ppt/slideLayouts/slideLayout${layoutIndex}.xml`,
            generateSlideLayoutMulti(masterConfig.layouts[li].name), opts);

          this.zip.file(
            `ppt/slideLayouts/_rels/slideLayout${layoutIndex}.xml.rels`,
            generateSlideLayoutRels(`../slideMasters/slideMaster${masterIndex}.xml`),
            opts,
          );
        }

        // Generate master
        const layoutBaseId = 2147483649 + (firstLayoutIndex - 1);
        this.zip.file(`ppt/slideMasters/slideMaster${masterIndex}.xml`,
          generateSlideMasterMulti(layoutRIds, layoutBaseId, masterConfig.background), opts);

        // Master rels: links to its layouts + theme
        const masterRelationships: PackageRelationship[] = [];
        for (let li = 0; li < layoutCount; li++) {
          const layoutIndex = firstLayoutIndex + li;
          masterRelationships.push({
            id: `rId${li + 1}`,
            type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout",
            target: `../slideLayouts/slideLayout${layoutIndex}.xml`,
          });
        }
        masterRelationships.push({
          id: `rId${layoutCount + 1}`,
          type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme",
          target: "../theme/theme1.xml",
        });
        this.zip.file(
          `ppt/slideMasters/_rels/slideMaster${masterIndex}.xml.rels`,
          generateRelationshipsXml(masterRelationships),
          opts,
        );
      }

      // Update presentation.xml with multi-master IDs
      // Update content types with multi-master
      const totalLayouts = globalLayoutIndex - 1;
      const updatedContentTypes = generateContentTypes(
        slideCount, totalCharts, hasAnyNotes, notesSlideIndices,
        commentSlideInfos?.map(c => c.commentFileIndex),
        fontDataFiles && fontDataFiles.length > 0,
        hasAnyVideo,
        hasAnyAudio,
        hasCustomPropsFlag,
        hasHandoutMasterFlag,
        totalChartEx,
        chartDrawingIndices,
        hasAnySvg,
        totalLayouts,
        mastersConfig.length,
      );
      this.zip.file("[Content_Types].xml", updatedContentTypes, opts);

      // Re-generate presentation.xml with multi-master IDs
      // rId layout: masters(M) + theme(1) + slides(N) + presProps+viewProps+tableStyles(3) + notesMaster = M+N+5
      const mmNotesMasterRId = hasAnyNotes ? `rId${computePresNotesMasterRId(mastersConfig.length, slideCount)}` : undefined;
      const presXmlContent = generatePresentationXml(slideCount, slideSize, {
        sections,
        protection,
        customShows,
        notesSize,
        embeddedFontListXml,
        hasNotes: hasAnyNotes,
        hasComments: !!hasComments,
        hasHandoutMaster: hasHandoutMasterFlag,
        notesMasterRId: mmNotesMasterRId,
        masterCount: mastersConfig.length,
      });
      this.zip.file("ppt/presentation.xml", presXmlContent, opts);

      // Update presentation rels with multi-master
      const presRelsXml = generateMultiMasterPresentationRels(
        slideCount, mastersConfig.length, hasAnyNotes, hasComments, extraPresentationRels, hasHandoutMasterFlag,
      );
      this.zip.file("ppt/_rels/presentation.xml.rels", presRelsXml, opts);

      // Store masterLayoutMap for slide layout target resolution
      this.masterLayoutMap = masterLayoutMap;
    } else {
      // Single master with 5 standard layouts
      const STANDARD_LAYOUTS = ["Blank", "Title Slide", "Section Header", "Two Content", "Title Only"];
      const singleLayoutCount = STANDARD_LAYOUTS.length;
      this.zip.file("ppt/slideMasters/slideMaster1.xml", generateSlideMaster(singleLayoutCount), opts);
      this.zip.file("ppt/slideMasters/_rels/slideMaster1.xml.rels", generateSlideMasterRels(singleLayoutCount), opts);
      for (let i = 0; i < singleLayoutCount; i++) {
        this.zip.file(`ppt/slideLayouts/slideLayout${i + 1}.xml`, generateSlideLayoutMulti(STANDARD_LAYOUTS[i]), opts);
      this.zip.file(`ppt/slideLayouts/_rels/slideLayout${i + 1}.xml.rels`, generateSlideLayoutRels(), opts);
      }
      // Re-generate content types with correct layout count
      this.zip.file("[Content_Types].xml", generateContentTypes(
        slideCount, totalCharts, hasAnyNotes, notesSlideIndices,
        commentSlideInfos?.map(c => c.commentFileIndex),
        fontDataFiles && fontDataFiles.length > 0,
        hasAnyVideo, hasAnyAudio, hasCustomPropsFlag, hasHandoutMasterFlag,
        totalChartEx, chartDrawingIndices, hasAnySvg, singleLayoutCount,
      ), opts);
    }

    // Theme
    this.zip.file("ppt/theme/theme1.xml", generateTheme(themeConfig), opts);
    if (hasAnyNotes) {
      this.zip.file("ppt/theme/theme2.xml", generateNotesTheme(), opts);
    }

    // Package-level parts
    this.zip.file("ppt/presProps.xml", generatePresProps(printSettings), opts);
    this.zip.file("ppt/viewProps.xml", generateViewProps(), opts);
    this.zip.file("ppt/tableStyles.xml", generateTableStyles(), opts);

    // Notes Master (if any slide has notes)
    if (hasAnyNotes) {
      this.addFolder("ppt/notesMasters");
      this.addFolder("ppt/notesMasters/_rels");
      this.addFolder("ppt/notesSlides");
      this.addFolder("ppt/notesSlides/_rels");
      this.zip.file("ppt/notesMasters/notesMaster1.xml", generateNotesMaster(), opts);
      this.zip.file("ppt/notesMasters/_rels/notesMaster1.xml.rels", generateNotesMasterRels(), opts);
    }

    // Create chart directories if needed
    if (totalCharts > 0 || totalChartEx > 0) {
      this.addFolder("ppt/charts");
      this.addFolder("ppt/charts/_rels");
      this.addFolder("ppt/embeddings");
    }
    if (chartDrawingIndices.length > 0) {
      this.addFolder("ppt/drawings");
    }

    // Individual slides
    for (let i = 1; i <= slideCount; i++) {
      const innerSpTree = slideContents[i - 1] ?? "";
      const mediaManifest = slideMediaManifests[i - 1];
      const chartManifest = slideChartManifests[i - 1];
      const hyperlinkRels = slideHyperlinkRels[i - 1] ?? [];
      const background = slideBackgrounds[i - 1];
      const notes = slideNotes[i - 1];
      const headerFooter = slideHeaderFooters[i - 1];

      // Store image buffers and build per-slide media rels
      const mediaRels: Array<{ rId: string; target: string }> = [];
      if (mediaManifest) {
        for (const asset of mediaManifest.assets) {
          this.zip.file(asset.mediaPath, asset.buffer, opts);
          mediaRels.push({ rId: asset.rId, target: asset.relativePath });
        }
        // Fill image assets (image fills on shapes)
        for (const asset of mediaManifest.fillAssets) {
          this.zip.file(asset.mediaPath, asset.buffer, opts);
          mediaRels.push({ rId: asset.rId, target: asset.relativePath });
        }
      }

      // Store video media files and build per-slide video rels
      const videoRels: VideoMediaRelationship[] = [];
      if (mediaManifest?.videoAssets) {
        for (const asset of mediaManifest.videoAssets) {
          if (asset.buffer.length > 0) {
            this.zip.file(asset.mediaPath, asset.buffer, opts);
          }
          if (asset.posterRId && asset.posterBuffer && asset.posterMediaPath && asset.posterRelativePath) {
            this.zip.file(asset.posterMediaPath, asset.posterBuffer, opts);
          }
          if (asset.webVideo) {
            // Web videos don't have video/media rels — only poster (handled above)
            // Hyperlink rels are handled via slideHyperlinkRels
            if (asset.posterRId) {
              videoRels.push({
                videoRId: "",
                mediaRId: "",
                videoTarget: "",
                posterRId: asset.posterRId,
                posterTarget: asset.posterRelativePath!,
              });
            }
          } else {
            const rel: VideoMediaRelationship = {
              videoRId: asset.videoRId,
              mediaRId: asset.mediaRId,
              videoTarget: asset.relativePath,
            };
            if (asset.posterRId && asset.posterRelativePath) {
              rel.posterRId = asset.posterRId;
              rel.posterTarget = asset.posterRelativePath;
            }
            videoRels.push(rel);
          }
        }
      }

      // Store audio media files and build per-slide audio rels
      const audioRels: AudioMediaRelationship[] = [];
      if (mediaManifest?.audioAssets) {
        for (const asset of mediaManifest.audioAssets) {
          this.zip.file(asset.mediaPath, asset.buffer, opts);
          audioRels.push({
            audioRId: asset.audioRId,
            mediaRId: asset.mediaRId,
            audioTarget: asset.relativePath,
          });
        }
      }

      // Store SVG media files and build per-slide SVG rels
      const svgRels: Array<{ rId: string; target: string }> = [];
      if (mediaManifest?.svgAssets) {
        for (const asset of mediaManifest.svgAssets) {
          this.zip.file(asset.svgMediaPath, asset.svgBuffer, opts);
          svgRels.push({ rId: asset.svgRId, target: asset.svgRelativePath });
        }
      }

      // Store chart files and build per-slide chart rels
      const chartRels: Array<{ rId: string; target: string; type: string }> = [];
      if (chartManifest) {
        for (const chart of chartManifest.charts) {
          if (chart.chartXml && chart.chartRelsXml && chart.excelBuffer && chart.rId) {
            const prefix = chart.isChartEx ? "chartEx" : "chart";
            this.zip.file(`ppt/charts/${prefix}${chart.chartIndex}.xml`, chart.chartXml, opts);
            this.zip.file(`ppt/charts/_rels/${prefix}${chart.chartIndex}.xml.rels`, chart.chartRelsXml, opts);
            this.zip.file(`ppt/embeddings/${prefix}${chart.chartIndex}.xlsx`, chart.excelBuffer, opts);
            // Store chart drawing for annotations
            if (chart.chartDrawingXml) {
              this.zip.file(`ppt/drawings/drawing${chart.chartIndex}.xml`, chart.chartDrawingXml, opts);
            }
            chartRels.push({
              rId: chart.rId,
              target: `../charts/${prefix}${chart.chartIndex}.xml`,
              type: chart.isChartEx ? "chartEx" : "chart",
            });
          }

          // Store fallback PNG and add its image relationship
          if (chart.fallbackPng && chart.fallbackMediaPath) {
            this.zip.file(chart.fallbackMediaPath, chart.fallbackPng, opts);
            if (chart.fallbackRId && chart.fallbackRelativePath) {
              mediaRels.push({ rId: chart.fallbackRId, target: chart.fallbackRelativePath });
            }
          }
        }
      }

      // Process background image asset
      const bgImageAsset = slideBgImageAssets?.[i - 1];
      if (bgImageAsset) {
        this.zip.file(bgImageAsset.mediaPath, bgImageAsset.buffer, opts);
        // Add to mediaRels so it gets an image relationship in slide rels
        mediaRels.push({ rId: bgImageAsset.rId, target: bgImageAsset.relativePath });
      }

      // Determine notes relationship
      const hasNotes = notes !== undefined && notes !== "" && !(Array.isArray(notes) && notes.length === 0);

      // Determine comment relationship for this slide
      const commentInfo = commentSlideInfos?.find(c => c.slideIndex === i - 1);

      // Determine layout target for this slide (multi-master support)
      let slideLayoutTarget: string | undefined;
      if (mastersConfig && mastersConfig.length > 0 && slideMasterNames) {
        const masterName = slideMasterNames[i - 1];
        const masterLayoutMap = this.masterLayoutMap;
        if (masterLayoutMap && masterName) {
          const info = masterLayoutMap.get(masterName);
          if (info) {
            slideLayoutTarget = `../slideLayouts/slideLayout${info.firstLayoutIndex}.xml`;
          }
        }
        // Fallback to first master's first layout
        if (!slideLayoutTarget && masterLayoutMap) {
          const unresolvedName = slideMasterNames[i - 1];
          getLogger().warn(
            `[zipper] Slide ${i}: master name "${unresolvedName ?? "(undefined)"}" not found in masterLayoutMap. ` +
            `Falling back to first master's first layout. Available masters: [${[...masterLayoutMap.keys()].join(", ")}]`,
          );
          const firstMaster = masterLayoutMap.values().next().value;
          if (firstMaster) {
            slideLayoutTarget = `../slideLayouts/slideLayout${firstMaster.firstLayoutIndex}.xml`;
          }
        }
      }

      const transitionXml = slideTransitionXmls[i - 1] ?? "";
      const timingXml = slideTimingXmls[i - 1] ?? "";
      const bgImageRId = bgImageAsset?.rId;
      const slideWidthEmu = slideSize ? Math.round(slideSize.width * PIXEL_TO_EMU) : undefined;
      const slideHeightEmu = slideSize ? Math.round(slideSize.height * PIXEL_TO_EMU) : undefined;
      this.zip.file(
        `ppt/slides/slide${i}.xml`,
        generateSlideShell(
          innerSpTree,
          transitionXml,
          timingXml,
          background,
          headerFooter,
          bgImageRId,
          slideWidthEmu,
          slideHeightEmu,
          `slide:${i}`,
        ),
        opts,
      );
      this.zip.file(
        `ppt/slides/_rels/slide${i}.xml.rels`,
        generateSlideRels(mediaRels, hyperlinkRels, chartRels, hasNotes ? i : undefined, slideLayoutTarget, commentInfo?.commentFileIndex, videoRels, audioRels, svgRels),
        opts,
      );

      // Notes slide
      if (hasNotes) {
        const notesResult = generateNotesSlide(notes!, i);
        this.zip.file(`ppt/notesSlides/notesSlide${i}.xml`, notesResult.xml, opts);
        this.zip.file(`ppt/notesSlides/_rels/notesSlide${i}.xml.rels`, generateNotesSlideRels(i, notesResult.hyperlinkRels), opts);
      }
    }
    this.shouldValidateOpcInvariants = true;
  }

  public async generateBuffer(): Promise<Buffer> {
    if (this.shouldValidateOpcInvariants) {
      await assertOpcPackageInvariants(this.zip);
    }
    return await this.zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
  }

  public generateStream(): Readable {
    return this.zip.generateNodeStream({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
      streamFiles: true,
    }) as unknown as Readable;
  }
}
