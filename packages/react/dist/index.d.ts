import * as react from 'react';
import { ReactNode, CSSProperties } from 'react';
import { PaperDocument, PaperNode, PaperSlide, DeclarativeDocument, DeclarativeChartSeries, DeclarativeMetric, DeclarativeLayout, DeclarativeChart, DeclarativeSlide } from '@runstamp/pptx';
export { DeclarativeChart, DeclarativeChartSeries, DeclarativeDocument, DeclarativeLayout, DeclarativeMetric, DeclarativeSlide, PaperDocument, PaperNode, PaperSlide } from '@runstamp/pptx';
import * as react_jsx_runtime from 'react/jsx-runtime';
import { Diagnostic, Loss, Receipt, OperationResult } from '@runstamp/contract';

/** @deprecated Use DeclarativeDocument from @runstamp/pptx. */
type DeclarativeDeckDocument = DeclarativeDocument;
/** @deprecated Use DeclarativeSlide from @runstamp/pptx. */
type DeclarativeDeckSlide = DeclarativeSlide;
/** @deprecated Use PaperDocument from @runstamp/pptx. */
type AstDeckDocument = PaperDocument;
/** @deprecated Use PaperSlide from @runstamp/pptx. */
type AstDeckSlide = PaperSlide;
/** @deprecated Use PaperNode from @runstamp/pptx. */
type AstDeckNode = PaperNode;
type DeckPattern = DeclarativeLayout;
type DeckKpi = DeclarativeMetric;
type DeckDataSeries = DeclarativeChartSeries;
type DeckDataPoint = DeclarativeChartSeries["dataPoints"][number];
type DeckDocument = DeclarativeDocument | PaperDocument;
interface DeckOptions {
    /** Zero-based initial slide. Out-of-range values are clamped. */
    initialSlide?: number;
}
interface DeckController {
    readonly document: DeckDocument;
    readonly currentSlide: number;
    readonly slideCount: number;
    readonly canPrevious: boolean;
    readonly canNext: boolean;
    setCurrentSlide(index: number): void;
    previous(): void;
    next(): void;
    first(): void;
    last(): void;
}
type DeckSource = DeckDocument | DeckController;
/** Normalized display metric; this is a render view-model, not an input schema. */
interface DeckRenderMetric {
    label: string;
    value: string;
    delta?: string;
    trend?: "up" | "down" | "flat" | "none";
}
interface DeckRenderModel {
    kind: DeclarativeLayout | "ast";
    title: string;
    subtitle?: string;
    eyebrow?: string;
    bullets: string[];
    metrics: DeckRenderMetric[];
    chart?: DeclarativeChart;
    comparison?: Extract<DeclarativeSlide, {
        layout: "comparison";
    }>;
    timeline?: Extract<DeclarativeSlide, {
        layout: "timeline";
    }>;
    astNodes: PaperNode[];
}
interface DeckRenderState {
    document: DeckDocument;
    slide: DeclarativeSlide | PaperSlide;
    slideIndex: number;
    slideCount: number;
    title: string;
    model: DeckRenderModel;
}
interface DeckProviderProps {
    deck: DeckSource;
    children: ReactNode;
}
interface DeckThemeTokens {
    accent?: string;
    ground?: string;
    surface?: string;
    ink?: string;
    mutedInk?: string;
    border?: string;
    signalGreen?: string;
    signalAmber?: string;
    signalRed?: string;
    fontSans?: string;
    fontMono?: string;
}
type DeckTheme = "light" | "dark" | {
    mode?: "light" | "dark";
    tokens?: DeckThemeTokens;
};
type FidelityStatus = "passed" | "failed" | "pending" | "unverified";
interface FidelityResult {
    status: FidelityStatus;
    /** Human-readable oracle, for example "PowerPoint for Windows". */
    platform?: string;
    /** ISO timestamp supplied by the validation service. */
    validatedAt?: string;
    message?: string;
}
type DownloadSource = string | URL | Blob | Uint8Array | (() => string | URL | Blob | Uint8Array | Promise<string | URL | Blob | Uint8Array>);
interface ThemedDeckProps {
    deck?: DeckSource;
    theme?: DeckTheme;
    className?: string;
    style?: CSSProperties;
}

/**
 * Create deck navigation state. When called with no source it consumes the
 * nearest DeckProvider, making the same hook useful for headless descendants.
 */
declare function useDeck(source?: DeckSource, options?: DeckOptions): DeckController;
declare function DeckProvider({ deck, children }: DeckProviderProps): react.FunctionComponentElement<react.ProviderProps<DeckController | null>>;
declare function isDeclarativeDeckSlide(slide: DeclarativeDeckSlide | AstDeckSlide): slide is DeclarativeDeckSlide;
declare function getSlideTitle(slide: DeclarativeDeckSlide | AstDeckSlide, index: number): string;
declare function createDeckRenderModel(slide: DeclarativeDeckSlide | AstDeckSlide, index: number): DeckRenderModel;
/** Derive a stable, markup-agnostic model for the active slide. */
declare function useDeckRender(source?: DeckSource, slideIndex?: number): DeckRenderState;

declare function DefaultSlide({ state, miniature }: {
    state: DeckRenderState;
    miniature?: boolean;
}): react_jsx_runtime.JSX.Element;
interface DeckViewerProps extends ThemedDeckProps {
    ariaLabel?: string;
    renderSlide?: (state: DeckRenderState) => ReactNode;
}
declare function DeckViewer({ deck, theme, className, style, ariaLabel, renderSlide, }: DeckViewerProps): react_jsx_runtime.JSX.Element;
interface DeckThumbnailsProps extends ThemedDeckProps {
    ariaLabel?: string;
    renderThumbnail?: (state: DeckRenderState) => ReactNode;
}
declare function DeckThumbnails({ deck, theme, className, style, ariaLabel, renderThumbnail, }: DeckThumbnailsProps): react_jsx_runtime.JSX.Element;
interface FidelityBadgeProps {
    status: FidelityStatus | FidelityResult;
    compact?: boolean;
    className?: string;
}
declare function FidelityBadge({ status, compact, className }: FidelityBadgeProps): react_jsx_runtime.JSX.Element;
interface DeckToolbarProps extends ThemedDeckProps {
    ariaLabel?: string;
    fileName?: string;
    pptx?: DownloadSource;
    pdf?: DownloadSource;
    fidelity?: FidelityStatus | FidelityResult;
}
declare function DeckToolbar({ deck, theme, className, style, ariaLabel, fileName, pptx, pdf, fidelity, }: DeckToolbarProps): react_jsx_runtime.JSX.Element;

interface ArtifactReference {
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
type OperationResultSection = "value" | "losses" | "diagnostics" | "receipt" | "artifacts";
interface SurfaceProps {
    readonly className?: string;
    readonly style?: CSSProperties;
    readonly theme?: DeckTheme;
}
interface OperationStatusProps {
    readonly result: OperationResult<unknown>;
    readonly className?: string;
}
declare function OperationStatus({ result, className }: OperationStatusProps): react_jsx_runtime.JSX.Element;
interface OperationLossesProps {
    readonly losses: readonly Loss[];
    readonly defaultExpanded?: boolean;
    readonly className?: string;
}
declare function OperationLosses({ losses, defaultExpanded, className }: OperationLossesProps): react_jsx_runtime.JSX.Element;
interface OperationDiagnosticsProps {
    readonly diagnostics: readonly Diagnostic[];
    readonly defaultExpanded?: boolean;
    readonly className?: string;
}
declare function OperationDiagnostics({ diagnostics, defaultExpanded, className }: OperationDiagnosticsProps): react_jsx_runtime.JSX.Element;
interface OperationReceiptProps {
    readonly receipt?: Receipt;
    readonly defaultExpanded?: boolean;
    readonly className?: string;
}
declare function OperationReceipt({ receipt, defaultExpanded, className }: OperationReceiptProps): react_jsx_runtime.JSX.Element;
interface OperationArtifactsProps {
    readonly artifacts: readonly ArtifactReference[];
    readonly onDownload?: (artifact: ArtifactReference) => void | Promise<void>;
    readonly defaultExpanded?: boolean;
    readonly className?: string;
}
declare function OperationArtifacts({ artifacts, onDownload, defaultExpanded, className }: OperationArtifactsProps): react_jsx_runtime.JSX.Element;
interface OperationResultViewProps<T> extends SurfaceProps {
    readonly result: OperationResult<T>;
    readonly renderValue?: (value: T) => ReactNode;
    readonly artifacts?: readonly ArtifactReference[];
    readonly onArtifactDownload?: (artifact: ArtifactReference) => void | Promise<void>;
    readonly defaultExpanded?: readonly OperationResultSection[];
    readonly ariaLabel?: string;
}
declare function OperationResultView<T>({ result, renderValue, artifacts, onArtifactDownload, defaultExpanded, ariaLabel, theme, className, style, }: OperationResultViewProps<T>): react_jsx_runtime.JSX.Element;

export { type ArtifactReference, type AstDeckDocument, type AstDeckNode, type AstDeckSlide, type DeckController, type DeckDataPoint, type DeckDataSeries, type DeckDocument, type DeckKpi, type DeckOptions, type DeckPattern, DeckProvider, type DeckProviderProps, type DeckRenderMetric, type DeckRenderModel, type DeckRenderState, type DeckSource, type DeckTheme, type DeckThemeTokens, DeckThumbnails, type DeckThumbnailsProps, DeckToolbar, type DeckToolbarProps, DeckViewer, type DeckViewerProps, type DeclarativeDeckDocument, type DeclarativeDeckSlide, DefaultSlide, type DownloadSource, FidelityBadge, type FidelityBadgeProps, type FidelityResult, type FidelityStatus, OperationArtifacts, type OperationArtifactsProps, OperationDiagnostics, type OperationDiagnosticsProps, OperationLosses, type OperationLossesProps, OperationReceipt, type OperationReceiptProps, type OperationResultSection, OperationResultView, type OperationResultViewProps, OperationStatus, type OperationStatusProps, type ThemedDeckProps, createDeckRenderModel, getSlideTitle, isDeclarativeDeckSlide, useDeck, useDeckRender };
