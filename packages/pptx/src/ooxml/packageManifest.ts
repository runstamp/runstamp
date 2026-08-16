import type JSZip from "jszip";
import { PaperError, type PaperErrorIssue } from "../errors.js";
import { escapeXmlAttr } from "./drawing/textUtils.js";

const CONTENT_TYPES_NS = "http://schemas.openxmlformats.org/package/2006/content-types";
const RELATIONSHIPS_NS = "http://schemas.openxmlformats.org/package/2006/relationships";

export interface PackageRelationship {
  id: string;
  type: string;
  target: string;
  targetMode?: "External";
}

function normalizeExtension(extension: string): string {
  return extension.replace(/^\./, "").toLowerCase();
}

function normalizePartPath(path: string): string {
  return path.replace(/^\/+/, "");
}

function overridePartName(path: string): string {
  return `/${normalizePartPath(path)}`;
}

function getExtension(path: string): string | undefined {
  const fileName = path.slice(path.lastIndexOf("/") + 1);
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex === -1 ? undefined : fileName.slice(dotIndex + 1).toLowerCase();
}

export class PackageManifest {
  private defaults = new Map<string, string>();
  private overrides = new Map<string, string>();
  private relationships = new Map<string, Map<string, PackageRelationship>>();

  addDefault(extension: string, contentType: string): void {
    const normalized = normalizeExtension(extension);
    const existing = this.defaults.get(normalized);
    if (existing && existing !== contentType) {
      throw new PaperError(
        `Conflicting content type defaults for extension "${normalized}".`,
        { code: "STRUCTURAL_VALIDATION_FAILED", phase: "serialization" },
      );
    }
    this.defaults.set(normalized, contentType);
  }

  addPart(path: string, contentType: string): void {
    const partName = overridePartName(path);
    const existing = this.overrides.get(partName);
    if (existing && existing !== contentType) {
      throw new PaperError(
        `Conflicting content type overrides for part "${partName}".`,
        { code: "STRUCTURAL_VALIDATION_FAILED", phase: "serialization" },
      );
    }
    this.overrides.set(partName, contentType);
  }

  addRelationship(ownerPath: string | null, relationship: PackageRelationship): void {
    const ownerKey = ownerPath ? normalizePartPath(ownerPath) : "";
    const ownerRels = this.relationships.get(ownerKey) ?? new Map<string, PackageRelationship>();
    if (ownerRels.has(relationship.id)) {
      throw new PaperError(
        `Duplicate relationship id "${relationship.id}" for "${ownerKey || "/"}".`,
        { code: "STRUCTURAL_VALIDATION_FAILED", phase: "serialization" },
      );
    }
    ownerRels.set(relationship.id, relationship);
    this.relationships.set(ownerKey, ownerRels);
  }

  generateContentTypesXml(): string {
    let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
    xml += `<Types xmlns="${CONTENT_TYPES_NS}">`;
    for (const [extension, contentType] of this.defaults) {
      xml += `<Default Extension="${escapeXmlAttr(extension)}" ContentType="${escapeXmlAttr(contentType)}"/>`;
    }
    for (const [partName, contentType] of this.overrides) {
      xml += `<Override PartName="${escapeXmlAttr(partName)}" ContentType="${escapeXmlAttr(contentType)}"/>`;
    }
    xml += `</Types>`;
    return xml;
  }

  generateRelationshipsXml(ownerPath: string | null): string {
    const ownerKey = ownerPath ? normalizePartPath(ownerPath) : "";
    const relationships = [...(this.relationships.get(ownerKey)?.values() ?? [])];
    return generateRelationshipsXml(relationships);
  }
}

export function generateRelationshipsXml(relationships: PackageRelationship[]): string {
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;
  xml += `<Relationships xmlns="${RELATIONSHIPS_NS}">\n`;
  for (const rel of relationships) {
    const targetMode = rel.targetMode ? ` TargetMode="${escapeXmlAttr(rel.targetMode)}"` : "";
    xml += `  <Relationship Id="${escapeXmlAttr(rel.id)}" Type="${escapeXmlAttr(rel.type)}" Target="${escapeXmlAttr(rel.target)}"${targetMode}/>\n`;
  }
  xml += `</Relationships>`;
  return xml;
}

function getAttr(xml: string, attrName: string): string | undefined {
  const match = new RegExp(`\\b${attrName}="([^"]*)"`).exec(xml);
  return match?.[1];
}

function resolveRelTarget(relsPath: string, target: string): string {
  if (target.startsWith("/")) return normalizePartPath(target);

  const relsDir = relsPath.substring(0, relsPath.lastIndexOf("/") + 1);
  const parentDir = relsDir.replace(/_rels\/$/, "");
  const resolved: string[] = [];
  for (const part of `${parentDir}${target}`.split("/")) {
    if (part === "..") {
      resolved.pop();
    } else if (part !== "." && part !== "") {
      resolved.push(part);
    }
  }
  return resolved.join("/");
}

function collectContentTypesDiagnostics(contentTypesXml: string): {
  diagnostics: string[];
  defaults: Set<string>;
  overrides: Set<string>;
} {
  const diagnostics: string[] = [];
  const defaults = new Set<string>();
  const overrides = new Set<string>();

  for (const match of contentTypesXml.matchAll(/<Default\b[^>]*>/g)) {
    const extension = getAttr(match[0], "Extension")?.toLowerCase();
    if (!extension) continue;
    if (defaults.has(extension)) {
      diagnostics.push(`Duplicate content type default for extension "${extension}".`);
    }
    defaults.add(extension);
  }

  for (const match of contentTypesXml.matchAll(/<Override\b[^>]*>/g)) {
    const partName = getAttr(match[0], "PartName")?.toLowerCase();
    if (!partName) continue;
    if (overrides.has(partName)) {
      diagnostics.push(`Duplicate content type override for part "${partName}".`);
    }
    overrides.add(partName);
  }

  return { diagnostics, defaults, overrides };
}

async function readText(zip: JSZip, path: string): Promise<string> {
  return await zip.file(path)!.async("string");
}

export async function assertOpcPackageInvariants(zip: JSZip): Promise<void> {
  const packagePaths = Object.keys(zip.files)
    .filter((path) => !zip.files[path].dir)
    .sort();
  const packagePathSet = new Set(packagePaths);
  const diagnostics: string[] = [];

  if (!packagePathSet.has("[Content_Types].xml")) {
    diagnostics.push("Package is missing [Content_Types].xml.");
  }

  const contentTypesXml = packagePathSet.has("[Content_Types].xml")
    ? await readText(zip, "[Content_Types].xml")
    : "";
  const contentTypes = collectContentTypesDiagnostics(contentTypesXml);
  diagnostics.push(...contentTypes.diagnostics);

  for (const path of packagePaths) {
    if (path === "[Content_Types].xml") continue;
    const extension = getExtension(path);
    const hasOverride = contentTypes.overrides.has(overridePartName(path).toLowerCase());
    const hasDefault = extension ? contentTypes.defaults.has(extension) : false;
    if (!hasOverride && !hasDefault) {
      diagnostics.push(`Package part "${path}" has no content type default or override.`);
    }
  }

  const relsPaths = packagePaths.filter((path) => path.endsWith(".rels"));
  for (const relsPath of relsPaths) {
    const relsXml = await readText(zip, relsPath);
    const seenIds = new Set<string>();
    for (const match of relsXml.matchAll(/<Relationship\b[^>]*>/g)) {
      const relXml = match[0];
      const relId = getAttr(relXml, "Id");
      const target = getAttr(relXml, "Target");
      const targetMode = getAttr(relXml, "TargetMode");
      if (!relId || !target) continue;

      if (seenIds.has(relId)) {
        diagnostics.push(`Duplicate relationship id "${relId}" in "${relsPath}".`);
      }
      seenIds.add(relId);

      if (targetMode === "External") continue;
      const resolvedTarget = resolveRelTarget(relsPath, target);
      if (!packagePathSet.has(resolvedTarget)) {
        diagnostics.push(`Relationship "${relId}" in "${relsPath}" points to missing target "${resolvedTarget}".`);
      }
    }
  }

  if (diagnostics.length > 0) {
    const issues: PaperErrorIssue[] = diagnostics.map((message, index) => ({
      path: `packageManifest.${index}`,
      message,
    }));
    throw new PaperError(
      `PPTX package manifest invariant check failed with ${diagnostics.length} issue(s).`,
      {
        code: "STRUCTURAL_VALIDATION_FAILED",
        phase: "serialization",
        issues,
      },
    );
  }
}
