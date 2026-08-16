// src/layout/ghostGrid.ts — Post-layout normalization pass.
// Snaps nearly-aligned edges to identical values before EMU conversion,
// eliminating sub-pixel drift from Yoga's floating-point layout engine.

import type { LayoutNode, LayoutTable } from "./extract.js";

const DEFAULT_DPI = 96;
const EMU_PER_INCH = 914400;
/** Convert DPI to pixel→EMU factor. Default 96 DPI → 9525 EMU/px. */
function pixelToEmu(dpi: number): number { return EMU_PER_INCH / dpi; }

const EPSILON = 0.5; // Half a CSS pixel — catches Yoga drift without false positives

// ---------------------------------------------------------------------------
// Data Structures
// ---------------------------------------------------------------------------

type EdgeType = "left" | "right" | "centerX" | "top" | "bottom" | "centerY";

interface EdgeDescriptor {
  value: number;
  node: LayoutNode;
  edgeType: EdgeType;
  depth: number;
  dfsOrder: number;
  isSlideEdge: boolean;
}

interface AlignmentCluster {
  edges: EdgeDescriptor[];
  anchorValue: number;
}

interface NodeMutationPlan {
  originalX: number;
  originalY: number;
  originalW: number;
  originalH: number;
  newLeft?: number;
  newRight?: number;
  newTop?: number;
  newBottom?: number;
  centerDeltaX: number;
  centerDeltaY: number;
}

// ---------------------------------------------------------------------------
// Phase A — Spatial Indexing
// ---------------------------------------------------------------------------

interface ExtractResult {
  xEdges: EdgeDescriptor[];
  yEdges: EdgeDescriptor[];
  tables: LayoutNode[];
}

function extractEdges(
  root: LayoutNode,
): ExtractResult {
  const xEdges: EdgeDescriptor[] = [];
  const yEdges: EdgeDescriptor[] = [];
  const tables: LayoutNode[] = [];
  let dfsCounter = 0;

  function walk(node: LayoutNode, depth: number): void {
    if ((node as { style?: { display?: string } }).style?.display === "none") return;
    const order = dfsCounter++;
    const { x, y, width, height } = node.layout;
    const isSlideEdge = node.type === "Slide";

    const left = x;
    const right = x + width;
    const centerX = x + width / 2;
    const top = y;
    const bottom = y + height;
    const centerY = y + height / 2;

    xEdges.push(
      { value: left, node, edgeType: "left", depth, dfsOrder: order, isSlideEdge },
      { value: right, node, edgeType: "right", depth, dfsOrder: order, isSlideEdge },
      { value: centerX, node, edgeType: "centerX", depth, dfsOrder: order, isSlideEdge },
    );
    yEdges.push(
      { value: top, node, edgeType: "top", depth, dfsOrder: order, isSlideEdge },
      { value: bottom, node, edgeType: "bottom", depth, dfsOrder: order, isSlideEdge },
      { value: centerY, node, edgeType: "centerY", depth, dfsOrder: order, isSlideEdge },
    );

    if (node.type === "Table") {
      tables.push(node);
    }

    if (node.children) {
      for (const child of node.children) {
        walk(child, depth + 1);
      }
    }
  }

  walk(root, 0);
  return { xEdges, yEdges, tables };
}

function buildClusters(edges: EdgeDescriptor[]): AlignmentCluster[] {
  if (edges.length === 0) return [];

  // Sort ascending by value, tiebreak by dfsOrder for determinism
  edges.sort((a, b) => a.value - b.value || a.dfsOrder - b.dfsOrder);

  const clusters: AlignmentCluster[] = [];
  let clusterStart = 0;

  for (let i = 1; i <= edges.length; i++) {
    // Compare against first edge in cluster (not previous) to prevent chain-drift
    if (i === edges.length || edges[i].value - edges[clusterStart].value > EPSILON) {
      if (i - clusterStart >= 2) {
        clusters.push({
          edges: edges.slice(clusterStart, i),
          anchorValue: 0, // resolved in Phase B
        });
      }
      clusterStart = i;
    }
  }

  return clusters;
}

// ---------------------------------------------------------------------------
// Phase B — Anchor Resolution & Mutation
// ---------------------------------------------------------------------------

function selectAnchor(cluster: AlignmentCluster): number {
  let best = cluster.edges[0];

  for (let i = 1; i < cluster.edges.length; i++) {
    const edge = cluster.edges[i];

    // P1: Slide boundary wins
    if (edge.isSlideEdge && !best.isSlideEdge) {
      best = edge;
      continue;
    }
    if (!edge.isSlideEdge && best.isSlideEdge) continue;

    // P2: Shallowest depth wins
    if (edge.depth < best.depth) {
      best = edge;
      continue;
    }
    if (edge.depth > best.depth) continue;

    // P3: Lowest dfsOrder wins (first in document order)
    if (edge.dfsOrder < best.dfsOrder) {
      best = edge;
    }
  }

  return best.value;
}

function getPlan(
  plans: Map<LayoutNode, NodeMutationPlan>,
  node: LayoutNode,
): NodeMutationPlan {
  let plan = plans.get(node);
  if (!plan) {
    plan = {
      originalX: node.layout.x,
      originalY: node.layout.y,
      originalW: node.layout.width,
      originalH: node.layout.height,
      centerDeltaX: 0,
      centerDeltaY: 0,
    };
    plans.set(node, plan);
  }
  return plan;
}

function resolveAndMutate(clusters: AlignmentCluster[]): void {
  // Pass 1 — Plan
  const plans = new Map<LayoutNode, NodeMutationPlan>();

  for (const cluster of clusters) {
    const anchor = selectAnchor(cluster);
    cluster.anchorValue = anchor;

    for (const edge of cluster.edges) {
      const plan = getPlan(plans, edge.node);

      switch (edge.edgeType) {
        case "left":
          plan.newLeft = anchor;
          break;
        case "right":
          plan.newRight = anchor;
          break;
        case "top":
          plan.newTop = anchor;
          break;
        case "bottom":
          plan.newBottom = anchor;
          break;
        case "centerX":
          plan.centerDeltaX = anchor - (plan.originalX + plan.originalW / 2);
          break;
        case "centerY":
          plan.centerDeltaY = anchor - (plan.originalY + plan.originalH / 2);
          break;
      }
    }
  }

  // Pass 2 — Apply
  for (const [node, plan] of plans) {
    // Apply center-axis shifts first (move whole box)
    if (plan.centerDeltaX !== 0) {
      node.layout.x = plan.originalX + plan.centerDeltaX;
      // Update originals for subsequent edge calculations
      plan.originalX = node.layout.x;
    }
    if (plan.centerDeltaY !== 0) {
      node.layout.y = plan.originalY + plan.centerDeltaY;
      plan.originalY = node.layout.y;
    }

    // Apply left/top position snaps
    if (plan.newLeft !== undefined) {
      node.layout.x = plan.newLeft;
    }
    if (plan.newTop !== undefined) {
      node.layout.y = plan.newTop;
    }

    // Recalculate width
    if (plan.newLeft !== undefined && plan.newRight !== undefined) {
      node.layout.width = Math.max(plan.newRight - plan.newLeft, 0);
    } else if (plan.newLeft !== undefined) {
      const originalRight = plan.originalX + plan.originalW;
      node.layout.width = Math.max(originalRight - plan.newLeft, 0);
    } else if (plan.newRight !== undefined) {
      node.layout.width = Math.max(plan.newRight - plan.originalX, 0);
    }

    // Recalculate height
    if (plan.newTop !== undefined && plan.newBottom !== undefined) {
      node.layout.height = Math.max(plan.newBottom - plan.newTop, 0);
    } else if (plan.newTop !== undefined) {
      const originalBottom = plan.originalY + plan.originalH;
      node.layout.height = Math.max(originalBottom - plan.newTop, 0);
    } else if (plan.newBottom !== undefined) {
      node.layout.height = Math.max(plan.newBottom - plan.originalY, 0);
    }
  }
}

// ---------------------------------------------------------------------------
// Phase C — Table Grid Enforcement
// ---------------------------------------------------------------------------

function enforceTableGrids(tables: LayoutNode[], pxToEmu: number): void {
  for (const table of tables) {
    const tableData = (table as LayoutTable).tableData;
    if (!tableData || !tableData.columns || tableData.columns.length === 0) continue;

    const tableWidth = table.layout.width;
    const targetTotal = Math.round(tableWidth * pxToEmu);

    // Convert each column to EMU
    const colEmus = tableData.columns.map((c) => Math.round(c * pxToEmu));
    const currentTotal = colEmus.reduce((sum, v) => sum + v, 0);
    let error = targetTotal - currentTotal;

    if (error !== 0) {
      // Distribute rounding error across widest columns first
      // Build index array sorted by column width descending
      const indices = tableData.columns.map((_, i) => i);
      indices.sort((a, b) => colEmus[b] - colEmus[a]);

      const step = error > 0 ? 1 : -1;
      let idx = 0;
      while (error !== 0) {
        colEmus[indices[idx % indices.length]] += step;
        error -= step;
        idx++;
      }
    }

    // Write back as pixels so toEmu() in the table emitter reproduces exact values
    for (let i = 0; i < tableData.columns.length; i++) {
      tableData.columns[i] = colEmus[i] / pxToEmu;
    }
  }
}

// ---------------------------------------------------------------------------
// Phase D — Zero-Dimension Clamping
// ---------------------------------------------------------------------------

function clampZeroDimensions(root: LayoutNode, pxToEmu: number): void {
  const minPx = 1 / pxToEmu; // ~0.000105 px = 1 EMU
  let clampCount = 0;

  function walk(node: LayoutNode): void {
    if (Math.round(node.layout.width * pxToEmu) === 0) {
      node.layout.width = minPx;
      clampCount++;
    }
    if (Math.round(node.layout.height * pxToEmu) === 0) {
      node.layout.height = minPx;
      clampCount++;
    }
    if (node.children) {
      for (const child of node.children) {
        walk(child);
      }
    }
  }

  walk(root);
  if (clampCount > 0) {
    // Clamping zero-dimension nodes is expected behavior — not a warning-level concern
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Post-layout normalization pass. Snaps nearly-aligned edges to identical
 * coordinate values, enforces table column grid integrity, and clamps
 * zero-dimension nodes — all before EMU conversion.
 *
 * Must be called after `runLayout` and before `applyAutoFit`.
 */
export function applyGhostGrid(
  root: LayoutNode,
  dpi: number = DEFAULT_DPI,
): void {
  const pxToEmu = pixelToEmu(dpi);

  // Phase A: extract edges and build clusters
  const { xEdges, yEdges, tables } = extractEdges(root);
  const xClusters = buildClusters(xEdges);
  const yClusters = buildClusters(yEdges);

  // Phase B: resolve anchors and mutate layout
  resolveAndMutate([...xClusters, ...yClusters]);

  // Phase C: enforce table grid integrity
  enforceTableGrids(tables, pxToEmu);

  // Phase D: clamp zero-dimension nodes
  clampZeroDimensions(root, pxToEmu);
}
