/**
 * PVCE Accessibility Layer
 * ========================
 * Document 4, Sections 4-5: Tagged PDF & PDF/UA Compliance
 *
 * Features:
 * - PDF/UA semantic tagging
 * - Auto-generated alt-text
 * - Natural language chart descriptions
 * - XMP metadata for data provenance
 */

import {
  AccessibilityMetadata,
  DataPointAccessibility,
  XMPMetadata,
  ChartType,
  SceneNode,
} from "./types.js";
import crypto from "crypto";

// =============================================================================
// ACCESSIBILITY CONFIGURATION
// =============================================================================

/** Accessibility options */
export interface AccessibilityOptions {
  /** Language code (e.g., 'en-US') */
  lang?: string;
  /** Custom chart title for alt-text */
  title?: string;
  /** Include data table in description */
  includeDataTable?: boolean;
  /** Maximum points to describe individually */
  maxDescribedPoints?: number;
  /** Number format for values */
  numberFormat?: Intl.NumberFormatOptions;
  /** Include percentage in descriptions */
  includePercentages?: boolean;
}

const DEFAULT_OPTIONS: Required<AccessibilityOptions> = {
  lang: "en-US",
  title: "Chart",
  includeDataTable: true,
  maxDescribedPoints: 20,
  numberFormat: { maximumFractionDigits: 2 },
  includePercentages: true,
};

// =============================================================================
// ACCESSIBILITY GENERATOR CLASS
// =============================================================================

/**
 * AccessibilityGenerator - Creates PDF/UA compliant accessibility metadata.
 *
 * Doc 4 Compliance:
 * - Section 4: Tagged PDF structure (Role: Chart, Caption, DataPoint)
 * - Section 4: Auto-generated natural language summaries
 * - Section 5: XMP metadata embedding
 */
export class AccessibilityGenerator {
  private options: Required<AccessibilityOptions>;
  private formatter: Intl.NumberFormat;

  constructor(options: AccessibilityOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.formatter = new Intl.NumberFormat(
      this.options.lang,
      this.options.numberFormat,
    );
  }

  /**
   * Generate complete accessibility metadata for a chart.
   */
  generateMetadata(
    chartType: ChartType,
    data: ChartData,
    title?: string,
  ): AccessibilityMetadata {
    const effectiveTitle = title ?? this.options.title;

    return {
      role: "Chart",
      altText: this.generateAltText(chartType, data, effectiveTitle),
      caption: effectiveTitle,
      dataSummary: this.generateDataSummary(chartType, data),
      lang: this.options.lang,
    };
  }

  /**
   * Generate natural language description of the chart.
   * Doc 4, Section 4: Alt-Text Generation.
   */
  generateAltText(
    chartType: ChartType,
    data: ChartData,
    title?: string,
  ): string {
    const parts: string[] = [];

    // Chart type and title
    const chartTypeName = this.getChartTypeName(chartType);
    if (title) {
      parts.push(`${chartTypeName} titled "${title}".`);
    } else {
      parts.push(`${chartTypeName}.`);
    }

    // Data overview
    parts.push(this.describeDataOverview(chartType, data));

    // Trend analysis
    const trend = (data.seriesCount ?? 1) <= 1 ? this.analyzeTrend(data) : null;
    if (trend) {
      parts.push(trend);
    }

    // Key statistics
    parts.push(this.describeStatistics(data));

    return parts.join(" ");
  }

  /**
   * Generate structured data summary for screen readers.
   */
  generateDataSummary(
    chartType: ChartType,
    data: ChartData,
  ): DataPointAccessibility[] {
    const summary: DataPointAccessibility[] = [];
    const total = this.calculateTotal(data);

    for (
      let i = 0;
      i < Math.min(data.values.length, this.options.maxDescribedPoints);
      i++
    ) {
      const value = data.values[i];
      const category = data.categories?.[i] ?? `Item ${i + 1}`;
      const formattedValue = this.formatValue(value, data.valueType);

      let percentage: number | undefined;
      if (this.options.includePercentages && total > 0) {
        percentage = (value / total) * 100;
      }

      const description = this.generatePointDescription(
        chartType,
        category,
        formattedValue,
        percentage,
        i,
        data.values.length,
      );

      summary.push({
        index: i,
        category,
        value,
        formattedValue,
        percentage,
        description,
      });
    }

    return summary;
  }

  /**
   * Add accessibility attributes to scene nodes.
   * Maps scene graph nodes to PDF/UA roles.
   */
  addAccessibilityToNode(
    node: SceneNode,
    info: {
      role?: string;
      label?: string;
      describedBy?: string;
    },
  ): SceneNode {
    return {
      ...node,
      attributes: {
        ...node.attributes,
        role: info.role,
        ariaLabel: info.label,
        ariaDescribedBy: info.describedBy,
      },
      metadata: {
        ...node.metadata,
        isAccessibilityNode: true,
      },
    };
  }

  /**
   * Generate XMP metadata for data provenance.
   * Doc 4, Section 5: XMP Metadata Embedding.
   */
  generateXMPMetadata(
    chartType: ChartType,
    sourceData: unknown,
    version: string = "1.0.0",
  ): XMPMetadata {
    const jsonString = JSON.stringify(sourceData, null, 2);
    const dataHash = this.hashData(jsonString);

    return {
      sourceData: jsonString,
      dataHash,
      createdAt: new Date().toISOString(),
      generatorVersion: version,
      chartType,
    };
  }

  /**
   * Generate XMP XML string for PDF embedding.
   */
  generateXMPXML(metadata: XMPMetadata): string {
    return `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:pvce="http://pvce.pdf-engine.io/1.0/">
      <pvce:chartType>${metadata.chartType}</pvce:chartType>
      <pvce:dataHash>${metadata.dataHash}</pvce:dataHash>
      <pvce:generatorVersion>${metadata.generatorVersion}</pvce:generatorVersion>
      <pvce:createdAt>${metadata.createdAt}</pvce:createdAt>
      <pvce:sourceData><![CDATA[${metadata.sourceData}]]></pvce:sourceData>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
  }

  // ===========================================================================
  // PRIVATE: Description Generation
  // ===========================================================================

  private getChartTypeName(type: ChartType): string {
    const names: Record<ChartType, string> = {
      bar: "Bar chart",
      line: "Line chart",
      scatter: "Scatter plot",
      pie: "Pie chart",
      donut: "Donut chart",
      waterfall: "Waterfall chart",
      marimekko: "Marimekko chart",
      area: "Area chart",
      "stacked-bar": "Stacked bar chart",
      "grouped-bar": "Grouped bar chart",
      combo: "Combo chart",
    };
    return names[type] || "Chart";
  }

  private describeDataOverview(chartType: ChartType, data: ChartData): string {
    const count = data.values.length;
    const categoryType = data.categoryType ?? "categories";

    if (data.seriesCount !== undefined && data.categoryCount !== undefined) {
      if (chartType === "combo") {
        const axisDescription = data.secondaryAxis
          ? "a separate right-hand axis for the line"
          : "a shared value axis";
        return `Shows ${data.seriesCount} series across ${data.categoryCount} categories, combining bars and a line on ${axisDescription}.`;
      }
      return `Shows ${data.seriesCount} series across ${data.categoryCount} categories.`;
    }

    if (chartType === "pie" || chartType === "donut") {
      return `Shows ${count} ${categoryType} as proportional segments.`;
    }

    if (chartType === "scatter") {
      return `Contains ${count} data points plotted on X-Y axes.`;
    }

    if (chartType === "line" || chartType === "area") {
      return `Shows ${count} data points connected over ${categoryType}.`;
    }

    return `Shows ${count} ${categoryType}.`;
  }

  private analyzeTrend(data: ChartData): string | null {
    if (data.values.length < 3) return null;

    const first = data.values[0];
    const last = data.values[data.values.length - 1];
    const change = ((last - first) / Math.abs(first)) * 100;

    // Check for consistent trend
    let increasing = 0;
    let decreasing = 0;
    for (let i = 1; i < data.values.length; i++) {
      if (data.values[i] > data.values[i - 1]) increasing++;
      if (data.values[i] < data.values[i - 1]) decreasing++;
    }

    const trend =
      increasing > decreasing * 1.5
        ? "upward"
        : decreasing > increasing * 1.5
          ? "downward"
          : "fluctuating";

    if (Math.abs(change) < 5) {
      return "The data shows relatively stable values.";
    }

    const direction = change > 0 ? "increase" : "decrease";
    const changeFormatted = this.formatter.format(Math.abs(change));

    return `Shows an ${trend} trend with ${changeFormatted}% overall ${direction} from ${this.formatValue(first, data.valueType)} to ${this.formatValue(last, data.valueType)}.`;
  }

  private describeStatistics(data: ChartData): string {
    let min = Infinity;
    let max = -Infinity;
    let minIdx = -1;
    let maxIdx = -1;
    let sum = 0;
    let count = 0;

    data.values.forEach((value, index) => {
      if (!Number.isFinite(value)) return;
      if (value < min) {
        min = value;
        minIdx = index;
      }
      if (value > max) {
        max = value;
        maxIdx = index;
      }
      sum += value;
      count++;
    });

    if (count === 0) return "No data to display.";

    const avg = sum / count;

    const minCat = data.categories?.[minIdx] ?? `position ${minIdx + 1}`;
    const maxCat = data.categories?.[maxIdx] ?? `position ${maxIdx + 1}`;

    return (
      `Minimum value of ${this.formatValue(min, data.valueType)} at ${minCat}; ` +
      `maximum of ${this.formatValue(max, data.valueType)} at ${maxCat}; ` +
      `average of ${this.formatValue(avg, data.valueType)}.`
    );
  }

  private generatePointDescription(
    chartType: ChartType,
    category: string,
    formattedValue: string,
    percentage: number | undefined,
    index: number,
    total: number,
  ): string {
    let desc = `${category}: ${formattedValue}`;

    if (percentage !== undefined) {
      desc += ` (${this.formatter.format(percentage)}%)`;
    }

    // Position context
    if (index === 0) {
      desc += " (first)";
    } else if (index === total - 1) {
      desc += " (last)";
    }

    return desc;
  }

  private formatValue(value: number, type?: string): string {
    switch (type) {
      case "currency":
        return new Intl.NumberFormat(this.options.lang, {
          style: "currency",
          currency: "USD",
        }).format(value);
      case "percent":
        return new Intl.NumberFormat(this.options.lang, {
          style: "percent",
          maximumFractionDigits: 1,
        }).format(value / 100);
      default:
        return this.formatter.format(value);
    }
  }

  private calculateTotal(data: ChartData): number {
    return data.values.reduce((sum, v) => sum + Math.abs(v), 0);
  }

  private hashData(data: string): string {
    return crypto.createHash("sha256").update(data).digest("hex");
  }
}

// =============================================================================
// TYPES
// =============================================================================

/** Generic chart data for accessibility generation */
export interface ChartData {
  values: number[];
  categories?: string[];
  categoryType?: string;
  valueType?: "number" | "currency" | "percent";
  seriesName?: string;
  seriesCount?: number;
  categoryCount?: number;
  secondaryAxis?: boolean;
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/** Global accessibility generator */
export const accessibilityGenerator = new AccessibilityGenerator();

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Generate alt-text for a chart.
 */
export function generateChartAltText(
  chartType: ChartType,
  values: number[],
  categories?: string[],
  title?: string,
): string {
  return accessibilityGenerator.generateAltText(
    chartType,
    { values, categories },
    title,
  );
}

/**
 * Generate XMP metadata.
 */
export function generateXMPMetadata(
  chartType: ChartType,
  sourceData: unknown,
): XMPMetadata {
  return accessibilityGenerator.generateXMPMetadata(chartType, sourceData);
}

/**
 * Hash data for verification.
 */
export function hashChartData(data: unknown): string {
  const json = JSON.stringify(data);
  return crypto.createHash("sha256").update(json).digest("hex");
}
