import { compareSemanticDocuments, type JsonValue, type SemanticDocument, type SemanticExecutionContext } from "./semantic.js";

export const semanticCompareManifest = {
  schemaVersion: 1,
  id: "runstamp.semantic-compare",
  version: "1.0.0",
  catalogItemId: "O03",
  title: "Semantic compare/redline",
  operations: [{ name: "compare", summary: "Compare exact DOCX or PPTX semantic versions.", inputKinds: ["runstamp.semantic-pair.v1"], outputKinds: ["runstamp.semantic-changeset.v1"] }],
  warningCodes: [],
  lossCodes: [
    { code: "NOISE_SUPPRESSED", description: "A declared noise-policy field was omitted from comparison." },
    { code: "RENDERER_LIMITATION", description: "A renderer could not represent a semantic change natively." },
  ],
} as const;

interface CompatibleRequest { input: JsonValue }
type CompatibleResult =
  | { status: "ok"; output: JsonValue; warnings: Array<{ code: string; message: string; severity?: "warning" }>; losses: Array<{ code: string; message: string; severity?: "warning"; locator?: { artifactId: string; scheme: string; value: Array<string | number> } }>; artifacts: [] }
  | { status: "error"; error: { code: string; message: string; retryable: boolean }; warnings: []; losses: []; artifacts: [] };

export const semanticCompareExtension = {
  manifest: semanticCompareManifest,
  async execute(request: CompatibleRequest, context: SemanticExecutionContext): Promise<CompatibleResult> {
    try {
      const input = request.input as unknown as { before: SemanticDocument; after: SemanticDocument; options?: { ignoreStyleProperties?: string[]; ignoreComments?: boolean } };
      const result = await compareSemanticDocuments(input.before, input.after, { ...input.options, context });
      context.checkpoint({ entries: result.changes.length, outputBytes: new TextEncoder().encode(JSON.stringify(result)).byteLength });
      return {
        status: "ok",
        output: result as unknown as JsonValue,
        warnings: [],
        losses: result.losses.map((loss) => ({ code: loss.code, message: loss.message, severity: "warning", locator: loss.locator })),
        artifacts: [],
      };
    } catch (error) {
      return { status: "error", error: { code: "SEMANTIC_COMPARE_FAILED", message: error instanceof Error ? error.message : "Semantic comparison failed.", retryable: false }, warnings: [], losses: [], artifacts: [] };
    }
  },
};
