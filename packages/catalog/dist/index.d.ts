import { OperationDescriptor, ErrorDomain, Verb } from '@runstamp/contract';
export { CONTRACT_VERSION } from '@runstamp/contract';

/** A public descriptor. Implementation modules are deliberately private. */
type CatalogOperationDescriptor = Omit<OperationDescriptor, "implementation">;
declare const CATALOG_VERSION: "1.0.0";
/** Exactly the stable v1 catalog, with no executable implementation metadata. */
declare const CATALOG: readonly CatalogOperationDescriptor[];
declare const DOMAINS: readonly ErrorDomain[];
declare function findOperation(name: string): CatalogOperationDescriptor | undefined;
declare function resolveOperation(domain: string, verb: string, qualifier?: string): CatalogOperationDescriptor | undefined;
declare function operationsFor(domain: ErrorDomain): readonly CatalogOperationDescriptor[];
declare function verbsFor(domain: ErrorDomain): readonly Verb[];
declare function mcpToolName(operation: CatalogOperationDescriptor): string;
declare function httpRoute(operation: CatalogOperationDescriptor): string;

export { CATALOG, CATALOG_VERSION, type CatalogOperationDescriptor, DOMAINS, findOperation, httpRoute, mcpToolName, operationsFor, resolveOperation, verbsFor };
