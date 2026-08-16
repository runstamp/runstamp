import { createHash, randomUUID } from "node:crypto";

import { isDeterministicMode } from "../deterministicMode.js";

function formatGuid(hex: string): string {
  const chars = hex.slice(0, 32).split("");
  chars[12] = "4";
  chars[16] = ((parseInt(chars[16] ?? "0", 16) & 0x3) | 0x8).toString(16);
  return [
    chars.slice(0, 8).join(""),
    chars.slice(8, 12).join(""),
    chars.slice(12, 16).join(""),
    chars.slice(16, 20).join(""),
    chars.slice(20, 32).join(""),
  ].join("-").toUpperCase();
}

export function createOoxmlGuid(scope: string): string {
  if (!isDeterministicMode()) {
    return randomUUID().toUpperCase();
  }

  const hash = createHash("sha256")
    // Frozen at the Runstamp rename. This is a hash domain separator, not a
    // brand string — nothing outside this function ever observes it. Changing
    // it rewrites every GUID in every generated PPTX, invalidating every frozen
    // artifact set and golden fixture, for no visible benefit. Do not rename.
    .update("paperjsx:pptx:ooxml-guid:")
    .update(scope)
    .digest("hex");
  return formatGuid(hash);
}
