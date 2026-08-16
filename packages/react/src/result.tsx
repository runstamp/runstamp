import { useCallback, useState, type CSSProperties, type ReactNode } from "react";
import type {
  Diagnostic,
  Loss,
  OperationResult,
  PaperError,
  Receipt,
} from "@runstamp/contract";

import { classNames, themeAttributes } from "./components.js";
import type { DeckTheme } from "./types.js";

export interface ArtifactReference {
  readonly id: string;
  readonly mediaType: string;
  readonly extension: string;
  readonly byteLength: number;
  readonly hash: string;
  readonly downloadPath?: string;
  readonly href?: string;
  readonly expiresAt?: string;
  readonly label?: string;
}

export type OperationResultSection = "value" | "losses" | "diagnostics" | "receipt" | "artifacts";

interface SurfaceProps {
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly theme?: DeckTheme;
}

export interface OperationStatusProps {
  readonly result: OperationResult<unknown>;
  readonly className?: string;
}

export function OperationStatus({ result, className }: OperationStatusProps) {
  const lossCount = Array.isArray(result.losses) ? result.losses.length : 0;
  const diagnosticCount = Array.isArray(result.diagnostics) ? result.diagnostics.length : 0;
  return (
    <div
      className={classNames("runstamp-operation-status", className)}
      data-status={result.ok ? "success" : "failure"}
      role="status"
      aria-live="polite"
    >
      <span className="runstamp-operation-status__signal" aria-hidden="true" />
      <strong>{result.ok ? "Operation completed" : "Operation failed"}</strong>
      <span>
        {result.ok
          ? `${lossCount} loss${lossCount === 1 ? "" : "es"}, ${diagnosticCount} diagnostic${diagnosticCount === 1 ? "" : "s"}`
          : `${result.error.code} · ${result.error.phase}`}
      </span>
    </div>
  );
}

export interface OperationLossesProps {
  readonly losses: readonly Loss[];
  readonly defaultExpanded?: boolean;
  readonly className?: string;
}

export function OperationLosses({ losses, defaultExpanded = false, className }: OperationLossesProps) {
  const safeLosses = Array.isArray(losses) ? losses : [];
  return (
    <details className={classNames("runstamp-operation-section", className)} open={defaultExpanded}>
      <summary>Losses <span>{safeLosses.length}</span></summary>
      {safeLosses.length === 0 ? (
        <p className="runstamp-operation-empty">No fidelity loss was reported.</p>
      ) : (
        <ol className="runstamp-operation-list">
          {safeLosses.map((loss, index) => (
            <li key={`${loss.code}-${index}`} data-severity={loss.severity}>
              <header><strong>{loss.subject}</strong><code>{loss.severity}</code></header>
              <p>{loss.message}</p>
              <small>{loss.code}</small>
              {loss.remediation ? <p className="runstamp-operation-remediation">{loss.remediation}</p> : null}
            </li>
          ))}
        </ol>
      )}
    </details>
  );
}

export interface OperationDiagnosticsProps {
  readonly diagnostics: readonly Diagnostic[];
  readonly defaultExpanded?: boolean;
  readonly className?: string;
}

export function OperationDiagnostics({ diagnostics, defaultExpanded = false, className }: OperationDiagnosticsProps) {
  const safeDiagnostics = Array.isArray(diagnostics) ? diagnostics : [];
  return (
    <details className={classNames("runstamp-operation-section", className)} open={defaultExpanded}>
      <summary>Diagnostics <span>{safeDiagnostics.length}</span></summary>
      {safeDiagnostics.length === 0 ? (
        <p className="runstamp-operation-empty">No diagnostic observations were reported.</p>
      ) : (
        <ol className="runstamp-operation-list">
          {safeDiagnostics.map((diagnostic, index) => (
            <li key={`${diagnostic.code}-${index}`} data-severity={diagnostic.severity}>
              <header><strong>{diagnostic.phase}</strong><code>{diagnostic.severity}</code></header>
              <p>{diagnostic.message}</p>
              <small>{diagnostic.code}</small>
            </li>
          ))}
        </ol>
      )}
    </details>
  );
}

function json(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? "null";
  } catch {
    return "[Value could not be serialized]";
  }
}

export interface OperationReceiptProps {
  readonly receipt?: Receipt;
  readonly defaultExpanded?: boolean;
  readonly className?: string;
}

export function OperationReceipt({ receipt, defaultExpanded = false, className }: OperationReceiptProps) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    if (receipt === undefined || typeof navigator === "undefined" || navigator.clipboard === undefined) return;
    await navigator.clipboard.writeText(json(receipt));
    setCopied(true);
  }, [receipt]);

  return (
    <details className={classNames("runstamp-operation-section", className)} open={defaultExpanded}>
      <summary>Receipt <span>{receipt ? "available" : "unavailable"}</span></summary>
      {receipt === undefined ? (
        <p className="runstamp-operation-empty">The operation ended before an input-bound receipt was available.</p>
      ) : (
        <div className="runstamp-operation-receipt">
          <dl>
            <div><dt>Operation</dt><dd>{receipt.operation}</dd></div>
            <div><dt>Engine</dt><dd>{receipt.engine.name} {receipt.engine.version}</dd></div>
            <div><dt>Input</dt><dd><code>{receipt.inputHash}</code></dd></div>
            {receipt.outputHash ? <div><dt>Output</dt><dd><code>{receipt.outputHash}</code></dd></div> : null}
            <div><dt>Deterministic</dt><dd>{receipt.deterministic ? "Yes" : "No"}</dd></div>
          </dl>
          <button type="button" onClick={copy} disabled={typeof navigator === "undefined" || navigator.clipboard === undefined}>
            {copied ? "Copied" : "Copy receipt"}
          </button>
        </div>
      )}
    </details>
  );
}

export interface OperationArtifactsProps {
  readonly artifacts: readonly ArtifactReference[];
  readonly onDownload?: (artifact: ArtifactReference) => void | Promise<void>;
  readonly defaultExpanded?: boolean;
  readonly className?: string;
}

function ArtifactAction({ artifact, onDownload }: Pick<OperationArtifactsProps, "onDownload"> & { artifact: ArtifactReference }) {
  const [busy, setBusy] = useState(false);
  const download = useCallback(async () => {
    if (onDownload === undefined || busy) return;
    setBusy(true);
    try {
      await onDownload(artifact);
    } finally {
      setBusy(false);
    }
  }, [artifact, busy, onDownload]);

  if (artifact.href) return <a href={artifact.href} download>{artifact.label ?? `Download .${artifact.extension}`}</a>;
  return (
    <button type="button" onClick={download} disabled={onDownload === undefined || busy}>
      {busy ? "Downloading…" : artifact.label ?? `Download .${artifact.extension}`}
    </button>
  );
}

export function OperationArtifacts({ artifacts, onDownload, defaultExpanded = false, className }: OperationArtifactsProps) {
  const safeArtifacts = Array.isArray(artifacts) ? artifacts : [];
  return (
    <details className={classNames("runstamp-operation-section", className)} open={defaultExpanded}>
      <summary>Artifacts <span>{safeArtifacts.length}</span></summary>
      {safeArtifacts.length === 0 ? (
        <p className="runstamp-operation-empty">This operation did not return a downloadable artifact.</p>
      ) : (
        <ul className="runstamp-operation-artifacts">
          {safeArtifacts.map((artifact) => (
            <li key={artifact.id}>
              <div>
                <strong>{artifact.label ?? artifact.id}</strong>
                <span>{artifact.mediaType} · {artifact.byteLength.toLocaleString()} bytes</span>
                <code>{artifact.hash}</code>
                {artifact.expiresAt ? <small>Expires {artifact.expiresAt}</small> : null}
              </div>
              <ArtifactAction artifact={artifact} onDownload={onDownload} />
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

export interface OperationResultViewProps<T> extends SurfaceProps {
  readonly result: OperationResult<T>;
  readonly renderValue?: (value: T) => ReactNode;
  readonly artifacts?: readonly ArtifactReference[];
  readonly onArtifactDownload?: (artifact: ArtifactReference) => void | Promise<void>;
  readonly defaultExpanded?: readonly OperationResultSection[];
  readonly ariaLabel?: string;
}

function ErrorSummary({ error }: { error: PaperError }) {
  return (
    <div className="runstamp-operation-error" role="alert">
      <strong>{error.message}</strong>
      <code>{error.code}</code>
      <p>{error.remediation}</p>
      {Array.isArray(error.issues) && error.issues.length > 0 ? (
        <ul>{error.issues.map((issue, index) => <li key={`${issue.path}-${index}`}><code>{issue.path}</code> {issue.message}</li>)}</ul>
      ) : null}
    </div>
  );
}

export function OperationResultView<T>({
  result,
  renderValue,
  artifacts = [],
  onArtifactDownload,
  defaultExpanded = [],
  ariaLabel = "Operation result",
  theme,
  className,
  style,
}: OperationResultViewProps<T>) {
  const expanded = new Set(defaultExpanded);
  return (
    <section
      {...themeAttributes(theme, style)}
      className={classNames("runstamp-root", "runstamp-operation-result", className)}
      aria-label={ariaLabel}
    >
      <OperationStatus result={result} />
      {result.ok ? (
        <details className="runstamp-operation-section" open={expanded.has("value")}>
          <summary>Value</summary>
          <div className="runstamp-operation-value">
            {renderValue ? renderValue(result.value) : <pre>{json(result.value)}</pre>}
          </div>
        </details>
      ) : <ErrorSummary error={result.error} />}
      <OperationArtifacts artifacts={artifacts} onDownload={onArtifactDownload} defaultExpanded={expanded.has("artifacts")} />
      <OperationLosses losses={result.losses} defaultExpanded={expanded.has("losses")} />
      <OperationDiagnostics diagnostics={result.diagnostics} defaultExpanded={expanded.has("diagnostics")} />
      <OperationReceipt receipt={result.receipt} defaultExpanded={expanded.has("receipt")} />
    </section>
  );
}
