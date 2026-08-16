/**
 * connectorLine — thin wrapper around ConnectorNode for straight /
 * right-angle / curved leader lines and pointer arrows. Used wherever
 * a primitive emits a ConnectorNode directly would be too low-level for
 * composition callers.
 *
 * Tokens consumed:
 *   - palette.faint (default line color)
 */

import type { Primitive } from "./primitive.js";
import type { ConnectorKind, ConnectorNode, Rect } from "../layout/index.js";

export interface ConnectorLineInput {
  /** Connector style. Default "straight". */
  kind?: ConnectorKind;
  /** Endpoints in slide-space pixels. */
  start: { x: number; y: number };
  end: { x: number; y: number };
  /** Line width in pixels. Default 1. */
  width?: number;
  /** Color role. Default "faint". */
  color?: "foreground" | "muted" | "faint" | "accent" | "rule";
  /** Dash style. Default "solid". */
  dashStyle?: "solid" | "dashed" | "dotted" | "dotDash";
  arrowStart?: boolean;
  arrowEnd?: boolean;
  /** Bounds used for layout validation. Default derives a tight rect from
   *  start/end so callers don't have to keep a redundant region in sync. */
  bounds?: "endpoints" | "region";
}

function connectorBounds(input: ConnectorLineInput, region: Rect): Rect {
  if (input.bounds === "region") return { ...region };
  const lineWidth = input.width ?? 1;
  const arrowPad = input.arrowStart || input.arrowEnd ? 8 : 0;
  const pad = Math.max(2, lineWidth / 2) + arrowPad;
  const minX = Math.min(input.start.x, input.end.x);
  const maxX = Math.max(input.start.x, input.end.x);
  const minY = Math.min(input.start.y, input.end.y);
  const maxY = Math.max(input.start.y, input.end.y);
  return {
    left: minX - pad,
    top: minY - pad,
    width: Math.max(1, maxX - minX) + pad * 2,
    height: Math.max(1, maxY - minY) + pad * 2,
  };
}

export const connectorLine: Primitive<ConnectorLineInput> = (input, tokens, region) => {
  const colorRole = input.color ?? "faint";
  const color =
    colorRole === "foreground"
      ? tokens.palette.foreground
      : colorRole === "muted"
        ? tokens.palette.muted
        : colorRole === "accent"
          ? tokens.palette.accent
          : colorRole === "rule"
            ? tokens.palette.rule
            : tokens.palette.faint;

  const node: ConnectorNode = {
    kind: "connector",
    rect: connectorBounds(input, region),
    connectorKind: input.kind ?? "straight",
    start: input.start,
    end: input.end,
    lineWidth: input.width ?? 1,
    lineColor: color,
    lineDashStyle: input.dashStyle ?? "solid",
    arrowStart: input.arrowStart,
    arrowEnd: input.arrowEnd,
  };

  return { nodes: [node], overflow: { kind: "fit" } };
};
