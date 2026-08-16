"use client";
import { createContext, useContext, createElement, useMemo, useState, useCallback, useEffect } from 'react';
import { jsxs, jsx } from 'react/jsx-runtime';

// src/deck.tsx
var DeckContext = createContext(null);
var EMPTY_DOCUMENT = {
  title: "Untitled deck",
  slides: [{ layout: "title", title: "Untitled deck" }]
};
function isController(source) {
  return "document" in source && typeof source.setCurrentSlide === "function";
}
function clampSlide(index, count) {
  return Math.max(0, Math.min(Math.max(0, count - 1), Math.trunc(index)));
}
function useLocalDeck(document2, options) {
  const slideCount = document2.slides.length;
  const [requestedSlide, setRequestedSlide] = useState(
    () => clampSlide(options?.initialSlide ?? 0, slideCount)
  );
  const currentSlide = clampSlide(requestedSlide, slideCount);
  useEffect(() => {
    if (requestedSlide !== currentSlide) setRequestedSlide(currentSlide);
  }, [currentSlide, requestedSlide]);
  const setCurrentSlide = useCallback(
    (index) => setRequestedSlide(clampSlide(index, slideCount)),
    [slideCount]
  );
  const previous = useCallback(
    () => setRequestedSlide((index) => clampSlide(index - 1, slideCount)),
    [slideCount]
  );
  const next = useCallback(
    () => setRequestedSlide((index) => clampSlide(index + 1, slideCount)),
    [slideCount]
  );
  const first = useCallback(() => setRequestedSlide(0), []);
  const last = useCallback(
    () => setRequestedSlide(Math.max(0, slideCount - 1)),
    [slideCount]
  );
  return useMemo(
    () => ({
      document: document2,
      currentSlide,
      slideCount,
      canPrevious: currentSlide > 0,
      canNext: currentSlide < slideCount - 1,
      setCurrentSlide,
      previous,
      next,
      first,
      last
    }),
    [
      document2,
      currentSlide,
      slideCount,
      setCurrentSlide,
      previous,
      next,
      first,
      last
    ]
  );
}
function useDeck(source, options) {
  const context = useContext(DeckContext);
  const local = useLocalDeck(
    source && !isController(source) ? source : EMPTY_DOCUMENT,
    options
  );
  if (source) return isController(source) ? source : local;
  if (context) return context;
  throw new Error("useDeck() requires a deck argument or a parent <DeckProvider>.");
}
function DeckProvider({ deck, children }) {
  const controller = useDeck(deck);
  return createElement(DeckContext.Provider, { value: controller }, children);
}
function textFromUnknown(value) {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value.map((part) => {
    if (typeof part === "string") return part;
    if (part && typeof part === "object" && "text" in part) {
      const text = part.text;
      return typeof text === "string" ? text : "";
    }
    return "";
  }).join("");
}
function isDeclarativeDeckSlide(slide) {
  return "layout" in slide && typeof slide.layout === "string";
}
function findAstTitle(nodes) {
  for (const node of nodes) {
    const fields = node;
    const text = textFromUnknown(fields.content) || textFromUnknown(fields.textContent);
    if (text) return text;
    if (fields.children) {
      const nested = findAstTitle(fields.children);
      if (nested) return nested;
    }
  }
  return "Untitled slide";
}
function getSlideTitle(slide, index) {
  if (isDeclarativeDeckSlide(slide)) {
    return "title" in slide && slide.title ? slide.title : "Key metrics";
  }
  return findAstTitle(slide.children) || `Slide ${index + 1}`;
}
function createDeckRenderModel(slide, index) {
  if (isDeclarativeDeckSlide(slide)) {
    const base = {
      kind: slide.layout,
      title: getSlideTitle(slide, index),
      subtitle: "subtitle" in slide ? slide.subtitle : void 0,
      eyebrow: slide.layout === "title" ? slide.eyebrow : void 0,
      bullets: slide.layout === "bullets" ? slide.bullets : [],
      metrics: slide.layout === "kpi-row" ? slide.metrics : [],
      chart: slide.layout === "chart" ? slide.chart : void 0,
      comparison: slide.layout === "comparison" ? slide : void 0,
      timeline: slide.layout === "timeline" ? slide : void 0,
      astNodes: []
    };
    return base;
  }
  return {
    kind: "ast",
    title: getSlideTitle(slide, index),
    bullets: [],
    metrics: [],
    astNodes: slide.children
  };
}
function useDeckRender(source, slideIndex) {
  const deck = useDeck(source);
  const resolvedIndex = clampSlide(slideIndex ?? deck.currentSlide, deck.slideCount);
  return useMemo(() => {
    const slide = deck.document.slides[resolvedIndex];
    if (!slide) {
      throw new Error("A Runstamp deck must contain at least one slide.");
    }
    const title = getSlideTitle(slide, resolvedIndex);
    return {
      document: deck.document,
      slide,
      slideIndex: resolvedIndex,
      slideCount: deck.slideCount,
      title,
      model: createDeckRenderModel(slide, resolvedIndex)
    };
  }, [deck.document, deck.slideCount, resolvedIndex]);
}
var TOKEN_PROPERTIES = {
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
  fontMono: "--runstamp-font-mono"
};
function themeAttributes(theme, style) {
  const mode = typeof theme === "string" ? theme : theme?.mode ?? "light";
  const tokenStyle = { ...style };
  if (typeof theme === "object") {
    for (const [key, value] of Object.entries(theme.tokens ?? {})) {
      if (value !== void 0) {
        tokenStyle[TOKEN_PROPERTIES[key]] = value;
      }
    }
  }
  return { "data-runstamp-theme": mode, style: tokenStyle };
}
function classNames(...names) {
  return names.filter(Boolean).join(" ");
}
function textFromUnknown2(value) {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value.map((item) => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object" && "text" in item) {
      const text = item.text;
      return typeof text === "string" ? text : "";
    }
    return "";
  }).join("");
}
function AstNode({ node }) {
  const fields = node;
  const text = textFromUnknown2(fields.content) || textFromUnknown2(fields.textContent);
  if (node.type === "Image") {
    const src = typeof fields.src === "string" ? fields.src : void 0;
    return src ? /* @__PURE__ */ jsx("img", { className: "runstamp-ast-image", src, alt: fields.altText ?? "" }) : null;
  }
  if (node.type === "Table" && fields.tableData && typeof fields.tableData === "object") {
    const rows = "rows" in fields.tableData ? fields.tableData.rows : void 0;
    if (Array.isArray(rows)) {
      return /* @__PURE__ */ jsx("table", { className: "runstamp-ast-table", children: /* @__PURE__ */ jsx("tbody", { children: rows.map((row, rowIndex) => {
        const cells = row && typeof row === "object" && "cells" in row ? row.cells : void 0;
        return /* @__PURE__ */ jsx("tr", { children: Array.isArray(cells) ? cells.map((cell, cellIndex) => /* @__PURE__ */ jsx("td", { children: cell && typeof cell === "object" && "text" in cell ? String(cell.text ?? "") : "" }, cellIndex)) : null }, rowIndex);
      }) }) });
    }
  }
  if (fields.children?.length) {
    return /* @__PURE__ */ jsxs("div", { className: "runstamp-ast-group", children: [
      text ? /* @__PURE__ */ jsx("p", { children: text }) : null,
      fields.children.map((child, index) => /* @__PURE__ */ jsx(AstNode, { node: child }, index))
    ] });
  }
  return text ? /* @__PURE__ */ jsx("p", { className: "runstamp-ast-text", children: text }) : null;
}
function Chart({ state }) {
  const chart = state.model.chart;
  if (!chart) return null;
  const points = chart.series.flatMap(
    (series) => series.dataPoints.map((point) => ({ ...point, series: series.name }))
  );
  const max = Math.max(1, ...points.map((point) => Math.abs(point.value)));
  return /* @__PURE__ */ jsxs("div", { className: "runstamp-chart", role: "img", "aria-label": chart.title ?? `${chart.kind} chart`, children: [
    /* @__PURE__ */ jsx("div", { className: "runstamp-chart-grid", "aria-hidden": "true" }),
    /* @__PURE__ */ jsx("div", { className: "runstamp-chart-bars", children: points.map((point, index) => /* @__PURE__ */ jsxs("div", { className: "runstamp-chart-column", children: [
      /* @__PURE__ */ jsx("span", { className: "runstamp-chart-value", children: point.value }),
      /* @__PURE__ */ jsx(
        "span",
        {
          className: "runstamp-chart-bar",
          style: { "--runstamp-bar-size": `${Math.max(3, Math.abs(point.value) / max * 100)}%` }
        }
      ),
      /* @__PURE__ */ jsx("span", { className: "runstamp-chart-label", children: point.category })
    ] }, `${point.series}-${point.category}-${index}`)) })
  ] });
}
function DefaultSlide({ state, miniature = false }) {
  const { model } = state;
  if (model.kind === "ast") {
    return /* @__PURE__ */ jsxs("div", { className: classNames("runstamp-slide", "runstamp-slide--ast", miniature && "runstamp-slide--miniature"), children: [
      /* @__PURE__ */ jsx("div", { className: "runstamp-ast-content", children: model.astNodes.map((node, index) => /* @__PURE__ */ jsx(AstNode, { node }, index)) }),
      /* @__PURE__ */ jsx("span", { className: "runstamp-slide-number", children: String(state.slideIndex + 1).padStart(2, "0") })
    ] });
  }
  const isTitle = model.kind === "title";
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: classNames(
        "runstamp-slide",
        `runstamp-slide--${model.kind}`,
        miniature && "runstamp-slide--miniature"
      ),
      children: [
        /* @__PURE__ */ jsxs("div", { className: "runstamp-slide-kicker", children: [
          "[",
          String(state.slideIndex + 1).padStart(2, "0"),
          "] RUNSTAMP"
        ] }),
        /* @__PURE__ */ jsxs("header", { className: classNames("runstamp-slide-header", isTitle && "runstamp-slide-header--hero"), children: [
          /* @__PURE__ */ jsx("h2", { children: model.title }),
          model.subtitle ? /* @__PURE__ */ jsx("p", { children: model.subtitle }) : null
        ] }),
        model.metrics.length ? /* @__PURE__ */ jsx("div", { className: "runstamp-kpi-grid", children: model.metrics.map((kpi, index) => /* @__PURE__ */ jsxs("article", { className: "runstamp-kpi", children: [
          /* @__PURE__ */ jsx("span", { className: "runstamp-kpi-label", children: kpi.label }),
          /* @__PURE__ */ jsx("strong", { children: kpi.value }),
          kpi.delta ? /* @__PURE__ */ jsx("span", { className: "runstamp-kpi-context", children: kpi.delta }) : null
        ] }, `${kpi.label}-${index}`)) }) : null,
        model.chart ? /* @__PURE__ */ jsx(Chart, { state }) : null,
        model.bullets.length ? /* @__PURE__ */ jsx("ul", { className: "runstamp-bullets", children: model.bullets.map((point, index) => /* @__PURE__ */ jsx("li", { children: point }, index)) }) : null,
        model.comparison ? /* @__PURE__ */ jsx("div", { className: "runstamp-comparison-wrap", children: /* @__PURE__ */ jsxs("table", { className: "runstamp-comparison", children: [
          /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsx("tr", { children: model.comparison.columns.map((column) => /* @__PURE__ */ jsx("th", { children: column }, column)) }) }),
          /* @__PURE__ */ jsx("tbody", { children: model.comparison.rows.map((row) => /* @__PURE__ */ jsxs("tr", { "data-highlight": row.highlight || void 0, children: [
            /* @__PURE__ */ jsx("th", { children: row.label }),
            row.values.map((value, index) => /* @__PURE__ */ jsx("td", { children: value }, index))
          ] }, row.label)) })
        ] }) }) : null,
        model.timeline ? /* @__PURE__ */ jsx("ol", { className: "runstamp-timeline", children: model.timeline.events.map((event, index) => /* @__PURE__ */ jsxs("li", { children: [
          event.date ? /* @__PURE__ */ jsx("span", { children: event.date }) : null,
          /* @__PURE__ */ jsx("strong", { children: event.label }),
          event.description ? /* @__PURE__ */ jsx("p", { children: event.description }) : null
        ] }, `${event.label}-${index}`)) }) : null,
        /* @__PURE__ */ jsx("span", { className: "runstamp-slide-number", children: String(state.slideIndex + 1).padStart(2, "0") })
      ]
    }
  );
}
function DeckViewer({
  deck,
  theme,
  className,
  style,
  ariaLabel = "Presentation slide",
  renderSlide
}) {
  const state = useDeckRender(deck);
  return /* @__PURE__ */ jsx(
    "section",
    {
      ...themeAttributes(theme, style),
      className: classNames("runstamp-root", "runstamp-viewer", className),
      "aria-label": ariaLabel,
      "aria-roledescription": "slide",
      children: /* @__PURE__ */ jsx("div", { className: "runstamp-canvas", children: renderSlide ? renderSlide(state) : /* @__PURE__ */ jsx(DefaultSlide, { state }) })
    }
  );
}
function DeckThumbnails({
  deck,
  theme,
  className,
  style,
  ariaLabel = "Presentation slides",
  renderThumbnail
}) {
  const controller = useDeck(deck);
  return /* @__PURE__ */ jsx(
    "nav",
    {
      ...themeAttributes(theme, style),
      className: classNames("runstamp-root", "runstamp-thumbnails", className),
      "aria-label": ariaLabel,
      children: controller.document.slides.map((slide, index) => {
        const state = {
          document: controller.document,
          slide,
          slideIndex: index,
          slideCount: controller.slideCount,
          title: getSlideTitle(slide, index),
          model: createDeckRenderModel(slide, index)
        };
        return /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            className: "runstamp-thumbnail",
            "aria-current": index === controller.currentSlide ? "page" : void 0,
            "aria-label": `Slide ${index + 1}: ${state.title}`,
            onClick: () => controller.setCurrentSlide(index),
            children: [
              /* @__PURE__ */ jsx("span", { className: "runstamp-thumbnail-index", children: String(index + 1).padStart(2, "0") }),
              /* @__PURE__ */ jsx("span", { className: "runstamp-thumbnail-canvas", children: renderThumbnail ? renderThumbnail(state) : /* @__PURE__ */ jsx(DefaultSlide, { state, miniature: true }) })
            ]
          },
          index
        );
      })
    }
  );
}
function normalizeFidelity(value) {
  return typeof value === "string" ? { status: value } : value;
}
var FIDELITY_LABEL = {
  passed: "Office validated",
  failed: "Validation failed",
  pending: "Validation pending",
  unverified: "Not Office validated"
};
function FidelityBadge({ status, compact = false, className }) {
  const result = normalizeFidelity(status);
  const label = result.message ?? FIDELITY_LABEL[result.status];
  const details = [result.platform, result.validatedAt].filter(Boolean).join(" \xB7 ");
  return /* @__PURE__ */ jsxs(
    "span",
    {
      className: classNames(
        "runstamp-fidelity-badge",
        `runstamp-fidelity-badge--${result.status}`,
        compact && "runstamp-fidelity-badge--compact",
        className
      ),
      role: "status",
      "aria-live": result.status === "pending" ? "polite" : void 0,
      title: details || void 0,
      children: [
        /* @__PURE__ */ jsx("span", { className: "runstamp-fidelity-signal", "aria-hidden": "true" }),
        /* @__PURE__ */ jsx("span", { children: compact ? result.status : label })
      ]
    }
  );
}
async function resolveDownload(source) {
  return typeof source === "function" ? await source() : source;
}
async function startDownload(source, fileName) {
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
  children
}) {
  const [busy, setBusy] = useState(false);
  const onClick = useCallback(async (event) => {
    event.preventDefault();
    if (!source || busy) return;
    setBusy(true);
    try {
      await startDownload(source, fileName);
    } finally {
      setBusy(false);
    }
  }, [busy, fileName, source]);
  return /* @__PURE__ */ jsx("button", { type: "button", disabled: !source || busy, onClick, children: busy ? "Preparing\u2026" : children });
}
function DeckToolbar({
  deck,
  theme,
  className,
  style,
  ariaLabel = "Presentation controls",
  fileName = "presentation",
  pptx,
  pdf,
  fidelity
}) {
  const controller = useDeck(deck);
  const page = `${String(controller.currentSlide + 1).padStart(2, "0")} / ${String(controller.slideCount).padStart(2, "0")}`;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      ...themeAttributes(theme, style),
      className: classNames("runstamp-root", "runstamp-toolbar", className),
      role: "toolbar",
      "aria-label": ariaLabel,
      children: [
        /* @__PURE__ */ jsxs("div", { className: "runstamp-toolbar-group", children: [
          /* @__PURE__ */ jsx("button", { type: "button", onClick: controller.previous, disabled: !controller.canPrevious, "aria-label": "Previous slide", children: "\u2190" }),
          /* @__PURE__ */ jsx("span", { className: "runstamp-page-label", "aria-live": "polite", children: page }),
          /* @__PURE__ */ jsx("button", { type: "button", onClick: controller.next, disabled: !controller.canNext, "aria-label": "Next slide", children: "\u2192" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "runstamp-toolbar-group runstamp-toolbar-group--end", children: [
          fidelity ? /* @__PURE__ */ jsx(FidelityBadge, { status: fidelity }) : null,
          /* @__PURE__ */ jsx(DownloadButton, { source: pdf, fileName: `${fileName}.pdf`, children: "PDF" }),
          /* @__PURE__ */ jsx(DownloadButton, { source: pptx, fileName: `${fileName}.pptx`, children: "PPTX" })
        ] })
      ]
    }
  );
}
function OperationStatus({ result, className }) {
  const lossCount = Array.isArray(result.losses) ? result.losses.length : 0;
  const diagnosticCount = Array.isArray(result.diagnostics) ? result.diagnostics.length : 0;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: classNames("runstamp-operation-status", className),
      "data-status": result.ok ? "success" : "failure",
      role: "status",
      "aria-live": "polite",
      children: [
        /* @__PURE__ */ jsx("span", { className: "runstamp-operation-status__signal", "aria-hidden": "true" }),
        /* @__PURE__ */ jsx("strong", { children: result.ok ? "Operation completed" : "Operation failed" }),
        /* @__PURE__ */ jsx("span", { children: result.ok ? `${lossCount} loss${lossCount === 1 ? "" : "es"}, ${diagnosticCount} diagnostic${diagnosticCount === 1 ? "" : "s"}` : `${result.error.code} \xB7 ${result.error.phase}` })
      ]
    }
  );
}
function OperationLosses({ losses, defaultExpanded = false, className }) {
  const safeLosses = Array.isArray(losses) ? losses : [];
  return /* @__PURE__ */ jsxs("details", { className: classNames("runstamp-operation-section", className), open: defaultExpanded, children: [
    /* @__PURE__ */ jsxs("summary", { children: [
      "Losses ",
      /* @__PURE__ */ jsx("span", { children: safeLosses.length })
    ] }),
    safeLosses.length === 0 ? /* @__PURE__ */ jsx("p", { className: "runstamp-operation-empty", children: "No fidelity loss was reported." }) : /* @__PURE__ */ jsx("ol", { className: "runstamp-operation-list", children: safeLosses.map((loss, index) => /* @__PURE__ */ jsxs("li", { "data-severity": loss.severity, children: [
      /* @__PURE__ */ jsxs("header", { children: [
        /* @__PURE__ */ jsx("strong", { children: loss.subject }),
        /* @__PURE__ */ jsx("code", { children: loss.severity })
      ] }),
      /* @__PURE__ */ jsx("p", { children: loss.message }),
      /* @__PURE__ */ jsx("small", { children: loss.code }),
      loss.remediation ? /* @__PURE__ */ jsx("p", { className: "runstamp-operation-remediation", children: loss.remediation }) : null
    ] }, `${loss.code}-${index}`)) })
  ] });
}
function OperationDiagnostics({ diagnostics, defaultExpanded = false, className }) {
  const safeDiagnostics = Array.isArray(diagnostics) ? diagnostics : [];
  return /* @__PURE__ */ jsxs("details", { className: classNames("runstamp-operation-section", className), open: defaultExpanded, children: [
    /* @__PURE__ */ jsxs("summary", { children: [
      "Diagnostics ",
      /* @__PURE__ */ jsx("span", { children: safeDiagnostics.length })
    ] }),
    safeDiagnostics.length === 0 ? /* @__PURE__ */ jsx("p", { className: "runstamp-operation-empty", children: "No diagnostic observations were reported." }) : /* @__PURE__ */ jsx("ol", { className: "runstamp-operation-list", children: safeDiagnostics.map((diagnostic, index) => /* @__PURE__ */ jsxs("li", { "data-severity": diagnostic.severity, children: [
      /* @__PURE__ */ jsxs("header", { children: [
        /* @__PURE__ */ jsx("strong", { children: diagnostic.phase }),
        /* @__PURE__ */ jsx("code", { children: diagnostic.severity })
      ] }),
      /* @__PURE__ */ jsx("p", { children: diagnostic.message }),
      /* @__PURE__ */ jsx("small", { children: diagnostic.code })
    ] }, `${diagnostic.code}-${index}`)) })
  ] });
}
function json(value) {
  try {
    return JSON.stringify(value, null, 2) ?? "null";
  } catch {
    return "[Value could not be serialized]";
  }
}
function OperationReceipt({ receipt, defaultExpanded = false, className }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    if (receipt === void 0 || typeof navigator === "undefined" || navigator.clipboard === void 0) return;
    await navigator.clipboard.writeText(json(receipt));
    setCopied(true);
  }, [receipt]);
  return /* @__PURE__ */ jsxs("details", { className: classNames("runstamp-operation-section", className), open: defaultExpanded, children: [
    /* @__PURE__ */ jsxs("summary", { children: [
      "Receipt ",
      /* @__PURE__ */ jsx("span", { children: receipt ? "available" : "unavailable" })
    ] }),
    receipt === void 0 ? /* @__PURE__ */ jsx("p", { className: "runstamp-operation-empty", children: "The operation ended before an input-bound receipt was available." }) : /* @__PURE__ */ jsxs("div", { className: "runstamp-operation-receipt", children: [
      /* @__PURE__ */ jsxs("dl", { children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("dt", { children: "Operation" }),
          /* @__PURE__ */ jsx("dd", { children: receipt.operation })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("dt", { children: "Engine" }),
          /* @__PURE__ */ jsxs("dd", { children: [
            receipt.engine.name,
            " ",
            receipt.engine.version
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("dt", { children: "Input" }),
          /* @__PURE__ */ jsx("dd", { children: /* @__PURE__ */ jsx("code", { children: receipt.inputHash }) })
        ] }),
        receipt.outputHash ? /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("dt", { children: "Output" }),
          /* @__PURE__ */ jsx("dd", { children: /* @__PURE__ */ jsx("code", { children: receipt.outputHash }) })
        ] }) : null,
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("dt", { children: "Deterministic" }),
          /* @__PURE__ */ jsx("dd", { children: receipt.deterministic ? "Yes" : "No" })
        ] })
      ] }),
      /* @__PURE__ */ jsx("button", { type: "button", onClick: copy, disabled: typeof navigator === "undefined" || navigator.clipboard === void 0, children: copied ? "Copied" : "Copy receipt" })
    ] })
  ] });
}
function ArtifactAction({ artifact, onDownload }) {
  const [busy, setBusy] = useState(false);
  const download = useCallback(async () => {
    if (onDownload === void 0 || busy) return;
    setBusy(true);
    try {
      await onDownload(artifact);
    } finally {
      setBusy(false);
    }
  }, [artifact, busy, onDownload]);
  if (artifact.href) return /* @__PURE__ */ jsx("a", { href: artifact.href, download: true, children: artifact.label ?? `Download .${artifact.extension}` });
  return /* @__PURE__ */ jsx("button", { type: "button", onClick: download, disabled: onDownload === void 0 || busy, children: busy ? "Downloading\u2026" : artifact.label ?? `Download .${artifact.extension}` });
}
function OperationArtifacts({ artifacts, onDownload, defaultExpanded = false, className }) {
  const safeArtifacts = Array.isArray(artifacts) ? artifacts : [];
  return /* @__PURE__ */ jsxs("details", { className: classNames("runstamp-operation-section", className), open: defaultExpanded, children: [
    /* @__PURE__ */ jsxs("summary", { children: [
      "Artifacts ",
      /* @__PURE__ */ jsx("span", { children: safeArtifacts.length })
    ] }),
    safeArtifacts.length === 0 ? /* @__PURE__ */ jsx("p", { className: "runstamp-operation-empty", children: "This operation did not return a downloadable artifact." }) : /* @__PURE__ */ jsx("ul", { className: "runstamp-operation-artifacts", children: safeArtifacts.map((artifact) => /* @__PURE__ */ jsxs("li", { children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("strong", { children: artifact.label ?? artifact.id }),
        /* @__PURE__ */ jsxs("span", { children: [
          artifact.mediaType,
          " \xB7 ",
          artifact.byteLength.toLocaleString(),
          " bytes"
        ] }),
        /* @__PURE__ */ jsx("code", { children: artifact.hash }),
        artifact.expiresAt ? /* @__PURE__ */ jsxs("small", { children: [
          "Expires ",
          artifact.expiresAt
        ] }) : null
      ] }),
      /* @__PURE__ */ jsx(ArtifactAction, { artifact, onDownload })
    ] }, artifact.id)) })
  ] });
}
function ErrorSummary({ error }) {
  return /* @__PURE__ */ jsxs("div", { className: "runstamp-operation-error", role: "alert", children: [
    /* @__PURE__ */ jsx("strong", { children: error.message }),
    /* @__PURE__ */ jsx("code", { children: error.code }),
    /* @__PURE__ */ jsx("p", { children: error.remediation }),
    Array.isArray(error.issues) && error.issues.length > 0 ? /* @__PURE__ */ jsx("ul", { children: error.issues.map((issue, index) => /* @__PURE__ */ jsxs("li", { children: [
      /* @__PURE__ */ jsx("code", { children: issue.path }),
      " ",
      issue.message
    ] }, `${issue.path}-${index}`)) }) : null
  ] });
}
function OperationResultView({
  result,
  renderValue,
  artifacts = [],
  onArtifactDownload,
  defaultExpanded = [],
  ariaLabel = "Operation result",
  theme,
  className,
  style
}) {
  const expanded = new Set(defaultExpanded);
  return /* @__PURE__ */ jsxs(
    "section",
    {
      ...themeAttributes(theme, style),
      className: classNames("runstamp-root", "runstamp-operation-result", className),
      "aria-label": ariaLabel,
      children: [
        /* @__PURE__ */ jsx(OperationStatus, { result }),
        result.ok ? /* @__PURE__ */ jsxs("details", { className: "runstamp-operation-section", open: expanded.has("value"), children: [
          /* @__PURE__ */ jsx("summary", { children: "Value" }),
          /* @__PURE__ */ jsx("div", { className: "runstamp-operation-value", children: renderValue ? renderValue(result.value) : /* @__PURE__ */ jsx("pre", { children: json(result.value) }) })
        ] }) : /* @__PURE__ */ jsx(ErrorSummary, { error: result.error }),
        /* @__PURE__ */ jsx(OperationArtifacts, { artifacts, onDownload: onArtifactDownload, defaultExpanded: expanded.has("artifacts") }),
        /* @__PURE__ */ jsx(OperationLosses, { losses: result.losses, defaultExpanded: expanded.has("losses") }),
        /* @__PURE__ */ jsx(OperationDiagnostics, { diagnostics: result.diagnostics, defaultExpanded: expanded.has("diagnostics") }),
        /* @__PURE__ */ jsx(OperationReceipt, { receipt: result.receipt, defaultExpanded: expanded.has("receipt") })
      ]
    }
  );
}

export { DeckProvider, DeckThumbnails, DeckToolbar, DeckViewer, DefaultSlide, FidelityBadge, OperationArtifacts, OperationDiagnostics, OperationLosses, OperationReceipt, OperationResultView, OperationStatus, createDeckRenderModel, getSlideTitle, isDeclarativeDeckSlide, useDeck, useDeckRender };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map