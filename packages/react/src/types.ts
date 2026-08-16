import type { CSSProperties, ReactNode } from "react";
import type {
  DeclarativeChart,
  DeclarativeChartSeries,
  DeclarativeDocument,
  DeclarativeLayout,
  DeclarativeMetric,
  DeclarativeSlide,
  PaperDocument,
  PaperNode,
  PaperSlide,
} from "@runstamp/pptx";

/** Canonical authoring and AST types come from @runstamp/pptx. */
export type {
  DeclarativeChart,
  DeclarativeChartSeries,
  DeclarativeDocument,
  DeclarativeLayout,
  DeclarativeMetric,
  DeclarativeSlide,
  PaperDocument,
  PaperNode,
  PaperSlide,
} from "@runstamp/pptx";

/** @deprecated Use DeclarativeDocument from @runstamp/pptx. */
export type DeclarativeDeckDocument = DeclarativeDocument;
/** @deprecated Use DeclarativeSlide from @runstamp/pptx. */
export type DeclarativeDeckSlide = DeclarativeSlide;
/** @deprecated Use PaperDocument from @runstamp/pptx. */
export type AstDeckDocument = PaperDocument;
/** @deprecated Use PaperSlide from @runstamp/pptx. */
export type AstDeckSlide = PaperSlide;
/** @deprecated Use PaperNode from @runstamp/pptx. */
export type AstDeckNode = PaperNode;

export type DeckPattern = DeclarativeLayout;
export type DeckKpi = DeclarativeMetric;
export type DeckDataSeries = DeclarativeChartSeries;
export type DeckDataPoint = DeclarativeChartSeries["dataPoints"][number];
export type DeckDocument = DeclarativeDocument | PaperDocument;

export interface DeckOptions {
  /** Zero-based initial slide. Out-of-range values are clamped. */
  initialSlide?: number;
}

export interface DeckController {
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

export type DeckSource = DeckDocument | DeckController;

/** Normalized display metric; this is a render view-model, not an input schema. */
export interface DeckRenderMetric {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "flat" | "none";
}

export interface DeckRenderModel {
  kind: DeclarativeLayout | "ast";
  title: string;
  subtitle?: string;
  eyebrow?: string;
  bullets: string[];
  metrics: DeckRenderMetric[];
  chart?: DeclarativeChart;
  comparison?: Extract<DeclarativeSlide, { layout: "comparison" }>;
  timeline?: Extract<DeclarativeSlide, { layout: "timeline" }>;
  astNodes: PaperNode[];
}

export interface DeckRenderState {
  document: DeckDocument;
  slide: DeclarativeSlide | PaperSlide;
  slideIndex: number;
  slideCount: number;
  title: string;
  model: DeckRenderModel;
}

export interface DeckProviderProps {
  deck: DeckSource;
  children: ReactNode;
}

export interface DeckThemeTokens {
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

export type DeckTheme =
  | "light"
  | "dark"
  | {
      mode?: "light" | "dark";
      tokens?: DeckThemeTokens;
    };

export type FidelityStatus = "passed" | "failed" | "pending" | "unverified";

export interface FidelityResult {
  status: FidelityStatus;
  /** Human-readable oracle, for example "PowerPoint for Windows". */
  platform?: string;
  /** ISO timestamp supplied by the validation service. */
  validatedAt?: string;
  message?: string;
}

export type DownloadSource =
  | string
  | URL
  | Blob
  | Uint8Array
  | (() => string | URL | Blob | Uint8Array | Promise<string | URL | Blob | Uint8Array>);

export interface ThemedDeckProps {
  deck?: DeckSource;
  theme?: DeckTheme;
  className?: string;
  style?: CSSProperties;
}
