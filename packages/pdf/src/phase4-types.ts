export type PdfBinarySource = Buffer | Uint8Array | string;

export type PdfColor =
  | { space: "cmyk"; c: number; k: number; m: number; y: number }
  | { b: number; g: number; r: number; space: "rgb" };

export interface PdfGradientStop {
  color: PdfColor;
  offset: number;
}

export interface PdfLinearGradientFill {
  endX: number;
  endY: number;
  opacity?: number;
  space: "linear-gradient";
  startX: number;
  startY: number;
  stops: [PdfGradientStop, PdfGradientStop];
}

export interface PdfRadialGradientFill {
  endRadius: number;
  endX: number;
  endY: number;
  opacity?: number;
  space: "radial-gradient";
  startRadius: number;
  startX: number;
  startY: number;
  stops: [PdfGradientStop, PdfGradientStop];
}

export interface PdfSolidFill {
  color: PdfColor;
  opacity?: number;
  space: "solid";
}

export type PdfFill = PdfLinearGradientFill | PdfRadialGradientFill | PdfSolidFill;

export interface PdfStrokeStyle {
  color: PdfColor;
  dash?: number[];
  lineCap?: "butt" | "round" | "square";
  opacity?: number;
  style?: "dashed" | "dotted" | "solid";
  width?: number;
}

export interface PdfRectGraphic {
  fill?: PdfFill;
  height: number;
  layer?: "background" | "foreground";
  radius?: number;
  stroke?: PdfStrokeStyle;
  type: "rect";
  width: number;
  x: number;
  y: number;
}

export interface PdfLineGraphic {
  layer?: "background" | "foreground";
  stroke: PdfStrokeStyle;
  type: "line";
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

export interface PdfPathGraphic {
  d: string;
  fill?: PdfFill;
  fillRule?: "evenodd" | "nonzero";
  layer?: "background" | "foreground";
  scaleX?: number;
  scaleY?: number;
  stroke?: PdfStrokeStyle;
  type: "path";
  x?: number;
  y?: number;
}

export interface PdfImageGraphic {
  format?: "jpeg" | "png";
  height: number;
  layer?: "background" | "foreground";
  opacity?: number;
  source: PdfBinarySource;
  type: "image";
  width: number;
  x: number;
  y: number;
}

export interface PdfSvgGraphic {
  height: number;
  layer?: "background" | "foreground";
  opacity?: number;
  source: PdfBinarySource;
  type: "svg";
  width: number;
  x: number;
  y: number;
}

export type PdfGraphic = PdfImageGraphic | PdfLineGraphic | PdfPathGraphic | PdfRectGraphic | PdfSvgGraphic;
