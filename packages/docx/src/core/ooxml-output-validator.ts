/**
 * Post-emit OOXML strict validator.
 *
 * The directive at docs/0428-claude-test-based-directive2.md
 * §"@runstamp/docx" calls out three concrete failure modes that ship
 * past LibreOffice ("opens fine") but trigger the Word "needs repair" prompt:
 *
 *   1. `<w:tab w:pos="N"/>` with N < 0 (negative footer tab positions).
 *   2. `<Override>` entries in `[Content_Types].xml` whose target part is
 *      absent from the .docx zip.
 *   3. Relationship targets that don't resolve to a sibling package part.
 *   4. Owner-part relationship references without a corresponding Id.
 *
 * Run this against the rendered buffer by default from `renderToDocx` (or via
 * the standalone `validateDocxBuffer` export). LibreOffice is not a sufficient
 * gate; Word's stricter parser surfaces these.
 */
import JSZip from 'jszip';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

export interface OoxmlValidationIssue {
  severity: 'error' | 'warning';
  code:
    | 'DOCX_TAB_NEGATIVE'
    | 'DOCX_CONTENT_TYPES_OVERRIDE_MISSING'
    | 'DOCX_RELATIONSHIP_TARGET_MISSING'
    | 'DOCX_RELATIONSHIP_REFERENCE_MISSING'
    | 'DOCX_VALIDATOR_INTERNAL';
  message: string;
  part?: string;
  details?: Record<string, unknown>;
}

export interface OoxmlValidationResult {
  ok: boolean;
  issues: OoxmlValidationIssue[];
}

const CONTENT_TYPES_PART = '[Content_Types].xml';
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: false,
});

type XmlRecord = Record<string, unknown>;

function asArray<T>(value: T | T[] | undefined): T[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

function findChildByLocalName(value: unknown, localName: string): unknown {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as XmlRecord;
  for (const [key, child] of Object.entries(record)) {
    if (key.split(':').at(-1) === localName) return child;
  }
  return undefined;
}

function parseXmlPart(xml: string, part: string, issues: OoxmlValidationIssue[]): XmlRecord | null {
  const validation = XMLValidator.validate(xml);
  if (validation !== true) {
    issues.push({
      severity: 'error',
      code: 'DOCX_VALIDATOR_INTERNAL',
      message: `Could not parse XML part "${part}": ${validation.err.msg}`,
      part,
      details: { line: validation.err.line, column: validation.err.col },
    });
    return null;
  }
  try {
    return xmlParser.parse(xml) as XmlRecord;
  } catch (error) {
    issues.push({
      severity: 'error',
      code: 'DOCX_VALIDATOR_INTERNAL',
      message: `Could not parse XML part "${part}": ${error instanceof Error ? error.message : String(error)}`,
      part,
    });
    return null;
  }
}

function normalizePartName(target: string, owner: string): string {
  if (target.startsWith('/')) {
    return target.slice(1);
  }
  // Resolve relative target against the owner's directory. e.g.
  // owner="word/_rels/document.xml.rels" target="media/image1.png" →
  // "word/media/image1.png". The root rels file (`_rels/.rels`) resolves
  // targets against the package root because its "owner" is the package.
  const ownerDir = owner.includes('/') ? owner.slice(0, owner.lastIndexOf('/')) : '';
  // Strip the trailing `_rels` segment because rels files live alongside their
  // owner rather than inside `_rels/`. Handles both `word/_rels` → `word`
  // and root `_rels` → `` (package root).
  let baseDir: string;
  if (ownerDir === '_rels') {
    baseDir = '';
  } else if (ownerDir.endsWith('/_rels')) {
    baseDir = ownerDir.slice(0, -'/_rels'.length);
  } else {
    baseDir = ownerDir;
  }
  const segments = target.split('/').filter(Boolean);
  const stack: string[] = baseDir ? baseDir.split('/').filter(Boolean) : [];
  for (const segment of segments) {
    if (segment === '.') continue;
    if (segment === '..') {
      stack.pop();
      continue;
    }
    stack.push(segment);
  }
  return stack.join('/');
}

function* matchAll(pattern: RegExp, input: string): Iterable<RegExpExecArray> {
  // Use a fresh global regex each call so the caller's `pattern` doesn't
  // accumulate `lastIndex` across files.
  const flags = pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g';
  const regex = new RegExp(pattern.source, flags);
  let match: RegExpExecArray | null;
  while ((match = regex.exec(input)) !== null) {
    yield match;
  }
}

async function validateNegativeTabPositions(
  zip: JSZip,
  issues: OoxmlValidationIssue[],
): Promise<void> {
  // Scan every word/*.xml part for `<w:tab w:pos="N"/>` and assert N >= 0.
  // Word rejects negative values; LibreOffice silently accepts.
  const xmlPaths = Object.keys(zip.files)
    .filter((path) => path.startsWith('word/') && path.endsWith('.xml'))
    .sort();
  const tabRegex = /<w:tab\b[^>]*\bw:pos="(-?\d+)"[^>]*\/?>/g;
  for (const path of xmlPaths) {
    const file = zip.file(path);
    if (!file) continue;
    const xml = await file.async('string');
    for (const match of matchAll(tabRegex, xml)) {
      const pos = Number.parseInt(match[1]!, 10);
      if (Number.isFinite(pos) && pos < 0) {
        issues.push({
          severity: 'error',
          code: 'DOCX_TAB_NEGATIVE',
          message: `Tab position ${pos} is negative (Word rejects this and prompts for repair).`,
          part: path,
          details: { pos, fragment: match[0] },
        });
      }
    }
  }
}

async function validateContentTypesOverrides(
  zip: JSZip,
  issues: OoxmlValidationIssue[],
): Promise<void> {
  const contentTypes = zip.file(CONTENT_TYPES_PART);
  if (!contentTypes) {
    issues.push({
      severity: 'error',
      code: 'DOCX_CONTENT_TYPES_OVERRIDE_MISSING',
      message: `[Content_Types].xml is missing from the package.`,
    });
    return;
  }
  const xml = await contentTypes.async('string');
  const parsed = parseXmlPart(xml, CONTENT_TYPES_PART, issues);
  if (!parsed) return;
  const types = findChildByLocalName(parsed, 'Types');
  const overrides = asArray(findChildByLocalName(types, 'Override'));
  for (const override of overrides) {
    if (!override || typeof override !== 'object') continue;
    const declaredPartName = String((override as XmlRecord).PartName ?? '');
    if (!declaredPartName) continue;
    const partName = declaredPartName.startsWith('/') ? declaredPartName.slice(1) : declaredPartName;
    if (!zip.file(partName)) {
      issues.push({
        severity: 'error',
        code: 'DOCX_CONTENT_TYPES_OVERRIDE_MISSING',
        message: `[Content_Types].xml declares Override for "${declaredPartName}" but no such part exists.`,
        part: CONTENT_TYPES_PART,
        details: { partName: declaredPartName },
      });
    }
  }
}

function ownerPartForRelationships(relsPath: string): string | null {
  if (relsPath === '_rels/.rels') return null;
  const marker = '/_rels/';
  const markerIndex = relsPath.lastIndexOf(marker);
  if (markerIndex < 0 || !relsPath.endsWith('.rels')) return null;
  const ownerDirectory = relsPath.slice(0, markerIndex);
  const ownerFile = relsPath.slice(markerIndex + marker.length, -'.rels'.length);
  return ownerDirectory ? `${ownerDirectory}/${ownerFile}` : ownerFile;
}

function relationshipsPartForOwner(ownerPart: string): string {
  const separator = ownerPart.lastIndexOf('/');
  const directory = separator >= 0 ? ownerPart.slice(0, separator) : '';
  const fileName = separator >= 0 ? ownerPart.slice(separator + 1) : ownerPart;
  return directory ? `${directory}/_rels/${fileName}.rels` : `_rels/${fileName}.rels`;
}

function collectRelationshipReferences(value: unknown, references: Set<string>): void {
  if (Array.isArray(value)) {
    for (const child of value) collectRelationshipReferences(child, references);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value as XmlRecord)) {
    if (key === 'r:id' || key === 'r:embed' || key === 'r:link') {
      if (typeof child === 'string') references.add(child);
    } else {
      collectRelationshipReferences(child, references);
    }
  }
}

async function validateRelationshipTargets(
  zip: JSZip,
  issues: OoxmlValidationIssue[],
): Promise<void> {
  const relsPaths = Object.keys(zip.files)
    .filter((path) => path.endsWith('.rels'))
    .sort();
  for (const path of relsPaths) {
    const file = zip.file(path);
    if (!file) continue;
    const xml = await file.async('string');
    const parsed = parseXmlPart(xml, path, issues);
    if (!parsed) continue;
    const relationshipsRoot = findChildByLocalName(parsed, 'Relationships');
    const relationships = asArray(findChildByLocalName(relationshipsRoot, 'Relationship'));
    const relationshipIds = new Set<string>();

    for (const relationship of relationships) {
      if (!relationship || typeof relationship !== 'object') continue;
      const attributes = relationship as XmlRecord;
      const id = typeof attributes.Id === 'string' ? attributes.Id : undefined;
      const target = typeof attributes.Target === 'string' ? attributes.Target : undefined;
      if (!id || !target) continue;
      relationshipIds.add(id);
      if (String(attributes.TargetMode ?? '').toLowerCase() === 'external') continue;
      const partName = normalizePartName(target, path);
      if (!zip.file(partName)) {
        issues.push({
          severity: 'error',
          code: 'DOCX_RELATIONSHIP_TARGET_MISSING',
          message: `Relationship "${id}" in "${path}" points to "${target}" (resolved as "${partName}") which is missing from the package.`,
          part: path,
          details: { id, target, resolved: partName },
        });
      }
    }

    const ownerPart = ownerPartForRelationships(path);
    const ownerFile = ownerPart ? zip.file(ownerPart) : null;
    if (!ownerPart || !ownerFile || !ownerPart.endsWith('.xml')) continue;
    const ownerXml = await ownerFile.async('string');
    const parsedOwner = parseXmlPart(ownerXml, ownerPart, issues);
    if (!parsedOwner) continue;
    const references = new Set<string>();
    collectRelationshipReferences(parsedOwner, references);
    for (const id of references) {
      if (!relationshipIds.has(id)) {
        issues.push({
          severity: 'error',
          code: 'DOCX_RELATIONSHIP_REFERENCE_MISSING',
          message: `Part "${ownerPart}" references relationship "${id}" but "${path}" does not define it.`,
          part: ownerPart,
          details: { id, relationshipsPart: path },
        });
      }
    }
  }
  // A part can contain r:id/r:embed/r:link references while its .rels part is
  // absent altogether. Such owners do not appear in the loop above.
  const ownerXmlPaths = Object.keys(zip.files)
    .filter((path) => path.endsWith('.xml') && !path.endsWith('.rels'))
    .sort();
  for (const ownerPart of ownerXmlPaths) {
    const expectedRelationshipsPart = relationshipsPartForOwner(ownerPart);
    if (zip.file(expectedRelationshipsPart)) continue;
    const ownerFile = zip.file(ownerPart);
    if (!ownerFile) continue;
    const ownerXml = await ownerFile.async('string');
    const parsedOwner = parseXmlPart(ownerXml, ownerPart, issues);
    if (!parsedOwner) continue;
    const references = new Set<string>();
    collectRelationshipReferences(parsedOwner, references);
    for (const id of references) {
      issues.push({
        severity: 'error',
        code: 'DOCX_RELATIONSHIP_REFERENCE_MISSING',
        message: `Part "${ownerPart}" references relationship "${id}" but relationships part "${expectedRelationshipsPart}" is missing.`,
        part: ownerPart,
        details: { id, relationshipsPart: expectedRelationshipsPart },
      });
    }
  }
}

/**
 * Validate a rendered DOCX buffer against the strict-mode invariants.
 * Pure read-only — does not mutate the buffer.
 */
export async function validateDocxBuffer(buffer: Buffer | Uint8Array): Promise<OoxmlValidationResult> {
  const issues: OoxmlValidationIssue[] = [];
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch (error) {
    issues.push({
      severity: 'error',
      code: 'DOCX_VALIDATOR_INTERNAL',
      message: `Failed to read DOCX zip: ${error instanceof Error ? error.message : String(error)}`,
    });
    return { ok: false, issues };
  }

  await validateNegativeTabPositions(zip, issues);
  await validateContentTypesOverrides(zip, issues);
  await validateRelationshipTargets(zip, issues);

  return {
    ok: issues.every((issue) => issue.severity !== 'error'),
    issues,
  };
}

export class DocxStrictValidationError extends Error {
  readonly issues: OoxmlValidationIssue[];
  constructor(issues: OoxmlValidationIssue[]) {
    super(`OOXML strict validation found ${issues.length} issue(s): ${issues.map((i) => i.code).join(', ')}`);
    this.name = 'DocxStrictValidationError';
    this.issues = issues;
  }
}
