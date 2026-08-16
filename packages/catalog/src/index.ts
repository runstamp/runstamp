import { parseOperationName } from "@runstamp/contract";
import type {
  ErrorDomain,
  OperationDescriptor,
  Verb,
} from "@runstamp/contract";
import catalogJson from "../catalog.json" with { type: "json" };

/** A public descriptor. Implementation modules are deliberately private. */
export type CatalogOperationDescriptor = Omit<OperationDescriptor, "implementation">;

export const CATALOG_VERSION = "1.0.0" as const;

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function validateCatalog(value: unknown): readonly CatalogOperationDescriptor[] {
  if (!Array.isArray(value)) throw new Error("Runstamp catalog data must be an array.");
  if (value.length !== 79) throw new Error(`Runstamp v1 catalog must contain 79 operations; found ${String(value.length)}.`);

  const names = new Set<string>();
  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) throw new Error("Runstamp catalog contains a non-object descriptor.");
    const descriptor = raw as Record<string, unknown>;
    if ("implementation" in descriptor) throw new Error(`Public descriptor ${String(descriptor.name)} leaks an implementation binding.`);
    if (descriptor.stability !== "stable") throw new Error(`Public descriptor ${String(descriptor.name)} is not stable.`);
    if (typeof descriptor.name !== "string" || parseOperationName(descriptor.name) === undefined) {
      throw new Error(`Public catalog contains an invalid operation name: ${String(descriptor.name)}.`);
    }
    if (names.has(descriptor.name)) throw new Error(`Public catalog contains duplicate operation ${descriptor.name}.`);
    names.add(descriptor.name);
  }
  return deepFreeze(value as CatalogOperationDescriptor[]);
}

/** Exactly the stable v1 catalog, with no executable implementation metadata. */
export const CATALOG: readonly CatalogOperationDescriptor[] = validateCatalog(catalogJson);

export const DOMAINS: readonly ErrorDomain[] = Object.freeze([
  ...new Set(CATALOG.map((operation) => operation.domain)),
]);

export function findOperation(name: string): CatalogOperationDescriptor | undefined {
  return CATALOG.find((operation) => operation.name === name);
}

export function resolveOperation(
  domain: string,
  verb: string,
  qualifier?: string,
): CatalogOperationDescriptor | undefined {
  const exact = findOperation(qualifier === undefined ? `${domain}.${verb}` : `${domain}.${verb}.${qualifier}`);
  if (exact !== undefined) return exact;
  if (qualifier !== undefined) return undefined;
  const candidates = CATALOG.filter((operation) => operation.domain === domain && operation.verb === verb);
  return candidates.length === 1 ? candidates[0] : undefined;
}

export function operationsFor(domain: ErrorDomain): readonly CatalogOperationDescriptor[] {
  return CATALOG.filter((operation) => operation.domain === domain);
}

export function verbsFor(domain: ErrorDomain): readonly Verb[] {
  return [...new Set(operationsFor(domain).map((operation) => operation.verb))];
}

export function mcpToolName(operation: CatalogOperationDescriptor): string {
  const qualifier = parseOperationName(operation.name)?.qualifier;
  const base = `runstamp_${operation.domain}_${operation.verb}`;
  return qualifier === undefined ? base : `${base}_${qualifier.replace(/[.-]/g, "_")}`;
}

export function httpRoute(operation: CatalogOperationDescriptor): string {
  const qualifier = parseOperationName(operation.name)?.qualifier;
  const base = `/v1/${operation.domain}/${operation.verb}`;
  return qualifier === undefined ? base : `${base}/${qualifier.replace(/\./g, "/")}`;
}

export { CONTRACT_VERSION } from "@runstamp/contract";
