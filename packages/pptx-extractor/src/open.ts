import JSZip from "jszip";

export interface OpenedPptx {
  parts: Map<string, Buffer>;
  hasPart(path: string): boolean;
  getPart(path: string): Buffer | undefined;
  getPartText(path: string): string | undefined;
  listParts(): string[];
}

export interface OpenPptxLimits {
  /** Maximum number of file entries in the archive (default: 10000). */
  maxEntries?: number;
  /** Maximum total uncompressed size across all entries in bytes (default: 1 GiB). */
  maxTotalUncompressedBytes?: number;
}

const DEFAULT_MAX_ENTRIES = 10_000;
const DEFAULT_MAX_TOTAL_UNCOMPRESSED_BYTES = 1_073_741_824; // 1 GiB

export async function openPptx(buffer: Buffer, limits?: OpenPptxLimits): Promise<OpenedPptx> {
  const maxEntries = limits?.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const maxTotalBytes = limits?.maxTotalUncompressedBytes ?? DEFAULT_MAX_TOTAL_UNCOMPRESSED_BYTES;

  const zip = await JSZip.loadAsync(buffer);
  const parts = new Map<string, Buffer>();

  const entries = Object.values(zip.files).filter((f) => !f.dir);
  if (entries.length > maxEntries) {
    throw new Error(
      `openPptx: archive has ${entries.length} entries, exceeding the limit of ${maxEntries}`,
    );
  }

  let totalBytes = 0;
  for (const entry of entries) {
    const data = await entry.async("nodebuffer");
    totalBytes += data.length;
    if (totalBytes > maxTotalBytes) {
      throw new Error(
        `openPptx: total uncompressed size exceeded the limit of ${maxTotalBytes} bytes while inflating "${entry.name}"`,
      );
    }
    parts.set(entry.name, data);
  }

  return {
    parts,
    hasPart: (path) => parts.has(path),
    getPart: (path) => parts.get(path),
    getPartText: (path) => {
      const buf = parts.get(path);
      return buf ? buf.toString("utf8") : undefined;
    },
    listParts: () => Array.from(parts.keys()).sort(),
  };
}
