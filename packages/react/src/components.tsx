import {
  Fragment,
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createDeckRenderModel, getSlideTitle, useDeck, useDeckRender } from "./deck.js";
import type {
  AstDeckNode,
  DeckRenderState,
  DeckTheme,
  DeckThemeTokens,
  DownloadSource,
  FidelityResult,
  FidelityStatus,
  ThemedDeckProps,
} from "./types.js";

type TokenStyle = CSSProperties & Record<`--runstamp-${string}`, string | number>;

const TOKEN_PROPERTIES: Record<keyof DeckThemeTokens, `--runstamp-${string}`> = {
  accent: "--runstamp-accent",
  ground: "--runstamp-ground",
  surface: "--runstamp-surface",
  ink: "--runstamp-ink",
  mutedInk: "--runstamp-muted-ink",
  border: "--runstamp-border",
  signalGreen: "--runstamp-signal-green",
  signalAmber: "--runstamp-signal-amber",
  signalRed: "--runstamp-signal-red",
  fontSans: "--runstamp-font-sans",
  fontMono: "--runstamp-font-mono",
};

export function themeAttributes(theme?: DeckTheme, style?: CSSProperties) {
  const mode = typeof theme === "string" ? theme : (theme?.mode ?? "light");
  const tokenStyle: TokenStyle = { ...style };
  if (typeof theme === "object") {
    for (const [key, value] of Object.entries(theme.tokens ?? {})) {
      if (value !== undefined) {
        tokenStyle[TOKEN_PROPERTIES[key as keyof DeckThemeTokens]] = value;
      }
    }
  }
  return { "data-runstamp-theme": mode, style: tokenStyle } as const;
}

export function classNames(...names: Array<string | undefined | false>): string {
  return names.filter(Boolean).join(" ");
}

function textFromUnknown(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "text" in item) {
        const text = (item as { text?: unknown }).text;
        return typeof text === "string" ? text : "";
      }
      return "";
    })
    .join("");
}

function AstNode({ node }: { node: AstDeckNode }) {
  const fields = node as unknown as {
    content?: unknown;
    textContent?: unknown;
    children?: AstDeckNode[];
    tableData?: unknown;
    src?: unknown;
    altText?: string;
  };
  const text = textFromUnknown(fields.content) || textFromUnknown(fields.textContent);
  if (node.type === "Image") {
    const src = typeof fields.src === "string" ? fields.src : undefined;
    return src ? (
      <img className="runstamp-ast-image" src={src} alt={fields.altText ?? ""} />
    ) : null;
  }
  if (node.type === "Table" && fields.tableData && typeof fields.tableData === "object") {
    const rows = "rows" in fields.tableData ? (fields.tableData as { rows?: unknown }).rows : undefined;
    if (Array.isArray(rows)) {
      return (
        <table className="runstamp-ast-table">
          <tbody>
            {rows.map((row, rowIndex) => {
              const cells = row && typeof row === "object" && "cells" in row
                ? (row as { cells?: unknown }).cells
                : undefined;
              return (
                <tr key={rowIndex}>
                  {Array.isArray(cells)
                    ? cells.map((cell, cellIndex) => (
                        <td key={cellIndex}>
                          {cell && typeof cell === "object" && "text" in cell
                            ? String((cell as { text?: unknown }).text ?? "")
                            : ""}
                        </td>
                      ))
                    : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    }
  }
  if (fields.children?.length) {
    return (
      <div className="runstamp-ast-group">
        {text ? <p>{text}</p> : null}
        {fields.children.map((child, index) => <AstNode key={index} node={child} />)}
      </div>
    );
  }
  return text ? <p className="runstamp-ast-text">{text}</p> : null;
}

function Chart({ state }: { state: DeckRenderState }) {
  const chart = state.model.chart;
  if (!chart) return null;
  const points = chart.series.flatMap((series) =>
    series.dataPoints.map((point) => ({ ...point, series: series.name })),
  );
  const max = Math.max(1, ...points.map((point) => Math.abs(point.value)));
  return (
    <div className="runstamp-chart" role="img" aria-label={chart.title ?? `${chart.kind} chart`}>
      <div className="runstamp-chart-grid" aria-hidden="true" />
      <div className="runstamp-chart-bars">
        {points.map((point, index) => (
          <div className="runstamp-chart-column" key={`${point.series}-${point.category}-${index}`}>
            <span className="runstamp-chart-value">{point.value}</span>
            <span
              className="runstamp-chart-bar"
              style={{ "--runstamp-bar-size": `${Math.max(3, Math.abs(point.value) / max * 100)}%` } as TokenStyle}
            />
            <span className="runstamp-chart-label">{point.category}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DefaultSlide({ state, miniature = false }: { state: DeckRenderState; miniature?: boolean }) {
  const { model } = state;
  if (model.kind === "ast") {
    return (
      <div className={classNames("runstamp-slide", "runstamp-slide--ast", miniature && "runstamp-slide--miniature")}>
        <div className="runstamp-ast-content">
          {model.astNodes.map((node, index) => <AstNode node={node} key={index} />)}
        </div>
        <span className="runstamp-slide-number">{String(state.slideIndex + 1).padStart(2, "0")}</span>
      </div>
    );
  }

  const isTitle = model.kind === "title";
  return (
    <div
      className={classNames(
        "runstamp-slide",
        `runstamp-slide--${model.kind}`,
        miniature && "runstamp-slide--miniature",
      )}
    >
      <div className="runstamp-slide-kicker">[{String(state.slideIndex + 1).padStart(2, "0")}] RUNSTAMP</div>
      <header className={classNames("runstamp-slide-header", isTitle && "runstamp-slide-header--hero")}>
        <h2>{model.title}</h2>
        {model.subtitle ? <p>{model.subtitle}</p> : null}
      </header>

      {model.metrics.length ? (
        <div className="runstamp-kpi-grid">
          {model.metrics.map((kpi, index) => (
            <article className="runstamp-kpi" key={`${kpi.label}-${index}`}>
              <span className="runstamp-kpi-label">{kpi.label}</span>
              <strong>{kpi.value}</strong>
              {kpi.delta ? <span className="runstamp-kpi-context">{kpi.delta}</span> : null}
            </article>
          ))}
        </div>
      ) : null}

      {model.chart ? <Chart state={state} /> : null}

      {model.bullets.length ? (
        <ul className="runstamp-bullets">
          {model.bullets.map((point, index) => <li key={index}>{point}</li>)}
        </ul>
      ) : null}

      {model.comparison ? (
        <div className="runstamp-comparison-wrap">
          <table className="runstamp-comparison">
            <thead><tr>{model.comparison.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
            <tbody>
              {model.comparison.rows.map((row) => (
                <tr key={row.label} data-highlight={row.highlight || undefined}>
                  <th>{row.label}</th>
                  {row.values.map((value, index) => <td key={index}>{value}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {model.timeline ? (
        <ol className="runstamp-timeline">
          {model.timeline.events.map((event, index) => (
            <li key={`${event.label}-${index}`}>
              {event.date ? <span>{event.date}</span> : null}
              <strong>{event.label}</strong>
              {event.description ? <p>{event.description}</p> : null}
            </li>
          ))}
        </ol>
      ) : null}

      <span className="runstamp-slide-number">{String(state.slideIndex + 1).padStart(2, "0")}</span>
    </div>
  );
}

export interface DeckViewerProps extends ThemedDeckProps {
  ariaLabel?: string;
  renderSlide?: (state: DeckRenderState) => ReactNode;
}

export function DeckViewer({
  deck,
  theme,
  className,
  style,
  ariaLabel = "Presentation slide",
  renderSlide,
}: DeckViewerProps) {
  const state = useDeckRender(deck);
  return (
    <section
      {...themeAttributes(theme, style)}
      className={classNames("runstamp-root", "runstamp-viewer", className)}
      aria-label={ariaLabel}
      aria-roledescription="slide"
    >
      <div className="runstamp-canvas">
        {renderSlide ? renderSlide(state) : <DefaultSlide state={state} />}
      </div>
    </section>
  );
}

export interface DeckThumbnailsProps extends ThemedDeckProps {
  ariaLabel?: string;
  renderThumbnail?: (state: DeckRenderState) => ReactNode;
}

export function DeckThumbnails({
  deck,
  theme,
  className,
  style,
  ariaLabel = "Presentation slides",
  renderThumbnail,
}: DeckThumbnailsProps) {
  const controller = useDeck(deck);
  return (
    <nav
      {...themeAttributes(theme, style)}
      className={classNames("runstamp-root", "runstamp-thumbnails", className)}
      aria-label={ariaLabel}
    >
      {controller.document.slides.map((slide, index) => {
        const state = {
          document: controller.document,
          slide,
          slideIndex: index,
          slideCount: controller.slideCount,
          title: getSlideTitle(slide, index),
          model: createDeckRenderModel(slide, index),
        } satisfies DeckRenderState;
        return (
          <button
            type="button"
            className="runstamp-thumbnail"
            aria-current={index === controller.currentSlide ? "page" : undefined}
            aria-label={`Slide ${index + 1}: ${state.title}`}
            onClick={() => controller.setCurrentSlide(index)}
            key={index}
          >
            <span className="runstamp-thumbnail-index">{String(index + 1).padStart(2, "0")}</span>
            <span className="runstamp-thumbnail-canvas">
              {renderThumbnail ? renderThumbnail(state) : <DefaultSlide state={state} miniature />}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function normalizeFidelity(value: FidelityStatus | FidelityResult): FidelityResult {
  return typeof value === "string" ? { status: value } : value;
}

const FIDELITY_LABEL: Record<FidelityStatus, string> = {
  passed: "Office validated",
  failed: "Validation failed",
  pending: "Validation pending",
  unverified: "Not Office validated",
};

export interface FidelityBadgeProps {
  status: FidelityStatus | FidelityResult;
  compact?: boolean;
  className?: string;
}

export function FidelityBadge({ status, compact = false, className }: FidelityBadgeProps) {
  const result = normalizeFidelity(status);
  const label = result.message ?? FIDELITY_LABEL[result.status];
  const details = [result.platform, result.validatedAt].filter(Boolean).join(" · ");
  return (
    <span
      className={classNames(
        "runstamp-fidelity-badge",
        `runstamp-fidelity-badge--${result.status}`,
        compact && "runstamp-fidelity-badge--compact",
        className,
      )}
      role="status"
      aria-live={result.status === "pending" ? "polite" : undefined}
      title={details || undefined}
    >
      <span className="runstamp-fidelity-signal" aria-hidden="true" />
      <span>{compact ? result.status : label}</span>
    </span>
  );
}

async function resolveDownload(source: DownloadSource) {
  return typeof source === "function" ? await source() : source;
}

async function startDownload(source: DownloadSource, fileName: string) {
  const result = await resolveDownload(source);
  if (typeof result === "string" || result instanceof URL) {
    const anchor = document.createElement("a");
    anchor.href = result.toString();
    anchor.download = fileName;
    anchor.click();
    return;
  }
  const blob = result instanceof Blob ? result : new Blob([new Uint8Array(result).buffer]);
  const href = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = fileName;
    anchor.click();
  } finally {
    URL.revokeObjectURL(href);
  }
}

function DownloadButton({
  source,
  fileName,
  children,
}: {
  source?: DownloadSource;
  fileName: string;
  children: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const onClick = useCallback(async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!source || busy) return;
    setBusy(true);
    try {
      await startDownload(source, fileName);
    } finally {
      setBusy(false);
    }
  }, [busy, fileName, source]);
  return (
    <button type="button" disabled={!source || busy} onClick={onClick}>
      {busy ? "Preparing…" : children}
    </button>
  );
}

export interface DeckToolbarProps extends ThemedDeckProps {
  ariaLabel?: string;
  fileName?: string;
  pptx?: DownloadSource;
  pdf?: DownloadSource;
  fidelity?: FidelityStatus | FidelityResult;
}

export function DeckToolbar({
  deck,
  theme,
  className,
  style,
  ariaLabel = "Presentation controls",
  fileName = "presentation",
  pptx,
  pdf,
  fidelity,
}: DeckToolbarProps) {
  const controller = useDeck(deck);
  const page = `${String(controller.currentSlide + 1).padStart(2, "0")} / ${String(controller.slideCount).padStart(2, "0")}`;
  return (
    <div
      {...themeAttributes(theme, style)}
      className={classNames("runstamp-root", "runstamp-toolbar", className)}
      role="toolbar"
      aria-label={ariaLabel}
    >
      <div className="runstamp-toolbar-group">
        <button type="button" onClick={controller.previous} disabled={!controller.canPrevious} aria-label="Previous slide">←</button>
        <span className="runstamp-page-label" aria-live="polite">{page}</span>
        <button type="button" onClick={controller.next} disabled={!controller.canNext} aria-label="Next slide">→</button>
      </div>
      <div className="runstamp-toolbar-group runstamp-toolbar-group--end">
        {fidelity ? <FidelityBadge status={fidelity} /> : null}
        <DownloadButton source={pdf} fileName={`${fileName}.pdf`}>PDF</DownloadButton>
        <DownloadButton source={pptx} fileName={`${fileName}.pptx`}>PPTX</DownloadButton>
      </div>
    </div>
  );
}
