import { createRequire as __runstampCreateRequire } from "node:module";
const require = __runstampCreateRequire(import.meta.url);
import "./chunk-OWC7QHPZ.js";

// ../pvce/src/charts/types.ts
var CollisionLevel = /* @__PURE__ */ ((CollisionLevel2) => {
  CollisionLevel2[CollisionLevel2["STANDARD"] = 0] = "STANDARD";
  CollisionLevel2[CollisionLevel2["STAGGERED"] = 1] = "STAGGERED";
  CollisionLevel2[CollisionLevel2["ROTATED_45"] = 2] = "ROTATED_45";
  CollisionLevel2[CollisionLevel2["ROTATED_90"] = 3] = "ROTATED_90";
  CollisionLevel2[CollisionLevel2["SAMPLED"] = 4] = "SAMPLED";
  return CollisionLevel2;
})(CollisionLevel || {});
var VIRTUAL_CANVAS = {
  WIDTH: 1e4,
  HEIGHT: 1e4
};
var HAIRLINE_MIN_PT = 0.25;
var SNAP_THRESHOLD = 0.5;

// ../pvce/src/charts/glyph-oracle.ts
var FONT_METRICS = {
  Arial: {
    avgCharWidth: 0.52,
    capHeight: 0.72,
    xHeight: 0.52,
    ascent: 0.91,
    descent: 0.21,
    lineHeight: 1.15,
    charWidths: {
      // Common characters with specific widths
      " ": 0.28,
      "!": 0.28,
      '"': 0.35,
      "#": 0.56,
      $: 0.56,
      "%": 0.89,
      "&": 0.67,
      "'": 0.19,
      "(": 0.33,
      ")": 0.33,
      "*": 0.39,
      "+": 0.58,
      ",": 0.28,
      "-": 0.33,
      ".": 0.28,
      "/": 0.28,
      "0": 0.56,
      "1": 0.56,
      "2": 0.56,
      "3": 0.56,
      "4": 0.56,
      "5": 0.56,
      "6": 0.56,
      "7": 0.56,
      "8": 0.56,
      "9": 0.56,
      ":": 0.28,
      ";": 0.28,
      "<": 0.58,
      "=": 0.58,
      ">": 0.58,
      "?": 0.56,
      "@": 1.02,
      A: 0.67,
      B: 0.67,
      C: 0.72,
      D: 0.72,
      E: 0.67,
      F: 0.61,
      G: 0.78,
      H: 0.72,
      I: 0.28,
      J: 0.5,
      K: 0.67,
      L: 0.56,
      M: 0.83,
      N: 0.72,
      O: 0.78,
      P: 0.67,
      Q: 0.78,
      R: 0.72,
      S: 0.67,
      T: 0.61,
      U: 0.72,
      V: 0.67,
      W: 0.94,
      X: 0.67,
      Y: 0.67,
      Z: 0.61,
      a: 0.56,
      b: 0.56,
      c: 0.5,
      d: 0.56,
      e: 0.56,
      f: 0.28,
      g: 0.56,
      h: 0.56,
      i: 0.22,
      j: 0.22,
      k: 0.5,
      l: 0.22,
      m: 0.83,
      n: 0.56,
      o: 0.56,
      p: 0.56,
      q: 0.56,
      r: 0.33,
      s: 0.5,
      t: 0.28,
      u: 0.56,
      v: 0.5,
      w: 0.72,
      x: 0.5,
      y: 0.5,
      z: 0.5
    }
  },
  Helvetica: {
    avgCharWidth: 0.52,
    capHeight: 0.72,
    xHeight: 0.52,
    ascent: 0.91,
    descent: 0.21,
    lineHeight: 1.15,
    charWidths: {
      // Similar to Arial
      " ": 0.28,
      "!": 0.28,
      '"': 0.36,
      "#": 0.56,
      $: 0.56,
      "%": 0.89,
      "&": 0.67,
      "'": 0.22,
      "(": 0.33,
      ")": 0.33,
      "*": 0.39,
      "+": 0.58,
      ",": 0.28,
      "-": 0.33,
      ".": 0.28,
      "/": 0.28,
      "0": 0.56,
      "1": 0.56,
      "2": 0.56,
      "3": 0.56,
      "4": 0.56,
      "5": 0.56,
      "6": 0.56,
      "7": 0.56,
      "8": 0.56,
      "9": 0.56,
      ":": 0.28,
      ";": 0.28,
      "<": 0.58,
      "=": 0.58,
      ">": 0.58,
      "?": 0.56,
      "@": 1.01,
      A: 0.67,
      B: 0.67,
      C: 0.72,
      D: 0.72,
      E: 0.67,
      F: 0.61,
      G: 0.78,
      H: 0.72,
      I: 0.28,
      J: 0.5,
      K: 0.67,
      L: 0.56,
      M: 0.83,
      N: 0.72,
      O: 0.78,
      P: 0.67,
      Q: 0.78,
      R: 0.72,
      S: 0.67,
      T: 0.61,
      U: 0.72,
      V: 0.67,
      W: 0.94,
      X: 0.67,
      Y: 0.67,
      Z: 0.61,
      a: 0.56,
      b: 0.56,
      c: 0.5,
      d: 0.56,
      e: 0.56,
      f: 0.28,
      g: 0.56,
      h: 0.56,
      i: 0.22,
      j: 0.22,
      k: 0.5,
      l: 0.22,
      m: 0.83,
      n: 0.56,
      o: 0.56,
      p: 0.56,
      q: 0.56,
      r: 0.33,
      s: 0.5,
      t: 0.28,
      u: 0.56,
      v: 0.5,
      w: 0.72,
      x: 0.5,
      y: 0.5,
      z: 0.5
    }
  },
  "Open Sans": {
    avgCharWidth: 0.54,
    capHeight: 0.71,
    xHeight: 0.54,
    ascent: 0.93,
    descent: 0.26,
    lineHeight: 1.2,
    charWidths: {
      " ": 0.26,
      "!": 0.26,
      '"': 0.41,
      "#": 0.63,
      $: 0.54,
      "%": 0.84,
      "&": 0.69,
      "'": 0.21,
      "(": 0.31,
      ")": 0.31,
      "*": 0.43,
      "+": 0.54,
      ",": 0.23,
      "-": 0.33,
      ".": 0.26,
      "/": 0.36,
      "0": 0.54,
      "1": 0.54,
      "2": 0.54,
      "3": 0.54,
      "4": 0.54,
      "5": 0.54,
      "6": 0.54,
      "7": 0.54,
      "8": 0.54,
      "9": 0.54,
      ":": 0.24,
      ";": 0.24,
      "<": 0.54,
      "=": 0.54,
      ">": 0.54,
      "?": 0.45,
      "@": 0.93,
      A: 0.65,
      B: 0.63,
      C: 0.65,
      D: 0.7,
      E: 0.55,
      F: 0.52,
      G: 0.72,
      H: 0.72,
      I: 0.27,
      J: 0.41,
      K: 0.62,
      L: 0.51,
      M: 0.9,
      N: 0.74,
      O: 0.76,
      P: 0.6,
      Q: 0.76,
      R: 0.62,
      S: 0.56,
      T: 0.56,
      U: 0.7,
      V: 0.62,
      W: 0.94,
      X: 0.6,
      Y: 0.57,
      Z: 0.57,
      a: 0.53,
      b: 0.58,
      c: 0.48,
      d: 0.58,
      e: 0.54,
      f: 0.33,
      g: 0.54,
      h: 0.58,
      i: 0.24,
      j: 0.24,
      k: 0.52,
      l: 0.24,
      m: 0.89,
      n: 0.58,
      o: 0.57,
      p: 0.58,
      q: 0.58,
      r: 0.37,
      s: 0.47,
      t: 0.36,
      u: 0.58,
      v: 0.5,
      w: 0.77,
      x: 0.49,
      y: 0.5,
      z: 0.46
    }
  },
  Roboto: {
    avgCharWidth: 0.53,
    capHeight: 0.71,
    xHeight: 0.53,
    ascent: 0.93,
    descent: 0.24,
    lineHeight: 1.17,
    charWidths: {
      " ": 0.25,
      "!": 0.26,
      '"': 0.35,
      "#": 0.59,
      $: 0.53,
      "%": 0.74,
      "&": 0.62,
      "'": 0.19,
      "(": 0.33,
      ")": 0.33,
      "*": 0.41,
      "+": 0.53,
      ",": 0.21,
      "-": 0.3,
      ".": 0.26,
      "/": 0.39,
      "0": 0.53,
      "1": 0.53,
      "2": 0.53,
      "3": 0.53,
      "4": 0.53,
      "5": 0.53,
      "6": 0.53,
      "7": 0.53,
      "8": 0.53,
      "9": 0.53,
      ":": 0.24,
      ";": 0.24,
      "<": 0.5,
      "=": 0.53,
      ">": 0.5,
      "?": 0.45,
      "@": 0.89,
      A: 0.64,
      B: 0.61,
      C: 0.64,
      D: 0.66,
      E: 0.55,
      F: 0.53,
      G: 0.69,
      H: 0.69,
      I: 0.27,
      J: 0.51,
      K: 0.61,
      L: 0.52,
      M: 0.85,
      N: 0.69,
      O: 0.71,
      P: 0.61,
      Q: 0.71,
      R: 0.61,
      S: 0.57,
      T: 0.57,
      U: 0.66,
      V: 0.61,
      W: 0.89,
      X: 0.6,
      Y: 0.58,
      Z: 0.58,
      a: 0.51,
      b: 0.55,
      c: 0.48,
      d: 0.55,
      e: 0.51,
      f: 0.34,
      g: 0.53,
      h: 0.55,
      i: 0.24,
      j: 0.24,
      k: 0.5,
      l: 0.24,
      m: 0.87,
      n: 0.55,
      o: 0.55,
      p: 0.55,
      q: 0.55,
      r: 0.35,
      s: 0.47,
      t: 0.35,
      u: 0.55,
      v: 0.49,
      w: 0.74,
      x: 0.49,
      y: 0.49,
      z: 0.47
    }
  },
  // Default/fallback metrics
  default: {
    avgCharWidth: 0.55,
    capHeight: 0.72,
    xHeight: 0.52,
    ascent: 0.92,
    descent: 0.23,
    lineHeight: 1.15,
    charWidths: {}
  }
};
var GlyphOracle = class {
  cache = /* @__PURE__ */ new Map();
  maxCacheSize;
  cacheHits = 0;
  cacheMisses = 0;
  constructor(options = {}) {
    this.maxCacheSize = options.maxCacheSize ?? 1e4;
  }
  /**
   * Measure text dimensions deterministically.
   * Doc 2, Section 2: "Exact bounding box of every string"
   */
  measureText(text, fontSize, fontFamily = "Arial") {
    const cacheKey = this.getCacheKey(text, fontSize, fontFamily);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      cached.lastAccessed = Date.now();
      this.cacheHits++;
      return cached.metrics;
    }
    this.cacheMisses++;
    const fontData = FONT_METRICS[fontFamily] || FONT_METRICS["default"];
    let width = 0;
    for (const char of text) {
      const charWidth = fontData.charWidths[char] ?? fontData.avgCharWidth;
      width += charWidth * fontSize;
    }
    const height = fontSize * fontData.lineHeight;
    const ascent = fontSize * fontData.ascent;
    const descent = fontSize * fontData.descent;
    const metrics = {
      text,
      width,
      height,
      ascent,
      descent,
      fontFamily,
      fontSize
    };
    this.addToCache(cacheKey, metrics);
    return metrics;
  }
  /**
   * Get raw font metrics for a font family.
   * Used by E-BBox calculator for glyph envelope calculations.
   */
  getFontMetrics(fontFamily) {
    const fontData = FONT_METRICS[fontFamily] || FONT_METRICS["default"];
    return {
      avgCharWidth: fontData.avgCharWidth,
      capHeight: fontData.capHeight,
      xHeight: fontData.xHeight,
      ascent: fontData.ascent,
      descent: fontData.descent,
      lineHeight: fontData.lineHeight
    };
  }
  /**
   * Create a TextBox with full positioning information.
   * Doc 2, Section 2: TextBox interface
   */
  createTextBox(text, fontSize, options = {}) {
    const {
      fontFamily = "Arial",
      anchor = "start",
      rotation = 0,
      padding = 0
    } = options;
    const metrics = this.measureText(text, fontSize, fontFamily);
    return {
      text,
      width: metrics.width + padding * 2,
      height: metrics.height + padding * 2,
      anchor,
      rotation,
      padding,
      baseline: "top"
    };
  }
  /**
   * Calculate the maximum label width for a set of labels.
   * Used for "Fixed Gutter Strategy" (Doc 1, Section 5).
   */
  getMaxLabelWidth(labels, fontSize, fontFamily = "Arial") {
    let maxWidth = 0;
    for (const label of labels) {
      const metrics = this.measureText(label, fontSize, fontFamily);
      maxWidth = Math.max(maxWidth, metrics.width);
    }
    return maxWidth;
  }
  /**
   * Get bounding box for rotated text.
   * Used for 45° and 90° label rotation (Doc 2, Section 3).
   */
  getRotatedBounds(textBox) {
    const rad = textBox.rotation * Math.PI / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    return {
      width: textBox.width * cos + textBox.height * sin,
      height: textBox.width * sin + textBox.height * cos
    };
  }
  /**
   * Check if two text boxes overlap.
   * Used for collision detection (Doc 2, Section 3).
   */
  boxesOverlap(box1, pos1, box2, pos2) {
    const bounds1 = this.getRotatedBounds(box1);
    const bounds2 = this.getRotatedBounds(box2);
    const x1 = this.getAnchoredX(pos1.x, box1.anchor, bounds1.width);
    const x2 = this.getAnchoredX(pos2.x, box2.anchor, bounds2.width);
    return !(x1 + bounds1.width < x2 || x2 + bounds2.width < x1 || pos1.y + bounds1.height < pos2.y || pos2.y + bounds2.height < pos1.y);
  }
  /**
   * Format number for display (e.g., currency, percentage).
   * Pre-measures result for consistent layout.
   */
  formatAndMeasure(value, format, fontSize, fontFamily = "Arial", options = {}) {
    const { currency = "USD", decimals = 2, locale = "en-US" } = options;
    let text;
    switch (format) {
      case "currency":
        text = new Intl.NumberFormat(locale, {
          style: "currency",
          currency,
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }).format(value);
        break;
      case "percent":
        text = new Intl.NumberFormat(locale, {
          style: "percent",
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }).format(value);
        break;
      case "compact":
        text = this.compactNumber(value);
        break;
      default:
        text = new Intl.NumberFormat(locale, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }).format(value);
    }
    return {
      text,
      metrics: this.measureText(text, fontSize, fontFamily)
    };
  }
  /**
   * Get cache statistics.
   */
  getStats() {
    const total = this.cacheHits + this.cacheMisses;
    return {
      cacheSize: this.cache.size,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate: total > 0 ? this.cacheHits / total : 0
    };
  }
  /**
   * Clear the glyph cache.
   */
  clearCache() {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
  // =========================================================================
  // PRIVATE METHODS
  // =========================================================================
  getCacheKey(text, fontSize, fontFamily) {
    return `${fontFamily}|${fontSize}|${text}`;
  }
  addToCache(key, metrics) {
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldestEntry();
    }
    this.cache.set(key, {
      key,
      metrics,
      lastAccessed: Date.now()
    });
  }
  evictOldestEntry() {
    let oldestKey = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
  getAnchoredX(x, anchor, width) {
    switch (anchor) {
      case "middle":
        return x - width / 2;
      case "end":
        return x - width;
      default:
        return x;
    }
  }
  compactNumber(value) {
    const abs = Math.abs(value);
    if (abs >= 1e12) return (value / 1e12).toFixed(1) + "T";
    if (abs >= 1e9) return (value / 1e9).toFixed(1) + "B";
    if (abs >= 1e6) return (value / 1e6).toFixed(1) + "M";
    if (abs >= 1e3) return (value / 1e3).toFixed(1) + "K";
    return value.toString();
  }
};
var glyphOracle = new GlyphOracle();
function measureText(text, fontSize, fontFamily) {
  return glyphOracle.measureText(text, fontSize, fontFamily);
}
function getMaxLabelWidth(labels, fontSize, fontFamily) {
  return glyphOracle.getMaxLabelWidth(labels, fontSize, fontFamily);
}

// ../pvce/src/charts/collision-solver.ts
var DEFAULT_CONFIG = {
  minGap: 8,
  maxIterations: 50,
  leaderLineThreshold: 50,
  enableStagger: true,
  enableRotation: true,
  enableSampling: true,
  rotationAngles: [45, 90],
  sampleSteps: [2, 3, 5, 10]
};
var AxisCollisionSolver = class {
  oracle;
  config;
  constructor(oracle = glyphOracle, config = {}) {
    this.oracle = oracle;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  /**
   * Resolve X-axis label collisions using the 4-level strategy.
   * Returns placement information for all labels.
   */
  resolveAxisLabels(labels, axisStart, axisEnd, axisY, fontSize, fontFamily = "Arial") {
    if (labels.length === 0) {
      return { placements: [], level: 0 /* STANDARD */ };
    }
    const textBoxes = labels.map(
      (text) => this.oracle.createTextBox(text, fontSize, { fontFamily })
    );
    const axisWidth = axisEnd - axisStart;
    const spacing = axisWidth / (labels.length - 1 || 1);
    const positions = labels.map((_, i) => ({
      x: axisStart + i * spacing,
      y: axisY
    }));
    let result = this.tryStandardLayout(textBoxes, positions, labels);
    if (!result.hasCollisions) {
      return { placements: result.placements, level: 0 /* STANDARD */ };
    }
    if (this.config.enableStagger) {
      result = this.tryStaggeredLayout(textBoxes, positions, labels, fontSize);
      if (!result.hasCollisions) {
        return {
          placements: result.placements,
          level: 1 /* STAGGERED */
        };
      }
    }
    if (this.config.enableRotation) {
      for (const angle of this.config.rotationAngles) {
        const rotatedBoxes = textBoxes.map((box) => ({
          ...box,
          rotation: angle
        }));
        result = this.tryRotatedLayout(rotatedBoxes, positions, labels, angle);
        if (!result.hasCollisions) {
          const level = angle === 45 ? 2 /* ROTATED_45 */ : 3 /* ROTATED_90 */;
          return { placements: result.placements, level };
        }
      }
    }
    if (this.config.enableSampling) {
      for (const step of this.config.sampleSteps) {
        result = this.trySampledLayout(textBoxes, positions, labels, step);
        if (!result.hasCollisions) {
          return {
            placements: result.placements,
            level: 4 /* SAMPLED */
          };
        }
      }
    }
    const maxStep = this.config.sampleSteps[this.config.sampleSteps.length - 1] || 10;
    result = this.trySampledLayout(textBoxes, positions, labels, maxStep, true);
    return { placements: result.placements, level: 4 /* SAMPLED */ };
  }
  /**
   * Resolve scatter/line chart label collisions using force-directed layout.
   * Doc 2, Section 4: Deterministic Force-Directed Layout
   */
  resolvePointLabels(points, bounds, fontSize, fontFamily = "Arial") {
    if (points.length === 0) return [];
    const textBoxes = points.map(
      (p) => this.oracle.createTextBox(p.label, fontSize, { fontFamily })
    );
    const placements = points.map((point, i) => {
      const box = textBoxes[i];
      return {
        id: `label-${i}`,
        text: point.label,
        box,
        position: {
          x: point.x - box.width / 2,
          y: point.y - box.height - 10
        },
        collisionLevel: 0 /* STANDARD */,
        isVisible: true
      };
    });
    for (let iter = 0; iter < this.config.maxIterations; iter++) {
      let anyMoved = false;
      for (let i = 0; i < placements.length; i++) {
        const p1 = placements[i];
        let forceX = 0;
        let forceY = 0;
        const point = points[i];
        const labelCenterX = p1.position.x + p1.box.width / 2;
        const labelCenterY = p1.position.y + p1.box.height / 2;
        const labelBottom = p1.position.y + p1.box.height;
        if (labelBottom > point.y - this.config.minGap) {
          forceY -= 2;
        }
        for (let j = 0; j < placements.length; j++) {
          if (i === j) continue;
          const p2 = placements[j];
          if (this.boxesOverlap(p1, p2)) {
            const dx = labelCenterX - (p2.position.x + p2.box.width / 2);
            let dy = labelCenterY - (p2.position.y + p2.box.height / 2);
            if (dx === 0 && dy === 0) {
              dy = i < j ? -1 : 1;
            }
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const strength = Math.min(20, 100 / dist);
            forceX += dx / dist * strength;
            forceY += dy / dist * strength;
          }
        }
        if (Math.abs(forceX) > 0.5 || Math.abs(forceY) > 0.5) {
          p1.position.x += Math.max(-10, Math.min(10, forceX));
          p1.position.y += Math.max(-10, Math.min(10, forceY));
          p1.position.x = Math.max(
            bounds.x,
            Math.min(bounds.x + bounds.width - p1.box.width, p1.position.x)
          );
          p1.position.y = Math.max(
            bounds.y,
            Math.min(bounds.y + bounds.height - p1.box.height, p1.position.y)
          );
          anyMoved = true;
        }
      }
      if (!anyMoved) break;
    }
    for (let i = 0; i < placements.length; i++) {
      const point = points[i];
      const placement = placements[i];
      const labelCenterX = placement.position.x + placement.box.width / 2;
      const labelCenterY = placement.position.y + placement.box.height / 2;
      const displacement = Math.sqrt(
        Math.pow(labelCenterX - point.x, 2) + Math.pow(labelCenterY - point.y, 2)
      );
      placement.box.padding = 0;
      if (displacement > this.config.leaderLineThreshold) {
        placement.leaderLine = {
          fromPoint: {
            x: labelCenterX,
            y: placement.position.y + placement.box.height
          },
          toPoint: { x: point.x, y: point.y },
          targetLabelId: placement.id
        };
      }
    }
    return placements;
  }
  /**
   * Resolve pie/donut chart label collisions with leader lines.
   * Doc 2, Section 5: Radial Labeling (Leader Line Logic)
   */
  resolvePieLabels(slices, center, innerRadius, outerRadius, fontSize, fontFamily = "Arial") {
    const placements = [];
    const labelRadius = outerRadius * 1.3;
    for (let i = 0; i < slices.length; i++) {
      const slice = slices[i];
      const midAngle = (slice.startAngle + slice.endAngle) / 2;
      const sliceAngle = slice.endAngle - slice.startAngle;
      const box = this.oracle.createTextBox(slice.label, fontSize, {
        fontFamily
      });
      const arcLength = sliceAngle * outerRadius;
      const fitsInside = arcLength > box.width * 1.5;
      let position;
      let leaderLine;
      if (fitsInside) {
        const r = (innerRadius + outerRadius) / 2;
        position = {
          x: center.x + Math.cos(midAngle) * r - box.width / 2,
          y: center.y + Math.sin(midAngle) * r - box.height / 2
        };
      } else {
        const labelX = center.x + Math.cos(midAngle) * labelRadius;
        const labelY = center.y + Math.sin(midAngle) * labelRadius;
        const onRightSide = Math.cos(midAngle) > 0;
        box.anchor = onRightSide ? "start" : "end";
        position = {
          x: onRightSide ? labelX : labelX - box.width,
          y: labelY - box.height / 2
        };
        const edgeX = center.x + Math.cos(midAngle) * outerRadius;
        const edgeY = center.y + Math.sin(midAngle) * outerRadius;
        const elbowX = center.x + Math.cos(midAngle) * (outerRadius + 20);
        const elbowY = center.y + Math.sin(midAngle) * (outerRadius + 20);
        leaderLine = {
          fromPoint: { x: edgeX, y: edgeY },
          elbowPoint: { x: elbowX, y: elbowY },
          toPoint: {
            x: onRightSide ? position.x : position.x + box.width,
            y: labelY
          },
          targetLabelId: `pie-label-${i}`
        };
      }
      placements.push({
        id: `pie-label-${i}`,
        text: slice.label,
        box,
        position,
        collisionLevel: fitsInside ? 0 /* STANDARD */ : 4 /* SAMPLED */,
        isVisible: true,
        leaderLine
      });
    }
    this.resolveExternalPieLabels(placements, center, labelRadius);
    return placements;
  }
  // ===========================================================================
  // PRIVATE: Layout Strategy Methods
  // ===========================================================================
  tryStandardLayout(boxes, positions, labels) {
    const placements = [];
    let hasCollisions = false;
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      const pos = positions[i];
      const placement = {
        id: `axis-label-${i}`,
        text: labels[i],
        box: { ...box, anchor: "middle" },
        position: { x: pos.x, y: pos.y },
        collisionLevel: 0 /* STANDARD */,
        isVisible: true
      };
      placements.push(placement);
      for (let j = 0; j < i; j++) {
        if (this.boxesOverlap(placements[j], placement)) {
          hasCollisions = true;
        }
      }
    }
    return { placements, hasCollisions };
  }
  tryStaggeredLayout(boxes, positions, labels, fontSize) {
    const placements = [];
    const staggerOffset = fontSize * 1.5;
    let hasCollisions = false;
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      const pos = positions[i];
      const isStaggered = i % 2 === 1;
      const placement = {
        id: `axis-label-${i}`,
        text: labels[i],
        box: { ...box, anchor: "middle" },
        position: {
          x: pos.x,
          y: pos.y + (isStaggered ? staggerOffset : 0)
        },
        collisionLevel: 1 /* STAGGERED */,
        isVisible: true
      };
      placements.push(placement);
      for (let j = 0; j < i; j++) {
        if (j % 2 === i % 2 && this.boxesOverlap(placements[j], placement)) {
          hasCollisions = true;
        }
      }
    }
    return { placements, hasCollisions };
  }
  tryRotatedLayout(boxes, positions, labels, angle) {
    const placements = [];
    let hasCollisions = false;
    for (let i = 0; i < boxes.length; i++) {
      const box = { ...boxes[i], rotation: angle };
      const pos = positions[i];
      const placement = {
        id: `axis-label-${i}`,
        text: labels[i],
        box,
        position: { x: pos.x, y: pos.y },
        collisionLevel: angle === 45 ? 2 /* ROTATED_45 */ : 3 /* ROTATED_90 */,
        isVisible: true
      };
      placements.push(placement);
      for (let j = 0; j < i; j++) {
        if (this.rotatedBoxesOverlap(placements[j], placement)) {
          hasCollisions = true;
        }
      }
    }
    return { placements, hasCollisions };
  }
  trySampledLayout(boxes, positions, labels, step, force = false) {
    const placements = [];
    let hasCollisions = false;
    for (let i = 0; i < boxes.length; i++) {
      const isVisible = i % step === 0;
      const box = boxes[i];
      const pos = positions[i];
      const placement = {
        id: `axis-label-${i}`,
        text: labels[i],
        box: { ...box, anchor: "middle" },
        position: { x: pos.x, y: pos.y },
        collisionLevel: 4 /* SAMPLED */,
        sampleStep: step,
        isVisible
      };
      placements.push(placement);
      if (isVisible && !force) {
        for (let j = 0; j < i; j++) {
          if (placements[j].isVisible && this.boxesOverlap(placements[j], placement)) {
            hasCollisions = true;
          }
        }
      }
    }
    return { placements, hasCollisions };
  }
  resolveExternalPieLabels(placements, _center, _labelRadius) {
    const external = placements.filter((p) => p.leaderLine);
    external.sort((a, b) => a.position.y - b.position.y);
    for (let iter = 0; iter < 20; iter++) {
      let anyMoved = false;
      for (let i = 1; i < external.length; i++) {
        const prev = external[i - 1];
        const curr = external[i];
        const minY = prev.position.y + prev.box.height + this.config.minGap;
        if (curr.position.y < minY) {
          const shift = minY - curr.position.y;
          curr.position.y = minY;
          if (curr.leaderLine) {
            curr.leaderLine.toPoint.y += shift;
          }
          anyMoved = true;
        }
      }
      if (!anyMoved) break;
    }
  }
  // ===========================================================================
  // PRIVATE: Collision Detection Helpers
  // ===========================================================================
  boxesOverlap(p1, p2) {
    const gap = this.config.minGap;
    const b1 = this.getEffectiveBounds(p1);
    const b2 = this.getEffectiveBounds(p2);
    return !(b1.x + b1.width + gap < b2.x || b2.x + b2.width + gap < b1.x || b1.y + b1.height + gap < b2.y || b2.y + b2.height + gap < b1.y);
  }
  rotatedBoxesOverlap(p1, p2) {
    const gap = this.config.minGap;
    const bounds1 = this.oracle.getRotatedBounds(p1.box);
    const bounds2 = this.oracle.getRotatedBounds(p2.box);
    const x1 = p1.position.x - bounds1.width / 2;
    const x2 = p2.position.x - bounds2.width / 2;
    return !(x1 + bounds1.width + gap < x2 || x2 + bounds2.width + gap < x1 || p1.position.y + bounds1.height + gap < p2.position.y || p2.position.y + bounds2.height + gap < p1.position.y);
  }
  getEffectiveBounds(p) {
    const { box, position } = p;
    let x = position.x;
    switch (box.anchor) {
      case "middle":
        x -= box.width / 2;
        break;
      case "end":
        x -= box.width;
        break;
    }
    return {
      x,
      y: position.y,
      width: box.width,
      height: box.height
    };
  }
};
var collisionSolver = new AxisCollisionSolver();
function resolveAxisLabels(labels, axisStart, axisEnd, axisY, fontSize, fontFamily) {
  return collisionSolver.resolveAxisLabels(
    labels,
    axisStart,
    axisEnd,
    axisY,
    fontSize,
    fontFamily
  );
}
function resolvePointLabels(points, bounds, fontSize, fontFamily) {
  return collisionSolver.resolvePointLabels(
    points,
    bounds,
    fontSize,
    fontFamily
  );
}

// ../pvce/src/charts/svg-renderer.ts
var DEFAULT_OPTIONS = {
  width: 800,
  height: 600,
  enableSnapping: true,
  minStrokeWidth: HAIRLINE_MIN_PT,
  nonScalingStrokes: true,
  includeAccessibility: true,
  prettyPrint: false,
  customCSS: ""
};
var SVGRenderer = class {
  options;
  indent = 0;
  output = [];
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }
  /**
   * Render a Scene Graph to SVG string.
   */
  render(sceneGraph) {
    this.output = [];
    this.indent = 0;
    const { width, height } = this.options;
    const viewBox = sceneGraph.viewBox;
    this.writeLine(`<svg xmlns="http://www.w3.org/2000/svg"`);
    this.indent++;
    this.writeLine(`width="${width}" height="${height}"`);
    this.writeLine(`viewBox="0 0 ${viewBox.width} ${viewBox.height}"`);
    this.writeLine(`preserveAspectRatio="xMidYMid meet"`);
    if (this.options.includeAccessibility && sceneGraph.metadata.accessibility) {
      const acc = sceneGraph.metadata.accessibility;
      this.writeLine(`role="${acc.role}"`);
      this.writeLine(`aria-label="${this.escapeXML(acc.altText)}"`);
    }
    this.writeLine(`>`);
    this.writeStyles();
    if (sceneGraph.defs) {
      this.writeDefs(sceneGraph.defs);
    }
    this.renderNode(sceneGraph.root);
    this.indent--;
    this.writeLine(`</svg>`);
    return this.output.join(this.options.prettyPrint ? "\n" : "");
  }
  /**
   * Render a single chart to SVG (convenience method).
   */
  renderChart(root, viewBox, defs) {
    const sceneGraph = {
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
          lang: "en"
        }
      },
      defs
    };
    return this.render(sceneGraph);
  }
  // ===========================================================================
  // PRIVATE: Node Rendering
  // ===========================================================================
  renderNode(node) {
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
        break;
      default:
        console.warn(`Unknown node type: ${node.type}`);
    }
  }
  renderGroup(node) {
    const attrs = this.buildCommonAttributes(node);
    if (node.x !== 0 || node.y !== 0) {
      attrs.push(
        `transform="translate(${this.snap(node.x)}, ${this.snap(node.y)})"`
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
  renderRect(node) {
    const { attributes: a } = node;
    const attrs = this.buildCommonAttributes(node);
    const x = this.snap(node.x);
    const y = this.snap(node.y);
    const width = a.width ?? 0;
    const height = a.height ?? 0;
    attrs.push(`x="${x}" y="${y}"`);
    attrs.push(`width="${width}" height="${height}"`);
    if (a.patternId) {
      attrs.push(`fill="url(#${a.patternId})"`);
    } else if (a.fill) {
      attrs.push(`fill="${a.fill}"`);
    }
    this.addStrokeAttributes(attrs, a);
    this.writeLine(`<rect ${attrs.join(" ")} />`);
  }
  renderCircle(node) {
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
  renderLine(node) {
    const { attributes: a } = node;
    const attrs = this.buildCommonAttributes(node);
    const x1 = this.snap(a.x1 ?? node.x);
    const y1 = this.snap(a.y1 ?? node.y);
    const x2 = this.snap(a.x2 ?? node.x);
    const y2 = this.snap(a.y2 ?? node.y);
    attrs.push(`x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"`);
    this.addStrokeAttributes(attrs, a);
    this.writeLine(`<line ${attrs.join(" ")} />`);
  }
  renderPath(node) {
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
  renderText(node) {
    const { attributes: a } = node;
    const attrs = this.buildCommonAttributes(node);
    const x = this.snap(node.x);
    const y = this.snap(node.y);
    attrs.push(`x="${x}" y="${y}"`);
    if (a.fontSize) attrs.push(`font-size="${a.fontSize}"`);
    if (a.fontFamily)
      attrs.push(`font-family="${this.escapeXML(a.fontFamily)}"`);
    if (a.fontWeight) attrs.push(`font-weight="${a.fontWeight}"`);
    if (a.textAnchor) attrs.push(`text-anchor="${a.textAnchor}"`);
    if (a.dominantBaseline)
      attrs.push(`dominant-baseline="${a.dominantBaseline}"`);
    attrs.push(`fill="${a.fill || "#000000"}"`);
    if (a.rotation) {
      attrs.push(`transform="rotate(${a.rotation}, ${x}, ${y})"`);
    }
    const text = a.text ? this.escapeXML(a.text) : "";
    this.writeLine(`<text ${attrs.join(" ")}>${text}</text>`);
  }
  // ===========================================================================
  // PRIVATE: Stroke & Style Handling
  // ===========================================================================
  addStrokeAttributes(attrs, a) {
    if (a.stroke) {
      attrs.push(`stroke="${a.stroke}"`);
      let strokeWidth = a.strokeWidth ?? 1;
      strokeWidth = Math.max(strokeWidth, this.options.minStrokeWidth);
      attrs.push(`stroke-width="${strokeWidth}"`);
      if (this.options.nonScalingStrokes && a.vectorEffect !== "none") {
        attrs.push(`vector-effect="non-scaling-stroke"`);
      }
    }
  }
  buildCommonAttributes(node) {
    const attrs = [];
    if (node.id) {
      attrs.push(`id="${this.escapeXML(node.id)}"`);
    }
    if (node.attributes.opacity !== void 0 && node.attributes.opacity !== 1) {
      attrs.push(`opacity="${node.attributes.opacity}"`);
    }
    if (node.attributes.role) {
      attrs.push(`role="${node.attributes.role}"`);
    }
    if (node.attributes.ariaLabel) {
      attrs.push(`aria-label="${this.escapeXML(node.attributes.ariaLabel)}"`);
    }
    return attrs;
  }
  writeStyles() {
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
  writeDefs(defs) {
    this.writeLine(`<defs>`);
    this.indent++;
    for (const pattern of defs.patterns) {
      this.writePattern(pattern);
    }
    if (defs.gradients) {
      for (const gradient of defs.gradients) {
        this.writeGradient(gradient);
      }
    }
    this.indent--;
    this.writeLine(`</defs>`);
  }
  writePattern(p) {
    const size = p.spacing;
    this.writeLine(
      `<pattern id="${p.id}" patternUnits="userSpaceOnUse" width="${size}" height="${size}">`
    );
    this.indent++;
    this.writeLine(
      `<rect width="${size}" height="${size}" fill="transparent" />`
    );
    switch (p.type) {
      case "diagonal-lines":
        this.writeLine(
          `<line x1="0" y1="${size}" x2="${size}" y2="0" stroke="currentColor" stroke-width="${p.strokeWidth}" />`
        );
        break;
      case "dots":
        this.writeLine(
          `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 4}" fill="currentColor" />`
        );
        break;
      case "crosshatch":
        this.writeLine(
          `<line x1="0" y1="${size}" x2="${size}" y2="0" stroke="currentColor" stroke-width="${p.strokeWidth}" />`
        );
        this.writeLine(
          `<line x1="0" y1="0" x2="${size}" y2="${size}" stroke="currentColor" stroke-width="${p.strokeWidth}" />`
        );
        break;
      case "horizontal-lines":
        this.writeLine(
          `<line x1="0" y1="${size / 2}" x2="${size}" y2="${size / 2}" stroke="currentColor" stroke-width="${p.strokeWidth}" />`
        );
        break;
      case "vertical-lines":
        this.writeLine(
          `<line x1="${size / 2}" y1="0" x2="${size / 2}" y2="${size}" stroke="currentColor" stroke-width="${p.strokeWidth}" />`
        );
        break;
      case "diagonal-reverse":
        this.writeLine(
          `<line x1="0" y1="0" x2="${size}" y2="${size}" stroke="currentColor" stroke-width="${p.strokeWidth}" />`
        );
        break;
      case "grid":
        this.writeLine(
          `<line x1="0" y1="${size / 2}" x2="${size}" y2="${size / 2}" stroke="currentColor" stroke-width="${p.strokeWidth}" />`
        );
        this.writeLine(
          `<line x1="${size / 2}" y1="0" x2="${size / 2}" y2="${size}" stroke="currentColor" stroke-width="${p.strokeWidth}" />`
        );
        break;
      case "circles":
        this.writeLine(
          `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 3}" stroke="currentColor" stroke-width="${p.strokeWidth}" fill="none" />`
        );
        break;
    }
    this.indent--;
    this.writeLine(`</pattern>`);
  }
  writeGradient(g) {
    if (g.type === "linear") {
      this.writeLine(
        `<linearGradient id="${g.id}" x1="${g.x1 ?? 0}%" y1="${g.y1 ?? 0}%" x2="${g.x2 ?? 100}%" y2="${g.y2 ?? 0}%">`
      );
    } else {
      this.writeLine(`<radialGradient id="${g.id}">`);
    }
    this.indent++;
    for (const stop of g.stops) {
      this.writeLine(
        `<stop offset="${stop.offset * 100}%" stop-color="${stop.color}" />`
      );
    }
    this.indent--;
    this.writeLine(
      g.type === "linear" ? `</linearGradient>` : `</radialGradient>`
    );
  }
  // ===========================================================================
  // PRIVATE: Utility Methods
  // ===========================================================================
  /**
   * Sub-pixel grid snapping (Doc 3, Section 5).
   * Snaps coordinates to 0.5px offsets for crisp 1px lines.
   */
  snap(value) {
    if (!this.options.enableSnapping) {
      return Math.round(value * 100) / 100;
    }
    return Math.round(value * 2) / 2;
  }
  escapeXML(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }
  writeLine(content) {
    if (this.options.prettyPrint) {
      this.output.push("  ".repeat(this.indent) + content);
    } else {
      this.output.push(content);
    }
  }
};
var svgRenderer = new SVGRenderer();
function renderToSVG(sceneGraph, options) {
  const renderer = options ? new SVGRenderer(options) : svgRenderer;
  return renderer.render(sceneGraph);
}
function snapToGrid(value) {
  return Math.round(value * 2) / 2;
}
function ensureMinStroke(strokeWidth) {
  return Math.max(strokeWidth, HAIRLINE_MIN_PT);
}

// ../pvce/src/charts/color-pipeline.ts
var WCAG_CONTRAST = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3,
  AAA_NORMAL: 7,
  AAA_LARGE: 4.5
};
var MIN_GRAY_DIFFERENCE = 15;
var PATTERN_MAP = [
  "diagonal-lines",
  // Series 0: 45° stripes
  "dots",
  // Series 1
  "crosshatch",
  // Series 2
  "horizontal-lines",
  // Series 3
  "vertical-lines",
  // Series 4
  "diagonal-reverse",
  // Series 5: -45° stripes
  "grid",
  // Series 6
  "circles"
  // Series 7
];
var DEFAULT_PALETTE_COLORS = [
  "#1B4D8F",
  // Deep Blue (contrast: ~8.5:1)
  "#006D5B",
  // Dark Teal (contrast: ~6.5:1)
  "#C62828",
  // Deep Red (contrast: ~5.9:1)
  "#4527A0",
  // Deep Purple (contrast: ~8.2:1)
  "#BF360C",
  // Deep Orange (contrast: ~5.6:1)
  "#1B5E20",
  // Forest Green (contrast: ~8.0:1)
  "#880E4F",
  // Deep Magenta (contrast: ~7.1:1)
  "#01579B",
  // Dark Cyan (contrast: ~6.4:1)
  "#5D4037",
  // Brown (contrast: ~7.5:1)
  "#37474F"
  // Blue Gray (contrast: ~9.8:1)
];
var COLORBLIND_SAFE_COLORS = [
  "#0077BB",
  // Blue
  "#EE7733",
  // Orange
  "#009988",
  // Teal
  "#CC3311",
  // Red
  "#33BBEE",
  // Cyan
  "#EE3377",
  // Magenta
  "#BBBBBB",
  // Gray
  "#000000"
  // Black
];
var MONOCHROME_PALETTE_COLORS = [
  "#1A1A1A",
  // ~10% gray (very dark)
  "#404040",
  // ~25% gray
  "#666666",
  // ~40% gray
  "#8C8C8C",
  // ~55% gray
  "#B3B3B3",
  // ~70% gray
  "#2D2D2D",
  // ~18% gray
  "#525252",
  // ~32% gray
  "#787878",
  // ~47% gray
  "#9E9E9E",
  // ~62% gray
  "#C4C4C4"
  // ~77% gray
];
var ColorPipeline = class {
  colorMode = "rgb";
  enablePatterns = false;
  customPalette;
  constructor(options = {}) {
    this.colorMode = options.colorMode ?? "rgb";
    this.enablePatterns = options.enablePatterns ?? false;
    this.customPalette = options.palette;
  }
  /**
   * Set the color mode (rgb, cmyk, or monochrome).
   */
  setColorMode(mode) {
    this.colorMode = mode;
  }
  /**
   * Enable/disable pattern overlays for accessibility.
   */
  setPatternMode(enabled) {
    this.enablePatterns = enabled;
  }
  /**
   * Convert a hex color to UnifiedColor with all representations.
   */
  parseColor(hex) {
    const rgb = this.hexToRGB(hex);
    const cmyk = this.rgbToCMYK(rgb);
    const grayscale = this.rgbToGrayscale(rgb);
    return {
      rgb,
      cmyk,
      grayscale,
      hex: hex.toUpperCase()
    };
  }
  /**
   * Get the appropriate color value based on current mode.
   */
  getColor(color) {
    switch (this.colorMode) {
      case "cmyk":
        return this.cmykToString(color.cmyk);
      case "monochrome":
        return this.grayscaleToString(color.grayscale);
      default:
        return color.hex;
    }
  }
  /**
   * Get color for a series index from the palette.
   */
  getSeriesColor(seriesIndex) {
    const colors = this.colorMode === "monochrome" ? MONOCHROME_PALETTE_COLORS : this.customPalette ?? DEFAULT_PALETTE_COLORS;
    const hex = colors[seriesIndex % colors.length];
    return this.parseColor(hex);
  }
  /**
   * Get pattern definition for a series (Doc 4, Section 3).
   * Patterns are deterministically mapped to series index.
   */
  getSeriesPattern(seriesIndex) {
    const patternType = PATTERN_MAP[seriesIndex % PATTERN_MAP.length];
    return {
      id: `pattern-series-${seriesIndex}`,
      seriesIndex,
      type: patternType,
      strokeWidth: 1.5,
      spacing: 8,
      angle: patternType === "diagonal-lines" ? 45 : patternType === "diagonal-reverse" ? -45 : 0
    };
  }
  /**
   * Check if patterns should be used (>3 series or monochrome mode).
   */
  shouldUsePatterns(seriesCount) {
    return this.enablePatterns || this.colorMode === "monochrome" || seriesCount > 3;
  }
  /**
   * Generate a complete color palette with patterns.
   */
  createPalette(seriesCount, name = "default") {
    const colors = [];
    const patterns = [];
    for (let i = 0; i < seriesCount; i++) {
      colors.push(this.getSeriesColor(i));
      patterns.push(this.getSeriesPattern(i));
    }
    const contrastResults = this.checkPaletteContrast(colors);
    return {
      name,
      colors,
      patterns,
      meetsWCAG: contrastResults.allPass,
      minContrastRatio: contrastResults.minRatio
    };
  }
  /**
   * Calculate contrast ratio between two colors (WCAG formula).
   */
  getContrastRatio(color1, color2) {
    const l1 = this.getRelativeLuminance(color1.rgb);
    const l2 = this.getRelativeLuminance(color2.rgb);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }
  /**
   * Check if two colors have sufficient contrast for text.
   */
  hasAdequateContrast(foreground, background, isLargeText = false) {
    const ratio = this.getContrastRatio(foreground, background);
    const required = isLargeText ? WCAG_CONTRAST.AA_LARGE : WCAG_CONTRAST.AA_NORMAL;
    return ratio >= required;
  }
  /**
   * Find a text color (black or white) with best contrast.
   */
  getTextColor(background) {
    const white = this.parseColor("#FFFFFF");
    const black = this.parseColor("#000000");
    const whiteContrast = this.getContrastRatio(white, background);
    const blackContrast = this.getContrastRatio(black, background);
    return whiteContrast > blackContrast ? white : black;
  }
  /**
   * Ensure grayscale values are distinct enough (Doc 4, Section 2).
   * Returns adjusted colors if needed.
   */
  ensureGrayscaleDistinction(colors) {
    const sorted = [...colors].sort(
      (a, b) => a.grayscale.gray - b.grayscale.gray
    );
    const result = [];
    let lastGray = -MIN_GRAY_DIFFERENCE;
    for (const color of sorted) {
      let gray = color.grayscale.gray;
      if (gray - lastGray < MIN_GRAY_DIFFERENCE) {
        gray = Math.min(100, lastGray + MIN_GRAY_DIFFERENCE);
      }
      if (gray !== color.grayscale.gray) {
        const adjustedRGB = this.grayscaleToRGB(gray);
        result.push({
          rgb: adjustedRGB,
          cmyk: this.rgbToCMYK(adjustedRGB),
          grayscale: { gray, perceptualLuminance: gray / 100 },
          hex: this.rgbToHex(adjustedRGB)
        });
      } else {
        result.push(color);
      }
      lastGray = gray;
    }
    return result;
  }
  // ===========================================================================
  // PRIVATE: Color Conversion Methods
  // ===========================================================================
  hexToRGB(hex) {
    const clean = hex.replace("#", "");
    return {
      r: parseInt(clean.substring(0, 2), 16),
      g: parseInt(clean.substring(2, 4), 16),
      b: parseInt(clean.substring(4, 6), 16),
      a: 1
    };
  }
  rgbToHex(rgb) {
    const toHex = (n) => Math.round(n).toString(16).padStart(2, "0");
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase();
  }
  /**
   * Convert RGB to CMYK using standard formulas.
   * Doc 4, Section 2: ICC Color Profiles support.
   */
  rgbToCMYK(rgb) {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
    const k = 1 - Math.max(r, g, b);
    if (k === 1) {
      return { c: 0, m: 0, y: 0, k: 100 };
    }
    const c = (1 - r - k) / (1 - k);
    const m = (1 - g - k) / (1 - k);
    const y = (1 - b - k) / (1 - k);
    return {
      c: Math.round(c * 100),
      m: Math.round(m * 100),
      y: Math.round(y * 100),
      k: Math.round(k * 100)
    };
  }
  /**
   * Convert RGB to Grayscale using perceptual luminance.
   * Doc 4, Section 2: Deterministic Color-to-Gray Mapping.
   */
  rgbToGrayscale(rgb) {
    const luminance = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
    const gray = Math.round(luminance / 255 * 100);
    return {
      gray,
      perceptualLuminance: luminance / 255
    };
  }
  grayscaleToRGB(gray) {
    const value = Math.round(gray / 100 * 255);
    return { r: value, g: value, b: value, a: 1 };
  }
  cmykToString(cmyk) {
    return `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`;
  }
  grayscaleToString(gs) {
    const value = Math.round(gs.gray / 100 * 255);
    return `rgb(${value}, ${value}, ${value})`;
  }
  /**
   * Calculate relative luminance for WCAG contrast formula.
   */
  getRelativeLuminance(rgb) {
    const transform = (v) => {
      v = v / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    const r = transform(rgb.r);
    const g = transform(rgb.g);
    const b = transform(rgb.b);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  /**
   * Check contrast between all adjacent colors in palette.
   */
  checkPaletteContrast(colors) {
    const white = this.parseColor("#FFFFFF");
    let minRatio = Infinity;
    for (const color of colors) {
      const ratio = this.getContrastRatio(color, white);
      minRatio = Math.min(minRatio, ratio);
    }
    return {
      allPass: minRatio >= WCAG_CONTRAST.AA_NORMAL,
      minRatio
    };
  }
};
var colorPipeline = new ColorPipeline();
function parseColor(hex) {
  return colorPipeline.parseColor(hex);
}
function getContrastRatio(hex1, hex2) {
  const c1 = colorPipeline.parseColor(hex1);
  const c2 = colorPipeline.parseColor(hex2);
  return colorPipeline.getContrastRatio(c1, c2);
}
function meetsContrastRequirement(foregroundHex, backgroundHex, level = "AA", isLargeText = false) {
  const ratio = getContrastRatio(foregroundHex, backgroundHex);
  if (level === "AAA") {
    return isLargeText ? ratio >= WCAG_CONTRAST.AAA_LARGE : ratio >= WCAG_CONTRAST.AAA_NORMAL;
  }
  return isLargeText ? ratio >= WCAG_CONTRAST.AA_LARGE : ratio >= WCAG_CONTRAST.AA_NORMAL;
}
function createMonochromePalette(seriesCount) {
  const pipeline = new ColorPipeline({
    colorMode: "monochrome",
    enablePatterns: true
  });
  return pipeline.createPalette(seriesCount, "monochrome");
}

// ../pvce/src/charts/accessibility.ts
import crypto from "crypto";
var DEFAULT_OPTIONS2 = {
  lang: "en-US",
  title: "Chart",
  includeDataTable: true,
  maxDescribedPoints: 20,
  numberFormat: { maximumFractionDigits: 2 },
  includePercentages: true
};
var AccessibilityGenerator = class {
  options;
  formatter;
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS2, ...options };
    this.formatter = new Intl.NumberFormat(
      this.options.lang,
      this.options.numberFormat
    );
  }
  /**
   * Generate complete accessibility metadata for a chart.
   */
  generateMetadata(chartType, data, title) {
    const effectiveTitle = title ?? this.options.title;
    return {
      role: "Chart",
      altText: this.generateAltText(chartType, data, effectiveTitle),
      caption: effectiveTitle,
      dataSummary: this.generateDataSummary(chartType, data),
      lang: this.options.lang
    };
  }
  /**
   * Generate natural language description of the chart.
   * Doc 4, Section 4: Alt-Text Generation.
   */
  generateAltText(chartType, data, title) {
    const parts = [];
    const chartTypeName = this.getChartTypeName(chartType);
    if (title) {
      parts.push(`${chartTypeName} titled "${title}".`);
    } else {
      parts.push(`${chartTypeName}.`);
    }
    parts.push(this.describeDataOverview(chartType, data));
    const trend = (data.seriesCount ?? 1) <= 1 ? this.analyzeTrend(data) : null;
    if (trend) {
      parts.push(trend);
    }
    parts.push(this.describeStatistics(data));
    return parts.join(" ");
  }
  /**
   * Generate structured data summary for screen readers.
   */
  generateDataSummary(chartType, data) {
    const summary = [];
    const total = this.calculateTotal(data);
    for (let i = 0; i < Math.min(data.values.length, this.options.maxDescribedPoints); i++) {
      const value = data.values[i];
      const category = data.categories?.[i] ?? `Item ${i + 1}`;
      const formattedValue = this.formatValue(value, data.valueType);
      let percentage;
      if (this.options.includePercentages && total > 0) {
        percentage = value / total * 100;
      }
      const description = this.generatePointDescription(
        chartType,
        category,
        formattedValue,
        percentage,
        i,
        data.values.length
      );
      summary.push({
        index: i,
        category,
        value,
        formattedValue,
        percentage,
        description
      });
    }
    return summary;
  }
  /**
   * Add accessibility attributes to scene nodes.
   * Maps scene graph nodes to PDF/UA roles.
   */
  addAccessibilityToNode(node, info) {
    return {
      ...node,
      attributes: {
        ...node.attributes,
        role: info.role,
        ariaLabel: info.label,
        ariaDescribedBy: info.describedBy
      },
      metadata: {
        ...node.metadata,
        isAccessibilityNode: true
      }
    };
  }
  /**
   * Generate XMP metadata for data provenance.
   * Doc 4, Section 5: XMP Metadata Embedding.
   */
  generateXMPMetadata(chartType, sourceData, version = "1.0.0") {
    const jsonString = JSON.stringify(sourceData, null, 2);
    const dataHash = this.hashData(jsonString);
    return {
      sourceData: jsonString,
      dataHash,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      generatorVersion: version,
      chartType
    };
  }
  /**
   * Generate XMP XML string for PDF embedding.
   */
  generateXMPXML(metadata) {
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
  getChartTypeName(type) {
    const names = {
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
      combo: "Combo chart"
    };
    return names[type] || "Chart";
  }
  describeDataOverview(chartType, data) {
    const count = data.values.length;
    const categoryType = data.categoryType ?? "categories";
    if (data.seriesCount !== void 0 && data.categoryCount !== void 0) {
      if (chartType === "combo") {
        const axisDescription = data.secondaryAxis ? "a separate right-hand axis for the line" : "a shared value axis";
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
  analyzeTrend(data) {
    if (data.values.length < 3) return null;
    const first = data.values[0];
    const last = data.values[data.values.length - 1];
    const change = (last - first) / Math.abs(first) * 100;
    let increasing = 0;
    let decreasing = 0;
    for (let i = 1; i < data.values.length; i++) {
      if (data.values[i] > data.values[i - 1]) increasing++;
      if (data.values[i] < data.values[i - 1]) decreasing++;
    }
    const trend = increasing > decreasing * 1.5 ? "upward" : decreasing > increasing * 1.5 ? "downward" : "fluctuating";
    if (Math.abs(change) < 5) {
      return "The data shows relatively stable values.";
    }
    const direction = change > 0 ? "increase" : "decrease";
    const changeFormatted = this.formatter.format(Math.abs(change));
    return `Shows an ${trend} trend with ${changeFormatted}% overall ${direction} from ${this.formatValue(first, data.valueType)} to ${this.formatValue(last, data.valueType)}.`;
  }
  describeStatistics(data) {
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
    return `Minimum value of ${this.formatValue(min, data.valueType)} at ${minCat}; maximum of ${this.formatValue(max, data.valueType)} at ${maxCat}; average of ${this.formatValue(avg, data.valueType)}.`;
  }
  generatePointDescription(chartType, category, formattedValue, percentage, index, total) {
    let desc = `${category}: ${formattedValue}`;
    if (percentage !== void 0) {
      desc += ` (${this.formatter.format(percentage)}%)`;
    }
    if (index === 0) {
      desc += " (first)";
    } else if (index === total - 1) {
      desc += " (last)";
    }
    return desc;
  }
  formatValue(value, type) {
    switch (type) {
      case "currency":
        return new Intl.NumberFormat(this.options.lang, {
          style: "currency",
          currency: "USD"
        }).format(value);
      case "percent":
        return new Intl.NumberFormat(this.options.lang, {
          style: "percent",
          maximumFractionDigits: 1
        }).format(value / 100);
      default:
        return this.formatter.format(value);
    }
  }
  calculateTotal(data) {
    return data.values.reduce((sum, v) => sum + Math.abs(v), 0);
  }
  hashData(data) {
    return crypto.createHash("sha256").update(data).digest("hex");
  }
};
var accessibilityGenerator = new AccessibilityGenerator();
function generateChartAltText(chartType, values, categories, title) {
  return accessibilityGenerator.generateAltText(
    chartType,
    { values, categories },
    title
  );
}
function generateXMPMetadata(chartType, sourceData) {
  return accessibilityGenerator.generateXMPMetadata(chartType, sourceData);
}
function hashChartData(data) {
  const json = JSON.stringify(data);
  return crypto.createHash("sha256").update(json).digest("hex");
}

// ../pvce/src/charts/determinism.ts
import crypto2 from "crypto";
var Mulberry32 = class {
  state;
  seed;
  constructor(seed) {
    this.seed = seed;
    this.state = seed;
  }
  /**
   * Get next random number in range [0, 1).
   */
  next() {
    let t = this.state += 1831565813;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  /**
   * Get random integer in range [min, max] (inclusive).
   */
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  /**
   * Get random item from array.
   */
  choice(array) {
    return array[this.nextInt(0, array.length - 1)];
  }
  /**
   * Shuffle array using Fisher-Yates algorithm.
   * Returns a new array (does not mutate input).
   */
  shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  /**
   * Reset to initial seed state.
   */
  reset() {
    this.state = this.seed;
  }
};
function hashData(data) {
  const normalized = normalizeForHashing(data);
  return crypto2.createHash("sha256").update(normalized).digest("hex");
}
function shortHash(data) {
  return hashData(data).substring(0, 8);
}
function normalizeForHashing(data) {
  return JSON.stringify(data, (key, value) => {
    if (typeof value === "number") {
      return Math.round(value * 1e6) / 1e6;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return Object.keys(value).sort().reduce((sorted, k) => {
        sorted[k] = value[k];
        return sorted;
      }, {});
    }
    return value;
  });
}
function generateNodeId(prefix, dataIndex, parentId) {
  const base = parentId ? `${parentId}-${prefix}` : prefix;
  return `${base}-${dataIndex}`;
}
function generateNodeIds(prefix, count, parentId) {
  return Array.from(
    { length: count },
    (_, i) => generateNodeId(prefix, i, parentId)
  );
}
function stripAnimations(node) {
  const cleaned = { ...node };
  const animationProps = [
    "transition",
    "animation",
    "animationDuration",
    "animationDelay",
    "animationTimingFunction",
    "transitionDuration",
    "transitionDelay"
  ];
  const cleanedAttrs = { ...cleaned.attributes };
  for (const prop of animationProps) {
    delete cleanedAttrs[prop];
  }
  cleaned.attributes = cleanedAttrs;
  if (cleaned.children) {
    cleaned.children = cleaned.children.map(stripAnimations);
  }
  return cleaned;
}
function verifyNoAnimations(graph) {
  const violations = [];
  function checkNode(node, path) {
    const attrs = node.attributes;
    if (attrs.transition || attrs.animation || attrs.animationDuration) {
      violations.push(`${path}: Contains animation properties`);
    }
    if (node.children) {
      node.children.forEach((child, i) => {
        checkNode(child, `${path}.children[${i}]`);
      });
    }
  }
  checkNode(graph.root, "root");
  return {
    valid: violations.length === 0,
    violations
  };
}
function validateDeterminism(graph) {
  const errors = [];
  const warnings = [];
  if (!graph.version) {
    errors.push("Missing version field");
  }
  if (!graph.viewBox || graph.viewBox.width <= 0 || graph.viewBox.height <= 0) {
    errors.push("Invalid viewBox dimensions");
  }
  if (!graph.metadata?.dataHash) {
    warnings.push("Missing dataHash in metadata - VRT verification disabled");
  }
  const animCheck = verifyNoAnimations(graph);
  if (!animCheck.valid) {
    errors.push(...animCheck.violations);
  }
  const ids = /* @__PURE__ */ new Set();
  function checkIds(node) {
    if (ids.has(node.id)) {
      errors.push(`Duplicate node ID: ${node.id}`);
    }
    ids.add(node.id);
    node.children?.forEach(checkIds);
  }
  checkIds(graph.root);
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
function compareSceneGraphs(graph1, graph2) {
  const differences = [];
  if (graph1.viewBox.width !== graph2.viewBox.width || graph1.viewBox.height !== graph2.viewBox.height) {
    differences.push("ViewBox dimensions differ");
  }
  if (graph1.metadata?.dataHash !== graph2.metadata?.dataHash) {
    differences.push("Data hashes differ");
  }
  function compareNodes(n1, n2, path) {
    if (n1.type !== n2.type) {
      differences.push(`${path}: Type mismatch (${n1.type} vs ${n2.type})`);
      return;
    }
    if (n1.id !== n2.id) {
      differences.push(`${path}: ID mismatch (${n1.id} vs ${n2.id})`);
    }
    const tolerance = 1e-4;
    if (Math.abs(n1.x - n2.x) > tolerance || Math.abs(n1.y - n2.y) > tolerance) {
      differences.push(`${path}: Position mismatch`);
    }
    const attrs1 = JSON.stringify(n1.attributes);
    const attrs2 = JSON.stringify(n2.attributes);
    if (attrs1 !== attrs2) {
      differences.push(`${path}: Attributes differ`);
    }
    const children1 = n1.children || [];
    const children2 = n2.children || [];
    if (children1.length !== children2.length) {
      differences.push(`${path}: Child count mismatch`);
    } else {
      children1.forEach((c1, i) => {
        compareNodes(c1, children2[i], `${path}.children[${i}]`);
      });
    }
  }
  compareNodes(graph1.root, graph2.root, "root");
  return {
    equal: differences.length === 0,
    differences
  };
}
function deriveSeedFromData(data) {
  const hash = hashData(data);
  return parseInt(hash.substring(0, 8), 16);
}
function createSeededRandom(data) {
  const seed = deriveSeedFromData(data);
  return new Mulberry32(seed);
}

// ../pvce/src/charts/path-optimizer.ts
var DEFAULT_OPTIONS3 = {
  areaThreshold: 0.5,
  subPixelThreshold: 0.01,
  maxPoints: void 0
};
var PathOptimizer = class {
  options;
  constructor(options = {}) {
    this.options = {
      ...DEFAULT_OPTIONS3,
      ...options,
      maxPoints: options.maxPoints ?? Infinity
    };
  }
  /**
   * Simplify a path using Visvalingam-Whyatt algorithm.
   * Removes points that contribute the least visual area.
   */
  simplifyPath(points) {
    if (points.length <= 2) {
      return {
        originalPointCount: points.length,
        optimizedPointCount: points.length,
        pathData: this.pointsToPathData(points),
        savings: 0
      };
    }
    const simplified = this.visvalingamWhyatt(
      points,
      this.options.areaThreshold
    );
    const filtered = this.filterSubPixel(simplified);
    const final = this.options.maxPoints < filtered.length ? this.reduceToMaxPoints(filtered, this.options.maxPoints) : filtered;
    const savings = points.length > 0 ? (points.length - final.length) / points.length * 100 : 0;
    return {
      originalPointCount: points.length,
      optimizedPointCount: final.length,
      pathData: this.pointsToPathData(final),
      savings: Math.round(savings * 100) / 100
    };
  }
  /**
   * Simplify an SVG path string (d attribute).
   */
  simplifyPathString(pathData) {
    const points = this.parsePathData(pathData);
    return this.simplifyPath(points);
  }
  /**
   * Optimize multiple paths and return combined statistics.
   */
  optimizePaths(paths) {
    let totalOriginal = 0;
    let totalOptimized = 0;
    const optimizedPaths = paths.map(({ id, points }) => {
      const result = this.simplifyPath(points);
      totalOriginal += result.originalPointCount;
      totalOptimized += result.optimizedPointCount;
      return { id, pathData: result.pathData };
    });
    const totalSavings = totalOriginal > 0 ? (totalOriginal - totalOptimized) / totalOriginal * 100 : 0;
    return {
      optimizedPaths,
      totalOriginalPoints: totalOriginal,
      totalOptimizedPoints: totalOptimized,
      totalSavings: Math.round(totalSavings * 100) / 100
    };
  }
  // ===========================================================================
  // PRIVATE: Visvalingam-Whyatt Algorithm
  // ===========================================================================
  /**
   * Visvalingam-Whyatt simplification algorithm.
   * Iteratively removes the point with the smallest effective area.
   */
  visvalingamWhyatt(points, threshold) {
    if (points.length <= 2) return points;
    const nodes = points.map((point) => ({
      point,
      area: Infinity,
      prev: null,
      next: null
    }));
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].prev = i > 0 ? nodes[i - 1] : null;
      nodes[i].next = i < nodes.length - 1 ? nodes[i + 1] : null;
    }
    for (let i = 1; i < nodes.length - 1; i++) {
      nodes[i].area = this.triangleArea(
        nodes[i].prev.point,
        nodes[i].point,
        nodes[i].next.point
      );
    }
    const heap = nodes.slice(1, -1);
    this.heapify(heap);
    while (heap.length > 0 && heap[0].area < threshold) {
      const minNode = this.heapPop(heap);
      if (!minNode) break;
      if (minNode.prev) minNode.prev.next = minNode.next;
      if (minNode.next) minNode.next.prev = minNode.prev;
      if (minNode.prev && minNode.prev.prev) {
        const newArea = this.triangleArea(
          minNode.prev.prev.point,
          minNode.prev.point,
          minNode.prev.next?.point ?? minNode.prev.point
        );
        minNode.prev.area = Math.max(minNode.prev.area, newArea);
        this.heapUpdate(heap, minNode.prev);
      }
      if (minNode.next && minNode.next.next) {
        const newArea = this.triangleArea(
          minNode.next.prev?.point ?? minNode.next.point,
          minNode.next.point,
          minNode.next.next.point
        );
        minNode.next.area = Math.max(minNode.next.area, newArea);
        this.heapUpdate(heap, minNode.next);
      }
    }
    const result = [];
    let current = nodes[0];
    while (current) {
      result.push(current.point);
      current = current.next;
    }
    return result;
  }
  /**
   * Calculate the area of a triangle formed by three points.
   * Uses the shoelace formula.
   */
  triangleArea(p1, p2, p3) {
    return Math.abs(
      (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y)) / 2
    );
  }
  // ===========================================================================
  // PRIVATE: Sub-Pixel Filtering
  // ===========================================================================
  /**
   * Remove points that are within sub-pixel threshold of their neighbors.
   * Doc 3, Section 2: "Points smaller than 0.01px rendering threshold"
   */
  filterSubPixel(points) {
    if (points.length <= 2) return points;
    const threshold = this.options.subPixelThreshold;
    const result = [points[0]];
    for (let i = 1; i < points.length - 1; i++) {
      const prev = result[result.length - 1];
      const curr = points[i];
      const next = points[i + 1];
      const distToPrev = this.distance(prev, curr);
      const distToNext = this.distance(curr, next);
      if (distToPrev > threshold || distToNext > threshold) {
        result.push(curr);
      }
    }
    result.push(points[points.length - 1]);
    return result;
  }
  /**
   * Euclidean distance between two points.
   */
  distance(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }
  /**
   * Reduce to maximum number of points using adaptive simplification.
   */
  reduceToMaxPoints(points, maxPoints) {
    if (points.length <= maxPoints) return points;
    let threshold = this.options.areaThreshold;
    let result = points;
    while (result.length > maxPoints && threshold < 1e6) {
      threshold *= 2;
      result = this.visvalingamWhyatt(points, threshold);
    }
    return result;
  }
  // ===========================================================================
  // PRIVATE: Path Data Conversion
  // ===========================================================================
  /**
   * Convert points to SVG path data string.
   */
  pointsToPathData(points) {
    if (points.length === 0) return "";
    if (points.length === 1) return `M${this.formatCoord(points[0])}`;
    const parts = [`M${this.formatCoord(points[0])}`];
    for (let i = 1; i < points.length; i++) {
      parts.push(`L${this.formatCoord(points[i])}`);
    }
    return parts.join("");
  }
  /**
   * Format coordinate with appropriate precision.
   */
  formatCoord(p) {
    const x = Math.round(p.x * 100) / 100;
    const y = Math.round(p.y * 100) / 100;
    return `${x},${y}`;
  }
  /**
   * Parse SVG path data into points.
   * Handles M, L, H, V, and Z commands.
   */
  parsePathData(d) {
    const points = [];
    let currentX = 0;
    let currentY = 0;
    const commands = d.match(/[MLHVZmlhvz][^MLHVZmlhvz]*/g) || [];
    for (const cmd of commands) {
      const type = cmd[0];
      const args = cmd.slice(1).trim().split(/[\s,]+/).map(parseFloat).filter((n) => !isNaN(n));
      switch (type) {
        case "M":
        case "m":
          if (args.length >= 2) {
            currentX = type === "M" ? args[0] : currentX + args[0];
            currentY = type === "M" ? args[1] : currentY + args[1];
            points.push({ x: currentX, y: currentY });
          }
          break;
        case "L":
        case "l":
          for (let i = 0; i < args.length; i += 2) {
            currentX = type === "L" ? args[i] : currentX + args[i];
            currentY = type === "L" ? args[i + 1] : currentY + args[i + 1];
            points.push({ x: currentX, y: currentY });
          }
          break;
        case "H":
        case "h":
          for (const arg of args) {
            currentX = type === "H" ? arg : currentX + arg;
            points.push({ x: currentX, y: currentY });
          }
          break;
        case "V":
        case "v":
          for (const arg of args) {
            currentY = type === "V" ? arg : currentY + arg;
            points.push({ x: currentX, y: currentY });
          }
          break;
        case "Z":
        case "z":
          if (points.length > 0) {
            currentX = points[0].x;
            currentY = points[0].y;
          }
          break;
      }
    }
    return points;
  }
  // ===========================================================================
  // PRIVATE: Min-Heap Operations
  // ===========================================================================
  heapify(heap) {
    for (let i = Math.floor(heap.length / 2) - 1; i >= 0; i--) {
      this.heapDown(heap, i);
    }
  }
  heapPop(heap) {
    if (heap.length === 0) return void 0;
    const result = heap[0];
    const last = heap.pop();
    if (heap.length > 0) {
      heap[0] = last;
      this.heapDown(heap, 0);
    }
    return result;
  }
  heapUpdate(heap, node) {
    const index = heap.indexOf(node);
    if (index === -1) return;
    this.heapUp(heap, index);
    this.heapDown(heap, index);
  }
  heapUp(heap, index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (heap[parent].area <= heap[index].area) break;
      [heap[parent], heap[index]] = [heap[index], heap[parent]];
      index = parent;
    }
  }
  heapDown(heap, index) {
    const length = heap.length;
    while (true) {
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      let smallest = index;
      if (left < length && heap[left].area < heap[smallest].area) {
        smallest = left;
      }
      if (right < length && heap[right].area < heap[smallest].area) {
        smallest = right;
      }
      if (smallest === index) break;
      [heap[index], heap[smallest]] = [heap[smallest], heap[index]];
      index = smallest;
    }
  }
};
var pathOptimizer = new PathOptimizer();
function simplifyPath(points) {
  return pathOptimizer.simplifyPath(points);
}
function simplifyPathString(pathData) {
  return pathOptimizer.simplifyPathString(pathData);
}
function optimizeLineChart(values, bounds) {
  if (values.length === 0) {
    return {
      originalPointCount: 0,
      optimizedPointCount: 0,
      pathData: "",
      savings: 0
    };
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => ({
    x: bounds.x + i / (values.length - 1 || 1) * bounds.width,
    y: bounds.y + bounds.height - (v - min) / range * bounds.height
  }));
  return pathOptimizer.simplifyPath(points);
}

// ../pvce/src/charts/compiler.ts
var DEFAULT_COMPILER_OPTIONS = {
  width: 800,
  height: 600,
  fontFamily: "Arial",
  fontSize: 12,
  accessibility: true,
  monochrome: false,
  patterns: false,
  embedSourceData: true,
  palette: DEFAULT_PALETTE_COLORS,
  seed: 0,
  prettyPrint: false
};
var PVCECompiler = class {
  glyphOracle;
  collisionSolver;
  svgRenderer;
  colorPipeline;
  accessibilityGenerator;
  pathOptimizer;
  options;
  warnings = [];
  // Stats tracking
  stats = {
    compileTime: 0,
    nodeCount: 0,
    svgSize: 0,
    pathOptimization: 0,
    glyphCacheHits: 0,
    collisionsResolved: 0
  };
  constructor(options = {}) {
    this.options = { ...DEFAULT_COMPILER_OPTIONS, ...options };
    this.glyphOracle = glyphOracle;
    this.collisionSolver = collisionSolver;
    this.svgRenderer = new SVGRenderer({
      width: this.options.width,
      height: this.options.height,
      prettyPrint: this.options.prettyPrint,
      includeAccessibility: this.options.accessibility
    });
    this.colorPipeline = new ColorPipeline({
      colorMode: this.options.monochrome ? "monochrome" : "rgb",
      enablePatterns: this.options.patterns,
      palette: this.options.palette
    });
    this.accessibilityGenerator = accessibilityGenerator;
    this.pathOptimizer = pathOptimizer;
  }
  /**
   * Compile a chart to Scene Graph and SVG.
   * This is the main entry point - Doc 1, Section 2: The Pure-Function Pipeline.
   */
  compile(chartType, input) {
    const startTime = performance.now();
    this.resetStats();
    const dataHash = hashData(input.data);
    const seed = this.options.seed || this.deriveSeed(dataHash);
    const random = createSeededRandom(input.data);
    const viewBox = {
      width: VIRTUAL_CANVAS.WIDTH,
      height: VIRTUAL_CANVAS.HEIGHT
    };
    const bounds = {
      x: 500,
      y: 500,
      width: viewBox.width - 1e3,
      height: viewBox.height - 1e3
    };
    let root;
    let chartData;
    switch (chartType) {
      case "bar":
        ({ root, chartData } = this.compileBarChart(input, bounds, random));
        break;
      case "marimekko":
        this.warnings.push({
          code: "UNSUPPORTED_CHART_TYPE",
          message: 'Chart type "marimekko" is not natively supported, rendered as bar.',
          path: "chartType",
          value: chartType,
          suggestion: 'Use "bar" for the current fallback behavior.'
        });
        ({ root, chartData } = this.compileBarChart(input, bounds, random));
        break;
      case "area":
        ({ root, chartData } = this.compileAreaChart(input, bounds));
        break;
      case "stacked-bar":
        ({ root, chartData } = this.compileStackedBarChart(input, bounds));
        break;
      case "grouped-bar":
        ({ root, chartData } = this.compileGroupedBarChart(input, bounds));
        break;
      case "combo":
        ({ root, chartData } = this.compileComboChart(input, bounds));
        break;
      case "line":
        ({ root, chartData } = this.compileLineChart(input, bounds, random));
        break;
      case "scatter":
        ({ root, chartData } = this.compileScatterChart(input, bounds, random));
        break;
      case "pie":
      case "donut":
        ({ root, chartData } = this.compilePieChart(
          input,
          bounds,
          chartType === "donut"
        ));
        break;
      case "waterfall":
        ({ root, chartData } = this.compileWaterfallChart(input, bounds));
        break;
      default:
        this.warnings.push({
          code: "UNKNOWN_CHART_TYPE",
          message: `Unknown chart type "${String(chartType)}"; rendered with the bar chart fallback.`,
          path: "chartType",
          value: chartType,
          suggestion: "Use one of the chart types exported by ChartType."
        });
        ({ root, chartData } = this.compileBarChart(input, bounds, random));
    }
    root = stripAnimations(root);
    const accessibility = this.options.accessibility ? this.accessibilityGenerator.generateMetadata(
      chartType,
      chartData,
      input.config?.title
    ) : this.createMinimalAccessibility(chartType);
    const xmpMetadata = this.options.embedSourceData ? this.accessibilityGenerator.generateXMPMetadata(chartType, input.data) : this.createMinimalXMP(chartType);
    const patterns = this.colorPipeline.shouldUsePatterns(
      input.data?.series?.length ?? 1
    ) ? this.generatePatterns(input.data?.series?.length ?? 5) : [];
    const sceneGraph = {
      version: "1.0.0",
      viewBox,
      root,
      metadata: {
        dataHash,
        generatedAt: Date.now(),
        deterministicSeed: seed,
        chartType,
        accessibility
      },
      defs: patterns.length > 0 ? { patterns } : void 0
    };
    const validation = validateDeterminism(sceneGraph);
    if (!validation.valid) {
      console.warn("Determinism validation warnings:", validation.warnings);
    }
    const svg = this.svgRenderer.render(sceneGraph);
    const endTime = performance.now();
    this.stats.compileTime = Math.round(endTime - startTime);
    this.stats.nodeCount = this.countNodes(root);
    this.stats.svgSize = new Blob([svg]).size;
    this.stats.glyphCacheHits = this.glyphOracle.getStats().cacheHits;
    return {
      sceneGraph,
      svg,
      accessibility,
      xmpMetadata,
      stats: { ...this.stats },
      warnings: [...this.warnings]
    };
  }
  // ===========================================================================
  // CHART TYPE COMPILERS
  // ===========================================================================
  /**
   * Compile a bar chart.
   */
  compileBarChart(input, bounds, _random) {
    const data = this.normalizeBarData(input.data);
    const { categories, values, series } = data;
    const children = [];
    const barPadding = 100;
    const barWidth = values.length > 0 ? (bounds.width - barPadding * (values.length + 1)) / values.length : 0;
    const [minValue, maxValue] = this.getNumericDomain(values, true);
    const range = maxValue - minValue || 1;
    const yAxisWidth = this.calculateAxisWidth(minValue, maxValue);
    const xAxisHeight = 300;
    const plotBounds = {
      x: bounds.x + yAxisWidth,
      y: bounds.y,
      width: bounds.width - yAxisWidth,
      height: bounds.height - xAxisHeight
    };
    const zeroY = plotBounds.y + plotBounds.height * (maxValue / range);
    values.forEach((value, i) => {
      const barX = plotBounds.x + barPadding + i * (barWidth + barPadding);
      const barHeight = Math.abs(value / range) * plotBounds.height;
      const barY = value >= 0 ? zeroY - barHeight : zeroY;
      const color = this.colorPipeline.getSeriesColor(i % series.length);
      const pattern = this.colorPipeline.getSeriesPattern(i % series.length);
      const bar = {
        type: "rect",
        id: generateNodeId("bar", i),
        x: this.snap(barX),
        y: this.snap(barY),
        attributes: {
          width: barWidth,
          height: barHeight,
          fill: this.options.patterns ? `url(#${pattern.id})` : color.hex,
          stroke: color.hex,
          strokeWidth: 1,
          role: "graphics-symbol",
          ariaLabel: `${categories[i]}: ${value}`
        },
        metadata: {
          dataIndex: i,
          dataValue: value,
          category: categories[i]
        }
      };
      children.push(bar);
    });
    const xAxisLabels = this.createXAxisLabels(
      categories,
      plotBounds,
      xAxisHeight
    );
    children.push(...xAxisLabels);
    const yAxisLabels = this.createYAxisLabels(
      minValue,
      maxValue,
      bounds,
      yAxisWidth
    );
    children.push(...yAxisLabels);
    children.push(this.createGridLines(plotBounds, minValue, maxValue));
    const root = {
      type: "group",
      id: "chart-root",
      x: 0,
      y: 0,
      attributes: {
        role: "graphics-document"
      },
      children
    };
    return {
      root,
      chartData: {
        values,
        categories,
        valueType: "number"
      }
    };
  }
  /**
   * Compile independently scaled series as overlapping translucent areas.
   *
   * The line compiler treats every series as an independent path on one shared
   * scale, so area follows that convention instead of cumulatively stacking.
   * Fills are emitted before strokes, in series order, to keep every outline
   * legible while overlapping colors remain visible.
   */
  compileAreaChart(input, bounds) {
    const data = this.normalizeMultiSeriesData(input.data);
    const finiteValues = this.getFiniteSeriesValues(data.series);
    const [minValue, maxValue] = this.getNumericDomain(finiteValues, true);
    const yAxisWidth = this.calculateAxisWidth(minValue, maxValue);
    const xAxisHeight = 300;
    const plotBounds = {
      x: bounds.x + yAxisWidth,
      y: bounds.y,
      width: bounds.width - yAxisWidth,
      height: bounds.height - xAxisHeight
    };
    const zeroY = this.scaleY(0, minValue, maxValue, plotBounds);
    const children = [];
    const seriesPaths = data.series.map((series) => {
      const points = this.createSeriesPoints(
        series.values,
        data.categories.length,
        minValue,
        maxValue,
        plotBounds
      );
      return {
        points,
        optimized: this.pathOptimizer.simplifyPath(points)
      };
    });
    seriesPaths.forEach(({ points, optimized }, seriesIndex) => {
      if (points.length === 0) return;
      this.stats.pathOptimization = Math.max(
        this.stats.pathOptimization,
        optimized.savings
      );
      const first = points[0];
      const last = points[points.length - 1];
      const color = this.colorPipeline.getSeriesColor(seriesIndex);
      const pattern = this.colorPipeline.getSeriesPattern(seriesIndex);
      children.push({
        type: "path",
        id: generateNodeId("area-fill", seriesIndex),
        x: 0,
        y: 0,
        attributes: {
          d: `${optimized.pathData} L${this.snap(last.x)},${this.snap(zeroY)} L${this.snap(first.x)},${this.snap(zeroY)} Z`,
          fill: this.options.patterns ? `url(#${pattern.id})` : color.hex,
          opacity: 0.35,
          role: "graphics-symbol",
          ariaLabel: `${data.series[seriesIndex].name} area series`
        },
        metadata: { seriesName: data.series[seriesIndex].name }
      });
    });
    seriesPaths.forEach(({ points, optimized }, seriesIndex) => {
      if (points.length === 0) return;
      const color = this.colorPipeline.getSeriesColor(seriesIndex);
      children.push({
        type: "path",
        id: generateNodeId("area-line", seriesIndex),
        x: 0,
        y: 0,
        attributes: {
          d: optimized.pathData,
          fill: "none",
          stroke: color.hex,
          strokeWidth: 2
        },
        metadata: { seriesName: data.series[seriesIndex].name }
      });
    });
    children.push(
      ...this.createXAxisLabels(data.categories, plotBounds, xAxisHeight)
    );
    children.push(
      ...this.createYAxisLabels(minValue, maxValue, bounds, yAxisWidth)
    );
    children.push(this.createGridLines(plotBounds, minValue, maxValue));
    return {
      root: this.createChartRoot(children),
      chartData: this.createMultiSeriesChartData(data)
    };
  }
  /**
   * Compile bars with separate positive and negative accumulators per category.
   * Negative segments are supported and stack below zero instead of being
   * discarded, preserving both their sign and their contribution to the domain.
   */
  compileStackedBarChart(input, bounds) {
    const data = this.normalizeMultiSeriesData(input.data);
    const positiveTotals = data.categories.map(
      (_, categoryIndex) => data.series.reduce((sum, series) => {
        const value = series.values[categoryIndex];
        return value !== null && value > 0 ? sum + value : sum;
      }, 0)
    );
    const negativeTotals = data.categories.map(
      (_, categoryIndex) => data.series.reduce((sum, series) => {
        const value = series.values[categoryIndex];
        return value !== null && value < 0 ? sum + value : sum;
      }, 0)
    );
    const [minValue, maxValue] = this.getNumericDomain(
      [...negativeTotals, ...positiveTotals],
      true
    );
    const yAxisWidth = this.calculateAxisWidth(minValue, maxValue);
    const xAxisHeight = 300;
    const plotBounds = {
      x: bounds.x + yAxisWidth,
      y: bounds.y,
      width: bounds.width - yAxisWidth,
      height: bounds.height - xAxisHeight
    };
    const slotWidth = data.categories.length > 0 ? plotBounds.width / data.categories.length : 0;
    const groupWidth = slotWidth * 0.8;
    const positiveOffsets = data.categories.map(() => 0);
    const negativeOffsets = data.categories.map(() => 0);
    const children = [];
    data.series.forEach((series, seriesIndex) => {
      const color = this.colorPipeline.getSeriesColor(seriesIndex);
      const pattern = this.colorPipeline.getSeriesPattern(seriesIndex);
      series.values.forEach((value, categoryIndex) => {
        if (value === null) return;
        const startValue = value >= 0 ? positiveOffsets[categoryIndex] : negativeOffsets[categoryIndex];
        const endValue = startValue + value;
        if (value >= 0) positiveOffsets[categoryIndex] = endValue;
        else negativeOffsets[categoryIndex] = endValue;
        const startY = this.scaleY(startValue, minValue, maxValue, plotBounds);
        const endY = this.scaleY(endValue, minValue, maxValue, plotBounds);
        const x = plotBounds.x + categoryIndex * slotWidth + (slotWidth - groupWidth) / 2;
        children.push({
          type: "rect",
          id: `stacked-bar-${seriesIndex}-${categoryIndex}`,
          x: this.snap(x),
          y: this.snap(Math.min(startY, endY)),
          attributes: {
            width: groupWidth,
            height: Math.abs(endY - startY),
            fill: this.options.patterns ? `url(#${pattern.id})` : color.hex,
            stroke: "#ffffff",
            strokeWidth: 1,
            role: "graphics-symbol",
            ariaLabel: `${series.name}, ${data.categories[categoryIndex]}: ${value}`
          },
          metadata: {
            dataIndex: categoryIndex,
            dataValue: value,
            category: data.categories[categoryIndex],
            seriesName: series.name
          }
        });
      });
    });
    children.push(
      ...this.createXAxisLabels(data.categories, plotBounds, xAxisHeight)
    );
    children.push(
      ...this.createYAxisLabels(minValue, maxValue, bounds, yAxisWidth)
    );
    children.push(this.createGridLines(plotBounds, minValue, maxValue));
    return {
      root: this.createChartRoot(children),
      chartData: this.createMultiSeriesChartData(data)
    };
  }
  /** Compile side-by-side series with 20% group gaps and 10% inter-bar gaps. */
  compileGroupedBarChart(input, bounds) {
    const data = this.normalizeMultiSeriesData(input.data);
    const finiteValues = this.getFiniteSeriesValues(data.series);
    const [minValue, maxValue] = this.getNumericDomain(finiteValues, true);
    const yAxisWidth = this.calculateAxisWidth(minValue, maxValue);
    const xAxisHeight = 300;
    const plotBounds = {
      x: bounds.x + yAxisWidth,
      y: bounds.y,
      width: bounds.width - yAxisWidth,
      height: bounds.height - xAxisHeight
    };
    const slotWidth = data.categories.length > 0 ? plotBounds.width / data.categories.length : 0;
    const groupWidth = slotWidth * 0.8;
    const seriesCount = data.series.length;
    const barWidth = seriesCount > 0 ? groupWidth / (seriesCount + Math.max(0, seriesCount - 1) * 0.1) : 0;
    const barGap = barWidth * 0.1;
    const zeroY = this.scaleY(0, minValue, maxValue, plotBounds);
    const children = [];
    data.series.forEach((series, seriesIndex) => {
      const color = this.colorPipeline.getSeriesColor(seriesIndex);
      const pattern = this.colorPipeline.getSeriesPattern(seriesIndex);
      series.values.forEach((value, categoryIndex) => {
        if (value === null) return;
        const valueY = this.scaleY(value, minValue, maxValue, plotBounds);
        const groupX = plotBounds.x + categoryIndex * slotWidth + (slotWidth - groupWidth) / 2;
        const x = groupX + seriesIndex * (barWidth + barGap);
        children.push({
          type: "rect",
          id: `grouped-bar-${seriesIndex}-${categoryIndex}`,
          x,
          y: Math.min(zeroY, valueY),
          attributes: {
            width: barWidth,
            height: Math.abs(valueY - zeroY),
            fill: this.options.patterns ? `url(#${pattern.id})` : color.hex,
            stroke: color.hex,
            strokeWidth: 1,
            role: "graphics-symbol",
            ariaLabel: `${series.name}, ${data.categories[categoryIndex]}: ${value}`
          },
          metadata: {
            dataIndex: categoryIndex,
            dataValue: value,
            category: data.categories[categoryIndex],
            seriesName: series.name
          }
        });
      });
    });
    children.push(
      ...this.createXAxisLabels(data.categories, plotBounds, xAxisHeight)
    );
    children.push(
      ...this.createYAxisLabels(minValue, maxValue, bounds, yAxisWidth)
    );
    children.push(this.createGridLines(plotBounds, minValue, maxValue));
    return {
      root: this.createChartRoot(children),
      chartData: this.createMultiSeriesChartData(data)
    };
  }
  /**
   * Compile the first series as bars and the second as a line. A secondary
   * right-hand scale is used only when both series have nonzero magnitudes and
   * the larger max-absolute magnitude is more than 10x the smaller one.
   */
  compileComboChart(input, bounds) {
    const normalized = this.normalizeMultiSeriesData(input.data);
    const data = {
      categories: normalized.categories,
      series: normalized.series.slice(0, 2)
    };
    const barSeries = data.series[0] ?? { name: "Series 1", values: [] };
    const lineSeries = data.series[1] ?? { name: "Series 2", values: [] };
    const barValues = barSeries.values.filter(
      (value) => value !== null
    );
    const lineValues = lineSeries.values.filter(
      (value) => value !== null
    );
    const barMagnitude = this.maxAbsoluteValue(barValues);
    const lineMagnitude = this.maxAbsoluteValue(lineValues);
    const smallerMagnitude = Math.min(barMagnitude, lineMagnitude);
    const largerMagnitude = Math.max(barMagnitude, lineMagnitude);
    const useSecondaryAxis = smallerMagnitude > 0 && largerMagnitude / smallerMagnitude > 10;
    const [leftMin, leftMax] = this.getNumericDomain(
      useSecondaryAxis ? barValues : [...barValues, ...lineValues],
      true
    );
    const [lineMin, lineMax] = useSecondaryAxis ? this.getNumericDomain(lineValues, true) : [leftMin, leftMax];
    const leftAxisWidth = this.calculateAxisWidth(leftMin, leftMax);
    const rightAxisWidth = useSecondaryAxis ? this.calculateAxisWidth(lineMin, lineMax) : 0;
    const xAxisHeight = 300;
    const plotBounds = {
      x: bounds.x + leftAxisWidth,
      y: bounds.y,
      width: bounds.width - leftAxisWidth - rightAxisWidth,
      height: bounds.height - xAxisHeight
    };
    const slotWidth = data.categories.length > 0 ? plotBounds.width / data.categories.length : 0;
    const barWidth = slotWidth * 0.55;
    const zeroY = this.scaleY(0, leftMin, leftMax, plotBounds);
    const children = [];
    const barColor = this.colorPipeline.getSeriesColor(0);
    const barPattern = this.colorPipeline.getSeriesPattern(0);
    barSeries.values.forEach((value, categoryIndex) => {
      if (value === null) return;
      const valueY = this.scaleY(value, leftMin, leftMax, plotBounds);
      children.push({
        type: "rect",
        id: generateNodeId("combo-bar", categoryIndex),
        x: plotBounds.x + categoryIndex * slotWidth + (slotWidth - barWidth) / 2,
        y: Math.min(zeroY, valueY),
        attributes: {
          width: barWidth,
          height: Math.abs(valueY - zeroY),
          fill: this.options.patterns ? `url(#${barPattern.id})` : barColor.hex,
          stroke: barColor.hex,
          strokeWidth: 1,
          role: "graphics-symbol",
          ariaLabel: `${barSeries.name}, ${data.categories[categoryIndex]}: ${value}`
        },
        metadata: {
          dataIndex: categoryIndex,
          dataValue: value,
          category: data.categories[categoryIndex],
          seriesName: barSeries.name
        }
      });
    });
    const linePoints = this.createSeriesPoints(
      lineSeries.values,
      data.categories.length,
      lineMin,
      lineMax,
      plotBounds
    );
    if (linePoints.length > 0) {
      const optimized = this.pathOptimizer.simplifyPath(linePoints);
      this.stats.pathOptimization = optimized.savings;
      const lineColor = this.colorPipeline.getSeriesColor(1);
      children.push({
        type: "path",
        id: "combo-line",
        x: 0,
        y: 0,
        attributes: {
          d: optimized.pathData,
          fill: "none",
          stroke: lineColor.hex,
          strokeWidth: 2,
          role: "graphics-symbol",
          ariaLabel: `${lineSeries.name} line series${useSecondaryAxis ? " on right axis" : ""}`
        },
        metadata: { seriesName: lineSeries.name }
      });
      linePoints.forEach((point, index) => {
        children.push({
          type: "circle",
          id: generateNodeId("combo-dot", index),
          x: this.snap(point.x),
          y: this.snap(point.y),
          attributes: {
            radius: 4,
            fill: lineColor.hex,
            stroke: "#ffffff",
            strokeWidth: 1.5
          }
        });
      });
    }
    children.push(
      ...this.createXAxisLabels(data.categories, plotBounds, xAxisHeight)
    );
    children.push(
      ...this.createYAxisLabels(leftMin, leftMax, bounds, leftAxisWidth)
    );
    if (useSecondaryAxis) {
      children.push(...this.createRightYAxisLabels(lineMin, lineMax, plotBounds));
    }
    children.push(this.createGridLines(plotBounds, leftMin, leftMax));
    return {
      root: this.createChartRoot(children),
      chartData: this.createMultiSeriesChartData(data, useSecondaryAxis)
    };
  }
  /**
   * Compile a line chart with path optimization (Doc 3, Section 2).
   */
  compileLineChart(input, bounds, _random) {
    const data = this.normalizeLineData(input.data);
    const { categories, values, series } = data;
    const children = [];
    const [minValue, maxValue] = this.getNumericDomain(values.flat());
    const range = maxValue - minValue || 1;
    const yAxisWidth = this.calculateAxisWidth(minValue, maxValue);
    const xAxisHeight = 300;
    const plotBounds = {
      x: bounds.x + yAxisWidth,
      y: bounds.y,
      width: bounds.width - yAxisWidth,
      height: bounds.height - xAxisHeight
    };
    series.forEach((seriesData, seriesIndex) => {
      const points = seriesData.map((value, i) => ({
        x: plotBounds.x + i / (seriesData.length - 1 || 1) * plotBounds.width,
        y: plotBounds.y + plotBounds.height - (value - minValue) / range * plotBounds.height
      }));
      const optimized = this.pathOptimizer.simplifyPath(points);
      this.stats.pathOptimization = optimized.savings;
      const color = this.colorPipeline.getSeriesColor(seriesIndex);
      const line = {
        type: "path",
        id: generateNodeId("line", seriesIndex),
        x: 0,
        y: 0,
        attributes: {
          d: optimized.pathData,
          stroke: color.hex,
          strokeWidth: 2,
          fill: "none",
          vectorEffect: "non-scaling-stroke"
        },
        metadata: {
          seriesName: `Series ${seriesIndex + 1}`
        }
      };
      children.push(line);
      points.forEach((point, i) => {
        const dot = {
          type: "circle",
          id: generateNodeId(`dot-${seriesIndex}`, i),
          x: this.snap(point.x),
          y: this.snap(point.y),
          attributes: {
            radius: 4,
            fill: color.hex,
            stroke: "#ffffff",
            strokeWidth: 1.5
          },
          metadata: {
            dataIndex: i,
            dataValue: seriesData[i]
          }
        };
        children.push(dot);
      });
    });
    children.push(
      ...this.createXAxisLabels(categories, plotBounds, xAxisHeight)
    );
    children.push(
      ...this.createYAxisLabels(minValue, maxValue, bounds, yAxisWidth)
    );
    children.push(this.createGridLines(plotBounds, minValue, maxValue));
    const root = {
      type: "group",
      id: "chart-root",
      x: 0,
      y: 0,
      attributes: {},
      children
    };
    return {
      root,
      chartData: {
        values: values.flat(),
        categories,
        valueType: "number"
      }
    };
  }
  /**
   * Compile a scatter chart with label collision detection (Doc 2, Section 4).
   */
  compileScatterChart(input, bounds, _random) {
    const data = this.normalizeScatterData(input.data);
    const { points } = data;
    const children = [];
    const xValues = points.map((p) => p.x);
    const yValues = points.map((p) => p.y);
    const [xMin, xMax] = this.getNumericDomain(xValues);
    const [yMin, yMax] = this.getNumericDomain(yValues);
    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;
    const yAxisWidth = this.calculateAxisWidth(yMin, yMax);
    const xAxisHeight = 300;
    const plotBounds = {
      x: bounds.x + yAxisWidth,
      y: bounds.y,
      width: bounds.width - yAxisWidth,
      height: bounds.height - xAxisHeight
    };
    const dotPositions = [];
    points.forEach((point, i) => {
      const px = plotBounds.x + (point.x - xMin) / xRange * plotBounds.width;
      const py = plotBounds.y + plotBounds.height - (point.y - yMin) / yRange * plotBounds.height;
      dotPositions.push({
        x: px,
        y: py,
        label: point.label || `Point ${i + 1}`
      });
      const color = this.colorPipeline.getSeriesColor(i % 10);
      const dot = {
        type: "circle",
        id: generateNodeId("dot", i),
        x: this.snap(px),
        y: this.snap(py),
        attributes: {
          radius: 6,
          fill: color.hex,
          stroke: "#ffffff",
          strokeWidth: 1.5,
          role: "graphics-symbol",
          ariaLabel: `${point.label}: (${point.x}, ${point.y})`
        },
        metadata: {
          dataIndex: i,
          dataValue: point.y
        }
      };
      children.push(dot);
    });
    const labelPlacements = this.collisionSolver.resolvePointLabels(
      dotPositions,
      plotBounds,
      this.options.fontSize * 10,
      this.options.fontFamily
    );
    this.stats.collisionsResolved = labelPlacements.filter(
      (p) => p.collisionLevel !== 0 /* STANDARD */
    ).length;
    labelPlacements.forEach((placement, i) => {
      const label = {
        type: "text",
        id: generateNodeId("label", i),
        x: this.snap(placement.position.x),
        y: this.snap(placement.position.y),
        attributes: {
          text: placement.text,
          fontSize: this.options.fontSize * 10,
          fontFamily: this.options.fontFamily,
          fill: "#333333",
          textAnchor: "start"
        }
      };
      children.push(label);
      if (placement.leaderLine) {
        const line = {
          type: "line",
          id: generateNodeId("leader", i),
          x: 0,
          y: 0,
          attributes: {
            x1: placement.leaderLine.fromPoint.x,
            y1: placement.leaderLine.fromPoint.y,
            x2: placement.leaderLine.toPoint.x,
            y2: placement.leaderLine.toPoint.y,
            stroke: "#999999",
            strokeWidth: 0.5
          }
        };
        children.push(line);
      }
    });
    children.push(this.createGridLines(plotBounds, yMin, yMax));
    const root = {
      type: "group",
      id: "chart-root",
      x: 0,
      y: 0,
      attributes: {},
      children
    };
    return {
      root,
      chartData: {
        values: yValues,
        categories: points.map((p) => p.label || ""),
        valueType: "number"
      }
    };
  }
  /**
   * Compile a pie/donut chart with radial labeling (Doc 2, Section 5).
   */
  compilePieChart(input, bounds, isDonut) {
    const data = this.normalizePieData(input.data);
    const { categories, values } = data;
    const children = [];
    const total = values.reduce((sum, value) => sum + Math.abs(value), 0);
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    const outerRadius = Math.min(bounds.width, bounds.height) / 2 - 500;
    const innerRadius = isDonut ? outerRadius * 0.5 : 0;
    let currentAngle = -Math.PI / 2;
    const slices = [];
    values.forEach((value, i) => {
      const proportion = total > 0 ? Math.abs(value) / total : 0;
      const sliceAngle = proportion * Math.PI * 2;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      slices.push({
        startAngle,
        endAngle,
        label: categories[i],
        value
      });
      const color = this.colorPipeline.getSeriesColor(i);
      const pattern = this.colorPipeline.getSeriesPattern(i);
      const pathData = this.createArcPath(
        centerX,
        centerY,
        innerRadius,
        outerRadius,
        startAngle,
        endAngle
      );
      const slice = {
        type: "path",
        id: generateNodeId("slice", i),
        x: 0,
        y: 0,
        attributes: {
          d: pathData,
          fill: this.options.patterns ? `url(#${pattern.id})` : color.hex,
          stroke: "#ffffff",
          strokeWidth: 2,
          role: "graphics-symbol",
          ariaLabel: `${categories[i]}: ${value} (${(proportion * 100).toFixed(1)}%)`
        },
        metadata: {
          dataIndex: i,
          dataValue: value,
          category: categories[i]
        }
      };
      children.push(slice);
      currentAngle = endAngle;
    });
    const labelPlacements = this.collisionSolver.resolvePieLabels(
      slices,
      { x: centerX, y: centerY },
      innerRadius,
      outerRadius,
      this.options.fontSize * 10,
      this.options.fontFamily
    );
    labelPlacements.forEach((placement, i) => {
      const label = {
        type: "text",
        id: generateNodeId("pie-label", i),
        x: this.snap(placement.position.x),
        y: this.snap(placement.position.y),
        attributes: {
          text: placement.text,
          fontSize: this.options.fontSize * 10,
          fontFamily: this.options.fontFamily,
          fill: "#333333",
          textAnchor: placement.box.anchor
        }
      };
      children.push(label);
      if (placement.leaderLine) {
        const ll = placement.leaderLine;
        let pathD = `M${ll.fromPoint.x},${ll.fromPoint.y}`;
        if (ll.elbowPoint) {
          pathD += ` L${ll.elbowPoint.x},${ll.elbowPoint.y}`;
        }
        pathD += ` L${ll.toPoint.x},${ll.toPoint.y}`;
        const leaderLine = {
          type: "path",
          id: generateNodeId("pie-leader", i),
          x: 0,
          y: 0,
          attributes: {
            d: pathD,
            stroke: "#999999",
            strokeWidth: 1,
            fill: "none"
          }
        };
        children.push(leaderLine);
      }
    });
    const root = {
      type: "group",
      id: "chart-root",
      x: 0,
      y: 0,
      attributes: {},
      children
    };
    return {
      root,
      chartData: {
        values,
        categories,
        valueType: "number"
      }
    };
  }
  /**
   * Compile a waterfall chart.
   */
  compileWaterfallChart(input, bounds) {
    const data = this.normalizeWaterfallData(input.data);
    const { categories, values, isTotal } = data;
    const children = [];
    let runningTotal = 0;
    const totals = [];
    values.forEach((val, i) => {
      if (isTotal[i]) {
        runningTotal = val;
      } else {
        runningTotal += val;
      }
      totals.push(runningTotal);
    });
    const allValues = [...values, ...totals];
    const [minValue, maxValue] = this.getNumericDomain(allValues, true);
    const range = maxValue - minValue || 1;
    const yAxisWidth = this.calculateAxisWidth(minValue, maxValue);
    const xAxisHeight = 300;
    const barPadding = 50;
    const plotBounds = {
      x: bounds.x + yAxisWidth,
      y: bounds.y,
      width: bounds.width - yAxisWidth,
      height: bounds.height - xAxisHeight
    };
    const barWidth = values.length > 0 ? (plotBounds.width - barPadding * (values.length + 1)) / values.length : 0;
    const zeroY = plotBounds.y + plotBounds.height * (maxValue / range);
    runningTotal = 0;
    values.forEach((val, i) => {
      let startVal;
      let endVal;
      if (isTotal[i]) {
        startVal = 0;
        endVal = val;
        runningTotal = val;
      } else {
        startVal = runningTotal;
        endVal = runningTotal + val;
        runningTotal = endVal;
      }
      const startY = plotBounds.y + plotBounds.height * ((maxValue - startVal) / range);
      const endY = plotBounds.y + plotBounds.height * ((maxValue - endVal) / range);
      const barX = plotBounds.x + barPadding + i * (barWidth + barPadding);
      const barY = Math.min(startY, endY);
      const barHeight = Math.abs(endY - startY);
      const colorIndex = isTotal[i] ? 0 : val >= 0 ? 1 : 2;
      const color = this.colorPipeline.getSeriesColor(colorIndex);
      const bar = {
        type: "rect",
        id: generateNodeId("bar", i),
        x: this.snap(barX),
        y: this.snap(barY),
        attributes: {
          width: barWidth,
          height: barHeight,
          fill: color.hex,
          stroke: "#ffffff",
          strokeWidth: 1
        },
        metadata: {
          dataIndex: i,
          dataValue: val,
          category: categories[i]
        }
      };
      children.push(bar);
      if (i < values.length - 1 && !isTotal[i + 1]) {
        const connectorY = endY;
        const nextBarX = barX + barWidth + barPadding;
        const connector = {
          type: "line",
          id: generateNodeId("connector", i),
          x: 0,
          y: 0,
          attributes: {
            x1: barX + barWidth,
            y1: connectorY,
            x2: nextBarX,
            y2: connectorY,
            stroke: "#999999",
            strokeWidth: 1,
            strokeDasharray: "4,2"
          }
        };
        children.push(connector);
      }
    });
    const zeroLine = {
      type: "line",
      id: "zero-line",
      x: 0,
      y: 0,
      attributes: {
        x1: plotBounds.x,
        y1: zeroY,
        x2: plotBounds.x + plotBounds.width,
        y2: zeroY,
        stroke: "#333333",
        strokeWidth: 1
      }
    };
    children.push(zeroLine);
    children.push(
      ...this.createXAxisLabels(categories, plotBounds, xAxisHeight)
    );
    children.push(
      ...this.createYAxisLabels(minValue, maxValue, bounds, yAxisWidth)
    );
    const root = {
      type: "group",
      id: "chart-root",
      x: 0,
      y: 0,
      attributes: {},
      children
    };
    return {
      root,
      chartData: {
        values,
        categories,
        valueType: "number"
      }
    };
  }
  // ===========================================================================
  // AXIS CREATION HELPERS
  // ===========================================================================
  /**
   * Create X-axis labels with collision detection (Doc 2, Section 3).
   */
  createXAxisLabels(categories, plotBounds, xAxisHeight) {
    const axisY = plotBounds.y + plotBounds.height + 50;
    const { placements, level } = this.collisionSolver.resolveAxisLabels(
      categories,
      plotBounds.x,
      plotBounds.x + plotBounds.width,
      axisY,
      this.options.fontSize * 10,
      this.options.fontFamily
    );
    this.stats.collisionsResolved += level > 0 ? categories.length : 0;
    return placements.filter((p) => p.isVisible).map((placement, i) => ({
      type: "text",
      id: generateNodeId("x-label", i),
      x: this.snap(placement.position.x),
      y: this.snap(placement.position.y),
      attributes: {
        text: placement.text,
        fontSize: this.options.fontSize * 10,
        fontFamily: this.options.fontFamily,
        fill: "#666666",
        textAnchor: placement.box.anchor,
        rotation: placement.box.rotation
      }
    }));
  }
  /**
   * Create Y-axis labels (Doc 2: Fixed Gutter Strategy).
   */
  createYAxisLabels(minValue, maxValue, bounds, yAxisWidth) {
    const labels = [];
    const tickCount = 5;
    const range = maxValue - minValue;
    const step = range / tickCount;
    for (let i = 0; i <= tickCount; i++) {
      const value = minValue + step * i;
      const y = bounds.y + bounds.height - 300 - i / tickCount * (bounds.height - 300);
      const formattedValue = this.formatAxisValue(value);
      labels.push({
        type: "text",
        id: generateNodeId("y-label", i),
        x: bounds.x + yAxisWidth - 50,
        y: this.snap(y),
        attributes: {
          text: formattedValue,
          fontSize: this.options.fontSize * 10,
          fontFamily: this.options.fontFamily,
          fill: "#666666",
          textAnchor: "end",
          dominantBaseline: "middle"
        }
      });
    }
    return labels;
  }
  /** Create labels for a combo chart's optional right-hand value axis. */
  createRightYAxisLabels(minValue, maxValue, plotBounds) {
    const labels = [];
    const tickCount = 5;
    const range = maxValue - minValue;
    for (let i = 0; i <= tickCount; i++) {
      const value = minValue + range / tickCount * i;
      const y = plotBounds.y + plotBounds.height - i / tickCount * plotBounds.height;
      labels.push({
        type: "text",
        id: generateNodeId("right-y-label", i),
        x: plotBounds.x + plotBounds.width + 50,
        y: this.snap(y),
        attributes: {
          text: this.formatAxisValue(value),
          fontSize: this.options.fontSize * 10,
          fontFamily: this.options.fontFamily,
          fill: "#666666",
          textAnchor: "start",
          dominantBaseline: "middle"
        }
      });
    }
    return labels;
  }
  /**
   * Create grid lines.
   */
  createGridLines(plotBounds, minValue, maxValue) {
    const lines = [];
    const tickCount = 5;
    for (let i = 0; i <= tickCount; i++) {
      const y = plotBounds.y + i / tickCount * plotBounds.height;
      lines.push({
        type: "line",
        id: generateNodeId("grid-h", i),
        x: 0,
        y: 0,
        attributes: {
          x1: plotBounds.x,
          y1: y,
          x2: plotBounds.x + plotBounds.width,
          y2: y,
          stroke: "#eeeeee",
          strokeWidth: 1
        }
      });
    }
    return {
      type: "group",
      id: "grid-lines",
      x: 0,
      y: 0,
      attributes: {},
      children: lines
    };
  }
  // ===========================================================================
  // DATA NORMALIZATION HELPERS
  // ===========================================================================
  /**
   * Normalize all multi-series shapes while retaining category alignment.
   * Invalid numeric entries become gaps instead of shifting later values into
   * the wrong category, and use the established NON_FINITE_DATA warning path.
   */
  normalizeMultiSeriesData(data) {
    let rawSeries;
    if (Array.isArray(data)) {
      const nested = Array.isArray(data[0]);
      const values = nested ? data : [data];
      rawSeries = values.map((series2, index) => ({
        name: `Series ${index + 1}`,
        values: Array.isArray(series2) ? series2 : [],
        path: nested ? `data.series[${index}].values` : "data.values"
      }));
    } else if (Array.isArray(data?.series)) {
      rawSeries = data.series.map((series2, index) => ({
        name: String(series2?.name ?? `Series ${index + 1}`),
        values: Array.isArray(series2?.values) ? series2.values : Array.isArray(series2) ? series2 : [],
        path: `data.series[${index}].values`
      }));
    } else if (Array.isArray(data?.values?.[0])) {
      rawSeries = data.values.map((values, index) => ({
        name: `Series ${index + 1}`,
        values,
        path: `data.series[${index}].values`
      }));
    } else {
      rawSeries = [{
        name: "Series 1",
        values: Array.isArray(data?.values) ? data.values : [],
        path: "data.values"
      }];
    }
    const suppliedCategories = Array.isArray(data?.categories) ? data.categories : [];
    const categoryCount = rawSeries.reduce(
      (maximum, series2) => Math.max(maximum, series2.values.length),
      0
    );
    const categories = Array.from(
      { length: categoryCount },
      (_, index) => String(suppliedCategories[index] ?? `Item ${index + 1}`)
    );
    const series = rawSeries.map((raw) => ({
      name: raw.name,
      values: Array.from({ length: categoryCount }, (_, index) => {
        const value = raw.values[index];
        if (value === void 0 || value === null) return null;
        if (this.isFiniteNumber(value)) return value;
        this.addNonFiniteWarning(`${raw.path}[${index}]`, value);
        return null;
      })
    }));
    return { categories, series };
  }
  normalizeBarData(data) {
    const rawValues = Array.isArray(data) ? data : data?.values ?? data?.series?.[0]?.values ?? [];
    const rawCategories = Array.isArray(data?.categories) ? data.categories : rawValues.map((_, i) => `Item ${i + 1}`);
    const filtered = this.filterFiniteValues(
      rawValues,
      rawCategories,
      "data.values"
    );
    const series = Array.isArray(data?.series) && data.series.length > 0 ? data.series : [{ name: "Series 1", values: filtered.values }];
    return {
      categories: filtered.categories,
      values: filtered.values,
      series
    };
  }
  normalizeLineData(data) {
    let rawSeries;
    if (Array.isArray(data)) {
      rawSeries = Array.isArray(data[0]) ? data : [data];
    } else if (Array.isArray(data?.series)) {
      rawSeries = data.series.map(
        (series2) => Array.isArray(series2?.values) ? series2.values : series2
      );
    } else if (Array.isArray(data?.values?.[0])) {
      rawSeries = data.values;
    } else {
      rawSeries = [Array.isArray(data?.values) ? data.values : []];
    }
    const suppliedCategories = Array.isArray(data?.categories) ? data.categories : [];
    const series = rawSeries.map(
      (values, seriesIndex) => this.filterFiniteValues(
        values,
        suppliedCategories,
        `data.series[${seriesIndex}].values`
      ).values
    );
    const maxLength = series.reduce(
      (maximum, values) => Math.max(maximum, values.length),
      0
    );
    const categories = suppliedCategories.length > 0 ? suppliedCategories.slice(0, maxLength) : Array.from({ length: maxLength }, (_, i) => `${i + 1}`);
    return {
      categories,
      values: series,
      series
    };
  }
  normalizeScatterData(data) {
    const rawPoints = Array.isArray(data) ? data : data?.points ?? data?.series?.[0]?.values ?? [];
    const points = [];
    if (!Array.isArray(rawPoints)) return { points };
    rawPoints.forEach((point, index) => {
      const x = point?.x ?? point?.[0] ?? index;
      const y = point?.y ?? point?.[1] ?? 0;
      const invalidCoordinates = [
        ["x", x],
        ["y", y]
      ].filter((entry) => !this.isFiniteNumber(entry[1]));
      if (invalidCoordinates.length > 0) {
        invalidCoordinates.forEach(([coordinate, value]) => {
          this.addNonFiniteWarning(
            `data.points[${index}].${String(coordinate)}`,
            value
          );
        });
        return;
      }
      points.push({
        x,
        y,
        label: String(point?.label ?? `Point ${index + 1}`)
      });
    });
    return { points };
  }
  normalizePieData(data) {
    const rawValues = Array.isArray(data) ? data.map(
      (datum) => typeof datum === "number" ? datum : datum?.value
    ) : data?.values ?? [];
    const rawCategories = Array.isArray(data) ? data.map((datum, i) => String(datum?.label ?? `Slice ${i + 1}`)) : data?.categories ?? data?.labels ?? [];
    const filtered = this.filterFiniteValues(
      rawValues,
      rawCategories,
      "data.values"
    );
    return {
      categories: filtered.categories,
      values: filtered.values
    };
  }
  normalizeWaterfallData(data) {
    const rawValues = data?.values ?? data?.series?.[0]?.values ?? [];
    const rawCategories = data?.categories ?? [];
    const rawIsTotal = data?.isTotal ?? data?.series?.[0]?.isTotal ?? [];
    const filtered = this.filterFiniteValues(
      rawValues,
      rawCategories,
      "data.values"
    );
    return {
      categories: filtered.categories,
      values: filtered.values,
      isTotal: filtered.indices.map((index) => Boolean(rawIsTotal[index]))
    };
  }
  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================
  getFiniteSeriesValues(series) {
    return series.flatMap(
      (entry) => entry.values.filter((value) => value !== null)
    );
  }
  maxAbsoluteValue(values) {
    return values.reduce(
      (maximum, value) => Math.max(maximum, Math.abs(value)),
      0
    );
  }
  scaleY(value, minValue, maxValue, plotBounds) {
    const range = maxValue - minValue || 1;
    return plotBounds.y + plotBounds.height - (value - minValue) / range * plotBounds.height;
  }
  createSeriesPoints(values, categoryCount, minValue, maxValue, plotBounds) {
    const points = [];
    values.forEach((value, categoryIndex) => {
      if (value === null) return;
      points.push({
        x: plotBounds.x + categoryIndex / (categoryCount - 1 || 1) * plotBounds.width,
        y: this.scaleY(value, minValue, maxValue, plotBounds)
      });
    });
    return points;
  }
  createMultiSeriesChartData(data, secondaryAxis) {
    const values = [];
    const categories = [];
    data.series.forEach((series) => {
      series.values.forEach((value, categoryIndex) => {
        if (value === null) return;
        values.push(value);
        categories.push(`${series.name} \u2013 ${data.categories[categoryIndex]}`);
      });
    });
    return {
      values,
      categories,
      valueType: "number",
      seriesCount: data.series.length,
      categoryCount: data.categories.length,
      secondaryAxis
    };
  }
  createChartRoot(children) {
    return {
      type: "group",
      id: "chart-root",
      x: 0,
      y: 0,
      attributes: { role: "graphics-document" },
      children
    };
  }
  isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }
  addNonFiniteWarning(path, value) {
    this.warnings.push({
      code: "NON_FINITE_DATA",
      message: `Filtered non-finite numeric value at ${path}.`,
      path,
      value,
      suggestion: "Provide a finite number to include this data point."
    });
  }
  filterFiniteValues(rawValues, rawCategories, pathPrefix) {
    const values = [];
    const categories = [];
    const indices = [];
    const sourceValues = Array.isArray(rawValues) ? rawValues : [];
    const sourceCategories = Array.isArray(rawCategories) ? rawCategories : [];
    sourceValues.forEach((value, index) => {
      if (!this.isFiniteNumber(value)) {
        this.addNonFiniteWarning(`${pathPrefix}[${index}]`, value);
        return;
      }
      values.push(value);
      categories.push(String(sourceCategories[index] ?? `Item ${index + 1}`));
      indices.push(index);
    });
    return { values, categories, indices };
  }
  getNumericDomain(values, includeZero = false) {
    if (values.length === 0) return [0, 1];
    let minValue = values[0];
    let maxValue = values[0];
    for (let i = 1; i < values.length; i++) {
      minValue = Math.min(minValue, values[i]);
      maxValue = Math.max(maxValue, values[i]);
    }
    if (includeZero) {
      minValue = Math.min(minValue, 0);
      maxValue = Math.max(maxValue, 0);
    }
    return [minValue, maxValue];
  }
  /**
   * Calculate Y-axis width based on max label width (Doc 1, Section 5).
   */
  calculateAxisWidth(minValue, maxValue) {
    const testValues = [minValue, maxValue, (minValue + maxValue) / 2];
    const labels = testValues.map((v) => this.formatAxisValue(v));
    const maxWidth = this.glyphOracle.getMaxLabelWidth(
      labels,
      this.options.fontSize * 10,
      this.options.fontFamily
    );
    return maxWidth + 150;
  }
  /**
   * Format axis value for display.
   */
  formatAxisValue(value) {
    const abs = Math.abs(value);
    if (abs >= 1e9) return (value / 1e9).toFixed(1) + "B";
    if (abs >= 1e6) return (value / 1e6).toFixed(1) + "M";
    if (abs >= 1e3) return (value / 1e3).toFixed(1) + "K";
    return value.toFixed(abs < 10 ? 1 : 0);
  }
  /**
   * Sub-pixel grid snapping (Doc 3, Section 5).
   */
  snap(value) {
    return Math.round(value * 2) / 2;
  }
  /**
   * Create arc path for pie charts.
   */
  createArcPath(cx, cy, innerR, outerR, startAngle, endAngle) {
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    const x1 = cx + Math.cos(startAngle) * outerR;
    const y1 = cy + Math.sin(startAngle) * outerR;
    const x2 = cx + Math.cos(endAngle) * outerR;
    const y2 = cy + Math.sin(endAngle) * outerR;
    if (innerR === 0) {
      return `M${cx},${cy} L${x1},${y1} A${outerR},${outerR} 0 ${largeArc} 1 ${x2},${y2} Z`;
    }
    const x3 = cx + Math.cos(endAngle) * innerR;
    const y3 = cy + Math.sin(endAngle) * innerR;
    const x4 = cx + Math.cos(startAngle) * innerR;
    const y4 = cy + Math.sin(startAngle) * innerR;
    return `M${x1},${y1} A${outerR},${outerR} 0 ${largeArc} 1 ${x2},${y2} L${x3},${y3} A${innerR},${innerR} 0 ${largeArc} 0 ${x4},${y4} Z`;
  }
  /**
   * Generate patterns for the palette.
   */
  generatePatterns(count) {
    const patterns = [];
    for (let i = 0; i < count; i++) {
      patterns.push(this.colorPipeline.getSeriesPattern(i));
    }
    return patterns;
  }
  /**
   * Derive seed from data hash.
   */
  deriveSeed(hash) {
    return parseInt(hash.substring(0, 8), 16);
  }
  /**
   * Count nodes in scene graph.
   */
  countNodes(node) {
    let count = 1;
    if (node.children) {
      for (const child of node.children) {
        count += this.countNodes(child);
      }
    }
    return count;
  }
  /**
   * Reset stats for new compilation.
   */
  resetStats() {
    this.warnings = [];
    this.stats = {
      compileTime: 0,
      nodeCount: 0,
      svgSize: 0,
      pathOptimization: 0,
      glyphCacheHits: 0,
      collisionsResolved: 0
    };
  }
  /**
   * Create minimal accessibility metadata.
   */
  createMinimalAccessibility(chartType) {
    return {
      role: "Chart",
      altText: `${chartType} chart`,
      dataSummary: [],
      lang: "en"
    };
  }
  /**
   * Create minimal XMP metadata.
   */
  createMinimalXMP(chartType) {
    return {
      sourceData: "{}",
      dataHash: "",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      generatorVersion: "1.0.0",
      chartType
    };
  }
};
var pvceCompiler = new PVCECompiler();
function compileChart(chartType, input, options) {
  const compiler = options ? new PVCECompiler(options) : pvceCompiler;
  return compiler.compile(chartType, input);
}
function chartToSVG(chartType, data, options) {
  const result = compileChart(
    chartType,
    {
      data,
      encoding: {},
      constraints: {
        width: options?.width ?? 800,
        height: options?.height ?? 600
      }
    },
    options
  );
  return result.svg;
}
export {
  AccessibilityGenerator,
  AxisCollisionSolver,
  COLORBLIND_SAFE_COLORS,
  CollisionLevel,
  ColorPipeline,
  DEFAULT_PALETTE_COLORS,
  GlyphOracle,
  HAIRLINE_MIN_PT,
  MIN_GRAY_DIFFERENCE,
  Mulberry32,
  PVCECompiler,
  PathOptimizer,
  SNAP_THRESHOLD,
  SVGRenderer,
  VIRTUAL_CANVAS,
  WCAG_CONTRAST,
  accessibilityGenerator,
  chartToSVG,
  collisionSolver,
  colorPipeline,
  compareSceneGraphs,
  compileChart,
  createMonochromePalette,
  createSeededRandom,
  deriveSeedFromData,
  ensureMinStroke,
  generateChartAltText,
  generateNodeId,
  generateNodeIds,
  generateXMPMetadata,
  getContrastRatio,
  getMaxLabelWidth,
  glyphOracle,
  hashChartData,
  hashData,
  measureText,
  meetsContrastRequirement,
  optimizeLineChart,
  parseColor,
  pathOptimizer,
  pvceCompiler,
  renderToSVG,
  resolveAxisLabels,
  resolvePointLabels,
  shortHash,
  simplifyPath,
  simplifyPathString,
  snapToGrid,
  stripAnimations,
  svgRenderer,
  validateDeterminism,
  verifyNoAnimations
};
//# sourceMappingURL=src-HD4QLQXR.js.map
