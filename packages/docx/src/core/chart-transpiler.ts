/**
 * Native Office Chart Transpiler
 * ===============================
 * Converts chart data to Office Open XML Chart format with embedded Excel.
 *
 * Phase 12 of Polyglot hardening.
 *
 * This is "the hardest engineering challenge but the biggest moat" (PRD-014).
 *
 * The key insight: Office charts are NOT just shapes with data.
 * They are linked to an embedded Excel spreadsheet inside the PPTX/DOCX file.
 * When you right-click "Edit Data" in PowerPoint, it opens that embedded Excel.
 *
 * Structure inside PPTX:
 * ```
 * [Content_Types].xml
 * ppt/
 *   slides/
 *     slide1.xml          <- Contains <c:chart r:id="rId2"/>
 *   charts/
 *     chart1.xml          <- The chart definition (<c:chartSpace>)
 *   embeddings/
 *     Microsoft_Excel_Worksheet1.xlsx  <- The embedded data source
 *   _rels/
 *     slide1.xml.rels     <- Links slide to chart
 *   charts/_rels/
 *     chart1.xml.rels     <- Links chart to Excel embedding
 * ```
 */

import JSZip from 'jszip';
import { escapeXml } from '../utils/xml.js';

// =============================================================================
// TYPES
// =============================================================================

/** Supported chart types */
export type ChartType = 'bar' | 'column' | 'line' | 'pie' | 'area' | 'scatter' | 'doughnut';

/** A single data point */
export interface DataPoint {
  /** Category label (x-axis) */
  category: string;
  /** Numeric value (y-axis) */
  value: number;
}

/** A data series */
export interface DataSeries {
  /** Series name (appears in legend) */
  name: string;
  /** Data points in this series */
  data: DataPoint[];
  /** Optional color (hex without #) */
  color?: string;
}

/** Chart configuration */
export interface ChartConfig {
  /** Chart type */
  type: ChartType;
  /** Chart title */
  title?: string;
  /** Data series */
  series: DataSeries[];
  /** X-axis configuration */
  xAxis?: {
    title?: string;
    categories?: string[];
  };
  /** Y-axis configuration */
  yAxis?: {
    title?: string;
    min?: number;
    max?: number;
  };
  /** Show legend */
  showLegend?: boolean;
  /** Legend position */
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  /** Show data labels */
  showDataLabels?: boolean;
  /** Chart width in EMUs (English Metric Units) */
  width?: number;
  /** Chart height in EMUs */
  height?: number;
}

/** Result of chart transpilation */
export interface ChartTranspileResult {
  /** The chart XML content (chart1.xml) */
  chartXml: string;
  /** The embedded Excel file as base64 */
  excelData: string;
  /** Relationship ID for the chart */
  chartRelId: string;
  /** Relationship ID for the Excel embedding */
  excelRelId: string;
  /** Content type entries needed */
  contentTypes: Array<{ partName: string; contentType: string }>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** EMUs per inch */
const EMU_PER_INCH = 914400;

/** Default chart dimensions */
const DEFAULT_WIDTH = 6 * EMU_PER_INCH;  // 6 inches
const DEFAULT_HEIGHT = 4 * EMU_PER_INCH; // 4 inches

/** Office Open XML namespaces */
const NS = {
  a: 'http://schemas.openxmlformats.org/drawingml/2006/main',
  c: 'http://schemas.openxmlformats.org/drawingml/2006/chart',
  r: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
};

/** Default colors for chart series (Office theme colors) */
const DEFAULT_COLORS = [
  '4472C4', // Blue
  'ED7D31', // Orange
  'A5A5A5', // Gray
  'FFC000', // Gold
  '5B9BD5', // Light Blue
  '70AD47', // Green
  '264478', // Dark Blue
  '9E480E', // Dark Orange
  '636363', // Dark Gray
  '997300', // Dark Gold
];

// =============================================================================
// EXCEL WORKBOOK GENERATOR
// =============================================================================

/**
 * Generate a minimal Excel workbook containing chart data.
 * This is what PowerPoint opens when you click "Edit Data".
 */
async function generateExcelWorkbook(config: ChartConfig): Promise<string> {
  const zip = new JSZip();

  // Extract categories and build data grid
  const categories = config.xAxis?.categories ||
    (config.series[0]?.data.map(d => d.category) || []);
  const seriesNames = config.series.map(s => s.name);

  // [Content_Types].xml
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`);

  // _rels/.rels
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`);

  // xl/_rels/workbook.xml.rels
  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`);

  // xl/workbook.xml
  zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`);

  // Build shared strings (categories + series names)
  const sharedStrings: string[] = ['', ...seriesNames, ...categories];
  const stringToIndex = new Map<string, number>();
  sharedStrings.forEach((s, i) => stringToIndex.set(s, i));

  zip.file('xl/sharedStrings.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStrings.length}" uniqueCount="${sharedStrings.length}">
${sharedStrings.map(s => `  <si><t>${escapeXml(s)}</t></si>`).join('\n')}
</sst>`);

  // Build worksheet with data
  // Row 1: empty, Series1, Series2, ...
  // Row 2+: Category, Value1, Value2, ...
  const rows: string[] = [];

  // Header row
  const headerCells = ['<c r="A1" t="s"><v>0</v></c>']; // Empty cell
  seriesNames.forEach((name, i) => {
    const col = String.fromCharCode(66 + i); // B, C, D, ...
    const idx = stringToIndex.get(name) || 0;
    headerCells.push(`<c r="${col}1" t="s"><v>${idx}</v></c>`);
  });
  rows.push(`<row r="1">${headerCells.join('')}</row>`);

  // Data rows
  categories.forEach((cat, rowIdx) => {
    const rowNum = rowIdx + 2;
    const cells: string[] = [];

    // Category in column A
    const catIdx = stringToIndex.get(cat) || 0;
    cells.push(`<c r="A${rowNum}" t="s"><v>${catIdx}</v></c>`);

    // Values in columns B, C, D, ...
    config.series.forEach((series, seriesIdx) => {
      const col = String.fromCharCode(66 + seriesIdx);
      const dataPoint = series.data.find(d => d.category === cat);
      const value = dataPoint?.value ?? 0;
      cells.push(`<c r="${col}${rowNum}"><v>${value}</v></c>`);
    });

    rows.push(`<row r="${rowNum}">${cells.join('')}</row>`);
  });

  zip.file('xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
${rows.join('\n')}
  </sheetData>
</worksheet>`);

  // Generate the xlsx as base64
  const blob = await zip.generateAsync({ type: 'base64' });
  return blob;
}

// =============================================================================
// CHART XML GENERATOR
// =============================================================================

/**
 * Generate the chart XML (chart1.xml) that defines the chart structure.
 */
function generateChartXml(config: ChartConfig, excelRelId: string): string {
  const categories = config.xAxis?.categories ||
    (config.series[0]?.data.map(d => d.category) || []);
  const numCategories = categories.length;

  // Build series XML
  const seriesXml = config.series.map((series, idx) => {
    const color = series.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
    const colLetter = String.fromCharCode(66 + idx); // B, C, D, ...

    return `
      <c:ser>
        <c:idx val="${idx}"/>
        <c:order val="${idx}"/>
        <c:tx>
          <c:strRef>
            <c:f>Sheet1!$${colLetter}$1</c:f>
            <c:strCache>
              <c:ptCount val="1"/>
              <c:pt idx="0"><c:v>${escapeXml(series.name)}</c:v></c:pt>
            </c:strCache>
          </c:strRef>
        </c:tx>
        <c:spPr>
          <a:solidFill>
            <a:srgbClr val="${color}"/>
          </a:solidFill>
        </c:spPr>
        ${config.showDataLabels ? '<c:dLbls><c:showVal val="1"/></c:dLbls>' : ''}
        <c:cat>
          <c:strRef>
            <c:f>Sheet1!$A$2:$A$${numCategories + 1}</c:f>
            <c:strCache>
              <c:ptCount val="${numCategories}"/>
              ${categories.map((cat, i) => `<c:pt idx="${i}"><c:v>${escapeXml(cat)}</c:v></c:pt>`).join('\n              ')}
            </c:strCache>
          </c:strRef>
        </c:cat>
        <c:val>
          <c:numRef>
            <c:f>Sheet1!$${colLetter}$2:$${colLetter}$${numCategories + 1}</c:f>
            <c:numCache>
              <c:formatCode>General</c:formatCode>
              <c:ptCount val="${numCategories}"/>
              ${series.data.map((d, i) => `<c:pt idx="${i}"><c:v>${d.value}</c:v></c:pt>`).join('\n              ')}
            </c:numCache>
          </c:numRef>
        </c:val>
      </c:ser>`;
  }).join('\n');

  // Chart type element
  const chartTypeElement = getChartTypeElement(config.type, seriesXml);

  // Legend
  const legendXml = config.showLegend !== false ? `
    <c:legend>
      <c:legendPos val="${getLegendPosition(config.legendPosition)}"/>
      <c:overlay val="0"/>
    </c:legend>` : '';

  // Title
  const titleXml = config.title ? `
    <c:title>
      <c:tx>
        <c:rich>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:pPr>
              <a:defRPr sz="1400" b="1"/>
            </a:pPr>
            <a:r>
              <a:rPr lang="en-US"/>
              <a:t>${escapeXml(config.title)}</a:t>
            </a:r>
          </a:p>
        </c:rich>
      </c:tx>
      <c:overlay val="0"/>
    </c:title>` : '<c:autoTitleDeleted val="1"/>';

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="${NS.c}" xmlns:a="${NS.a}" xmlns:r="${NS.r}">
  <c:date1904 val="0"/>
  <c:lang val="en-US"/>
  <c:roundedCorners val="0"/>
  <c:chart>
    ${titleXml}
    <c:plotArea>
      <c:layout/>
      ${chartTypeElement}
      <c:catAx>
        <c:axId val="100"/>
        <c:scaling><c:orientation val="minMax"/></c:scaling>
        <c:delete val="0"/>
        <c:axPos val="b"/>
        <c:majorTickMark val="out"/>
        <c:minorTickMark val="none"/>
        <c:tickLblPos val="nextTo"/>
        <c:crossAx val="101"/>
        <c:crosses val="autoZero"/>
        <c:auto val="1"/>
        <c:lblAlgn val="ctr"/>
        <c:lblOffset val="100"/>
        <c:noMultiLvlLbl val="0"/>
      </c:catAx>
      <c:valAx>
        <c:axId val="101"/>
        <c:scaling><c:orientation val="minMax"/></c:scaling>
        <c:delete val="0"/>
        <c:axPos val="l"/>
        <c:majorGridlines/>
        <c:numFmt formatCode="General" sourceLinked="1"/>
        <c:majorTickMark val="out"/>
        <c:minorTickMark val="none"/>
        <c:tickLblPos val="nextTo"/>
        <c:crossAx val="100"/>
        <c:crosses val="autoZero"/>
        <c:crossBetween val="between"/>
      </c:valAx>
    </c:plotArea>
    ${legendXml}
    <c:plotVisOnly val="1"/>
    <c:dispBlanksAs val="gap"/>
    <c:showDLblsOverMax val="0"/>
  </c:chart>
  <c:externalData r:id="${excelRelId}">
    <c:autoUpdate val="0"/>
  </c:externalData>
</c:chartSpace>`;
}

/**
 * Get the chart type element XML based on chart type
 */
function getChartTypeElement(type: ChartType, seriesXml: string): string {
  switch (type) {
    case 'bar':
      return `
      <c:barChart>
        <c:barDir val="bar"/>
        <c:grouping val="clustered"/>
        <c:varyColors val="0"/>
        ${seriesXml}
        <c:gapWidth val="150"/>
        <c:axId val="100"/>
        <c:axId val="101"/>
      </c:barChart>`;

    case 'column':
      return `
      <c:barChart>
        <c:barDir val="col"/>
        <c:grouping val="clustered"/>
        <c:varyColors val="0"/>
        ${seriesXml}
        <c:gapWidth val="150"/>
        <c:axId val="100"/>
        <c:axId val="101"/>
      </c:barChart>`;

    case 'line':
      return `
      <c:lineChart>
        <c:grouping val="standard"/>
        <c:varyColors val="0"/>
        ${seriesXml}
        <c:marker val="1"/>
        <c:axId val="100"/>
        <c:axId val="101"/>
      </c:lineChart>`;

    case 'pie':
      return `
      <c:pieChart>
        <c:varyColors val="1"/>
        ${seriesXml}
        <c:firstSliceAng val="0"/>
      </c:pieChart>`;

    case 'doughnut':
      return `
      <c:doughnutChart>
        <c:varyColors val="1"/>
        ${seriesXml}
        <c:firstSliceAng val="0"/>
        <c:holeSize val="50"/>
      </c:doughnutChart>`;

    case 'area':
      return `
      <c:areaChart>
        <c:grouping val="standard"/>
        <c:varyColors val="0"/>
        ${seriesXml}
        <c:axId val="100"/>
        <c:axId val="101"/>
      </c:areaChart>`;

    case 'scatter':
      return `
      <c:scatterChart>
        <c:scatterStyle val="lineMarker"/>
        <c:varyColors val="0"/>
        ${seriesXml}
        <c:axId val="100"/>
        <c:axId val="101"/>
      </c:scatterChart>`;

    default:
      return getChartTypeElement('column', seriesXml);
  }
}

/**
 * Get legend position value
 */
function getLegendPosition(pos?: string): string {
  switch (pos) {
    case 'top': return 't';
    case 'bottom': return 'b';
    case 'left': return 'l';
    case 'right': return 'r';
    default: return 'r';
  }
}

// =============================================================================
// MAIN TRANSPILER
// =============================================================================

/**
 * Transpile chart data to Office Open XML format.
 *
 * This is the core function that converts a chart configuration into:
 * 1. A chart XML file (chart1.xml)
 * 2. An embedded Excel workbook with the data
 *
 * @param config Chart configuration
 * @param chartIndex Index for naming (chart1, chart2, etc.)
 * @returns Transpile result with XML and Excel data
 */
export async function transpileChart(
  config: ChartConfig,
  chartIndex: number = 1
): Promise<ChartTranspileResult> {
  const chartRelId = `rIdChart${chartIndex}`;
  const excelRelId = `rIdExcel${chartIndex}`;

  // Generate the embedded Excel workbook
  const excelData = await generateExcelWorkbook(config);

  // Generate the chart XML
  const chartXml = generateChartXml(config, excelRelId);

  return {
    chartXml,
    excelData,
    chartRelId,
    excelRelId,
    contentTypes: [
      {
        partName: `/ppt/charts/chart${chartIndex}.xml`,
        contentType: 'application/vnd.openxmlformats-officedocument.drawingml.chart+xml',
      },
      {
        partName: `/ppt/embeddings/Microsoft_Excel_Worksheet${chartIndex}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    ],
  };
}

/**
 * Generate the drawing XML that embeds a chart in a slide.
 *
 * This goes inside the slide XML to reference the chart.
 */
export function generateChartDrawingXml(
  chartRelId: string,
  x: number = 0,
  y: number = 0,
  width: number = DEFAULT_WIDTH,
  height: number = DEFAULT_HEIGHT
): string {
  return `
    <p:graphicFrame>
      <p:nvGraphicFramePr>
        <p:cNvPr id="2" name="Chart 1"/>
        <p:cNvGraphicFramePr>
          <a:graphicFrameLocks noGrp="1"/>
        </p:cNvGraphicFramePr>
        <p:nvPr/>
      </p:nvGraphicFramePr>
      <p:xfrm>
        <a:off x="${Math.round(x)}" y="${Math.round(y)}"/>
        <a:ext cx="${Math.round(width)}" cy="${Math.round(height)}"/>
      </p:xfrm>
      <a:graphic>
        <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
          <c:chart xmlns:c="${NS.c}" xmlns:r="${NS.r}" r:id="${chartRelId}"/>
        </a:graphicData>
      </a:graphic>
    </p:graphicFrame>`;
}

/**
 * Generate relationship entries for chart and Excel embedding.
 */
export function generateChartRelationships(
  chartIndex: number,
  chartRelId: string,
  excelRelId: string
): {
  slideRels: string;
  chartRels: string;
} {
  return {
    // Goes in slide1.xml.rels - links slide to chart
    slideRels: `<Relationship Id="${chartRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${chartIndex}.xml"/>`,

    // Goes in chart1.xml.rels - links chart to Excel
    chartRels: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="${excelRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/package" Target="../embeddings/Microsoft_Excel_Worksheet${chartIndex}.xlsx"/>
</Relationships>`,
  };
}

// =============================================================================
// RECHARTS ADAPTER
// =============================================================================

/**
 * Convert Recharts-style data to our ChartConfig format.
 *
 * Recharts typically uses:
 * ```
 * const data = [
 *   { name: 'Jan', sales: 4000, profit: 2400 },
 *   { name: 'Feb', sales: 3000, profit: 1398 },
 * ];
 * <BarChart data={data}>
 *   <Bar dataKey="sales" fill="#8884d8" />
 *   <Bar dataKey="profit" fill="#82ca9d" />
 * </BarChart>
 * ```
 */
export function fromRechartsData(
  data: Array<Record<string, unknown>>,
  dataKeys: string[],
  categoryKey: string = 'name',
  options: Partial<ChartConfig> = {}
): ChartConfig {
  const series: DataSeries[] = dataKeys.map((key, idx) => ({
    name: key,
    data: data.map(item => ({
      category: String(item[categoryKey] || ''),
      value: Number(item[key]) || 0,
    })),
    color: DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
  }));

  return {
    type: options.type || 'column',
    series,
    xAxis: {
      categories: data.map(item => String(item[categoryKey] || '')),
      ...options.xAxis,
    },
    showLegend: options.showLegend ?? true,
    ...options,
  };
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate chart configuration
 */
export function validateChartConfig(config: ChartConfig): string[] {
  const errors: string[] = [];

  if (!config.series || config.series.length === 0) {
    errors.push('Chart must have at least one data series');
  }

  for (const series of config.series) {
    if (!series.name) {
      errors.push('Each series must have a name');
    }
    if (!series.data || series.data.length === 0) {
      errors.push(`Series "${series.name}" has no data points`);
    }
  }

  // Check for consistent categories across series
  if (config.series.length > 1) {
    const firstCategories = config.series[0].data.map(d => d.category);
    for (let i = 1; i < config.series.length; i++) {
      const categories = config.series[i].data.map(d => d.category);
      if (categories.length !== firstCategories.length) {
        errors.push(`Series "${config.series[i].name}" has different number of data points than first series`);
      }
    }
  }

  return errors;
}
