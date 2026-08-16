import type { PdfPermissionFlags } from "./types.js";

/**
 * Compute the 32-bit permission integer for the PDF /P entry.
 *
 * When `flags` is undefined all permissions are granted (user-password-only mode).
 * Otherwise individual bits are set according to the PDF spec.
 */
export function computePermissionFlags(flags?: PdfPermissionFlags): number {
  if (flags === undefined) {
    // All permissions granted — 0xFFFFFFFC as signed 32-bit
    return 0xFFFFFFFC | 0;
  }

  // Reserved bits: 7-8 set, 13-32 set, 1-2 clear
  let value = 0xFFFFF0C0;

  // bit 3 (0x4): print — default true
  if (flags.print !== false) {
    value |= 0x4;
  }

  // bit 4 (0x8): modify
  if (flags.modify === true) {
    value |= 0x8;
  }

  // bit 5 (0x10): copy
  if (flags.copy === true) {
    value |= 0x10;
  }

  // bit 6 (0x20): annotate
  if (flags.annotate === true) {
    value |= 0x20;
  }

  // bit 9 (0x100): fillForms
  if (flags.fillForms === true) {
    value |= 0x100;
  }

  // bit 10 (0x200): extract (accessibility)
  if (flags.extract === true) {
    value |= 0x200;
  }

  // bit 11 (0x400): assemble
  if (flags.assemble === true) {
    value |= 0x400;
  }

  // bit 12 (0x800): printHighQuality — default true
  if (flags.printHighQuality !== false) {
    value |= 0x800;
  }

  // Force sign extension to signed 32-bit
  return value | 0;
}
