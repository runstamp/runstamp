// src/layout/yoga.ts — Yoga WASM initialization and style mapping

import initYoga from "yoga-wasm-web";
import type { Yoga, Node as YogaNode } from "yoga-wasm-web";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { FlexStyle } from "../types/ast.js";
import { normalizeStyle } from "../normalizer.js";

declare const __RUNSTAMP_YOGA_WASM_BASE64__: string | undefined;

export type { Yoga, YogaNode };

// yoga-wasm-web/auto resolves ./yoga.wasm relative to import.meta.url, which
// breaks on serverless hosts that build under one root and run under another
// (e.g. Vercel builds at /vercel/path0 but runs at /var/task, and the module
// registry preserves build-time filenames). Load the wasm ourselves through a
// candidate chain that ends with a cwd walk immune to that translation.
function wasmCandidates(): string[] {
  const out: string[] = [];
  try {
    out.push(fileURLToPath(new URL("./yoga.wasm", import.meta.url)));
  } catch {
    /* non-file URL (bundled/edge) — fall through */
  }
  try {
    out.push(createRequire(import.meta.url).resolve("yoga-wasm-web/dist/yoga.wasm"));
  } catch {
    /* stale module path — fall through */
  }
  let dir = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    for (const rel of [
      "packages/core/dist-pro/yoga.wasm",
      "packages/core/dist/yoga.wasm",
      "packages/lite/dist-lite/yoga.wasm",
      "node_modules/yoga-wasm-web/dist/yoga.wasm",
    ]) {
      out.push(join(dir, rel));
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return out;
}

async function loadYoga(): Promise<Yoga> {
  if (typeof __RUNSTAMP_YOGA_WASM_BASE64__ === "string" && __RUNSTAMP_YOGA_WASM_BASE64__.length > 0) {
    return initYoga(Buffer.from(__RUNSTAMP_YOGA_WASM_BASE64__, "base64"));
  }
  const tried: string[] = [];
  for (const candidate of wasmCandidates()) {
    tried.push(candidate);
    if (!existsSync(candidate)) continue;
    return initYoga(await readFile(candidate));
  }
  throw new Error(`yoga.wasm not found; tried:\n${tried.join("\n")}`);
}

let yogaPromise: Promise<Yoga> | null = null;

/** Parse a percentage string, returning undefined if NaN/Infinity. */
function safePercent(s: string): number | undefined {
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : undefined;
}

/** Guard numeric dimension: reject NaN, Infinity, and negative values. */
function safeDim(v: number): number | undefined {
  return Number.isFinite(v) && v >= 0 ? v : undefined;
}

// Singleton accessor — lazily initializes the wasm instance on first use.
export async function getYoga(): Promise<Yoga> {
  yogaPromise ??= loadYoga();
  return yogaPromise;
}

// Translates a FlexStyle (after shorthand normalization) into Yoga node
// configuration calls, mapping CSS string enums to Yoga integer constants.
export function applyStyleToNode(
  node: YogaNode,
  style: FlexStyle,
  yoga: Yoga,
): void {
  const s = normalizeStyle(style);

  // Flex Direction
  if (s.flexDirection === "row") {
    node.setFlexDirection(yoga.FLEX_DIRECTION_ROW);
  } else {
    node.setFlexDirection(yoga.FLEX_DIRECTION_COLUMN);
  }

  // Justify Content
  if (s.justifyContent === "center") {
    node.setJustifyContent(yoga.JUSTIFY_CENTER);
  } else if (s.justifyContent === "flex-end") {
    node.setJustifyContent(yoga.JUSTIFY_FLEX_END);
  } else if (s.justifyContent === "space-between") {
    node.setJustifyContent(yoga.JUSTIFY_SPACE_BETWEEN);
  } else if (s.justifyContent === "space-around") {
    node.setJustifyContent(yoga.JUSTIFY_SPACE_AROUND);
  } else {
    node.setJustifyContent(yoga.JUSTIFY_FLEX_START);
  }

  // Align Items
  if (s.alignItems === "center") {
    node.setAlignItems(yoga.ALIGN_CENTER);
  } else if (s.alignItems === "flex-end") {
    node.setAlignItems(yoga.ALIGN_FLEX_END);
  } else if (s.alignItems === "stretch") {
    node.setAlignItems(yoga.ALIGN_STRETCH);
  } else if (s.alignItems === "flex-start") {
    node.setAlignItems(yoga.ALIGN_FLEX_START);
  }

  // Dimensions (guarded against NaN/Infinity/negative)
  if (typeof s.width === "number") {
    const v = safeDim(s.width);
    if (v !== undefined) node.setWidth(v);
  } else if (typeof s.width === "string" && s.width.endsWith("%")) {
    const v = safePercent(s.width);
    if (v !== undefined) node.setWidthPercent(v);
  }

  if (typeof s.height === "number") {
    const v = safeDim(s.height);
    if (v !== undefined) node.setHeight(v);
  } else if (typeof s.height === "string" && s.height.endsWith("%")) {
    const v = safePercent(s.height);
    if (v !== undefined) node.setHeightPercent(v);
  }

  // Padding (expanded from shorthand by normalizeStyle)
  if (s.paddingTop !== undefined) node.setPadding(yoga.EDGE_TOP, s.paddingTop);
  if (s.paddingRight !== undefined)
    node.setPadding(yoga.EDGE_RIGHT, s.paddingRight);
  if (s.paddingBottom !== undefined)
    node.setPadding(yoga.EDGE_BOTTOM, s.paddingBottom);
  if (s.paddingLeft !== undefined)
    node.setPadding(yoga.EDGE_LEFT, s.paddingLeft);

  // Margin (expanded from shorthand by normalizeStyle)
  if (s.marginTop !== undefined) node.setMargin(yoga.EDGE_TOP, s.marginTop);
  if (s.marginRight !== undefined)
    node.setMargin(yoga.EDGE_RIGHT, s.marginRight);
  if (s.marginBottom !== undefined)
    node.setMargin(yoga.EDGE_BOTTOM, s.marginBottom);
  if (s.marginLeft !== undefined)
    node.setMargin(yoga.EDGE_LEFT, s.marginLeft);

  // Explicit Position
  if (s.position === "absolute") {
    node.setPositionType(yoga.POSITION_TYPE_ABSOLUTE);
    if (s.top !== undefined) node.setPosition(yoga.EDGE_TOP, s.top);
    if (s.right !== undefined) node.setPosition(yoga.EDGE_RIGHT, s.right);
    if (s.bottom !== undefined) node.setPosition(yoga.EDGE_BOTTOM, s.bottom);
    if (s.left !== undefined) node.setPosition(yoga.EDGE_LEFT, s.left);
  }

  // Flex Wrap
  if (s.flexWrap === "wrap") node.setFlexWrap(yoga.WRAP_WRAP);
  else if (s.flexWrap === "wrap-reverse") node.setFlexWrap(yoga.WRAP_WRAP_REVERSE);

  // Flex Item
  if (s.flexGrow !== undefined) node.setFlexGrow(s.flexGrow);
  if (s.flexShrink !== undefined) node.setFlexShrink(s.flexShrink);
  if (s.flexBasis !== undefined) {
    if (typeof s.flexBasis === "number") { const v = safeDim(s.flexBasis); if (v !== undefined) node.setFlexBasis(v); }
    else if (typeof s.flexBasis === "string") { const v = safePercent(s.flexBasis); if (v !== undefined) node.setFlexBasisPercent(v); }
  }

  // Gap
  if (s.gap !== undefined) node.setGap(yoga.GUTTER_ALL, s.gap);
  if (s.rowGap !== undefined) node.setGap(yoga.GUTTER_ROW, s.rowGap);
  if (s.columnGap !== undefined) node.setGap(yoga.GUTTER_COLUMN, s.columnGap);

  // Min/Max Dimensions (guarded against NaN/Infinity/negative)
  if (typeof s.minWidth === "number") { const v = safeDim(s.minWidth); if (v !== undefined) node.setMinWidth(v); }
  else if (typeof s.minWidth === "string") { const v = safePercent(s.minWidth); if (v !== undefined) node.setMinWidthPercent(v); }
  if (typeof s.maxWidth === "number") { const v = safeDim(s.maxWidth); if (v !== undefined) node.setMaxWidth(v); }
  else if (typeof s.maxWidth === "string") { const v = safePercent(s.maxWidth); if (v !== undefined) node.setMaxWidthPercent(v); }
  if (typeof s.minHeight === "number") { const v = safeDim(s.minHeight); if (v !== undefined) node.setMinHeight(v); }
  else if (typeof s.minHeight === "string") { const v = safePercent(s.minHeight); if (v !== undefined) node.setMinHeightPercent(v); }
  if (typeof s.maxHeight === "number") { const v = safeDim(s.maxHeight); if (v !== undefined) node.setMaxHeight(v); }
  else if (typeof s.maxHeight === "string") { const v = safePercent(s.maxHeight); if (v !== undefined) node.setMaxHeightPercent(v); }

  // Align Self
  if (s.alignSelf === "center") node.setAlignSelf(yoga.ALIGN_CENTER);
  else if (s.alignSelf === "flex-start") node.setAlignSelf(yoga.ALIGN_FLEX_START);
  else if (s.alignSelf === "flex-end") node.setAlignSelf(yoga.ALIGN_FLEX_END);
  else if (s.alignSelf === "stretch") node.setAlignSelf(yoga.ALIGN_STRETCH);

  // Aspect Ratio
  if (s.aspectRatio !== undefined) node.setAspectRatio(s.aspectRatio);

  // Display
  if (s.display === "none") node.setDisplay(yoga.DISPLAY_NONE);
}
