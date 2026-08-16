import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeDocxPackageBuffer } from '../src/ooxml/package-normalizer.ts';

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = resolve(packageDir, 'output/manual-validation');

const entries = await readdir(outputDir, { withFileTypes: true });
for (const entry of entries) {
  if (!entry.isFile() || !entry.name.endsWith('.docx')) {
    continue;
  }

  const filePath = resolve(outputDir, entry.name);
  const buffer = await readFile(filePath);
  const normalized = await normalizeDocxPackageBuffer(buffer);
  await writeFile(filePath, normalized);
}
