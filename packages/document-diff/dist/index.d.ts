type JsonValue = string | number | boolean | null | JsonValue[] | {
    [key: string]: JsonValue;
};
interface ExtensionLocator {
    artifactId: string;
    scheme: string;
    value: Array<string | number>;
}
interface SemanticExecutionContext {
    readonly signal: AbortSignal;
    readonly budget: {
        maxInputBytes: number;
        maxOutputBytes: number;
        maxEntries: number;
        maxDepth: number;
        timeoutMs: number;
    };
    checkpoint(usage: {
        inputBytes?: number;
        outputBytes?: number;
        entries?: number;
        depth?: number;
    }): void;
}
type SemanticArtifactKind = "docx" | "pptx";
type SemanticChangeCategory = "insert" | "delete" | "move" | "text" | "style" | "data" | "comment" | "structure";
type ReviewDecision = "accept" | "reject" | "defer";
interface SemanticVersionBinding {
    id: string;
    sha256: string;
}
interface SemanticNode {
    id: string;
    kind: string;
    locator: ExtensionLocator;
    text?: string;
    style?: Record<string, JsonValue>;
    data?: JsonValue;
    comments?: JsonValue[];
    children?: SemanticNode[];
}
interface SemanticDocument {
    schemaVersion: 1;
    artifactId: string;
    artifactKind: SemanticArtifactKind;
    version: SemanticVersionBinding;
    nodes: SemanticNode[];
}
interface SemanticLoss {
    code: "NOISE_SUPPRESSED" | "RENDERER_LIMITATION";
    message: string;
    locator?: ExtensionLocator;
}
interface SemanticChange {
    id: string;
    category: SemanticChangeCategory;
    nodeId: string;
    nodeKind: string;
    locator: ExtensionLocator;
    fromLocator?: ExtensionLocator;
    before?: JsonValue;
    after?: JsonValue;
    severity: "major" | "minor" | "cosmetic";
}
interface SemanticChangeSet {
    schemaVersion: 1;
    artifactKind: SemanticArtifactKind;
    artifactId: string;
    beforeVersion: SemanticVersionBinding;
    afterVersion: SemanticVersionBinding;
    changes: SemanticChange[];
    losses: SemanticLoss[];
    statistics: Record<SemanticChangeCategory, number>;
    changeSetHash: string;
}
interface SemanticCompareOptions {
    maxEntries?: number;
    maxDepth?: number;
    maxInputBytes?: number;
    ignoreStyleProperties?: string[];
    ignoreComments?: boolean;
    signal?: AbortSignal;
    context?: SemanticExecutionContext;
}
declare class SemanticDiffError extends Error {
    readonly code: "INVALID_DOCUMENT" | "AMBIGUOUS_ALIGNMENT" | "VERSION_MISMATCH" | "RESOURCE_LIMIT" | "ABORTED" | "RENDERER_BINDING_MISMATCH" | "INSPECTOR_TIMEOUT";
    constructor(code: "INVALID_DOCUMENT" | "AMBIGUOUS_ALIGNMENT" | "VERSION_MISMATCH" | "RESOURCE_LIMIT" | "ABORTED" | "RENDERER_BINDING_MISMATCH" | "INSPECTOR_TIMEOUT", message: string);
}
declare function compareSemanticDocuments(before: SemanticDocument, after: SemanticDocument, options?: SemanticCompareOptions): Promise<SemanticChangeSet>;
interface RedlinePayload {
    schemaVersion: 1;
    changeSetHash: string;
    artifactId: string;
    artifactKind: SemanticArtifactKind;
    beforeVersion: SemanticVersionBinding;
    afterVersion: SemanticVersionBinding;
    changes: Array<SemanticChange & {
        decision: ReviewDecision;
    }>;
    losses: SemanticLoss[];
}
declare function createRedlinePayload(changeSet: SemanticChangeSet): RedlinePayload;
declare function decideRedlineChanges(payload: RedlinePayload, decisions: Readonly<Record<string, ReviewDecision>>): RedlinePayload;
type RedlineExportFormat = "native" | "pdf";
interface RedlineRendererResult {
    bytes: Uint8Array;
    mediaType: string;
    losses?: SemanticLoss[];
}
interface RedlineRenderer {
    render(payload: RedlinePayload, format: RedlineExportFormat, signal?: AbortSignal): Promise<RedlineRendererResult>;
}
interface RedlineOutputInspection {
    format: RedlineExportFormat;
    changeSetHash: string;
    sourceHashes: [string, string];
    unitCount: number;
    changedNodeIds: string[];
    extractedText: string;
    byteLength: number;
    sha256: string;
}
interface RedlineOutputInspector {
    inspect(bytes: Uint8Array, mediaType: string, format: RedlineExportFormat, signal?: AbortSignal): Promise<RedlineOutputInspection>;
}
interface RedlineReferenceExpectations {
    unitCount?: number;
    requiredText?: string[];
}
interface RedlineExport {
    bytes: Uint8Array;
    mediaType: string;
    byteLength: number;
    sha256: string;
    changeSetHash: string;
    losses: SemanticLoss[];
}
interface RedlineExportOptions {
    signal?: AbortSignal;
    maxOutputBytes?: number;
    inspectorTimeoutMs?: number;
    reference?: RedlineReferenceExpectations;
}
declare function exportRedline(payload: RedlinePayload, format: RedlineExportFormat, renderer: RedlineRenderer, inspector: RedlineOutputInspector, options?: RedlineExportOptions): Promise<RedlineExport>;

declare const semanticCompareManifest: {
    readonly schemaVersion: 1;
    readonly id: "runstamp.semantic-compare";
    readonly version: "1.0.0";
    readonly catalogItemId: "O03";
    readonly title: "Semantic compare/redline";
    readonly operations: readonly [{
        readonly name: "compare";
        readonly summary: "Compare exact DOCX or PPTX semantic versions.";
        readonly inputKinds: readonly ["runstamp.semantic-pair.v1"];
        readonly outputKinds: readonly ["runstamp.semantic-changeset.v1"];
    }];
    readonly warningCodes: readonly [];
    readonly lossCodes: readonly [{
        readonly code: "NOISE_SUPPRESSED";
        readonly description: "A declared noise-policy field was omitted from comparison.";
    }, {
        readonly code: "RENDERER_LIMITATION";
        readonly description: "A renderer could not represent a semantic change natively.";
    }];
};
interface CompatibleRequest {
    input: JsonValue;
}
type CompatibleResult = {
    status: "ok";
    output: JsonValue;
    warnings: Array<{
        code: string;
        message: string;
        severity?: "warning";
    }>;
    losses: Array<{
        code: string;
        message: string;
        severity?: "warning";
        locator?: {
            artifactId: string;
            scheme: string;
            value: Array<string | number>;
        };
    }>;
    artifacts: [];
} | {
    status: "error";
    error: {
        code: string;
        message: string;
        retryable: boolean;
    };
    warnings: [];
    losses: [];
    artifacts: [];
};
declare const semanticCompareExtension: {
    manifest: {
        readonly schemaVersion: 1;
        readonly id: "runstamp.semantic-compare";
        readonly version: "1.0.0";
        readonly catalogItemId: "O03";
        readonly title: "Semantic compare/redline";
        readonly operations: readonly [{
            readonly name: "compare";
            readonly summary: "Compare exact DOCX or PPTX semantic versions.";
            readonly inputKinds: readonly ["runstamp.semantic-pair.v1"];
            readonly outputKinds: readonly ["runstamp.semantic-changeset.v1"];
        }];
        readonly warningCodes: readonly [];
        readonly lossCodes: readonly [{
            readonly code: "NOISE_SUPPRESSED";
            readonly description: "A declared noise-policy field was omitted from comparison.";
        }, {
            readonly code: "RENDERER_LIMITATION";
            readonly description: "A renderer could not represent a semantic change natively.";
        }];
    };
    execute(request: CompatibleRequest, context: SemanticExecutionContext): Promise<CompatibleResult>;
};

interface SemanticArtifactSource<TInspection = JsonValue> {
    artifactId: string;
    artifactKind: "docx" | "pptx";
    versionId: string;
    declaredSha256: string;
    sourceBytes: Uint8Array;
    inspection: TInspection;
}
interface SemanticArtifactAdapter<TInspection = JsonValue> {
    readonly artifactKind: "docx" | "pptx";
    readonly inspectionKind: string;
    adapt(source: SemanticArtifactSource<TInspection>, computedSha256: string): SemanticDocument | Promise<SemanticDocument>;
}
declare function adaptSemanticArtifact<TInspection>(source: SemanticArtifactSource<TInspection>, adapter: SemanticArtifactAdapter<TInspection>, options?: SemanticCompareOptions): Promise<SemanticDocument>;
declare function compareArtifactSources<TInspection>(before: SemanticArtifactSource<TInspection>, after: SemanticArtifactSource<TInspection>, adapter: SemanticArtifactAdapter<TInspection>, options?: SemanticCompareOptions): Promise<SemanticChangeSet>;
interface DocxControlledInspectionOutput {
    sha256: string;
    byteLength: number;
    entryCount: number;
    uncompressedBytes: number;
    partNames: string[];
    searchableParts: string[];
    metadataParts: string[];
    mediaParts: string[];
    executableParts: string[];
    oleParts: string[];
    relationships: unknown[];
    features: {
        sections: number;
        paragraphs: number;
        runs: number;
        tables: number;
        styles: number;
        numberingDefinitions: number;
        headers: number;
        footers: number;
        footnotes: number;
        endnotes: number;
        comments: number;
        trackedInsertions: number;
        trackedDeletions: number;
        hyperlinks: number;
    };
    warnings: unknown[];
    losses: unknown[];
}
interface ControlledDocxPartOutput {
    name: string;
    text: string;
    paragraphCount: number;
    xml: string;
}
interface ControlledDocxDocumentOutput {
    schemaVersion: 1;
    artifactId: string;
    sourceSha256: string;
    packageBase64: string;
    inspection: DocxControlledInspectionOutput;
    parts: ControlledDocxPartOutput[];
}
declare const docxInspectionAdapter: SemanticArtifactAdapter<ControlledDocxDocumentOutput>;
interface PptxTemplateLocatorOutput {
    artifactId: string;
    scheme: "pptx.slide" | "pptx.object" | "pptx.part";
    value: Array<string | number>;
}
interface PptxTemplateObjectOutput {
    id: string;
    kind: "chart" | "group" | "image" | "shape" | "table";
    locator: PptxTemplateLocatorOutput;
    name?: string;
    slotId?: string;
    text: string;
}
interface PptxTemplateSlideOutput {
    index: number;
    locator: PptxTemplateLocatorOutput;
    objects: PptxTemplateObjectOutput[];
    part: string;
    text: string;
}
interface PptxInspectionOutput {
    artifactId: string;
    byteLength: number;
    canonicalPackageHash: string;
    counts: {
        charts: number;
        comments: number;
        layouts: number;
        masters: number;
        media: number;
        notes: number;
        objects: number;
        placeholders: number;
        relationships: number;
        slides: number;
        tables: number;
        themes: number;
    };
    losses: unknown[];
    opaqueParts: unknown[];
    relationships: unknown[];
    slides: PptxTemplateSlideOutput[];
    slots: unknown[];
}
declare const pptxInspectionAdapter: SemanticArtifactAdapter<PptxInspectionOutput>;

type ChangeKind = "added" | "removed" | "modified" | "moved";
type ChangeSeverity = "major" | "minor" | "cosmetic";
type DiffPathSegment = string | number;
interface Change {
    type: ChangeKind;
    path: string;
    description: string;
    before?: unknown;
    after?: unknown;
    severity: ChangeSeverity;
}
interface DiffStatistics {
    added: number;
    removed: number;
    modified: number;
    moved: number;
}
interface ChangeSet {
    changes: Change[];
    summary: string;
    statistics: DiffStatistics;
}
interface DiffOptions {
    includeSummary?: boolean;
}
interface DiffInterpretContext<TNormalized = unknown> {
    type: ChangeKind;
    path: DiffPathSegment[];
    pathString: string;
    fromPath?: DiffPathSegment[];
    fromPathString?: string;
    before?: unknown;
    after?: unknown;
    normalizedBefore: TNormalized;
    normalizedAfter: TNormalized;
}
interface DiffInterpretResult {
    description?: string;
    severity?: ChangeSeverity;
    summaryLabel?: string;
}
interface DiffPlugin<TNormalized = unknown> {
    normalize(document: unknown): TNormalized;
    interpretChange?(context: DiffInterpretContext<TNormalized>): DiffInterpretResult | null;
    shouldSuppress?(context: DiffInterpretContext<TNormalized>): boolean;
}
declare function diffDocuments<TNormalized = unknown>(before: unknown, after: unknown, plugin: DiffPlugin<TNormalized>, options?: DiffOptions): ChangeSet;
declare function createDiffKey(...parts: Array<string | number | undefined | null>): string;
declare function isInternalDiffField(segment: DiffPathSegment): boolean;

export { type Change, type ChangeKind, type ChangeSet, type ChangeSeverity, type ControlledDocxDocumentOutput, type ControlledDocxPartOutput, type DiffInterpretContext, type DiffInterpretResult, type DiffOptions, type DiffPathSegment, type DiffPlugin, type DiffStatistics, type DocxControlledInspectionOutput, type ExtensionLocator, type JsonValue, type PptxInspectionOutput, type PptxTemplateLocatorOutput, type PptxTemplateObjectOutput, type PptxTemplateSlideOutput, type RedlineExport, type RedlineExportFormat, type RedlineExportOptions, type RedlineOutputInspection, type RedlineOutputInspector, type RedlinePayload, type RedlineReferenceExpectations, type RedlineRenderer, type RedlineRendererResult, type ReviewDecision, type SemanticArtifactAdapter, type SemanticArtifactKind, type SemanticArtifactSource, type SemanticChange, type SemanticChangeCategory, type SemanticChangeSet, type SemanticCompareOptions, SemanticDiffError, type SemanticDocument, type SemanticExecutionContext, type SemanticLoss, type SemanticNode, type SemanticVersionBinding, adaptSemanticArtifact, compareArtifactSources, compareSemanticDocuments, createDiffKey, createRedlinePayload, decideRedlineChanges, diffDocuments, docxInspectionAdapter, exportRedline, isInternalDiffField, pptxInspectionAdapter, semanticCompareExtension, semanticCompareManifest };
