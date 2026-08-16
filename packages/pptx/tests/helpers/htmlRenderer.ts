/**
 * Pure Node.js HTML string renderer — port of SlideRenderer.tsx.
 * No React dependency; generates a standalone HTML page for screenshot comparison.
 */
import * as echarts from "echarts";
import { mapChartDataToEChartsOption } from "../../src/ooxml/chart/rasterizer.js";
import type { ChartData } from "../../src/types/ast.js";

function renderChartSvg(chartData: ChartData, width: number, height: number): string {
  const chart = echarts.init(null, undefined, {
    renderer: "svg",
    ssr: true,
    width,
    height,
  });

  try {
    chart.setOption(mapChartDataToEChartsOption(chartData, undefined, { width, height }));
    return chart.renderToSVGString();
  } finally {
    chart.dispose();
  }
}

// ---------------------------------------------------------------------------
// Escape helper
// ---------------------------------------------------------------------------
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// Style conversion
// ---------------------------------------------------------------------------

function resolveBackground(style: any): string | undefined {
  if (!style) return undefined;
  if (style.fill?.type === "linear" && style.fill.stops) {
    const angle = style.fill.angle ?? 0;
    const stops = style.fill.stops.map((s: any) => `${s.color} ${s.position}%`).join(", ");
    return `linear-gradient(${angle}deg, ${stops})`;
  }
  return style.backgroundColor;
}

function resolveBoxShadow(style: any): string | undefined {
  const ds = style?.effects?.dropShadow;
  if (!ds) return undefined;
  const r = parseInt(ds.color.slice(1, 3), 16);
  const g = parseInt(ds.color.slice(3, 5), 16);
  const b = parseInt(ds.color.slice(5, 7), 16);
  return `${ds.offsetX}px ${ds.offsetY}px ${ds.blurRadius}px rgba(${r},${g},${b},${ds.opacity})`;
}

function styleToCss(style: any): string {
  if (!style) return "";
  const props: string[] = [];

  const set = (prop: string, val: string | number | undefined) => {
    if (val !== undefined && val !== null) {
      props.push(`${prop}:${typeof val === "number" ? val + "px" : val}`);
    }
  };

  if (style.position === "absolute") props.push("position:absolute");
  set("top", style.top);
  set("left", style.left);
  set("right", style.right);
  set("bottom", style.bottom);
  set("width", style.width);
  set("height", style.height);

  props.push("display:flex");
  props.push(`flex-direction:${style.flexDirection ?? "column"}`);
  if (style.justifyContent) props.push(`justify-content:${style.justifyContent}`);
  if (style.alignItems) props.push(`align-items:${style.alignItems}`);
  if (style.gap !== undefined) set("gap", style.gap);
  if (style.flexGrow !== undefined) props.push(`flex-grow:${style.flexGrow}`);
  if (style.flexShrink !== undefined) props.push(`flex-shrink:${style.flexShrink}`);

  if (style.padding !== undefined) set("padding", style.padding);
  if (style.paddingTop !== undefined) set("padding-top", style.paddingTop);
  if (style.paddingBottom !== undefined) set("padding-bottom", style.paddingBottom);
  if (style.paddingLeft !== undefined) set("padding-left", style.paddingLeft);
  if (style.paddingRight !== undefined) set("padding-right", style.paddingRight);

  if (style.margin !== undefined) set("margin", style.margin);
  if (style.marginTop !== undefined) set("margin-top", style.marginTop);
  if (style.marginBottom !== undefined) set("margin-bottom", style.marginBottom);
  if (style.marginLeft !== undefined) set("margin-left", style.marginLeft);
  if (style.marginRight !== undefined) set("margin-right", style.marginRight);

  const bg = resolveBackground(style);
  if (bg) {
    if (bg.startsWith("linear-gradient")) {
      props.push(`background:${bg}`);
    } else {
      props.push(`background-color:${bg}`);
    }
  }

  if (style.color) props.push(`color:${style.color}`);
  if (style.fontSize) set("font-size", style.fontSize);
  if (style.fontFamily) props.push(`font-family:${style.fontFamily}`);
  if (style.fontWeight) props.push(`font-weight:${style.fontWeight}`);
  if (style.textAlign) props.push(`text-align:${style.textAlign}`);

  if (style.borderWidth && style.borderColor) {
    props.push(`border:${style.borderWidth}px solid ${style.borderColor}`);
  }
  if (style.borderRadius !== undefined) set("border-radius", style.borderRadius);
  if (style.opacity !== undefined) props.push(`opacity:${style.opacity}`);

  const shadow = resolveBoxShadow(style);
  if (shadow) props.push(`box-shadow:${shadow}`);

  if (style.lineHeight !== undefined) set("line-height", style.lineHeight);

  return props.join(";");
}

// ---------------------------------------------------------------------------
// Text content rendering
// ---------------------------------------------------------------------------

function renderTextContent(content: any, paragraphs: any[] | undefined, style: any): string {
  if (paragraphs && paragraphs.length > 0) {
    return paragraphs.map((p: any) => {
      const bullet = p.bullet?.char ? `<span style="margin-right:4px">${esc(p.bullet.char)} </span>` : "";
      const runs = (p.runs || []).map((run: any) => {
        const rs: string[] = [];
        const sz = run.style?.fontSize ?? style?.fontSize;
        const fw = run.style?.fontWeight ?? style?.fontWeight;
        const cl = run.style?.color ?? style?.color;
        const ff = run.style?.fontFamily ?? style?.fontFamily;
        if (sz) rs.push(`font-size:${sz}px`);
        if (fw) rs.push(`font-weight:${fw}`);
        if (cl) rs.push(`color:${cl}`);
        if (ff) rs.push(`font-family:${ff}`);
        return `<span style="${rs.join(";")}">${esc(run.text)}</span>`;
      }).join("");
      return `<div style="margin-top:${p.spaceBefore ?? 0}px">${bullet}${runs}</div>`;
    }).join("");
  }
  if (typeof content === "string") return esc(content);
  if (Array.isArray(content)) {
    return content.map((run: any) => {
      const rs: string[] = [];
      const sz = run.style?.fontSize ?? style?.fontSize;
      const fw = run.style?.fontWeight ?? style?.fontWeight;
      const cl = run.style?.color ?? style?.color;
      const ff = run.style?.fontFamily ?? style?.fontFamily;
      if (sz) rs.push(`font-size:${sz}px`);
      if (fw) rs.push(`font-weight:${fw}`);
      if (cl) rs.push(`color:${cl}`);
      if (ff) rs.push(`font-family:${ff}`);
      return `<span style="${rs.join(";")}">${esc(run.text)}</span>`;
    }).join("");
  }
  return "";
}

// ---------------------------------------------------------------------------
// Node renderer
// ---------------------------------------------------------------------------

function renderNode(node: any): string {
  const style = node.style ?? {};

  switch (node.type) {
    case "Text": {
      const css = styleToCss(style);
      const textCss = css
        .replace("display:flex;", "")
        .replace(/flex-direction:[^;]+;?/, "")
        + ";overflow:hidden;word-wrap:break-word";
      return `<div style="${textCss}">${renderTextContent(node.content, node.paragraphs, style)}</div>`;
    }

    case "View": {
      const hasShapeText = node.textContent || (node.textParagraphs && node.textParagraphs.length > 0);
      const css = styleToCss(style);
      const viewCss = css + (css.includes("position:absolute") ? "" : ";position:relative") + ";overflow:hidden";
      let inner = (node.children || []).map(renderNode).join("");
      if (hasShapeText) {
        const ts = node.textStyle ?? {};
        const tsCss: string[] = [];
        if (ts.fontSize) tsCss.push(`font-size:${ts.fontSize}px`);
        if (ts.fontWeight) tsCss.push(`font-weight:${ts.fontWeight}`);
        if (ts.color) tsCss.push(`color:${ts.color}`);
        if (ts.fontFamily) tsCss.push(`font-family:${ts.fontFamily}`);
        if (ts.textAlign) tsCss.push(`text-align:${ts.textAlign}`);
        inner += `<div style="${tsCss.join(";")}">${renderTextContent(node.textContent, node.textParagraphs, ts)}</div>`;
      }
      return `<div style="${viewCss}">${inner}</div>`;
    }

    case "Table": {
      const td = node.tableData;
      if (!td?.rows) return `<div style="${styleToCss(style)}"></div>`;
      const headerStyle = td.style?.headerRowStyle;
      const bandEvenFill = td.style?.bandRowEvenStyle?.fill;
      const css = styleToCss(style).replace("display:flex", "display:block") + ";overflow:hidden";
      let rows = "";
      for (let ri = 0; ri < td.rows.length; ri++) {
        const row = td.rows[ri];
        const isHeader = ri === 0 && td.style?.headerRowStyle;
        const isEvenBand = td.style?.bandRow && ri > 0 && ri % 2 === 0;
        const rowBg = isHeader ? (headerStyle?.backgroundColor ?? headerStyle?.fill) : isEvenBand ? bandEvenFill : undefined;
        let cells = "";
        for (let ci = 0; ci < (row.cells?.length ?? 0); ci++) {
          const cell = row.cells[ci];
          const tdStyle: string[] = ["padding:4px 6px"];
          const fs = isHeader ? headerStyle?.fontSize : cell.style?.fontSize;
          const fw = isHeader ? headerStyle?.fontWeight : cell.style?.fontWeight;
          const cl = isHeader ? (headerStyle?.color ?? "white") : cell.style?.color;
          const ff = isHeader ? headerStyle?.fontFamily : cell.style?.fontFamily;
          const ta = cell.style?.textAlign ?? (ci === 0 ? "left" : "center");
          if (fs) tdStyle.push(`font-size:${fs}px`);
          if (fw) tdStyle.push(`font-weight:${fw}`);
          if (cl) tdStyle.push(`color:${cl}`);
          if (ff) tdStyle.push(`font-family:${ff}`);
          tdStyle.push(`text-align:${ta}`);
          tdStyle.push("border-bottom:1px solid #E2E8F0");
          if (td.columns?.[ci]) tdStyle.push(`width:${td.columns[ci]}px`);
          const cellContent = cell.text ? esc(cell.text) : (cell.content ? renderTextContent(cell.content, undefined, cell.style) : "");
          cells += `<td style="${tdStyle.join(";")}">${cellContent}</td>`;
        }
        const trStyle = rowBg ? ` style="background-color:${rowBg}"` : "";
        rows += `<tr${trStyle}>${cells}</tr>`;
      }
      return `<div style="${css}"><table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:11px"><tbody>${rows}</tbody></table></div>`;
    }

    case "Chart": {
      const css = styleToCss(style);
      const chartW = typeof style.width === "number" ? style.width : 200;
      const chartH = typeof style.height === "number" ? style.height : 150;
      const svgStr = node.chartData
        ? renderChartSvg(node.chartData as Record<string, unknown>, chartW, chartH)
        : "";
      return `<div style="${css};overflow:hidden">${svgStr}</div>`;
    }

    case "Image": {
      const css = styleToCss(style);
      const imgCss = css + ";align-items:center;justify-content:center;background-color:#F1F5F9;border:1px dashed #CBD5E1;border-radius:4px;color:#94A3B8;font-size:11px;font-family:monospace";
      return `<div style="${imgCss}">[image]</div>`;
    }

    case "Group": {
      const css = styleToCss(style);
      const grpCss = css + (css.includes("position:absolute") ? "" : ";position:relative");
      const inner = (node.children || []).map(renderNode).join("");
      return `<div style="${grpCss}">${inner}</div>`;
    }

    default:
      return `<div style="${styleToCss(style)}"></div>`;
  }
}

// ---------------------------------------------------------------------------
// Slide background
// ---------------------------------------------------------------------------

function resolveSlideBackground(bg: any): string {
  if (!bg) return "background-color:#FFFFFF";
  if (bg.type === "solid" && bg.color) return `background-color:${bg.color}`;
  if (bg.type === "gradient" && bg.stops) {
    const angle = bg.angle ?? 0;
    const stops = bg.stops.map((s: any) => `${s.color} ${s.position}%`).join(", ");
    return `background:linear-gradient(${angle}deg, ${stops})`;
  }
  return "background-color:#FFFFFF";
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Renders a PaperSlide AST node to a standalone HTML page string.
 * The viewport is 960x540, matching the slide dimensions.
 */
export function renderSlideToHtml(slide: any, width = 960, height = 540): string {
  const bgCss = resolveSlideBackground(slide.background);
  const children = (slide.children || []).map(renderNode).join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
* { margin:0; padding:0; box-sizing:border-box; }
</style></head>
<body style="margin:0;padding:0">
<div style="position:relative;width:${width}px;height:${height}px;overflow:hidden;${bgCss};font-family:Arial,sans-serif">
${children}
</div>
</body></html>`;
}
