/**
 * PVCE SVG Renderer
 * =================
 * Document 3: Sub-Pixel Vector Normalization & Scaling
 *
 * Features:
 * - SVG-First Vector Pipeline (no canvas)
 * - Non-scaling strokes for consistent line weights
 * - Hairline management (minimum 0.25pt)
 * - Sub-pixel grid snapping (half-pixel)
 * - LBU to viewport transformation
 */

import {
  SceneGraph,
  SceneNode,
  SceneAttributes,
  PatternDefinition,
  GradientDefinition,
  LBU,
  HAIRLINE_MIN_PT,
  SNAP_THRESHOLD,
} from "./types.js";

// =============================================================================
// RENDERER CONFIGURATION
// =============================================================================

/** SVG rendering options */
export interface SVGRenderOptions {
  /** Output width in pixels */
  width?: number;
  /** Output height in pixels */
  height?: number;
  /** Enable half-pixel snapping for crisp lines */
  enableSnapping?: boolean;
  /** Minimum stroke width (pt) */
  minStrokeWidth?: number;
  /** Use non-scaling strokes */
  nonScalingStrokes?: boolean;
  /** Include accessibility attributes */
  includeAccessibility?: boolean;
  /** Indent output for readability */
  prettyPrint?: boolean;
  /** Custom CSS to inject */
  customCSS?: string;
}

/** Default render options */
const DEFAULT_OPTIONS: Required<SVGRenderOptions> = {
  width: 800,
  height: 600,
  enableSnapping: true,
  minStrokeWidth: HAIRLINE_MIN_PT,
  nonScalingStrokes: true,
  includeAccessibility: true,
  prettyPrint: false,
  customCSS: "",
};

// =============================================================================
// SVG RENDERER CLASS
// =============================================================================

/**
 * SVGRenderer - Converts Scene Graph to optimized SVG
 *
 * Doc 3 Compliance:
 * - Section 2: SVG-only output (no canvas)
 * - Section 3: LBU coordinate mapping
 * - Section 4: Non-scaling strokes, hairline management
 * - Section 5: Sub-pixel grid snapping
 */
export class SVGRenderer {
  private options: Required<SVGRenderOptions>;
  private indent = 0;
  private output: string[] = [];

  constructor(options: SVGRenderOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Render a Scene Graph to SVG string.
   */
  render(sceneGraph: SceneGraph): string {
    this.output = [];
    this.indent = 0;

    const { width, height } = this.options;
    const viewBox = sceneGraph.viewBox;

    // SVG root element
    this.writeLine(`<svg xmlns="http://www.w3.org/2000/svg"`);
    this.indent++;
    this.writeLine(`width="${width}" height="${height}"`);
    this.writeLine(`viewBox="0 0 ${viewBox.width} ${viewBox.height}"`);
    this.writeLine(`preserveAspectRatio="xMidYMid meet"`);

    // Accessibility attributes (Doc 4)
    if (
      this.options.includeAccessibility &&
      sceneGraph.metadata.accessibility
    ) {
      const acc = sceneGraph.metadata.accessibility;
      this.writeLine(`role="${acc.role}"`);
      this.writeLine(`aria-label="${this.escapeXML(acc.altText)}"`);
    }

    this.writeLine(`>`);

    // Style definitions
    this.writeStyles();

    // Defs section (patterns, gradients)
    if (sceneGraph.defs) {
      this.writeDefs(sceneGraph.defs);
    }

    // Render root node
    this.renderNode(sceneGraph.root);

    this.indent--;
    this.writeLine(`</svg>`);

    return this.output.join(this.options.prettyPrint ? "\n" : "");
  }

  /**
   * Render a single chart to SVG (convenience method).
   */
  renderChart(
    root: SceneNode,
    viewBox: { width: LBU; height: LBU },
    defs?: { patterns: PatternDefinition[]; gradients?: GradientDefinition[] },
  ): string {
    const sceneGraph: SceneGraph = {
      version: "1.0.0",
      viewBox,
      root,
      metadata: {
        dataHash: "",
        generatedAt: Date.now(),
        chartType: "bar",
        accessibility: {
          role: "Chart",
          altText: "Chart",
          dataSummary: [],
          lang: "en",
        },
      },
      defs,
    };
    return this.render(sceneGraph);
  }

  // ===========================================================================
  // PRIVATE: Node Rendering
  // ===========================================================================

  private renderNode(node: SceneNode): void {
    switch (node.type) {
      case "group":
        this.renderGroup(node);
        break;
      case "rect":
        this.renderRect(node);
        break;
      case "circle":
        this.renderCircle(node);
        break;
      case "line":
        this.renderLine(node);
        break;
      case "path":
        this.renderPath(node);
        break;
      case "text":
        this.renderText(node);
        break;
      case "pattern":
        // Patterns are rendered in defs
        break;
      default:
        console.warn(`Unknown node type: ${node.type}`);
    }
  }

  private renderGroup(node: SceneNode): void {
    const attrs = this.buildCommonAttributes(node);

    // Add transform if position is non-zero
    if (node.x !== 0 || node.y !== 0) {
      attrs.push(
        `transform="translate(${this.snap(node.x)}, ${this.snap(node.y)})"`,
      );
    }

    this.writeLine(`<g ${attrs.join(" ")}>`);
    this.indent++;

    if (node.children) {
      for (const child of node.children) {
        this.renderNode(child);
      }
    }

    this.indent--;
    this.writeLine(`</g>`);
  }

  private renderRect(node: SceneNode): void {
    const { attributes: a } = node;
    const attrs = this.buildCommonAttributes(node);

    // Snap coordinates for crisp edges (Doc 3, Section 5)
    const x = this.snap(node.x);
    const y = this.snap(node.y);
    const width = a.width ?? 0;
    const height = a.height ?? 0;

    attrs.push(`x="${x}" y="${y}"`);
    attrs.push(`width="${width}" height="${height}"`);

    // Fill
    if (a.patternId) {
      attrs.push(`fill="url(#${a.patternId})"`);
    } else if (a.fill) {
      attrs.push(`fill="${a.fill}"`);
    }

    // Stroke with hairline management (Doc 3, Section 4)
    this.addStrokeAttributes(attrs, a);

    this.writeLine(`<rect ${attrs.join(" ")} />`);
  }

  private renderCircle(node: SceneNode): void {
    const { attributes: a } = node;
    const attrs = this.buildCommonAttributes(node);

    const cx = this.snap(node.x);
    const cy = this.snap(node.y);
    const r = a.radius ?? 5;

    attrs.push(`cx="${cx}" cy="${cy}" r="${r}"`);

    if (a.fill) attrs.push(`fill="${a.fill}"`);
    this.addStrokeAttributes(attrs, a);

    this.writeLine(`<circle ${attrs.join(" ")} />`);
  }

  private renderLine(node: SceneNode): void {
    const { attributes: a } = node;
    const attrs = this.buildCommonAttributes(node);

    // Snap line endpoints for crisp rendering
    const x1 = this.snap(a.x1 ?? node.x);
    const y1 = this.snap(a.y1 ?? node.y);
    const x2 = this.snap(a.x2 ?? node.x);
    const y2 = this.snap(a.y2 ?? node.y);

    attrs.push(`x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"`);
    this.addStrokeAttributes(attrs, a);

    this.writeLine(`<line ${attrs.join(" ")} />`);
  }

  private renderPath(node: SceneNode): void {
    const { attributes: a } = node;
    const attrs = this.buildCommonAttributes(node);

    if (a.d) {
      attrs.push(`d="${a.d}"`);
    }

    if (a.fill) {
      attrs.push(`fill="${a.fill}"`);
    } else {
      attrs.push(`fill="none"`);
    }

    this.addStrokeAttributes(attrs, a);

    this.writeLine(`<path ${attrs.join(" ")} />`);
  }

  private renderText(node: SceneNode): void {
    const { attributes: a } = node;
    const attrs = this.buildCommonAttributes(node);

    // Text position
    const x = this.snap(node.x);
    const y = this.snap(node.y);
    attrs.push(`x="${x}" y="${y}"`);

    // Font properties
    if (a.fontSize) attrs.push(`font-size="${a.fontSize}"`);
    if (a.fontFamily)
      attrs.push(`font-family="${this.escapeXML(a.fontFamily)}"`);
    if (a.fontWeight) attrs.push(`font-weight="${a.fontWeight}"`);

    // Text alignment (Doc 2 compliance)
    if (a.textAnchor) attrs.push(`text-anchor="${a.textAnchor}"`);
    if (a.dominantBaseline)
      attrs.push(`dominant-baseline="${a.dominantBaseline}"`);

    // Fill (default black for text)
    attrs.push(`fill="${a.fill || "#000000"}"`);

    // Rotation transform
    if (a.rotation) {
      attrs.push(`transform="rotate(${a.rotation}, ${x}, ${y})"`);
    }

    const text = a.text ? this.escapeXML(a.text) : "";
    this.writeLine(`<text ${attrs.join(" ")}>${text}</text>`);
  }

  // ===========================================================================
  // PRIVATE: Stroke & Style Handling
  // ===========================================================================

  private addStrokeAttributes(attrs: string[], a: SceneAttributes): void {
    if (a.stroke) {
      attrs.push(`stroke="${a.stroke}"`);

      // Hairline management (Doc 3, Section 4)
      let strokeWidth = a.strokeWidth ?? 1;
      strokeWidth = Math.max(strokeWidth, this.options.minStrokeWidth);
      attrs.push(`stroke-width="${strokeWidth}"`);

      // Non-scaling stroke (Doc 3, Section 4)
      if (this.options.nonScalingStrokes && a.vectorEffect !== "none") {
        attrs.push(`vector-effect="non-scaling-stroke"`);
      }
    }
  }

  private buildCommonAttributes(node: SceneNode): string[] {
    const attrs: string[] = [];

    // ID for accessibility and testing
    if (node.id) {
      attrs.push(`id="${this.escapeXML(node.id)}"`);
    }

    // Opacity
    if (
      node.attributes.opacity !== undefined &&
      node.attributes.opacity !== 1
    ) {
      attrs.push(`opacity="${node.attributes.opacity}"`);
    }

    // Accessibility role
    if (node.attributes.role) {
      attrs.push(`role="${node.attributes.role}"`);
    }

    // ARIA attributes
    if (node.attributes.ariaLabel) {
      attrs.push(`aria-label="${this.escapeXML(node.attributes.ariaLabel)}"`);
    }

    return attrs;
  }

  private writeStyles(): void {
    const css = `
      text { 
        font-family: Arial, Helvetica, sans-serif;
        /* Prevent text selection in interactive contexts */
        user-select: none;
        -webkit-user-select: none;
      }
      ${this.options.customCSS}
    `.trim();

    this.writeLine(`<style type="text/css">`);
    this.writeLine(`<![CDATA[${css}]]>`);
    this.writeLine(`</style>`);
  }

  // ===========================================================================
  // PRIVATE: Defs Section (Patterns, Gradients)
  // ===========================================================================

  private writeDefs(defs: {
    patterns: PatternDefinition[];
    gradients?: GradientDefinition[];
  }): void {
    this.writeLine(`<defs>`);
    this.indent++;

    // Render patterns (Doc 4, Section 3)
    for (const pattern of defs.patterns) {
      this.writePattern(pattern);
    }

    // Render gradients
    if (defs.gradients) {
      for (const gradient of defs.gradients) {
        this.writeGradient(gradient);
      }
    }

    this.indent--;
    this.writeLine(`</defs>`);
  }

  private writePattern(p: PatternDefinition): void {
    const size = p.spacing;

    this.writeLine(
      `<pattern id="${p.id}" patternUnits="userSpaceOnUse" width="${size}" height="${size}">`,
    );
    this.indent++;

    // Pattern background (transparent)
    this.writeLine(
      `<rect width="${size}" height="${size}" fill="transparent" />`,
    );

    // Pattern content based on type (Doc 4, Section 3)
    switch (p.type) {
      case "diagonal-lines":
        // 45° diagonal stripes
        this.writeLine(
          `<line x1="0" y1="${size}" x2="${size}" y2="0" stroke="currentColor" stroke-width="${p.strokeWidth}" />`,
        );
        break;

      case "dots":
        this.writeLine(
          `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 4}" fill="currentColor" />`,
        );
        break;

      case "crosshatch":
        this.writeLine(
          `<line x1="0" y1="${size}" x2="${size}" y2="0" stroke="currentColor" stroke-width="${p.strokeWidth}" />`,
        );
        this.writeLine(
          `<line x1="0" y1="0" x2="${size}" y2="${size}" stroke="currentColor" stroke-width="${p.strokeWidth}" />`,
        );
        break;

      case "horizontal-lines":
        this.writeLine(
          `<line x1="0" y1="${size / 2}" x2="${size}" y2="${size / 2}" stroke="currentColor" stroke-width="${p.strokeWidth}" />`,
        );
        break;

      case "vertical-lines":
        this.writeLine(
          `<line x1="${size / 2}" y1="0" x2="${size / 2}" y2="${size}" stroke="currentColor" stroke-width="${p.strokeWidth}" />`,
        );
        break;

      case "diagonal-reverse":
        // -45° diagonal stripes
        this.writeLine(
          `<line x1="0" y1="0" x2="${size}" y2="${size}" stroke="currentColor" stroke-width="${p.strokeWidth}" />`,
        );
        break;

      case "grid":
        this.writeLine(
          `<line x1="0" y1="${size / 2}" x2="${size}" y2="${size / 2}" stroke="currentColor" stroke-width="${p.strokeWidth}" />`,
        );
        this.writeLine(
          `<line x1="${size / 2}" y1="0" x2="${size / 2}" y2="${size}" stroke="currentColor" stroke-width="${p.strokeWidth}" />`,
        );
        break;

      case "circles":
        this.writeLine(
          `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 3}" stroke="currentColor" stroke-width="${p.strokeWidth}" fill="none" />`,
        );
        break;
    }

    this.indent--;
    this.writeLine(`</pattern>`);
  }

  private writeGradient(g: GradientDefinition): void {
    if (g.type === "linear") {
      this.writeLine(
        `<linearGradient id="${g.id}" x1="${g.x1 ?? 0}%" y1="${g.y1 ?? 0}%" x2="${g.x2 ?? 100}%" y2="${g.y2 ?? 0}%">`,
      );
    } else {
      this.writeLine(`<radialGradient id="${g.id}">`);
    }

    this.indent++;
    for (const stop of g.stops) {
      this.writeLine(
        `<stop offset="${stop.offset * 100}%" stop-color="${stop.color}" />`,
      );
    }
    this.indent--;

    this.writeLine(
      g.type === "linear" ? `</linearGradient>` : `</radialGradient>`,
    );
  }

  // ===========================================================================
  // PRIVATE: Utility Methods
  // ===========================================================================

  /**
   * Sub-pixel grid snapping (Doc 3, Section 5).
   * Snaps coordinates to 0.5px offsets for crisp 1px lines.
   */
  private snap(value: LBU): number {
    if (!this.options.enableSnapping) {
      return Math.round(value * 100) / 100;
    }

    // Snap to nearest half-pixel
    return Math.round(value * 2) / 2;
  }

  private escapeXML(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  private writeLine(content: string): void {
    if (this.options.prettyPrint) {
      this.output.push("  ".repeat(this.indent) + content);
    } else {
      this.output.push(content);
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/** Default SVG renderer */
export const svgRenderer = new SVGRenderer();

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Render a Scene Graph to SVG string.
 */
export function renderToSVG(
  sceneGraph: SceneGraph,
  options?: SVGRenderOptions,
): string {
  const renderer = options ? new SVGRenderer(options) : svgRenderer;
  return renderer.render(sceneGraph);
}

/**
 * Snap a coordinate to the sub-pixel grid.
 */
export function snapToGrid(value: LBU): number {
  return Math.round(value * 2) / 2;
}

/**
 * Ensure stroke width meets minimum hairline requirement.
 */
export function ensureMinStroke(strokeWidth: number): number {
  return Math.max(strokeWidth, HAIRLINE_MIN_PT);
}
