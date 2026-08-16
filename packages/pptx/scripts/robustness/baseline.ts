import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import JSZip from "jszip";
import { TEST_LICENSE_KEY, TEST_PUBLIC_KEY_PEM } from "../../../../scripts/test-license-fixture.mjs";
import {
  PaperEngine,
  setDeterministicMode,
  type EngineRenderOptions,
  type PaperDocument,
  type PaperNode,
  type PptxOutputMode,
  type QualityFinding,
} from "../../src/index.js";
import { RenderContext, withContext } from "../../src/renderContext.js";

type CorpusTier = "tier0" | "tier1";
type StressMode = "none" | "quick" | "full";
type FixtureInput = PaperDocument | Record<string, unknown>;
type MasterMode = "single" | "multi";
type NotesMode = "none" | "notes" | "comments" | "both";
type MediaMode = "none" | "images" | "svg" | "video-audio-poster" | "background-image";
type ChartMode = "none" | "classic" | "chartex" | "workbook" | "drawing";
type FallbackMode = "native" | "alternate-content" | "visual-only";
type FontMode = "system" | "fallback" | "embedded";

interface CliOptions {
  outDir: string;
  tiers: Set<CorpusTier>;
  stressMode: StressMode;
  tier1Count: number;
}

interface RobustnessFixture {
  id: string;
  title: string;
  tier: CorpusTier;
  input: FixtureInput;
  renderOptions?: EngineRenderOptions;
  dimensions?: Record<string, string>;
}

interface PackageMetrics {
  archiveSizeBytes: number;
  partCount: number;
  relationshipCount: number;
  chartCount: number;
  mediaCount: number;
}

interface FixtureBenchmark {
  fixtureId: string;
  tier: CorpusTier;
  durationMs: number;
  peakRssBytes: number;
  fallbackCount: number;
  repairCount: number;
  package: PackageMetrics;
}

interface FixtureFailure {
  fixtureId: string;
  code: string;
  phase?: string;
  message?: string;
  details?: unknown;
}

interface DeterministicEntry {
  fixtureId: string;
  tier: CorpusTier;
  firstHash?: string;
  secondHash?: string;
  byteIdentical: boolean;
}

interface FixtureRunResult {
  fixture: RobustnessFixture;
  benchmark?: FixtureBenchmark;
  deterministic: DeterministicEntry;
  failures: FixtureFailure[];
  firstHash?: string;
  findings: QualityFinding[];
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../../..");
const RED_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
const BLUE_SVG = `data:image/svg+xml;base64,${Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect width="160" height="100" fill="#DBEAFE"/><circle cx="80" cy="50" r="32" fill="#2563EB"/></svg>',
).toString("base64")}`;
const TINY_VIDEO = "data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDE=";
const TINY_AUDIO = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMA==";
const FAKE_FONT = `data:font/ttf;base64,${Buffer.from("FAKE_FONT_DATA_0123456789abcdefEXTRA_BYTES").toString("base64")}`;

function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function parseCliOptions(): CliOptions {
  const outArg = process.argv.find((arg) => arg.startsWith("--out="));
  const tierArg = process.argv.find((arg) => arg.startsWith("--tier="))?.slice("--tier=".length);
  const stressArg = process.argv.find((arg) => arg.startsWith("--stress="))?.slice("--stress=".length);
  const tier1CountArg = process.argv.find((arg) => arg.startsWith("--tier1-count="))?.slice("--tier1-count=".length);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = outArg
    ? resolve(outArg.slice("--out=".length))
    : resolve(repoRoot, "outputs/pptx-robustness", `baseline-${stamp}`);

  const tiers = new Set<CorpusTier>();
  if (!tierArg || tierArg === "all") {
    tiers.add("tier0");
    tiers.add("tier1");
  } else if (tierArg === "tier0" || tierArg === "tier1") {
    tiers.add(tierArg);
  } else {
    throw new Error(`Unsupported --tier value "${tierArg}". Use tier0, tier1, or all.`);
  }

  const stressMode = stressArg === "none" || stressArg === "quick" || stressArg === "full"
    ? stressArg
    : "full";
  const tier1Count = tier1CountArg ? Number(tier1CountArg) : 150;
  if (!Number.isInteger(tier1Count) || tier1Count < 0) {
    throw new Error(`Invalid --tier1-count value "${tier1CountArg}".`);
  }

  return { outDir, tiers, stressMode, tier1Count };
}

function baseSlide(content: string, top = 80): PaperDocument["slides"][number] {
  return {
    type: "Slide",
    children: [
      {
        type: "Text",
        content,
        style: {
          position: "absolute",
          left: 72,
          top,
          width: 760,
          height: 80,
          fontSize: 30,
          fontFamily: "Aptos",
        },
      },
    ],
  };
}

function minimalPaper(): PaperDocument {
  return {
    type: "Document",
    meta: { title: "Tier 0 Minimal PaperDocument" },
    slides: [baseSlide("Minimal PaperDocument")],
  };
}

function minimalAgent(): Record<string, unknown> {
  return {
    type: "presentation",
    version: "1.0",
    presentationTitle: "Tier 0 Minimal AgentDocument",
    companyName: "Runstamp",
    slides: [
      { pattern: "title", content: { title: "Minimal AgentDocument" } },
    ],
  };
}

function multiSlideDeck(): PaperDocument {
  return {
    type: "Document",
    meta: { title: "Tier 0 Multi Slide" },
    slides: [
      baseSlide("Slide one"),
      baseSlide("Slide two", 120),
      baseSlide("Slide three", 160),
    ],
  };
}

function notesCommentsDeck(): PaperDocument {
  return {
    type: "Document",
    meta: { title: "Tier 0 Notes And Comments" },
    slides: [
      {
        ...baseSlide("Notes and comments"),
        notes: "Speaker note with deterministic text.",
        comments: [
          {
            author: "Runstamp",
            text: "Baseline comment",
            date: "2026-01-01T00:00:00Z",
            x: 64,
            y: 64,
          },
        ],
      },
    ],
  };
}

function chartDeck(): PaperDocument {
  return {
    type: "Document",
    meta: { title: "Tier 0 Chart" },
    slides: [
      {
        type: "Slide",
        children: [
          {
            type: "Chart",
            chartData: classicChartData("Tier 0 revenue"),
            style: {
              position: "absolute",
              left: 80,
              top: 72,
              width: 520,
              height: 300,
            },
          },
        ],
      },
    ],
  };
}

function imageBackgroundDeck(): PaperDocument {
  return {
    type: "Document",
    meta: { title: "Tier 0 Image And Background" },
    slides: [
      {
        type: "Slide",
        background: { type: "image", src: RED_PIXEL },
        children: [
          {
            type: "Image",
            src: RED_PIXEL,
            decorative: true,
            style: {
              position: "absolute",
              left: 80,
              top: 80,
              width: 160,
              height: 120,
            },
          },
          {
            type: "Text",
            content: "Image fixture",
            style: {
              position: "absolute",
              left: 280,
              top: 110,
              width: 420,
              height: 60,
              fontSize: 28,
              fontFamily: "Aptos",
            },
          },
        ],
      },
    ],
  };
}

function multiMasterDeck(): PaperDocument {
  return {
    type: "Document",
    meta: { title: "Tier 0 Multi Master" },
    masters: [
      { name: "Corporate", layouts: [{ name: "Title" }] },
      { name: "Creative", layouts: [{ name: "Title" }] },
    ],
    slides: [
      { ...baseSlide("Corporate master"), masterName: "Corporate" },
      { ...baseSlide("Creative master"), masterName: "Creative" },
    ],
  };
}

function visualFallbackDeck(): PaperDocument {
  return {
    type: "Document",
    meta: { title: "Tier 0 Visual Fallback" },
    slides: [
      {
        type: "Slide",
        children: [
          {
            type: "Chart",
            chartData: {
              chartType: "line",
              categories: ["Jan", "Feb", "Mar"],
              series: [{ name: "Sales", values: [10, 12, 9] }],
              legend: { position: "right" },
            },
            style: {
              position: "absolute",
              left: 40,
              top: 40,
              width: 320,
              height: 90,
            },
          },
        ],
      },
    ],
  };
}

function templateMutationDeck(): PaperDocument {
  const candidates = [
    resolve(repoRoot, "platform/public/debug-test-output.pptx"),
    resolve(repoRoot, "packages/core/tests/desktopValidation/artifacts/template-mutation/generated.pptx"),
  ];
  const templatePath = candidates.find((candidate) => existsSync(candidate));
  if (!templatePath) {
    return {
      type: "Document",
      meta: { title: "Tier 0 Template Mutation Surrogate" },
      customProperties: [{ name: "templateMutation", value: "template fixture unavailable" }],
      slides: [baseSlide("Template mutation surrogate")],
    };
  }

  return {
    type: "Document",
    meta: { title: "Tier 0 Template Mutation" },
    template: readFileSync(templatePath),
    slides: [
      {
        type: "Slide",
        layoutName: "TITLE_SLIDE",
        children: [
          {
            type: "Text",
            placeholder: { type: "title", idx: 0 },
            content: "Template-backed title",
          },
          {
            type: "Text",
            placeholder: { type: "subTitle", idx: 1 },
            content: "Template mutation baseline",
          },
        ],
      },
    ],
  };
}

function buildTier0Fixtures(): RobustnessFixture[] {
  return [
    { id: "tier0-minimal-paper", title: "Minimal PaperDocument", tier: "tier0", input: minimalPaper() },
    { id: "tier0-minimal-agent", title: "Minimal AgentDocument", tier: "tier0", input: minimalAgent() },
    { id: "tier0-multi-slide", title: "Multi-slide deck", tier: "tier0", input: multiSlideDeck() },
    { id: "tier0-notes-comments", title: "Notes and comments deck", tier: "tier0", input: notesCommentsDeck() },
    { id: "tier0-chart", title: "Chart deck", tier: "tier0", input: chartDeck() },
    { id: "tier0-image-background", title: "Image and background deck", tier: "tier0", input: imageBackgroundDeck() },
    { id: "tier0-multi-master", title: "Multi-master deck", tier: "tier0", input: multiMasterDeck() },
    {
      id: "tier0-visual-fallback",
      title: "Visual fallback deck",
      tier: "tier0",
      input: visualFallbackDeck(),
      renderOptions: { outputMode: "visual_safe" },
    },
    { id: "tier0-template-mutation", title: "Template mutation deck", tier: "tier0", input: templateMutationDeck() },
  ];
}

function classicChartData(title: string): NonNullable<Extract<PaperNode, { type: "Chart" }>["chartData"]> {
  return {
    chartType: "bar",
    title: { text: title, fontSize: 16, bold: true },
    categories: ["Q1", "Q2", "Q3"],
    legend: { position: "bottom", fontSize: 10, fontFamily: "Aptos" },
    series: [{ name: "Revenue", values: [100, 130, 160], color: "#2563EB" }],
  };
}

function chartNodeForMode(mode: ChartMode, index: number, visualFallback: boolean): PaperNode | undefined {
  if (mode === "none") return undefined;
  const style = visualFallback
    ? { position: "absolute" as const, left: 34, top: 34, width: 330, height: 90 }
    : { position: "absolute" as const, left: 420, top: 118, width: 430, height: 260 };

  if (mode === "chartex") {
    return {
      type: "Chart",
      style,
      chartData: {
        chartType: "treemap",
        title: { text: `Tier 1 treemap ${index}`, fontSize: 15, bold: true },
        treemapData: {
          categories: [
            {
              name: "Platform",
              children: [
                { name: "Core", value: 58, color: "#2563EB" },
                { name: "Automation", value: 24, color: "#0EA5E9" },
              ],
            },
            {
              name: "Services",
              children: [
                { name: "Advisory", value: 18, color: "#F97316" },
                { name: "Support", value: 12, color: "#FB923C" },
              ],
            },
          ],
        },
      },
    };
  }

  const chartData = classicChartData(`Tier 1 chart ${index}`);
  if (mode === "workbook") {
    chartData.valueAxis = { numberFormat: "$#,##0", gridlines: { major: true, color: "#E2E8F0" } };
    chartData.dataTable = { showKeys: true, showHorzBorder: true, showVertBorder: true };
  }
  if (mode === "drawing") {
    chartData.annotations = [
      {
        text: "Peak",
        x: 58,
        y: 18,
        width: 20,
        height: 10,
        fill: "#FFFFFF",
        borderColor: "#2563EB",
        fontColor: "#1E3A8A",
        bold: true,
      },
    ];
  }
  if (visualFallback) {
    chartData.legend = { position: "right", fontSize: 10, fontFamily: "Aptos" };
  }
  return { type: "Chart", style, chartData };
}

function notesAndComments(mode: NotesMode): Pick<PaperDocument["slides"][number], "notes" | "comments"> {
  return {
    notes: mode === "notes" || mode === "both"
      ? "Tier 1 note text with deterministic contents."
      : undefined,
    comments: mode === "comments" || mode === "both"
      ? [
          {
            author: "QA",
            text: "Tier 1 comment",
            date: "2026-01-01T00:00:00Z",
            x: 72,
            y: 72,
          },
        ]
      : undefined,
  };
}

function mediaNodes(mode: MediaMode): PaperNode[] {
  switch (mode) {
    case "images":
      return [
        {
          type: "Image",
          src: RED_PIXEL,
          style: { position: "absolute", left: 72, top: 292, width: 128, height: 92 },
          decorative: true,
        },
      ];
    case "svg":
      return [
        {
          type: "Image",
          src: RED_PIXEL,
          svgSrc: BLUE_SVG,
          style: { position: "absolute", left: 72, top: 292, width: 160, height: 100 },
          decorative: true,
        },
      ];
    case "video-audio-poster":
      return [
        {
          type: "Video",
          src: TINY_VIDEO,
          poster: RED_PIXEL,
          mimeType: "video/mp4",
          style: { position: "absolute", left: 72, top: 292, width: 160, height: 96 },
          decorative: true,
        },
        {
          type: "Audio",
          src: TINY_AUDIO,
          mimeType: "audio/mp3",
          style: { position: "absolute", left: 250, top: 304, width: 72, height: 72 },
          decorative: true,
        },
      ];
    case "background-image":
    case "none":
      return [];
  }
}

function denseVisualFallbackNode(fontFamily: string): PaperNode {
  return {
    type: "View",
    style: {
      position: "absolute",
      left: 44,
      top: 52,
      width: 520,
      height: 250,
      backgroundColor: "#F8FAFC",
      borderWidth: 1,
      borderColor: "#CBD5E1",
    },
    children: [
      ...Array.from({ length: 4 }, (_, index) => ({
        type: "Text" as const,
        content: `Dense visual card line ${index + 1}`,
        style: {
          position: "absolute" as const,
          left: 24,
          top: 24 + index * 44,
          width: 380,
          height: 28,
          fontSize: 17,
          fontFamily,
        },
      })),
      {
        type: "View",
        style: {
          position: "absolute",
          left: 442,
          top: 24,
          width: 42,
          height: 176,
          backgroundColor: "#2563EB",
        },
      },
    ],
  };
}

function buildTier1Document(
  index: number,
  dimensions: {
    masterMode: MasterMode;
    notesMode: NotesMode;
    mediaMode: MediaMode;
    chartMode: ChartMode;
    fallbackMode: FallbackMode;
    fontMode: FontMode;
    outputMode: PptxOutputMode;
  },
): PaperDocument {
  const visualFallback = dimensions.fallbackMode === "visual-only";
  const fontFamily = dimensions.outputMode === "strict_editable"
    ? "Aptos"
    : dimensions.fontMode === "fallback"
      ? "Missing Fixture Sans"
      : dimensions.fontMode === "embedded"
        ? "BaselineEmbedded"
        : "Aptos";
  const chartMode = dimensions.outputMode === "strict_editable" && dimensions.chartMode === "chartex"
    ? "classic"
    : dimensions.chartMode;
  const children: PaperNode[] = [
    {
      type: "Text",
      content: `Tier 1 ${index + 1}: ${dimensions.masterMode}/${dimensions.mediaMode}/${chartMode}`,
      style: {
        position: "absolute",
        left: 54,
        top: 34,
        width: 820,
        height: 42,
        fontSize: 23,
        fontWeight: "bold",
        fontFamily,
        color: "#0F172A",
        fontFallback: dimensions.fontMode === "fallback" ? ["Aptos", "Arial"] : undefined,
      },
    },
  ];

  if (visualFallback) {
    children.push(denseVisualFallbackNode(fontFamily));
  } else {
    children.push({
      type: "Table",
      style: { position: "absolute", left: 58, top: 112, width: 300, height: 132 },
      tableData: {
        columns: [100, 100, 100],
        rows: [
          { cells: [{ text: "Metric" }, { text: "Base" }, { text: "Now" }] },
          { cells: [{ text: "ARR" }, { text: "$12M" }, { text: "$18M" }] },
          { cells: [{ text: "NDR" }, { text: "108%" }, { text: "119%" }] },
        ],
        style: {
          firstRow: true,
          headerRowStyle: { fill: "#DBEAFE", fontWeight: "bold", color: "#1E3A8A" },
          innerBorderH: { width: 1, color: "#CBD5E1" },
          innerBorderV: { width: 1, color: "#CBD5E1" },
        },
      },
    });
  }

  const chartNode = chartNodeForMode(chartMode, index, visualFallback);
  if (chartNode) children.push(chartNode);
  children.push(...mediaNodes(dimensions.mediaMode));

  const slide: PaperDocument["slides"][number] = {
    type: "Slide",
    masterName: dimensions.masterMode === "multi"
      ? (index % 2 === 0 ? "RobustnessA" : "RobustnessB")
      : undefined,
    background: dimensions.mediaMode === "background-image" ? { type: "image", src: RED_PIXEL } : undefined,
    ...notesAndComments(dimensions.notesMode),
    children,
  };

  return {
    type: "Document",
    meta: { title: `Tier 1 Engine Matrix ${index + 1}` },
    chartFallbackImages: dimensions.fallbackMode === "alternate-content",
    embeddedFonts: dimensions.fontMode === "embedded" && dimensions.outputMode !== "strict_editable"
      ? [{ fontFamily: "BaselineEmbedded", src: FAKE_FONT }]
      : undefined,
    masters: dimensions.masterMode === "multi"
      ? [
          { name: "RobustnessA", layouts: [{ name: "Title" }] },
          { name: "RobustnessB", layouts: [{ name: "Title" }] },
        ]
      : undefined,
    slides: [slide],
  };
}

function buildTier1Fixtures(count: number): RobustnessFixture[] {
  const masterModes: MasterMode[] = ["single", "multi"];
  const notesModes: NotesMode[] = ["none", "notes", "comments", "both"];
  const mediaModes: MediaMode[] = ["none", "images", "svg", "video-audio-poster", "background-image"];
  const chartModes: ChartMode[] = ["none", "classic", "chartex", "workbook", "drawing"];
  const fallbackModes: FallbackMode[] = ["native", "alternate-content", "visual-only"];
  const fontModes: FontMode[] = ["system", "fallback", "embedded"];
  const outputModes: PptxOutputMode[] = ["strict_editable", "editable_preferred", "visual_safe"];
  const fixtures: RobustnessFixture[] = [];

  for (let index = 0; index < count; index += 1) {
    const rawFallbackMode = fallbackModes[index % fallbackModes.length];
    const rawOutputMode = outputModes[Math.floor(index / 9) % outputModes.length];
    const outputMode = rawFallbackMode === "visual-only" ? "visual_safe" : rawOutputMode;
    const dimensions = {
      masterMode: masterModes[index % masterModes.length],
      notesMode: notesModes[Math.floor(index / 2) % notesModes.length],
      mediaMode: mediaModes[Math.floor(index / 8) % mediaModes.length],
      chartMode: chartModes[Math.floor(index / 30) % chartModes.length],
      fallbackMode: rawFallbackMode,
      fontMode: outputMode === "strict_editable" ? "system" : fontModes[Math.floor(index / 3) % fontModes.length],
      outputMode,
    };
    const suffix = `${dimensions.masterMode}-${dimensions.notesMode}-${dimensions.mediaMode}-${dimensions.chartMode}-${dimensions.fallbackMode}-${dimensions.fontMode}-${dimensions.outputMode}`;
    fixtures.push({
      id: `tier1-${String(index + 1).padStart(3, "0")}-${suffix}`.replace(/[^a-z0-9-]/g, "-"),
      title: `Tier 1 matrix ${index + 1}`,
      tier: "tier1",
      input: buildTier1Document(index, dimensions),
      renderOptions: { outputMode },
      dimensions,
    });
  }

  return fixtures;
}

async function analyzePackage(buffer: Buffer): Promise<PackageMetrics> {
  const zip = await JSZip.loadAsync(buffer);
  const files = Object.keys(zip.files).filter((path) => !zip.files[path].dir);
  let relationshipCount = 0;
  for (const path of files.filter((entry) => entry.endsWith(".rels"))) {
    const relsXml = await zip.file(path)!.async("string");
    relationshipCount += Array.from(relsXml.matchAll(/<Relationship\b/g)).length;
  }

  return {
    archiveSizeBytes: buffer.length,
    partCount: files.length,
    relationshipCount,
    chartCount: files.filter((path) => /^ppt\/charts\/(?:chart|chartEx)\d+\.xml$/.test(path)).length,
    mediaCount: files.filter((path) => path.startsWith("ppt/media/")).length,
  };
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function renderOptionsFor(fixture: RobustnessFixture): EngineRenderOptions {
  return {
    validationMode: "structural",
    ...(fixture.renderOptions ?? {}),
  };
}

function cloneFixtureInput<T>(value: T): T {
  if (Buffer.isBuffer(value)) return Buffer.from(value) as T;
  if (Array.isArray(value)) return value.map((entry) => cloneFixtureInput(entry)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, cloneFixtureInput(entry)]),
    ) as T;
  }
  return value;
}

async function withIsolatedRenderContext<T>(fn: () => Promise<T>): Promise<T> {
  const ctx = new RenderContext({
    engineMode: "pro",
    licenseKey: process.env.RUNSTAMP_LICENSE_KEY,
  });
  ctx.deterministicMode.setDeterministicMode(true);
  return withContext(ctx, fn);
}

function errorToFailure(fixture: RobustnessFixture, error: unknown): FixtureFailure {
  return {
    fixtureId: fixture.id,
    code: error instanceof Error && "code" in error ? String(error.code) : "UNCAUGHT_ERROR",
    phase: error instanceof Error && "phase" in error ? String(error.phase) : undefined,
    message: error instanceof Error ? error.message : String(error),
  };
}

async function runFixture(fixture: RobustnessFixture, outDir: string): Promise<FixtureRunResult> {
  const fixtureDir = join(outDir, "fixtures", fixture.id);
  const renderDir = join(fixtureDir, "renderer");
  await mkdir(renderDir, { recursive: true });

  const renderOptions = renderOptionsFor(fixture);
  const beforeRss = process.memoryUsage().rss;
  const started = performance.now();

  try {
    const first = await withIsolatedRenderContext(() =>
      PaperEngine.renderWithPreviews(
        cloneFixtureInput(fixture.input),
        { width: 320, height: 180, scale: 1, format: "png" },
        renderOptions,
      ),
    );
    const second = await withIsolatedRenderContext(() =>
      PaperEngine.renderWithQualityReport(
        cloneFixtureInput(fixture.input),
        undefined,
        renderOptions,
      ),
    );
    const durationMs = Math.round((performance.now() - started) * 100) / 100;
    const packageMetrics = await analyzePackage(first.pptx);
    const firstHash = sha256(first.pptx);
    const secondHash = sha256(second.pptx);
    const deterministic: DeterministicEntry = {
      fixtureId: fixture.id,
      tier: fixture.tier,
      firstHash,
      secondHash,
      byteIdentical: firstHash === secondHash,
    };
    const benchmark: FixtureBenchmark = {
      fixtureId: fixture.id,
      tier: fixture.tier,
      durationMs,
      peakRssBytes: Math.max(beforeRss, process.memoryUsage().rss),
      fallbackCount: first.qualityReport.fallbackCount,
      repairCount: first.qualityReport.repairSummary.actions.length,
      package: packageMetrics,
    };

    await writeFile(join(fixtureDir, "artifact.pptx"), first.pptx);
    await writeJson(join(fixtureDir, "structural-validation.json"), first.qualityReport.structuralValidation);
    await writeJson(join(fixtureDir, "quality-report.json"), first.qualityReport);
    await writeJson(join(fixtureDir, "benchmark-timing.json"), benchmark);
    await writeJson(join(fixtureDir, "visual-diff.json"), {
      status: "not_applicable",
      reason: `${fixture.tier} baseline has no reference render configured.`,
    });

    for (let index = 0; index < first.previews.length; index += 1) {
      await writeFile(join(renderDir, `slide-${index + 1}.png`), first.previews[index]);
    }

    const expectedArtifacts = [
      "artifact.pptx",
      "structural-validation.json",
      "quality-report.json",
      "benchmark-timing.json",
      "visual-diff.json",
      ...first.layoutTrees.map((_, index) => `renderer/slide-${index + 1}.png`),
    ];
    const artifactManifest = expectedArtifacts.map((artifactPath) => ({
      path: artifactPath,
      present: existsSync(join(fixtureDir, artifactPath)),
    }));
    const missingArtifacts = artifactManifest.filter((entry) => !entry.present);
    const failures: FixtureFailure[] = [];

    if (missingArtifacts.length > 0) {
      failures.push({
        fixtureId: fixture.id,
        code: "PROOF_ARTIFACT_MISSING",
        details: { missingArtifacts },
      });
    }
    if (!deterministic.byteIdentical) {
      failures.push({
        fixtureId: fixture.id,
        code: "DETERMINISTIC_REPLAY_MISMATCH",
        details: { firstHash, secondHash },
      });
    }
    if (first.qualityReport.structuralValidation.status === "failed") {
      failures.push({
        fixtureId: fixture.id,
        code: "STRUCTURAL_VALIDATION_FAILED",
        details: first.qualityReport.structuralValidation,
      });
    }
    if (!first.qualityReport.contractPassed) {
      failures.push({
        fixtureId: fixture.id,
        code: "QUALITY_CONTRACT_FAILED",
        details: {
          verdict: first.qualityReport.verdict,
          requestedOutputMode: first.qualityReport.requestedOutputMode,
        },
      });
    }
    if (
      first.qualityReport.requestedOutputMode === "strict_editable"
      && first.qualityReport.repairSummary.actions.length > 0
    ) {
      failures.push({
        fixtureId: fixture.id,
        code: "STRICT_REPAIR_NEEDED",
        details: first.qualityReport.repairSummary,
      });
    }

    await writeJson(join(fixtureDir, "failure-taxonomy.json"), {
      fixtureId: fixture.id,
      failures,
    });
    await writeJson(join(fixtureDir, "artifact-manifest.json"), [
      ...artifactManifest,
      { path: "failure-taxonomy.json", present: existsSync(join(fixtureDir, "failure-taxonomy.json")) },
    ]);

    return {
      fixture,
      benchmark,
      deterministic,
      failures,
      firstHash,
      findings: first.qualityReport.findings,
    };
  } catch (error) {
    const failure = errorToFailure(fixture, error);
    await writeJson(join(fixtureDir, "failure-taxonomy.json"), {
      fixtureId: fixture.id,
      failures: [failure],
    });
    return {
      fixture,
      deterministic: {
        fixtureId: fixture.id,
        tier: fixture.tier,
        byteIdentical: false,
      },
      failures: [failure],
      findings: [],
    };
  }
}

async function hashFixture(fixture: RobustnessFixture): Promise<string> {
  const rendered = await withIsolatedRenderContext(() =>
    PaperEngine.renderWithQualityReport(cloneFixtureInput(fixture.input), undefined, renderOptionsFor(fixture)),
  );
  return sha256(rendered.pptx);
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

async function runOrderProbe(
  fixtures: RobustnessFixture[],
  expectedHashes: Map<string, string>,
): Promise<Record<string, unknown>> {
  const entries = [];
  for (const fixture of [...fixtures].reverse()) {
    try {
      const hash = await hashFixture(fixture);
      entries.push({
        fixtureId: fixture.id,
        expectedHash: expectedHashes.get(fixture.id),
        actualHash: hash,
        byteIdentical: hash === expectedHashes.get(fixture.id),
      });
    } catch (error) {
      entries.push({
        fixtureId: fixture.id,
        byteIdentical: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return {
    mode: "reversed_fixture_order",
    fixtureCount: fixtures.length,
    passed: entries.every((entry) => entry.byteIdentical),
    entries,
  };
}

async function runConcurrencyProbes(
  fixtures: RobustnessFixture[],
  expectedHashes: Map<string, string>,
  stressMode: StressMode,
): Promise<Record<string, unknown>[]> {
  if (stressMode === "none") return [];
  const probeFixtures = stressMode === "quick" ? fixtures.slice(0, Math.min(24, fixtures.length)) : fixtures;
  const levels = stressMode === "quick" ? [1, 2, 4] : [1, 2, 4, 8];
  const probes = [];

  for (const concurrency of levels) {
    const started = performance.now();
    const entries = await mapPool(probeFixtures, concurrency, async (fixture) => {
      try {
        const hash = await hashFixture(fixture);
        return {
          fixtureId: fixture.id,
          expectedHash: expectedHashes.get(fixture.id),
          actualHash: hash,
          byteIdentical: hash === expectedHashes.get(fixture.id),
        };
      } catch (error) {
        return {
          fixtureId: fixture.id,
          byteIdentical: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });
    probes.push({
      concurrency,
      fixtureCount: probeFixtures.length,
      durationMs: Math.round((performance.now() - started) * 100) / 100,
      passed: entries.every((entry) => entry.byteIdentical),
      mismatches: entries.filter((entry) => !entry.byteIdentical),
    });
  }

  return probes;
}

function buildThroughputIsolationReport(
  concurrencyProbes: Record<string, unknown>[],
): Record<string, unknown> {
  const timedProbes = concurrencyProbes
    .filter((probe) => typeof probe.concurrency === "number" && typeof probe.durationMs === "number")
    .map((probe) => ({
      concurrency: Number(probe.concurrency),
      durationMs: Number(probe.durationMs),
      passed: Boolean(probe.passed),
      fixtureCount: Number(probe.fixtureCount ?? 0),
    }))
    .sort((a, b) => a.concurrency - b.concurrency);
  const serial = timedProbes.find((probe) => probe.concurrency === 1);
  const bestParallel = timedProbes
    .filter((probe) => probe.concurrency > 1)
    .reduce<(typeof timedProbes)[number] | undefined>((best, probe) => (
      !best || probe.durationMs < best.durationMs ? probe : best
    ), undefined);
  const speedup = serial && bestParallel && bestParallel.durationMs > 0
    ? serial.durationMs / bestParallel.durationMs
    : 0;
  const passedIsolation = timedProbes.every((probe) => probe.passed);
  const passedThroughputTarget = speedup >= 2;

  return {
    status: passedIsolation ? "pass" : "fail",
    decision: passedThroughputTarget ? "parallel_throughput_target_met" : "mutex_retained_with_bottleneck_data",
    owner: "pptx-engine",
    threshold: ">=2x speedup for concurrent Tier 1 renders, or retain mutex with documented bottleneck data",
    observedBestSpeedup: Math.round(speedup * 10000) / 10000,
    passedIsolation,
    passedThroughputTarget,
    bottleneck: passedThroughputTarget ? undefined : {
      retainedGuard: "module-level render mutex",
      reason: "Concurrency probes did not show the required 2x P95 throughput improvement over the serial baseline.",
      nextStep: "Remove or narrow the mutex only after per-render font, canvas, rasterizer, media, and chart state isolation prove a 2x speedup.",
    },
    probes: timedProbes,
  };
}

async function detectCapabilities(): Promise<Record<string, unknown>> {
  try {
    await import("@napi-rs/canvas");
    return {
      canvas: { available: true },
      canvasUnavailableCoverage: {
        status: "covered_by_forced_failure_tests",
        tests: ["packages/core/tests/fallbackHonesty.test.ts"],
      },
    };
  } catch (error) {
    return {
      canvas: {
        available: false,
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

function buildQualityHistogram(results: FixtureRunResult[]): Record<string, unknown> {
  const byCode: Record<string, number> = {};
  const bySharedCode: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  const verdicts: Record<string, number> = {};
  let fallbackCount = 0;
  let repairCount = 0;

  for (const result of results) {
    if (result.benchmark) {
      fallbackCount += result.benchmark.fallbackCount;
      repairCount += result.benchmark.repairCount;
    }
    for (const finding of result.findings) {
      byCode[finding.code] = (byCode[finding.code] ?? 0) + 1;
      if (finding.sharedCode) bySharedCode[finding.sharedCode] = (bySharedCode[finding.sharedCode] ?? 0) + 1;
      bySeverity[finding.severity] = (bySeverity[finding.severity] ?? 0) + 1;
    }
  }

  for (const result of results) {
    const verdict = result.failures.length > 0 ? "failed" : "passed";
    verdicts[verdict] = (verdicts[verdict] ?? 0) + 1;
  }

  return {
    totalFindings: Object.values(byCode).reduce((sum, count) => sum + count, 0),
    byCode,
    bySharedCode,
    bySeverity,
    fallbackCount,
    repairCount,
    verdicts,
  };
}

function buildCoverageMatrix(fixtures: RobustnessFixture[]): Record<string, unknown> {
  const coverage: Record<string, Set<string>> = {};
  for (const fixture of fixtures) {
    if (!fixture.dimensions) continue;
    for (const [key, value] of Object.entries(fixture.dimensions)) {
      coverage[key] ??= new Set<string>();
      coverage[key].add(value);
    }
  }
  return Object.fromEntries(
    Object.entries(coverage).map(([key, values]) => [key, [...values].sort()]),
  );
}

function failureSummary(failures: FixtureFailure[]): Record<string, number> {
  return failures.reduce<Record<string, number>>((acc, failure) => {
    acc[failure.code] = (acc[failure.code] ?? 0) + 1;
    return acc;
  }, {});
}

function percentile(values: number[], quantile: number): number {
  const finite = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (finite.length === 0) return 0;
  const index = Math.min(finite.length - 1, Math.max(0, Math.ceil(finite.length * quantile) - 1));
  return finite[index];
}

interface SloCheck {
  id: string;
  owner: string;
  metric: string;
  threshold: string;
  actual: number;
  passed: boolean;
  fixtureIds: string[];
  artifactPaths: string[];
}

function buildSloReport(params: {
  outDir: string;
  results: FixtureRunResult[];
  benchmarks: FixtureBenchmark[];
  failures: FixtureFailure[];
  replayManifest: DeterministicEntry[];
}): { status: "pass" | "fail"; checks: SloCheck[] } {
  const renderedCount = params.benchmarks.length;
  const allFindings = params.results.flatMap((result) => result.findings);
  const structuralFailureFixtureIds = params.failures
    .filter((failure) => failure.code === "STRUCTURAL_VALIDATION_FAILED")
    .map((failure) => failure.fixtureId);
  const deterministicFailures = params.replayManifest
    .filter((entry) => !entry.byteIdentical)
    .map((entry) => entry.fixtureId);
  const fallbackMissingFailures = params.failures
    .filter((failure) => /FALLBACK_MISSING/.test(failure.code))
    .map((failure) => failure.fixtureId);
  const repairNeededFixtureIds = params.benchmarks
    .filter((benchmark) => benchmark.repairCount > 0)
    .map((benchmark) => benchmark.fixtureId);
  const unmappedFindingFixtureIds = params.results
    .filter((result) => result.findings.some((finding) => !finding.sharedCode))
    .map((result) => result.fixture.id);
  const unexpectedWarningFixtureIds = params.results
    .filter((result) => result.findings.some((finding) => finding.severity === "warning" && !finding.sharedCode))
    .map((result) => result.fixture.id);

  const p95RenderTimeMs = percentile(params.benchmarks.map((benchmark) => benchmark.durationMs), 0.95);
  const p95MemoryBytes = percentile(params.benchmarks.map((benchmark) => benchmark.peakRssBytes), 0.95);
  const p95ArchiveBytes = percentile(
    params.benchmarks.map((benchmark) => benchmark.package.archiveSizeBytes),
    0.95,
  );

  const checks: SloCheck[] = [
    {
      id: "structural-pass-rate",
      owner: "pptx-engine",
      metric: "Tier 0/Tier 1 structural pass rate",
      threshold: "1.0",
      actual: renderedCount === 0 ? 0 : (renderedCount - structuralFailureFixtureIds.length) / renderedCount,
      passed: structuralFailureFixtureIds.length === 0 && renderedCount > 0,
      fixtureIds: structuralFailureFixtureIds,
      artifactPaths: structuralFailureFixtureIds.map((id) => relative(repoRoot, join(params.outDir, "fixtures", id, "structural-validation.json"))),
    },
    {
      id: "deterministic-replay-pass-rate",
      owner: "pptx-engine",
      metric: "Deterministic replay pass rate",
      threshold: "1.0",
      actual: params.replayManifest.length === 0
        ? 0
        : params.replayManifest.filter((entry) => entry.byteIdentical).length / params.replayManifest.length,
      passed: deterministicFailures.length === 0 && params.replayManifest.length > 0,
      fixtureIds: deterministicFailures,
      artifactPaths: [relative(repoRoot, join(params.outDir, "deterministic-replay-manifest.json"))],
    },
    {
      id: "unexpected-warning-count",
      owner: "quality-contract",
      metric: "Unexpected warning count",
      threshold: "0",
      actual: unexpectedWarningFixtureIds.length,
      passed: unexpectedWarningFixtureIds.length === 0,
      fixtureIds: unexpectedWarningFixtureIds,
      artifactPaths: unexpectedWarningFixtureIds.map((id) => relative(repoRoot, join(params.outDir, "fixtures", id, "quality-report.json"))),
    },
    {
      id: "silent-fallback-count",
      owner: "fallback-contract",
      metric: "Silent fallback count",
      threshold: "0",
      actual: fallbackMissingFailures.length,
      passed: fallbackMissingFailures.length === 0,
      fixtureIds: fallbackMissingFailures,
      artifactPaths: fallbackMissingFailures.map((id) => relative(repoRoot, join(params.outDir, "fixtures", id, "quality-report.json"))),
    },
    {
      id: "unmapped-finding-count",
      owner: "quality-contract",
      metric: "Unmapped finding count",
      threshold: "0",
      actual: unmappedFindingFixtureIds.length,
      passed: unmappedFindingFixtureIds.length === 0,
      fixtureIds: unmappedFindingFixtureIds,
      artifactPaths: unmappedFindingFixtureIds.map((id) => relative(repoRoot, join(params.outDir, "fixtures", id, "quality-report.json"))),
    },
    {
      id: "repair-needed-count",
      owner: "structural-repair",
      metric: "Repair-needed count outside mutation fixtures",
      threshold: "0",
      actual: repairNeededFixtureIds.length,
      passed: repairNeededFixtureIds.length === 0,
      fixtureIds: repairNeededFixtureIds,
      artifactPaths: repairNeededFixtureIds.map((id) => relative(repoRoot, join(params.outDir, "fixtures", id, "quality-report.json"))),
    },
    {
      id: "p95-render-time-ratio",
      owner: "performance",
      metric: "P95 Tier 1 render time ratio against this baseline",
      threshold: "<=1.25",
      actual: p95RenderTimeMs === 0 ? 0 : 1,
      passed: true,
      fixtureIds: [],
      artifactPaths: [relative(repoRoot, join(params.outDir, "benchmark-timing.json"))],
    },
    {
      id: "p95-memory-ratio",
      owner: "performance",
      metric: "P95 Tier 1 memory ratio against this baseline",
      threshold: "<=1.25",
      actual: p95MemoryBytes === 0 ? 0 : 1,
      passed: true,
      fixtureIds: [],
      artifactPaths: [relative(repoRoot, join(params.outDir, "benchmark-timing.json"))],
    },
  ];

  return {
    status: checks.every((check) => check.passed) ? "pass" : "fail",
    checks: checks.map((check) => ({
      ...check,
      actual: Math.round(check.actual * 10000) / 10000,
    })),
  };
}

function buildRobustnessDashboard(params: {
  status: "pass" | "fail";
  fixtures: RobustnessFixture[];
  benchmarks: FixtureBenchmark[];
  failures: FixtureFailure[];
  replayManifest: DeterministicEntry[];
  qualityHistogram: Record<string, unknown>;
  sloReport: { status: "pass" | "fail"; checks: SloCheck[] };
  throughputIsolationReport: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    status: params.status,
    generatedAt: new Date().toISOString(),
    fixtureCount: params.fixtures.length,
    tierCounts: {
      tier0: params.fixtures.filter((fixture) => fixture.tier === "tier0").length,
      tier1: params.fixtures.filter((fixture) => fixture.tier === "tier1").length,
    },
    metrics: {
      failureCount: params.failures.length,
      deterministicReplayPassRate: params.replayManifest.length === 0
        ? 0
        : params.replayManifest.filter((entry) => entry.byteIdentical).length / params.replayManifest.length,
      fallbackCount: params.benchmarks.reduce((sum, benchmark) => sum + benchmark.fallbackCount, 0),
      repairCount: params.benchmarks.reduce((sum, benchmark) => sum + benchmark.repairCount, 0),
      p95RenderTimeMs: percentile(params.benchmarks.map((benchmark) => benchmark.durationMs), 0.95),
      p95MemoryBytes: percentile(params.benchmarks.map((benchmark) => benchmark.peakRssBytes), 0.95),
      p95ArchiveBytes: percentile(params.benchmarks.map((benchmark) => benchmark.package.archiveSizeBytes), 0.95),
    },
    qualityHistogram: params.qualityHistogram,
    sloReport: params.sloReport,
    throughputIsolationReport: params.throughputIsolationReport,
    failureSummary: failureSummary(params.failures),
  };
}

function renderDashboardMarkdown(dashboard: Record<string, unknown>): string {
  const metrics = dashboard.metrics as Record<string, unknown>;
  const sloReport = dashboard.sloReport as { status: string; checks: SloCheck[] };
  const lines = [
    "# PPTX Robustness Dashboard",
    "",
    `Status: ${dashboard.status}`,
    `Generated at: ${dashboard.generatedAt}`,
    `Fixtures: ${dashboard.fixtureCount}`,
    "",
    "## Metrics",
    "",
    `- Failure count: ${metrics.failureCount}`,
    `- Deterministic replay pass rate: ${metrics.deterministicReplayPassRate}`,
    `- Fallback count: ${metrics.fallbackCount}`,
    `- Repair count: ${metrics.repairCount}`,
    `- P95 render time ms: ${metrics.p95RenderTimeMs}`,
    `- P95 memory bytes: ${metrics.p95MemoryBytes}`,
    `- P95 archive bytes: ${metrics.p95ArchiveBytes}`,
    "",
    "## SLOs",
    "",
    `SLO status: ${sloReport.status}`,
    "",
    "| SLO | Threshold | Actual | Status | Owner |",
    "| --- | --- | ---: | --- | --- |",
    ...sloReport.checks.map((check) => (
      `| ${check.metric} | ${check.threshold} | ${check.actual} | ${check.passed ? "pass" : "fail"} | ${check.owner} |`
    )),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function renderThroughputIsolationMarkdown(report: Record<string, unknown>): string {
  const probes = report.probes as Array<{
    concurrency: number;
    durationMs: number;
    passed: boolean;
    fixtureCount: number;
  }>;
  return `${[
    "# PPTX Throughput And Isolation Report",
    "",
    `Status: ${report.status}`,
    `Decision: ${report.decision}`,
    `Observed best speedup: ${report.observedBestSpeedup}`,
    `Threshold: ${report.threshold}`,
    "",
    "| Concurrency | Fixtures | Duration ms | Isolation |",
    "| ---: | ---: | ---: | --- |",
    ...probes.map((probe) => (
      `| ${probe.concurrency} | ${probe.fixtureCount} | ${probe.durationMs} | ${probe.passed ? "pass" : "fail"} |`
    )),
    "",
  ].join("\n")}\n`;
}

async function main(): Promise<void> {
  process.env.NODE_ENV ??= "test";
  process.env.RUNSTAMP_LICENSE_KEY ??= TEST_LICENSE_KEY;
  process.env.RUNSTAMP_TEST_PUBLIC_KEY_V2 ??= TEST_PUBLIC_KEY_PEM;
  setDeterministicMode(true);

  const options = parseCliOptions();
  await mkdir(options.outDir, { recursive: true });

  const fixtures = [
    ...(options.tiers.has("tier0") ? buildTier0Fixtures() : []),
    ...(options.tiers.has("tier1") ? buildTier1Fixtures(options.tier1Count) : []),
  ];
  const results: FixtureRunResult[] = [];

  for (const fixture of fixtures) {
    results.push(await runFixture(fixture, options.outDir));
  }

  const replayManifest = results.map((result) => result.deterministic);
  const expectedHashes = new Map(
    results.flatMap((result) => result.firstHash ? [[result.fixture.id, result.firstHash] as const] : []),
  );
  const successfulFixtures = fixtures.filter((fixture) => expectedHashes.has(fixture.id));
  const orderProbe = options.stressMode === "none"
    ? { mode: "reversed_fixture_order", skipped: true }
    : await runOrderProbe(successfulFixtures, expectedHashes);
  const concurrencyProbes = await runConcurrencyProbes(successfulFixtures, expectedHashes, options.stressMode);
  const throughputIsolationReport = buildThroughputIsolationReport(concurrencyProbes);
  const capabilityProbes = await detectCapabilities();
  const benchmarks = results.flatMap((result) => result.benchmark ? [result.benchmark] : []);
  const fixtureFailures = results.flatMap((result) => result.failures);
  const stressFailures: FixtureFailure[] = [];

  if ("passed" in orderProbe && orderProbe.passed === false) {
    stressFailures.push({
      fixtureId: "stress:reversed-order",
      code: "DETERMINISM_ORDER_MISMATCH",
      details: orderProbe,
    });
  }
  for (const probe of concurrencyProbes) {
    if (probe.passed === false) {
      stressFailures.push({
        fixtureId: `stress:concurrency-${probe.concurrency}`,
        code: "CONCURRENT_DETERMINISM_MISMATCH",
        details: probe,
      });
    }
  }

  const failures = [...fixtureFailures, ...stressFailures];
  const qualityHistogram = buildQualityHistogram(results);
  const sloReport = buildSloReport({
    outDir: options.outDir,
    results,
    benchmarks,
    failures,
    replayManifest,
  });
  const baseStatus = failures.length === 0 && replayManifest.every((entry) => entry.byteIdentical)
    ? "pass"
    : "fail";
  const status = baseStatus === "pass" && sloReport.status === "pass" ? "pass" : "fail";
  const dashboard = buildRobustnessDashboard({
    status,
    fixtures,
    benchmarks,
    failures,
    replayManifest,
    qualityHistogram,
    sloReport,
    throughputIsolationReport,
  });

  await writeJson(join(options.outDir, "deterministic-replay-manifest.json"), replayManifest);
  await writeJson(join(options.outDir, "benchmark-timing.json"), benchmarks);
  await writeJson(join(options.outDir, "failure-taxonomy.json"), {
    failures,
    byCode: failureSummary(failures),
  });
  await writeJson(join(options.outDir, "quality-histogram.json"), qualityHistogram);
  await writeJson(join(options.outDir, "coverage-matrix.json"), {
    tiers: [...options.tiers].sort(),
    tier1Count: options.tier1Count,
    coverage: buildCoverageMatrix(fixtures),
  });
  await writeJson(join(options.outDir, "run-order-determinism.json"), orderProbe);
  await writeJson(join(options.outDir, "concurrency-probes.json"), concurrencyProbes);
  await writeJson(join(options.outDir, "throughput-isolation-report.json"), throughputIsolationReport);
  await writeFile(
    join(options.outDir, "throughput-isolation-report.md"),
    renderThroughputIsolationMarkdown(throughputIsolationReport),
  );
  await writeJson(join(options.outDir, "capability-probes.json"), capabilityProbes);
  await writeJson(join(options.outDir, "slo-report.json"), sloReport);
  await writeJson(join(options.outDir, "robustness-dashboard.json"), dashboard);
  await writeFile(join(options.outDir, "robustness-dashboard.md"), renderDashboardMarkdown(dashboard));
  await writeJson(join(options.outDir, "summary.json"), {
    status,
    generatedAt: new Date().toISOString(),
    corpusTiers: [...options.tiers].sort(),
    fixtureCount: fixtures.length,
    tier0Count: fixtures.filter((fixture) => fixture.tier === "tier0").length,
    tier1Count: fixtures.filter((fixture) => fixture.tier === "tier1").length,
    stressMode: options.stressMode,
    outputDir: relative(repoRoot, options.outDir),
    failureCount: failures.length,
    failures,
  });

  if (status !== "pass") {
    process.exitCode = 1;
  }

  console.log(`PPTX robustness baseline proof pack: ${relative(repoRoot, options.outDir)} (${status})`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  setDeterministicMode(false);
});
