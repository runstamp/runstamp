import JSZip from 'jszip';
import type { DeterministicContext } from './deterministic.js';
import { createPackageIntegrityError } from './errors.js';

export interface NativeDocxParts {
  contentTypesXml: string;
  packageRelationshipsXml: string;
  documentRelationshipsXml: string;
  documentXml: string;
  numberingXml?: string;
  footnotesXml?: string;
  endnotesXml?: string;
  commentsXml?: string;
  stylesXml: string;
  settingsXml: string;
  webSettingsXml: string;
  fontTableXml: string;
  themeXml: string;
  appPropsXml: string;
  corePropsXml: string;
  mediaParts?: Array<{ path: string; buffer: Buffer }>;
  xmlParts?: Array<{ path: string; xml: string; relationshipsPath?: string; relationshipsXml?: string }>;
}

const PACKAGE_ORDER: Array<Exclude<keyof NativeDocxParts, 'mediaParts' | 'xmlParts'> | '__path'> = [
  'contentTypesXml',
  'packageRelationshipsXml',
  'appPropsXml',
  'corePropsXml',
  'documentXml',
  'documentRelationshipsXml',
  'numberingXml',
  'footnotesXml',
  'endnotesXml',
  'commentsXml',
  'stylesXml',
  'settingsXml',
  'webSettingsXml',
  'fontTableXml',
  'themeXml',
];

const PART_PATHS: Record<Exclude<keyof NativeDocxParts, 'mediaParts' | 'xmlParts'>, string> = {
  contentTypesXml: '[Content_Types].xml',
  packageRelationshipsXml: '_rels/.rels',
  documentRelationshipsXml: 'word/_rels/document.xml.rels',
  documentXml: 'word/document.xml',
  numberingXml: 'word/numbering.xml',
  footnotesXml: 'word/footnotes.xml',
  endnotesXml: 'word/endnotes.xml',
  commentsXml: 'word/comments.xml',
  stylesXml: 'word/styles.xml',
  settingsXml: 'word/settings.xml',
  webSettingsXml: 'word/webSettings.xml',
  fontTableXml: 'word/fontTable.xml',
  themeXml: 'word/theme/theme1.xml',
  appPropsXml: 'docProps/app.xml',
  corePropsXml: 'docProps/core.xml',
};

function normalizeTarget(basePath: string, target: string): string {
  if (basePath === '_rels/.rels') {
    return target;
  }

  const baseDir = basePath.endsWith('.rels')
    ? basePath.replace(/\/_rels\/[^/]+\.rels$/, '')
    : basePath.slice(0, basePath.lastIndexOf('/'));
  const stack = baseDir.split('/').filter(Boolean);
  for (const segment of target.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      stack.pop();
      continue;
    }
    stack.push(segment);
  }
  return stack.join('/');
}

function extractRelationshipTargets(xml: string): string[] {
  const matches = [...xml.matchAll(/<Relationship\b[^>]*\bTarget="([^"]+)"[^>]*>/g)];
  return matches
    .filter((match) => !/\bTargetMode="External"/.test(match[0]))
    .map((match) => match[1]);
}

export async function assembleNativeDocxPackage(
  parts: NativeDocxParts,
  context: DeterministicContext,
): Promise<Buffer> {
  const zip = new JSZip();
  const knownPaths = new Set(
    Object.entries(PART_PATHS)
      .filter(([key]) => parts[key as keyof typeof PART_PATHS] !== undefined)
      .map(([, value]) => value),
  );
  for (const media of parts.mediaParts ?? []) {
    knownPaths.add(media.path);
  }
  for (const part of parts.xmlParts ?? []) {
    knownPaths.add(part.path);
    if (part.relationshipsPath) {
      knownPaths.add(part.relationshipsPath);
    }
  }

  for (const target of extractRelationshipTargets(parts.packageRelationshipsXml)) {
    if (!knownPaths.has(normalizeTarget(PART_PATHS.packageRelationshipsXml, target))) {
      throw createPackageIntegrityError('root relationship target is missing', { target });
    }
  }

  for (const target of extractRelationshipTargets(parts.documentRelationshipsXml)) {
    if (!knownPaths.has(normalizeTarget(PART_PATHS.documentRelationshipsXml, target))) {
      throw createPackageIntegrityError('document relationship target is missing', { target });
    }
  }

  for (const part of parts.xmlParts ?? []) {
    if (!part.relationshipsPath || !part.relationshipsXml) {
      continue;
    }
    for (const target of extractRelationshipTargets(part.relationshipsXml)) {
      if (!knownPaths.has(normalizeTarget(part.relationshipsPath, target))) {
        throw createPackageIntegrityError('part relationship target is missing', {
          part: part.relationshipsPath,
          target,
        });
      }
    }
  }

  for (const key of PACKAGE_ORDER) {
    if (key === '__path') continue;
    const path = PART_PATHS[key];
    const content = parts[key];
    if (content !== undefined) {
      zip.file(path, content, { date: context.fixedDate });
    }
  }

  for (const media of [...(parts.mediaParts ?? [])].sort((left, right) => left.path.localeCompare(right.path))) {
    zip.file(media.path, media.buffer, { date: context.fixedDate });
  }

  for (const part of [...(parts.xmlParts ?? [])].sort((left, right) => left.path.localeCompare(right.path))) {
    zip.file(part.path, part.xml, { date: context.fixedDate });
    if (part.relationshipsPath && part.relationshipsXml) {
      zip.file(part.relationshipsPath, part.relationshipsXml, { date: context.fixedDate });
    }
  }

  applyStableZipMetadata(zip, context.fixedDate);

  return zip.generateAsync({
    type: 'nodebuffer',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'STORE',
  });
}

function applyStableZipMetadata(zip: JSZip, fixedDate: Date): void {
  for (const file of Object.values(zip.files)) {
    file.date = fixedDate;
    file.comment = '';
  }
}
