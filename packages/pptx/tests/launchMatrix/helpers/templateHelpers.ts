/**
 * Reusable AST builder functions for launch matrix template fixtures.
 * Builds PaperDocument-level AST nodes (not AgentDocument).
 */
import type {
  PaperDocument, PaperSlide, PaperNode, PaperView, PaperText,
  PaperTable, PaperChart, PaperImage, PaperConnector, PaperGroup,
  ChartData, ChartSeries, TableData, TableRow, TableCell, TableCellStyle,
  Paragraph, TextRun, SlideBackground, Fill,
} from "../../../src/types/ast.js";

// Re-export convenience types
type Slide = PaperSlide;
type Node = PaperNode;

// ---------------------------------------------------------------------------
// Unit conversion: points → AST pixels
// The AST uses CSS pixels (96 DPI). OOXML uses hundredths-of-a-point.
// Conversion: px * 75 = OOXML sz. So to get N points: px = N * 96/72 = N * 4/3
// ---------------------------------------------------------------------------
export function pt(points: number): number {
  return Math.round(points * (96 / 72));
}

// Slide dimensions — standard widescreen 13.33"×7.5" (1280×720px)
const SLIDE_W = 1280;
const SLIDE_H = 720;

// ---------------------------------------------------------------------------
// Document wrapper
// ---------------------------------------------------------------------------

export function makeDoc(
  slides: Slide[],
  meta?: { title?: string; author?: string },
): PaperDocument {
  return {
    type: "Document",
    meta: { title: meta?.title ?? "Launch Matrix Test", author: meta?.author ?? "Runstamp" },
    slideSize: { width: SLIDE_W, height: SLIDE_H },
    theme: {
      name: "LaunchMatrix",
      colorScheme: {
        dk1: "#1B1B3A", lt1: "#FFFFFF", dk2: "#2D2D5E", lt2: "#F5F5F5",
        accent1: "#003366", accent2: "#0078D4", accent3: "#00B050",
        accent4: "#FFC000", accent5: "#FF6600", accent6: "#C00000",
        hlink: "#0563C1", folHlink: "#954F72",
      },
      fontScheme: { majorLatin: "Arial", minorLatin: "Arial" },
    },
    slides,
  };
}

// ---------------------------------------------------------------------------
// Colors & Backgrounds
// ---------------------------------------------------------------------------

// Brand colors — spec-accurate, not Tailwind
export const MBB_NAVY = "#003366";      // McKinsey primary navy
export const MBB_BLUE = "#0078D4";      // Vivid accent blue
export const MBB_DARK_BG = "#001A33";   // Dark slide backgrounds
export const IB_BLUE = "#003A70";       // Investment banking blue
export const WHITE = "#FFFFFF";
export const OFF_WHITE = "#F5F5F5";     // Standard near-white (not Tailwind)
export const LIGHT_GRAY = "#E0E0E0";    // Standard light gray
export const MID_GRAY = "#888888";      // Standard medium gray
export const DARK_GRAY = "#333333";     // Standard dark gray / body text
export const GREEN = "#00B050";
export const RED = "#C00000";
export const AMBER = "#FFC000";
export const TABLE_ALT_ROW = "#F2F2F2"; // Alternating row background

export const DARK_GRADIENT: SlideBackground = {
  type: "gradient",
  angle: 160,
  stops: [
    { color: "#001A33", position: 0 },
    { color: "#003366", position: 100 },
  ],
};

export const CONTENT_BG: SlideBackground = { type: "solid", color: OFF_WHITE };

// ---------------------------------------------------------------------------
// Placeholder image generator (solid-color PNGs, no external deps)
// ---------------------------------------------------------------------------
import { deflateSync } from "zlib";

function generatePlaceholderPng(width: number, height: number, hexColor: string): string {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  // Raw pixel data: filter byte (0) + RGB for each pixel, per row
  const rawData = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 3);
    rawData[rowOffset] = 0; // no filter
    for (let x = 0; x < width; x++) {
      const px = rowOffset + 1 + x * 3;
      rawData[px] = r;
      rawData[px + 1] = g;
      rawData[px + 2] = b;
    }
  }

  const compressed = deflateSync(rawData);

  // Build PNG file
  const crc32 = (buf: Buffer): number => {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xEDB88320 : 0);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  };

  const makeChunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeAndData = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData));
    return Buffer.concat([len, typeAndData, crc]);
  };

  // IHDR: width, height, bit depth 8, color type 2 (RGB)
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type RGB
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = makeChunk("IHDR", ihdrData);
  const idat = makeChunk("IDAT", compressed);
  const iend = makeChunk("IEND", Buffer.alloc(0));

  const png = Buffer.concat([signature, ihdr, idat, iend]);
  return `data:image/png;base64,${png.toString("base64")}`;
}

// Pre-generated placeholder images at proper sizes
export const RED_PIXEL = generatePlaceholderPng(1, 1, "#FF0000");
export const BLUE_PIXEL = generatePlaceholderPng(1, 1, "#0000FF");

// Properly-sized placeholders for different content types
export const LOGO_PLACEHOLDER = generatePlaceholderPng(400, 100, "#E0E0E0");
export const PHOTO_PLACEHOLDER = generatePlaceholderPng(200, 200, "#C0C0C0");
export const SCREENSHOT_PLACEHOLDER = generatePlaceholderPng(800, 450, "#D0D0D0");
export const ICON_PLACEHOLDER = generatePlaceholderPng(64, 64, "#B0B0B0");
export const BADGE_PLACEHOLDER = generatePlaceholderPng(300, 300, "#D0D0D0");

// ---------------------------------------------------------------------------
// Basic shapes & text
// ---------------------------------------------------------------------------

export function accentBar(color: string, y = 0, height = 5): Node {
  return {
    type: "View",
    style: { position: "absolute", top: y, left: 0, width: SLIDE_W, height, backgroundColor: color },
  } as PaperView;
}

export function textNode(content: string, style: Record<string, any>): Node {
  return {
    type: "Text",
    style: { fontFamily: "Arial", ...style },
    content,
  } as PaperText;
}

export function richText(paragraphs: Paragraph[], style: Record<string, any>): Node {
  return {
    type: "Text",
    style: { fontFamily: "Arial", ...style },
    paragraphs,
  } as PaperText;
}

// ---------------------------------------------------------------------------
// MBB-style title slides
// ---------------------------------------------------------------------------

export function mbbTitleSlide(
  title: string, subtitle: string,
  opts?: { bg?: SlideBackground; accentColor?: string; titleColor?: string; subtitleColor?: string },
): Slide {
  const accent = opts?.accentColor ?? MBB_BLUE;
  return {
    type: "Slide",
    background: opts?.bg ?? DARK_GRADIENT,
    children: [
      accentBar(accent),
      textNode(title, {
        position: "absolute", top: 220, left: 80, width: 1120,
        fontSize: pt(36), fontWeight: "bold", color: opts?.titleColor ?? WHITE,
      }),
      textNode(subtitle, {
        position: "absolute", top: 310, left: 80, width: 900,
        fontSize: pt(16), color: opts?.subtitleColor ?? MID_GRAY,
      }),
    ],
  };
}

// ---------------------------------------------------------------------------
// Section divider
// ---------------------------------------------------------------------------

export function sectionDivider(
  number: string, title: string, bgColor?: string,
  opts?: { textColor?: string },
): Slide {
  const textColor = opts?.textColor ?? WHITE;
  const bg = bgColor ?? MBB_NAVY; // Consistent navy for all section dividers
  return {
    type: "Slide",
    background: { type: "solid", color: bg },
    headerFooter: { slideNumber: true },
    children: [
      textNode(number, {
        position: "absolute", top: 240, left: 100,
        fontSize: pt(16), fontWeight: "bold", color: textColor, letterSpacing: 3,
      }),
      textNode(title, {
        position: "absolute", top: 290, left: 100, width: 900,
        fontSize: pt(36), fontWeight: "bold", color: textColor,
      }),
      // Accent line
      {
        type: "View",
        style: {
          position: "absolute", top: 370, left: 100,
          width: 80, height: 4, backgroundColor: WHITE,
        },
      } as PaperView,
    ],
  };
}

// ---------------------------------------------------------------------------
// Action title (MBB-style insight statement)
// ---------------------------------------------------------------------------

export function actionTitle(text: string, opts?: { color?: string; fontSize?: number }): Node {
  return textNode(text, {
    position: "absolute", top: 25, left: 55, width: 1170, height: 65,
    fontSize: opts?.fontSize ?? pt(18), fontWeight: "bold",
    color: opts?.color ?? MBB_NAVY,
  });
}

// ---------------------------------------------------------------------------
// Source footer
// ---------------------------------------------------------------------------

export function sourceFooter(text: string): Node {
  return textNode(text, {
    position: "absolute", bottom: 15, left: 55,
    fontSize: pt(7), color: MID_GRAY,
  });
}

// ---------------------------------------------------------------------------
// KPI tile & grid
// ---------------------------------------------------------------------------

export function kpiTile(
  label: string, value: string, trend?: string,
  opts?: { width?: number; height?: number; valueColor?: string; trendColor?: string },
): Node {
  const children: Node[] = [
    textNode(value, {
      fontSize: pt(28), fontWeight: "bold", color: opts?.valueColor ?? MBB_NAVY,
      textAlign: "center",
    }),
    textNode(label, {
      fontSize: pt(11), color: DARK_GRAY, textAlign: "center", marginTop: 6,
    }),
  ];
  if (trend) {
    children.push(textNode(trend, {
      fontSize: pt(11), fontWeight: "bold", textAlign: "center", marginTop: 3,
      color: opts?.trendColor ?? GREEN,
    }));
  }
  return {
    type: "View",
    shapeType: "roundRect",
    style: {
      width: opts?.width ?? 260,
      height: opts?.height ?? 130,
      backgroundColor: WHITE,
      borderWidth: 1, borderColor: LIGHT_GRAY,
      padding: 16,
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      effects: { dropShadow: { color: "#000000", offsetX: 0, offsetY: 2, blurRadius: 6, opacity: 0.05 } },
    },
    children,
  } as PaperView;
}

export function kpiGrid(tiles: Node[], columns: number): Node {
  return {
    type: "View",
    style: {
      position: "absolute", top: 105, left: 55, width: 1170,
      flexDirection: "row", flexWrap: "wrap", gap: 20,
    },
    children: tiles,
  } as PaperView;
}

// ---------------------------------------------------------------------------
// Financial / data table
// ---------------------------------------------------------------------------

export function financialTable(
  headers: string[], rows: (string | number)[][],
  opts?: {
    columnWidths?: number[];
    headerStyle?: TableCellStyle;
    alternatingRows?: boolean;
    mergedHeaderGroups?: { text: string; colSpan: number }[];
    style?: Record<string, any>;
  },
): Node {
  const numCols = headers.length;
  const defaultColWidth = Math.floor(1170 / numCols);
  const colWidths = opts?.columnWidths ?? headers.map(() => defaultColWidth);

  const headerCellStyle: TableCellStyle = opts?.headerStyle ?? {
    fill: MBB_NAVY, color: WHITE, fontWeight: "bold", fontSize: pt(9),
    textAlign: "center", padding: 6,
    borders: { bottom: { width: 2, color: MBB_BLUE } },
  };

  const tableRows: TableRow[] = [];

  // Optional merged header row (with hMerge ghost cells for validation)
  if (opts?.mergedHeaderGroups) {
    const mergedCells: TableCell[] = [];
    for (const g of opts.mergedHeaderGroups) {
      mergedCells.push({
        text: g.text,
        colSpan: g.colSpan > 1 ? g.colSpan : undefined,
        style: { ...headerCellStyle, textAlign: "center" as const },
      });
      // Add ghost cells for horizontal merge continuation
      for (let i = 1; i < g.colSpan; i++) {
        mergedCells.push({ text: "", hMerge: true });
      }
    }
    tableRows.push({ height: 32, cells: mergedCells });
  }

  // Header row
  tableRows.push({
    height: 32,
    cells: headers.map((h, i) => ({
      text: h,
      style: { ...headerCellStyle, textAlign: i === 0 ? "left" as const : "right" as const },
    })),
  });

  // Data rows
  rows.forEach((row, ri) => {
    const bgColor = opts?.alternatingRows && ri % 2 === 1 ? TABLE_ALT_ROW : WHITE;
    tableRows.push({
      height: 28,
      cells: row.map((val, ci) => ({
        text: String(val),
        style: {
          fill: bgColor,
          fontSize: pt(9),
          textAlign: ci === 0 ? "left" as const : "right" as const,
          padding: 5,
          borders: { bottom: { width: 0.5, color: LIGHT_GRAY } },
        },
      })),
    });
  });

  return {
    type: "Table",
    style: {
      position: "absolute", top: 105, left: 55,
      width: colWidths.reduce((a, b) => a + b, 0),
      ...opts?.style,
    },
    tableData: { columns: colWidths, rows: tableRows, style: { bandRow: opts?.alternatingRows } },
  } as PaperTable;
}

// ---------------------------------------------------------------------------
// Football field chart (horizontal stacked bar approximation)
// ---------------------------------------------------------------------------

export function footballFieldChart(
  ranges: { label: string; low: number; high: number; color: string }[],
  opts?: { style?: Record<string, any>; currentPrice?: number; currentPriceLabel?: string },
): Node {
  const maxVal = Math.max(...ranges.map(r => r.high));
  const chartTop = opts?.style?.top ?? 105;
  const chartLeft = opts?.style?.left ?? 55;
  const chartWidth = opts?.style?.width ?? 1170;
  const chartHeight = opts?.style?.height ?? 460;

  const chart: PaperChart = {
    type: "Chart",
    style: {
      position: "absolute", top: chartTop, left: chartLeft, width: chartWidth, height: chartHeight,
      ...opts?.style,
    },
    chartData: {
      chartType: "bar",
      barDirection: "bar",
      barGrouping: "stacked",
      categories: ranges.map(r => r.label),
      series: [
        // Invisible spacer (low bound) — white fill (matches chart background)
        {
          name: "Low",
          values: ranges.map(r => r.low),
          color: "#FFFFFF",
          dataLabels: { showVal: false },
        },
        // Colored range
        {
          name: "Range",
          values: ranges.map(r => r.high - r.low),
          pointColors: ranges.map(r => r.color),
          dataLabels: { showVal: true, position: "ctr", fontSize: pt(9) },
        },
      ],
      valueAxis: { max: maxVal * 1.1, numberFormat: "$#,##0" },
      legend: { position: "none" },
    },
  };

  if (!opts?.currentPrice) return chart;

  // Add price line overlay as a shape positioned proportionally within chart area
  // Chart plot area is approximately 85% of chart width (label area takes ~15%)
  const plotLeft = chartLeft + chartWidth * 0.15;
  const plotWidth = chartWidth * 0.85;
  const axisMax = maxVal * 1.1;
  const lineX = plotLeft + (opts.currentPrice / axisMax) * plotWidth;
  const label = opts.currentPriceLabel ?? `$${opts.currentPrice.toLocaleString()}`;

  const children: Node[] = [
    chart,
    // Vertical dashed price line
    {
      type: "View",
      style: {
        position: "absolute",
        top: chartTop + 10,
        left: Math.round(lineX),
        width: 2,
        height: chartHeight - 40,
        backgroundColor: "#C00000",
      },
    } as PaperView,
    // Price label
    textNode(label, {
      position: "absolute",
      top: chartTop + chartHeight - 25,
      left: Math.round(lineX) - 40,
      width: 80,
      fontSize: pt(8),
      fontWeight: "bold",
      color: "#C00000",
      textAlign: "center",
    }),
  ];

  return {
    type: "Group",
    style: { position: "absolute", top: 0, left: 0, width: SLIDE_W, height: SLIDE_H },
    children,
  } as PaperGroup;
}

// ---------------------------------------------------------------------------
// Gantt timeline (shape-based)
// ---------------------------------------------------------------------------

export function ganttTimeline(
  tasks: { name: string; start: number; duration: number; color: string }[],
  opts?: { top?: number; left?: number; width?: number; rowHeight?: number },
): Node {
  const top = opts?.top ?? 130;
  const left = opts?.left ?? 55;
  const width = opts?.width ?? 1170;
  const rowH = opts?.rowHeight ?? 38;
  const maxEnd = Math.max(...tasks.map(t => t.start + t.duration));

  const children: Node[] = tasks.map((task, i) => {
    const barLeft = (task.start / maxEnd) * (width - 190);
    const barWidth = (task.duration / maxEnd) * (width - 190);
    return {
      type: "View",
      style: {
        position: "absolute",
        top: i * (rowH + 4),
        left: 0,
        width,
        height: rowH,
        flexDirection: "row",
        alignItems: "center",
      },
      children: [
        // Label
        textNode(task.name, {
          width: 180, fontSize: pt(9), color: MBB_NAVY,
        }),
        // Bar
        {
          type: "View",
          style: {
            position: "absolute",
            left: 190 + barLeft,
            top: 4,
            width: Math.max(barWidth, 10),
            height: rowH - 8,
            backgroundColor: task.color,
            borderRadius: 3,
          },
        } as PaperView,
      ],
    } as PaperView;
  });

  return {
    type: "View",
    style: { position: "absolute", top, left, width, height: tasks.length * (rowH + 4) },
    children,
  } as PaperView;
}

// ---------------------------------------------------------------------------
// Harvey balls (Unicode)
// ---------------------------------------------------------------------------

const HARVEY_CHARS = ["○", "◔", "◑", "◕", "●"] as const;

export function harveyBall(level: 0 | 1 | 2 | 3 | 4): string {
  return HARVEY_CHARS[level];
}

// ---------------------------------------------------------------------------
// Compliance row helper (for table cells with status icons)
// ---------------------------------------------------------------------------

export function complianceRow(
  req: string, status: "full" | "partial" | "none", description: string,
): TableCell[] {
  const icon = status === "full" ? "✓" : status === "partial" ? "◐" : "✗";
  const iconColor = status === "full" ? GREEN : status === "partial" ? AMBER : RED;
  return [
    { text: req, style: { fontSize: pt(9), padding: 5 } },
    { text: icon, style: { fontSize: pt(14), color: iconColor, textAlign: "center", padding: 5 } },
    { text: description, style: { fontSize: pt(9), padding: 5 } },
  ];
}

// ---------------------------------------------------------------------------
// Photo / logo grid
// ---------------------------------------------------------------------------

export function photoGrid(images: string[], cols: number, opts?: { top?: number; left?: number; width?: number; height?: number; gap?: number }): Node {
  const top = opts?.top ?? 130;
  const left = opts?.left ?? 55;
  const totalW = opts?.width ?? 1170;
  const gap = opts?.gap ?? 8;
  const imgW = (totalW - (cols - 1) * gap) / cols;
  const imgH = opts?.height ? (opts.height - Math.ceil(images.length / cols) * gap) / Math.ceil(images.length / cols) : imgW * 0.75;

  const children: Node[] = images.map((src, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      type: "Image",
      src,
      style: {
        position: "absolute",
        left: col * (imgW + gap),
        top: row * (imgH + gap),
        width: imgW,
        height: imgH,
      },
    } as PaperImage;
  });

  return {
    type: "Group",
    style: { position: "absolute", top, left, width: totalW, height: Math.ceil(images.length / cols) * (imgH + gap) },
    children,
  } as PaperGroup;
}

// ---------------------------------------------------------------------------
// Gauge chart (doughnut approximation)
// ---------------------------------------------------------------------------

export function gaugeChart(
  value: number, max: number, label: string,
  opts?: { color?: string; style?: Record<string, any> },
): Node {
  const filled = Math.min(value, max);
  const empty = max - filled;
  return {
    type: "Chart",
    style: {
      position: "absolute", top: 105, left: 55, width: 400, height: 330,
      ...opts?.style,
    },
    chartData: {
      chartType: "doughnut",
      holeSize: 70,
      firstSliceAng: 270,
      categories: [label, "Remaining"],
      series: [{
        name: label,
        values: [filled, empty],
        pointColors: [opts?.color ?? MBB_BLUE, "#E5E7EB"],
      }],
      legend: { position: "none" },
      dataLabels: { showVal: false },
    },
  } as PaperChart;
}

// ---------------------------------------------------------------------------
// Bullet list helper (multi-level)
// ---------------------------------------------------------------------------

export function bulletList(
  items: { text: string; level?: number }[],
  style: Record<string, any>,
): Node {
  return {
    type: "Text",
    style: { fontFamily: "Arial", ...style },
    paragraphs: items.map((item, i) => ({
      runs: [{ text: item.text, style: { fontSize: style.fontSize ?? pt(11) } }],
      bullet: { char: item.level && item.level > 0 ? "–" : "•" },
      level: item.level ?? 0,
      spaceBefore: i === 0 ? 0 : 6,
    })),
  } as PaperText;
}

// ---------------------------------------------------------------------------
// Card container
// ---------------------------------------------------------------------------

export function card(children: Node[], opts?: {
  width?: number; height?: number; bg?: string; padding?: number;
  style?: Record<string, any>;
}): Node {
  return {
    type: "View",
    shapeType: "roundRect",
    style: {
      flexDirection: "column",
      padding: opts?.padding ?? 16,
      backgroundColor: opts?.bg ?? WHITE,
      borderWidth: 1,
      borderColor: LIGHT_GRAY,
      width: opts?.width,
      height: opts?.height,
      effects: { dropShadow: { color: "#000000", offsetX: 0, offsetY: 2, blurRadius: 6, opacity: 0.05 } },
      ...opts?.style,
    },
    children,
  } as PaperView;
}

// ---------------------------------------------------------------------------
// Connector helper
// ---------------------------------------------------------------------------

export function connector(
  x1: number, y1: number, x2: number, y2: number,
  opts?: { color?: string; width?: number; arrowEnd?: boolean },
): Node {
  return {
    type: "Connector",
    connectorType: "straight",
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    lineColor: opts?.color ?? MBB_NAVY,
    lineWidth: opts?.width ?? 1,
    arrowEnd: opts?.arrowEnd ?? false,
  } as PaperConnector;
}

// ---------------------------------------------------------------------------
// Content slide builder (action title + body + source)
// ---------------------------------------------------------------------------

export function contentSlide(
  title: string, body: Node[], source?: string,
  opts?: { bg?: SlideBackground; notes?: string },
): Slide {
  const children: Node[] = [
    accentBar(MBB_BLUE),
    actionTitle(title),
    ...body,
  ];
  if (source) children.push(sourceFooter(source));
  const slide: Slide = {
    type: "Slide",
    background: opts?.bg ?? CONTENT_BG,
    headerFooter: { slideNumber: true },
    children,
  };
  if (opts?.notes) (slide as any).notes = opts.notes;
  return slide;
}
