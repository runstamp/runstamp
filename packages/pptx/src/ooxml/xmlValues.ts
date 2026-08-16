export interface OoxmlNumberOptions {
  min?: number;
  max?: number;
  fallback?: number;
}

function finiteNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, options: OoxmlNumberOptions): number {
  let next = value;
  if (options.min !== undefined) next = Math.max(options.min, next);
  if (options.max !== undefined) next = Math.min(options.max, next);
  return next;
}

function trimDecimal(value: number, digits: number): string {
  return value.toFixed(digits).replace(/\.?0+$/, "");
}

export function ooxmlInt(value: number, options: OoxmlNumberOptions = {}): string {
  const rounded = Math.round(finiteNumber(value, options.fallback));
  return String(clamp(rounded, options));
}

export function ooxmlUInt(value: number, options: OoxmlNumberOptions = {}): string {
  return ooxmlInt(value, { ...options, min: Math.max(0, options.min ?? 0) });
}

export function ooxmlBool(value: boolean | undefined | null): "1" | "0" {
  return value ? "1" : "0";
}

export function ooxmlRatio(value: number): string {
  const safe = clamp(finiteNumber(value, 0), { min: 0, max: 1 });
  return trimDecimal(safe, 4);
}

export function ooxmlTextFontSize(points: number, fallback = 10): string {
  return ooxmlUInt(finiteNumber(points, fallback) * 75, { min: 1 });
}

export function ooxmlAngle(degrees: number, fallback = 0): string {
  return ooxmlInt(finiteNumber(degrees, fallback) * 60000);
}

export function ooxmlPercentage100k(value: number, fallback = 1): string {
  return ooxmlUInt(finiteNumber(value, fallback) * 100000, { max: 100000 });
}
