import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import JSZip from 'jszip';
import type {
  ComputedStyle,
  StructuredDocument,
  StructuredElement,
  TextRun,
} from '../../types.js';

export const DEFAULT_STYLE: ComputedStyle = {
  backgroundColor: undefined,
  backgroundImage: undefined,
  borderTopWidth: 0,
  borderTopColor: '#000000',
  borderTopStyle: 'none',
  borderRightWidth: 0,
  borderRightColor: '#000000',
  borderRightStyle: 'none',
  borderBottomWidth: 0,
  borderBottomColor: '#000000',
  borderBottomStyle: 'none',
  borderLeftWidth: 0,
  borderLeftColor: '#000000',
  borderLeftStyle: 'none',
  borderRadius: 0,
  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,
  fontFamily: 'Calibri',
  fontSize: 11,
  fontWeight: 'normal',
  fontStyle: 'normal',
  lineHeight: 1.15,
  letterSpacing: 0,
  textAlign: 'left',
  textDecoration: 'none',
  color: '#000000',
  display: 'block',
  visibility: 'visible',
  overflow: 'visible',
  opacity: 1,
  boxShadow: undefined,
  transform: undefined,
};

export function createTextRun(text: string, overrides: Partial<TextRun> = {}): TextRun {
  return {
    text,
    fontFamily: 'Calibri',
    fontSize: 11,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    color: '#000000',
    ...overrides,
  };
}

export function createStructuredDocument(
  elements: StructuredElement[],
  overrides?: Partial<StructuredDocument>,
): StructuredDocument {
  return {
    __kind: 'StructuredDocument',
    metadata: {
      title: 'Phase 1 Native Serializer',
      author: 'Runstamp',
      createdAt: new Date('2026-04-10T00:00:00.000Z'),
      modifiedAt: new Date('2026-04-10T00:00:00.000Z'),
      language: 'en-US',
      ...overrides?.metadata,
    },
    revisionInfo: overrides?.revisionInfo,
    pages: overrides?.pages ?? [
      {
        pageNumber: 1,
        dimensions: {
          width: 794,
          height: 1123,
          margins: { top: 96, right: 96, bottom: 96, left: 96 },
        },
        elements,
      },
    ],
    styles: overrides?.styles ?? {
      paragraphStyles: new Map(),
      characterStyles: new Map(),
      tableStyles: new Map(),
    },
    assets: overrides?.assets ?? {
      images: new Map(),
      fonts: new Map(),
      embeddedFiles: new Map(),
    },
    stats: overrides?.stats ?? {
      imageCount: 0,
      tableCount: 0,
      chartCount: 0,
      shapeCount: 0,
      listCount: 0,
      containerCount: 0,
      textRunCount: elements.reduce((count, element) => count + ('runs' in element ? element.runs.length : 0), 0),
      totalElements: elements.length,
    },
    warnings: overrides?.warnings ?? [],
    toc: overrides?.toc,
  };
}

export async function unzipDocx(buffer: Buffer): Promise<Record<string, string>> {
  const zip = await JSZip.loadAsync(buffer);
  const entries: Record<string, string> = {};

  await Promise.all(
    Object.values(zip.files)
      .filter((entry) => !entry.dir)
      .map(async (entry) => {
        entries[entry.name] = await entry.async('string');
      }),
  );

  return entries;
}

export async function validateDocx(buffer: Buffer): Promise<{ ok: boolean; errors: unknown[] }> {
  const dir = await mkdtemp(join(tmpdir(), 'runstamp-native-docx-'));
  const filePath = join(dir, 'native.docx');

  try {
    await writeFile(filePath, buffer);
    const { validateFile } = await import('@xarsh/ooxml-validator');
    const result = await validateFile(filePath, { officeVersion: 'Microsoft365' }) as { ok: boolean; errors: unknown[] };
    return result;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
