import JSZip from "jszip";

export type ChartFamily = "classic" | "chartex" | "unknown";
export type ChartEditabilitySupport = "supported" | "unsupported";

export interface ChartInventoryItem {
  slideIndex: number;
  chartPart: string;
  family: ChartFamily;
  kind: string;
  embeddedWorkbook: boolean;
  workbookPaths: string[];
  editabilitySupport: ChartEditabilitySupport;
}

export interface ChartInventory {
  hasCharts: boolean;
  totalCount: number;
  supportedCount: number;
  unsupportedCount: number;
  items: ChartInventoryItem[];
}

const CLASSIC_CHART_TAGS: Array<{ tag: string; kind: string }> = [
  { tag: "areaChart", kind: "area" },
  { tag: "barChart", kind: "bar" },
  { tag: "bubbleChart", kind: "bubble" },
  { tag: "doughnutChart", kind: "doughnut" },
  { tag: "lineChart", kind: "line" },
  { tag: "pieChart", kind: "pie" },
  { tag: "radarChart", kind: "radar" },
  { tag: "scatterChart", kind: "scatter" },
  { tag: "stockChart", kind: "stock" },
  { tag: "surfaceChart", kind: "surface" },
];

function normalizeZipPath(basePath: string, target: string): string {
  if (!target) return target;

  const baseParts = basePath.split("/").slice(0, -1);
  const targetParts = target.replace(/^\/+/, "").split("/");
  const parts = target.startsWith("/")
    ? targetParts
    : [...baseParts, ...targetParts];

  const normalized: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      normalized.pop();
      continue;
    }
    normalized.push(part);
  }
  return normalized.join("/");
}

function extractRelationshipTargets(xml: string): string[] {
  const targets: string[] = [];
  const relationshipPattern = /<Relationship\b[^>]*Target="([^"]+)"[^>]*>/g;

  let match: RegExpExecArray | null;
  while ((match = relationshipPattern.exec(xml)) !== null) {
    const target = match[1]?.trim();
    if (target) targets.push(target);
  }

  return targets;
}

function extractChartTargets(relsXml: string): string[] {
  const targets: string[] = [];
  const relationshipPattern =
    /<Relationship\b[^>]*Type="[^"]*\/chart[^"]*"[^>]*Target="([^"]+)"[^>]*>/g;

  let match: RegExpExecArray | null;
  while ((match = relationshipPattern.exec(relsXml)) !== null) {
    const target = match[1]?.trim();
    if (target) targets.push(target);
  }

  return targets;
}

function detectChartKind(xml: string, chartPart: string): { family: ChartFamily; kind: string } {
  if (/<cx:chart\b|<cx:chartData\b/.test(xml) || /chartEx\d+\.xml$/i.test(chartPart)) {
    const layoutId = xml.match(/layoutId="([^"]+)"/)?.[1];
    return {
      family: "chartex",
      kind: layoutId?.trim() || "chartex",
    };
  }

  const classicMatches = CLASSIC_CHART_TAGS
    .filter(({ tag }) => xml.includes(`<c:${tag}`))
    .map(({ kind }) => kind);

  if (classicMatches.length > 1) {
    return { family: "classic", kind: "combo" };
  }
  if (classicMatches.length === 1) {
    return { family: "classic", kind: classicMatches[0] ?? "classic" };
  }

  return { family: "unknown", kind: "unknown" };
}

function toEditabilitySupport(family: ChartFamily): ChartEditabilitySupport {
  return family === "classic" ? "supported" : "unsupported";
}

export async function inspectChartInventory(buffer: Buffer): Promise<ChartInventory> {
  const zip = await JSZip.loadAsync(buffer);
  const files = Object.keys(zip.files).filter((path) => !zip.files[path]?.dir);
  const slideRels = files
    .filter((path) => /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/.test(path))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const items: ChartInventoryItem[] = [];

  for (const relsPath of slideRels) {
    const relsXml = await zip.file(relsPath)?.async("string");
    if (!relsXml) continue;

    const slideIndexMatch = relsPath.match(/slide(\d+)\.xml\.rels$/);
    const slideIndex = slideIndexMatch ? Number(slideIndexMatch[1]) - 1 : items.length;

    for (const target of extractChartTargets(relsXml)) {
      const chartPart = normalizeZipPath(relsPath, target);
      const chartXml = await zip.file(chartPart)?.async("string");
      if (!chartXml) continue;

      const chartRelsPath = `${chartPart.replace(/\.xml$/i, ".xml.rels").replace("/charts/", "/charts/_rels/")}`;
      const chartRelsXml = await zip.file(chartRelsPath)?.async("string");
      const workbookPaths = (chartRelsXml ? extractRelationshipTargets(chartRelsXml) : [])
        .map((workbookTarget) => normalizeZipPath(chartRelsPath, workbookTarget))
        .filter((workbookPath) => workbookPath.endsWith(".xlsx") || workbookPath.includes("/embeddings/"));

      const kind = detectChartKind(chartXml, chartPart);
      items.push({
        slideIndex,
        chartPart,
        family: kind.family,
        kind: kind.kind,
        embeddedWorkbook: workbookPaths.some((workbookPath) => files.includes(workbookPath)),
        workbookPaths,
        editabilitySupport: toEditabilitySupport(kind.family),
      });
    }
  }

  const supportedCount = items.filter((item) => item.editabilitySupport === "supported").length;
  const unsupportedCount = items.length - supportedCount;

  return {
    hasCharts: items.length > 0,
    totalCount: items.length,
    supportedCount,
    unsupportedCount,
    items,
  };
}
