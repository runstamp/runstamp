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
import type { ConnectorKind } from "../layout/index.js";
export interface ConnectorLineInput {
    /** Connector style. Default "straight". */
    kind?: ConnectorKind;
    /** Endpoints in slide-space pixels. */
    start: {
        x: number;
        y: number;
    };
    end: {
        x: number;
        y: number;
    };
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
export declare const connectorLine: Primitive<ConnectorLineInput>;
//# sourceMappingURL=connectorLine.d.ts.map