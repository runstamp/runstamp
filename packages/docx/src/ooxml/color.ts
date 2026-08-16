import { DOCXError, DOCXErrorCode } from '../errors.js';

export interface NormalizeOoxmlColorOptions {
  allowCssHex?: boolean;
}

export function normalizeOoxmlColor(
  color: string | undefined,
  fallback?: string,
  options: NormalizeOoxmlColorOptions = {},
): string | undefined {
  const value = (color ?? fallback)?.trim();
  if (!value) {
    return undefined;
  }
  if (value.toLowerCase() === 'auto') {
    return 'auto';
  }

  if (/^[0-9a-fA-F]{6}$/.test(value)) {
    return value.toUpperCase();
  }
  if (options.allowCssHex !== false) {
    const cssHex = value.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
    if (cssHex) {
      const hex = cssHex[1];
      return hex.length === 3
        ? hex.split('').map((char) => `${char}${char}`).join('').toUpperCase()
        : hex.toUpperCase();
    }
  }

  throw new DOCXError(
    DOCXErrorCode.INVALID_COLOR,
    `Invalid DOCX color value "${value}".`,
    {
      recovery: 'Use "auto", a 6-character OOXML hex color like "FF0000", or a CSS hex color like "#FF0000".',
      context: { color: value },
    },
  );
}
