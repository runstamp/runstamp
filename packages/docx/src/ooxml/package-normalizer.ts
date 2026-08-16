import JSZip from 'jszip';

const DETERMINISTIC_ZIP_DATE = new Date('1980-01-01T00:00:00.000Z');

/**
 * Normalize a DOCX ZIP for fixture generation and byte comparison.
 *
 * The native serializer already emits deterministic packages; this helper is
 * retained for manual validation fixture tooling that needs stable ZIP entry
 * ordering and timestamps independent of the source buffer.
 */
export async function normalizeDocxPackageBuffer(
  buffer: Buffer | ArrayBuffer | Uint8Array,
): Promise<Buffer> {
  const input = await JSZip.loadAsync(buffer);
  const output = new JSZip();

  for (const path of Object.keys(input.files).sort()) {
    const file = input.files[path];
    if (!file || file.dir) {
      continue;
    }
    output.file(path, await file.async('nodebuffer'), {
      date: DETERMINISTIC_ZIP_DATE,
      compression: 'DEFLATE',
    });
  }

  return output.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
    platform: 'DOS',
  });
}
